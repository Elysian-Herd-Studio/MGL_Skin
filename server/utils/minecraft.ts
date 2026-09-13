import { createHash, randomBytes } from 'node:crypto'
import type { H3Event } from 'h3'
import { findUserById } from './users'
import { toSessionUser } from './session'

function hash(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function createSecret() {
  return randomBytes(32).toString('base64url')
}

export function createMinecraftAuthCode(userId: number) {
  const code = createSecret()
  useDatabase().prepare('INSERT INTO minecraft_auth_codes (code_hash, user_id, expires_at) VALUES (?, ?, datetime(\'now\', \'+5 minutes\'))')
    .run(hash(code), userId)
  return code
}

export function consumeMinecraftAuthCode(code: string) {
  const db = useDatabase()
  const row = db.prepare('SELECT code_hash, user_id FROM minecraft_auth_codes WHERE code_hash = ? AND used_at IS NULL AND expires_at > datetime(\'now\')')
    .get(hash(code)) as { code_hash: string, user_id: number } | undefined
  if (!row) return undefined
  const result = db.prepare("UPDATE minecraft_auth_codes SET used_at = datetime('now') WHERE code_hash = ? AND used_at IS NULL")
    .run(row.code_hash)
  return result.changes === 1 ? findUserById(row.user_id) : undefined
}

export function createMinecraftToken(userId: number) {
  const token = createSecret()
  useDatabase().prepare('INSERT INTO minecraft_tokens (token_hash, user_id, expires_at) VALUES (?, ?, datetime(\'now\', \'+365 days\'))')
    .run(hash(token), userId)
  return token
}

export function userFromMinecraftToken(event: H3Event) {
  const header = getHeader(event, 'authorization') || ''
  if (!header.toLowerCase().startsWith('bearer ')) return undefined
  const token = header.slice(7).trim()
  if (!token || token.length > 256) return undefined
  const row = useDatabase().prepare("SELECT user_id FROM minecraft_tokens WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > datetime('now')")
    .get(hash(token)) as { user_id: number } | undefined
  return row ? findUserById(row.user_id) : undefined
}

export function requireMinecraftUser(event: H3Event) {
  const user = userFromMinecraftToken(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: '需要 MGL Skin 登录令牌', data: { code: 'MINECRAFT_AUTH_REQUIRED' } })
  return user
}

export function minecraftUserResponse(user: NonNullable<ReturnType<typeof findUserById>>) {
  return toSessionUser(user)
}
