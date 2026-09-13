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

export function findUserById(id: number) {
  const row = useDatabase()
    .prepare(`SELECT ${columns} FROM users WHERE id = ?`)
    .get(id) as UserRow | undefined
  return row ? toUser(row) : undefined
}

export function findUserByEmail(email: string) {
  const row = useDatabase()
    .prepare(`SELECT ${columns} FROM users WHERE email = ?`)
    .get(email) as UserRow | undefined
  return row ? toUser(row) : undefined
}

export function usernameExists(username: string) {
  return Boolean(useDatabase().prepare('SELECT 1 AS ok FROM users WHERE username = ?').get(username))
}

export function createUser(input: { username: string, email: string, passwordHash: string }) {
  const info = useDatabase()
    .prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)')
    .run(input.username, input.email, input.passwordHash)
  return findUserById(Number(info.lastInsertRowid)) as UserRecord
}

export function setUserEmailVerified(id: number, verified: boolean) {
  useDatabase()
    .prepare("UPDATE users SET email_verified = ?, updated_at = datetime('now') WHERE id = ?")
    .run(verified ? 1 : 0, id)
}

export function setUserUsername(id: number, username: string) {
  const result = useDatabase()
    .prepare("UPDATE OR IGNORE users SET username = ?, updated_at = datetime('now') WHERE id = ?")
    .run(username, id)
  return result.changes > 0
}

export function setUserPassword(id: number, passwordHash: string) {
  useDatabase()
    .prepare("UPDATE users SET password_hash = ?, session_version = session_version + 1, updated_at = datetime('now') WHERE id = ?")
    .run(passwordHash, id)
}

export function setUserRole(id: number, role: UserRole) {
  useDatabase()
    .prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?")
    .run(role, id)
}

export function recordLogin(id: number) {
  useDatabase()
    .prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?")
    .run(id)
}

export function countAdmins() {
  const row = useDatabase()
    .prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'")
    .get() as { n: number }
  return row.n
}

export function deleteUser(id: number) {
  useDatabase().prepare('DELETE FROM users WHERE id = ?').run(id)
}

export function listUsers(options: { limit: number, offset: number, query: string }) {
  const db = useDatabase()
  const args: (string | number)[] = []
  let where = ''

  if (options.query) {
    where = 'WHERE username LIKE ? OR email LIKE ?'
    args.push(`%${options.query}%`, `%${options.query}%`)
  }

  const totalRow = db
    .prepare(`SELECT COUNT(*) AS n FROM users ${where}`)
    .get(...args) as { n: number }

  args.push(options.limit, options.offset)
  const rows = db
    .prepare(`SELECT ${columns} FROM users ${where} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(...args) as UserRow[]

  return { items: rows.map(toUser), total: totalRow.n }
}
