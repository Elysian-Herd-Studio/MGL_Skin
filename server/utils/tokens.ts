import { createHash, randomBytes } from 'node:crypto'

export type TokenPurpose = 'email_verify' | 'password_reset'

const ttlSeconds: Record<TokenPurpose, number> = {
  email_verify: 60 * 60 * 24,
  password_reset: 60 * 60
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function createToken(userId: number, purpose: TokenPurpose) {
  const db = useDatabase()
  const token = randomBytes(32).toString('base64url')

  db.prepare('DELETE FROM auth_tokens WHERE user_id = ? AND purpose = ?').run(userId, purpose)
  db.prepare("INSERT INTO auth_tokens (user_id, token_hash, purpose, expires_at) VALUES (?, ?, ?, datetime('now', ?))")
    .run(userId, hashToken(token), purpose, `+${ttlSeconds[purpose]} seconds`)

  return token
}

export function consumeToken(token: string, purpose: TokenPurpose) {
  const db = useDatabase()
  const row = db
    .prepare('SELECT id, user_id, used_at FROM auth_tokens WHERE token_hash = ? AND purpose = ?')
    .get(hashToken(token), purpose) as { id: number, user_id: number, used_at: string | null } | undefined

  if (!row || row.used_at) {
    return { ok: false as const, reason: 'invalid' as const }
  }

  const result = db
    .prepare("UPDATE auth_tokens SET used_at = datetime('now') WHERE id = ? AND used_at IS NULL AND expires_at > datetime('now')")
    .run(row.id)

  if (result.changes === 0) {
    return { ok: false as const, reason: 'expired' as const }
  }

  return { ok: true as const, userId: row.user_id }
}

export function clearTokens(userId: number, purpose: TokenPurpose) {
  useDatabase().prepare('DELETE FROM auth_tokens WHERE user_id = ? AND purpose = ?').run(userId, purpose)
}
