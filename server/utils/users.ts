import { isUniqueConstraintError, type DatabaseSession } from './db'

export type UserRole = 'user' | 'admin'

export interface UserRecord {
  id: number
  username: string
  avatarUrl: string | null
  email: string
  passwordHash: string
  emailVerified: boolean
  role: UserRole
  sessionVersion: number
  createdAt: string
  lastLoginAt: string | null
}

interface UserRow {
  id: number
  username: string
  avatar_version: string | null
  email: string
  password_hash: string
  email_verified: number
  role: UserRole
  session_version: number
  created_at: string
  last_login_at: string | null
}

const columns = `id, username, email, password_hash, email_verified, role, session_version, created_at, last_login_at,
  (SELECT version FROM user_avatars WHERE user_id = users.id) AS avatar_version`

export async function lockUserForUpdate(db: DatabaseSession, id: number) {
  await db.prepare(`SELECT id FROM users WHERE id = ?${db.provider === 'postgresql' ? ' FOR UPDATE' : ''}`).get(id)
}

export async function lockAdminChanges(db: DatabaseSession) {
  if (db.provider === 'postgresql') await db.prepare('SELECT pg_advisory_xact_lock(1397442893, 2)').get()
}

function toUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    username: row.username,
    avatarUrl: row.avatar_version ? `/api/users/${row.id}/avatar?v=${row.avatar_version}` : null,
    email: row.email,
    passwordHash: row.password_hash,
    emailVerified: row.email_verified === 1,
    role: row.role,
    sessionVersion: row.session_version,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at
  }
}

export function toAdminUser(user: UserRecord) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt
  }
}

export async function findUserById(id: number, database?: DatabaseSession) {
  const db = database ?? await useDatabase()
  const row = await db
    .prepare(`SELECT ${columns} FROM users WHERE id = ?`)
    .get(id) as UserRow | undefined
  return row ? toUser(row) : undefined
}

export async function findUserByEmail(email: string) {
  const db = await useDatabase()
  const row = await db
    .prepare(`SELECT ${columns} FROM users WHERE lower(email) = lower(?)`)
    .get(email) as UserRow | undefined
  return row ? toUser(row) : undefined
}

export async function usernameExists(username: string) {
  const db = await useDatabase()
  return Boolean(await db.prepare('SELECT 1 AS ok FROM users WHERE lower(username) = lower(?)').get(username))
}

export async function createUser(input: { username: string, email: string, passwordHash: string }) {
  const db = await useDatabase()
  const info = await db
    .prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?) RETURNING id')
    .get<{ id: number }>(input.username, input.email, input.passwordHash)
  return (await findUserById(info!.id))!
}

export async function setUserEmailVerified(id: number, verified: boolean, database?: DatabaseSession) {
  const db = database ?? await useDatabase()
  await db
    .prepare(`UPDATE users SET email_verified = ?, updated_at = ${db.now} WHERE id = ?`)
    .run(verified ? 1 : 0, id)
}

export async function setUserUsername(id: number, username: string) {
  const db = await useDatabase()
  try {
    const result = await db
      .prepare(`UPDATE users SET username = ?, updated_at = ${db.now} WHERE id = ?`)
      .run(username, id)
    return result.changes > 0
  } catch (cause) {
    if (isUniqueConstraintError(cause)) return false
    throw cause
  }
}

export async function setUserPassword(id: number, passwordHash: string) {
  const db = await useDatabase()
  await db
    .prepare(`UPDATE users SET password_hash = ?, session_version = session_version + 1, updated_at = ${db.now} WHERE id = ?`)
    .run(passwordHash, id)
}

export async function setUserRole(id: number, role: UserRole, database?: DatabaseSession) {
  const db = database ?? await useDatabase()
  await db
    .prepare(`UPDATE users SET role = ?, updated_at = ${db.now} WHERE id = ?`)
    .run(role, id)
}

export async function recordLogin(id: number) {
  const db = await useDatabase()
  await db
    .prepare(`UPDATE users SET last_login_at = ${db.now} WHERE id = ?`)
    .run(id)
}

export async function countAdmins(database?: DatabaseSession) {
  const db = database ?? await useDatabase()
  const row = await db
    .prepare("SELECT CAST(COUNT(*) AS INTEGER) AS n FROM users WHERE role = 'admin'")
    .get() as { n: number }
  return row.n
}

export async function deleteUser(id: number, database?: DatabaseSession) {
  const db = database ?? await useDatabase()
  await db.prepare('DELETE FROM users WHERE id = ?').run(id)
}

export async function listUsers(options: { limit: number, offset: number, query: string }) {
  const db = await useDatabase()
  const args: (string | number)[] = []
  let where = ''

  if (options.query) {
    where = 'WHERE lower(username) LIKE lower(?) OR lower(email) LIKE lower(?)'
    args.push(`%${options.query}%`, `%${options.query}%`)
  }

  const totalRow = await db
    .prepare(`SELECT CAST(COUNT(*) AS INTEGER) AS n FROM users ${where}`)
    .get(...args) as { n: number }

  args.push(options.limit, options.offset)
  const rows = await db
    .prepare(`SELECT ${columns} FROM users ${where} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(...args) as UserRow[]

  return { items: rows.map(toUser), total: totalRow.n }
}
