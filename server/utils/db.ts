import { Buffer } from 'node:buffer'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import postgres from 'postgres'
import type { DatabaseProvider } from '../../shared/types/database'
import { configuredDatabase, type DatabaseConfig } from './database-config'
import { databaseNow, databaseSchema } from './database-schema'

type DatabaseValue = string | number | null | Uint8Array
type DatabaseRow = Record<string, unknown>

interface DatabaseStatement {
  get<T = DatabaseRow>(...values: DatabaseValue[]): Promise<T | undefined>
  all<T = DatabaseRow>(...values: DatabaseValue[]): Promise<T[]>
  run(...values: DatabaseValue[]): Promise<{ changes: number }>
}

export interface DatabaseSession {
  provider: DatabaseProvider
  now: string
  prepare(sql: string): DatabaseStatement
}

export interface Database extends DatabaseSession {
  transaction<T>(callback: (db: DatabaseSession) => Promise<T>): Promise<T>
  close(): Promise<void>
}

const databases = new Map<string, Promise<Database>>()

function sqliteSession(db: DatabaseSync, execute: <T>(callback: () => T) => Promise<T>): DatabaseSession {
  return {
    provider: 'sqlite',
    now: databaseNow('sqlite'),
    prepare(sql) {
      return {
        get: <T>(...values: DatabaseValue[]) => execute(() => db.prepare(sql).get(...values) as T | undefined),
        all: <T>(...values: DatabaseValue[]) => execute(() => db.prepare(sql).all(...values) as T[]),
        run: (...values) => execute(() => ({ changes: Number(db.prepare(sql).run(...values).changes) }))
      }
    }
  }
}

async function openSQLite(path: string): Promise<Database> {
  const { DatabaseSync } = await import('node:sqlite')
  mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  try {
    db.exec('PRAGMA busy_timeout = 5000')
    db.exec('PRAGMA journal_mode = WAL')
    db.exec('PRAGMA foreign_keys = ON')
    db.exec('BEGIN IMMEDIATE')
    db.exec(databaseSchema('sqlite'))
    const columns = db.prepare('PRAGMA table_info(skin_presets)').all()
    if (!columns.some(column => column.name === 'is_public')) {
      db.exec('ALTER TABLE skin_presets ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0 CHECK (is_public IN (0, 1))')
    }
    db.exec('CREATE INDEX IF NOT EXISTS idx_skin_presets_public_updated ON skin_presets(is_public, updated_at DESC, id DESC)')
    db.exec('COMMIT')
  } catch (cause) {
    db.close()
    throw cause
  }

  let queue = Promise.resolve()
  function exclusive<T>(callback: () => T | Promise<T>): Promise<T> {
    const result = queue.then(callback)
    queue = result.then(() => undefined, () => undefined)
    return result
  }
  const session = sqliteSession(db, async callback => callback())
  return {
    ...sqliteSession(db, exclusive),
    transaction: callback => exclusive(async () => {
      db.exec('BEGIN IMMEDIATE')
      try {
        const result = await callback(session)
        db.exec('COMMIT')
        return result
      } catch (cause) {
        db.exec('ROLLBACK')
        throw cause
      }
    }),
    close: () => exclusive(() => db.close())
  }
}

function postgresSession(client: postgres.Sql | postgres.TransactionSql): DatabaseSession {
  return {
    provider: 'postgresql',
    now: databaseNow('postgresql'),
    prepare(sql) {
      let index = 0
      const query = sql.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|\?/g, token => token === '?' ? `$${++index}` : token)
      const parameters = (values: DatabaseValue[]) => values.map(value => value instanceof Uint8Array ? Buffer.from(value) : value)
      return {
        get: async <T>(...values: DatabaseValue[]) => (await client.unsafe<T[]>(query, parameters(values)))[0],
        all: async <T>(...values: DatabaseValue[]) => Array.from(await client.unsafe<T[]>(query, parameters(values))),
        run: async (...values) => ({ changes: (await client.unsafe(query, parameters(values))).count })
      }
    }
  }
}

async function openPostgreSQL(config: Extract<DatabaseConfig, { provider: 'postgresql' }>): Promise<Database> {
  const client = postgres({
    host: config.host,
    port: config.port,
    database: config.database,
    username: config.username,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: true } : false,
    max: 10,
    connect_timeout: 10,
    idle_timeout: 30,
    prepare: false,
    connection: { application_name: 'MGL Skin', statement_timeout: 15000 },
    onnotice: () => undefined
  })
  try {
    await client.begin(async sql => {
      await sql.unsafe('SELECT pg_advisory_xact_lock(1397442893, 1)')
      await sql.unsafe(databaseSchema('postgresql'))
      await sql.unsafe('ALTER TABLE skin_presets ADD COLUMN IF NOT EXISTS is_public INTEGER NOT NULL DEFAULT 0 CHECK (is_public IN (0, 1))')
      await sql.unsafe('CREATE INDEX IF NOT EXISTS idx_skin_presets_public_updated ON skin_presets(is_public, updated_at DESC, id DESC)')
    })
  } catch (cause) {
    await client.end({ timeout: 1 })
    throw cause
  }
  return {
    ...postgresSession(client),
    async transaction(callback) {
      const result = await client.begin(async sql => ({ value: await callback(postgresSession(sql)) }))
      return result.value
    },
    close: () => client.end({ timeout: 5 })
  }
}

export async function openDatabase(config: DatabaseConfig) {
  let db: Database | undefined
  try {
    db = config.provider === 'sqlite' ? await openSQLite(config.path) : await openPostgreSQL(config)
    await db.prepare(`INSERT INTO app_settings (key, value)
      SELECT 'initialized_at', ${db.now} WHERE EXISTS (SELECT 1 FROM users)
      ON CONFLICT(key) DO NOTHING`).run()
    return db
  } catch {
    await db?.close()
    throw createError({
      statusCode: 503,
      statusMessage: config.provider === 'postgresql'
        ? '无法连接或初始化 PostgreSQL，请检查地址、端口、数据库、凭据、SSL 和建表权限'
        : '无法打开 SQLite 数据库，请检查数据目录的读写权限',
      data: { code: 'DATABASE_UNAVAILABLE' }
    })
  }
}

export function connectDatabase(config: DatabaseConfig): Promise<Database> {
  const key = JSON.stringify(config)
  let database = databases.get(key)
  if (!database) {
    database = openDatabase(config).catch(cause => {
      databases.delete(key)
      throw cause
    })
    databases.set(key, database)
  }
  return database
}

export function useDatabase(): Promise<Database> {
  const config = configuredDatabase()
  if (!config) throw createError({ statusCode: 503, statusMessage: '请先完成站点初始化', data: { code: 'SETUP_REQUIRED' } })
  return connectDatabase(config)
}

export async function closeDatabases() {
  await Promise.allSettled([...databases.values()].map(async database => (await database).close()))
  databases.clear()
}

export function databaseTimestamp(offsetSeconds = 0) {
  return new Date(Date.now() + offsetSeconds * 1000).toISOString().slice(0, 19).replace('T', ' ')
}

export function isUniqueConstraintError(cause: unknown) {
  const error = cause as { code?: string, errcode?: number }
  return error?.code === '23505' || error?.errcode === 2067 || error?.errcode === 1555
}
