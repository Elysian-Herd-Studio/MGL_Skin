import { createHash, randomBytes } from 'node:crypto'
import type { H3Event } from 'h3'
import { findUserById, type UserRecord } from './users'
import { databaseTimestamp } from './db'
import { toSessionUser } from './session'

function hash(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function createSecret() {
  return randomBytes(32).toString('base64url')
}

export async function createMinecraftAuthCode(userId: number) {
  const code = createSecret()
  const db = await useDatabase()
  await db.prepare('INSERT INTO minecraft_auth_codes (code_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(hash(code), userId, databaseTimestamp(5 * 60))
  return code
}

export async function consumeMinecraftAuthCode(code: string) {
  const db = await useDatabase()
  const row = await db.prepare(`UPDATE minecraft_auth_codes SET used_at = ${db.now}
    WHERE code_hash = ? AND used_at IS NULL AND expires_at > ? RETURNING user_id`)
    .get<{ user_id: number }>(hash(code), databaseTimestamp())
  return row ? findUserById(row.user_id) : undefined
}

export async function createMinecraftToken(userId: number) {
  const token = createSecret()
  const db = await useDatabase()
  await db.prepare('INSERT INTO minecraft_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(hash(token), userId, databaseTimestamp(365 * 24 * 60 * 60))
  return token
}

export async function userFromMinecraftToken(event: H3Event) {
  const header = getHeader(event, 'authorization') || ''
  if (!header.toLowerCase().startsWith('bearer ')) return undefined
  const token = header.slice(7).trim()
  if (!token || token.length > 256) return undefined
  const db = await useDatabase()
  const row = await db.prepare('SELECT user_id FROM minecraft_tokens WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > ?')
    .get(hash(token), databaseTimestamp()) as { user_id: number } | undefined
  return row ? findUserById(row.user_id) : undefined
}

export async function requireMinecraftUser(event: H3Event) {
  const user = await userFromMinecraftToken(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: '需要 MGL Skin 登录令牌', data: { code: 'MINECRAFT_AUTH_REQUIRED' } })
  return user
}

export function minecraftUserResponse(user: UserRecord) {
  return toSessionUser(user)
}
