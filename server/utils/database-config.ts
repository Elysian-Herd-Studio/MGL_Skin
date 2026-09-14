import { existsSync, linkSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { isIP } from 'node:net'
import { dirname, resolve } from 'node:path'
import type { PostgreSQLSettings } from '../../shared/types/database'

export type DatabaseConfig = { provider: 'sqlite', path: string }
  | ({ provider: 'postgresql' } & PostgreSQLSettings)

const dataDirectory = resolve(process.cwd(), '.data')
const defaultSQLitePath = resolve(dataDirectory, 'mgl.sqlite')
const databaseConfigFile = resolve(dataDirectory, 'database.json')

function invalidDatabaseSettings(message: string): never {
  throw createError({ statusCode: 400, statusMessage: message, data: { code: 'INVALID_DATABASE_SETTINGS' } })
}

function databaseText(value: unknown, label: string, maximum: number) {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum || value.includes('\0')) {
    invalidDatabaseSettings(`${label}无效`)
  }
  return value.trim()
}

function parsePostgreSQLSettings(input: unknown): PostgreSQLSettings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) invalidDatabaseSettings('请填写 PostgreSQL 连接配置')
  const body = input as Record<string, unknown>
  const host = databaseText(body.host, '数据库主机', 253)
  if (/[\s/\\?#@,]/.test(host) || (!isIP(host) && /[:\[\]]/.test(host))) {
    invalidDatabaseSettings('数据库主机应为域名或 IP 地址，不包含协议和端口')
  }
  if ((typeof body.port !== 'string' && typeof body.port !== 'number')
    || !Number.isInteger(Number(body.port)) || Number(body.port) < 1 || Number(body.port) > 65535) {
    invalidDatabaseSettings('数据库端口需为 1-65535')
  }
  if (typeof body.password !== 'string' || body.password.length > 4096 || body.password.includes('\0')) {
    invalidDatabaseSettings('数据库密码格式不正确')
  }
  if (typeof body.ssl !== 'boolean') invalidDatabaseSettings('数据库 SSL 选项无效')
  return {
    host,
    port: Number(body.port),
    database: databaseText(body.database, '数据库名称', 128),
    username: databaseText(body.username, '数据库用户名', 128),
    password: body.password,
    ssl: body.ssl
  }
}

function parseSQLiteSettings(input: unknown): string {
  if (!input || typeof input !== 'object' || Array.isArray(input)) invalidDatabaseSettings('请填写 SQLite 数据文件路径')
  const path = (input as Record<string, unknown>).path
  if (typeof path !== 'string' || !path.trim() || path.length > 1024 || path.includes('\0')) {
    invalidDatabaseSettings('SQLite 数据文件路径无效')
  }
  return resolve(process.cwd(), path.trim())
}

export function parseDatabaseSettings(input: unknown): DatabaseConfig {
  if (!input || typeof input !== 'object' || Array.isArray(input)) invalidDatabaseSettings('请选择数据库类型')
  const body = input as Record<string, unknown>
  if (body.provider === 'sqlite') return { provider: 'sqlite', path: parseSQLiteSettings(body.sqlite) }
  if (body.provider === 'postgresql') return { provider: 'postgresql', ...parsePostgreSQLSettings(body.postgresql) }
  return invalidDatabaseSettings('请选择 SQLite 或 PostgreSQL')
}

export function readDatabaseConfig(): DatabaseConfig | undefined {
  let content: string
  try {
    content = readFileSync(databaseConfigFile, 'utf8')
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw createError({ statusCode: 503, statusMessage: '无法读取数据库配置，请检查数据目录的权限', data: { code: 'DATABASE_CONFIG_UNAVAILABLE' } })
  }
  try {
    const saved = JSON.parse(content)
    if (saved.version !== 1) throw new Error()
    const connection = saved.connection
    if (connection?.provider === 'sqlite' && typeof connection.path === 'string' && connection.path) {
      return { provider: 'sqlite', path: resolve(connection.path) }
    }
    if (connection?.provider === 'postgresql') return { provider: 'postgresql', ...parsePostgreSQLSettings(connection) }
    throw new Error()
  } catch {
    throw createError({ statusCode: 503, statusMessage: '数据库配置文件无效，请检查服务端配置', data: { code: 'DATABASE_CONFIG_INVALID' } })
  }
}

export function configuredDatabase(): DatabaseConfig | undefined {
  const saved = readDatabaseConfig()
  if (saved) return saved
  const path = defaultSQLitePath
  try {
    statSync(path)
    return { provider: 'sqlite', path }
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw createError({ statusCode: 503, statusMessage: '无法访问 SQLite 数据文件，请检查数据目录的权限', data: { code: 'DATABASE_UNAVAILABLE' } })
  }
}

function createPrivateFile(file: string, content: string) {
  const temporary = `${file}.${randomBytes(16).toString('hex')}.tmp`
  try {
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(temporary, content, { flag: 'wx', mode: 0o600 })
    try {
      linkSync(temporary, file)
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code !== 'EEXIST') throw cause
    }
  } catch {
    throw createError({ statusCode: 503, statusMessage: '无法保存数据库配置，请检查数据目录的写入权限', data: { code: 'DATABASE_CONFIG_UNAVAILABLE' } })
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary)
  }
}

export function persistDatabaseConfig(connection: DatabaseConfig) {
  createPrivateFile(databaseConfigFile, JSON.stringify({ version: 1, connection }, null, 2))
  if (JSON.stringify(readDatabaseConfig()) !== JSON.stringify(connection)) {
    throw createError({ statusCode: 409, statusMessage: '数据库已由另一个初始化请求选定，请刷新页面后重试', data: { code: 'DATABASE_ALREADY_CONFIGURED' } })
  }
}

export function getBootstrapSessionPassword() {
  const file = resolve(dataDirectory, 'session.key')
  if (!existsSync(file)) createPrivateFile(file, randomBytes(48).toString('hex'))
  try {
    const password = readFileSync(file, 'utf8').trim()
    if (password.length < 32) throw new Error()
    return password
  } catch {
    throw createError({ statusCode: 503, statusMessage: '无法读取初始会话密钥，请检查数据目录的文件和权限', data: { code: 'SESSION_CONFIG_UNAVAILABLE' } })
  }
}
