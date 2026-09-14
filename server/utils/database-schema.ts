import type { DatabaseProvider } from '../../shared/types/database'

export function databaseNow(provider: DatabaseProvider) {
  return provider === 'sqlite' ? 'CURRENT_TIMESTAMP' : "to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')"
}

export function databaseSchema(provider: DatabaseProvider) {
  const sqlite = provider === 'sqlite'
  const id = sqlite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'SERIAL PRIMARY KEY'
  const unique = sqlite ? ' UNIQUE COLLATE NOCASE' : ''
  const now = databaseNow(provider)
  return `
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id ${id},
  username TEXT NOT NULL${unique},
  email TEXT NOT NULL${unique},
  password_hash TEXT NOT NULL,
  email_verified INTEGER NOT NULL DEFAULT 0,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  session_version INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (${now}),
  updated_at TEXT NOT NULL DEFAULT (${now}),
  last_login_at TEXT
);

${sqlite ? '' : `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));`}

CREATE TABLE IF NOT EXISTS user_avatars (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  data ${sqlite ? 'BLOB' : 'BYTEA'} NOT NULL,
  version TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_tokens (
  id ${id},
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL CHECK (purpose IN ('email_verify','password_reset')),
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (${now})
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_lookup ON auth_tokens(user_id, purpose);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS skin_presets (
  id ${id},
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  data TEXT NOT NULL${sqlite ? '' : " CHECK (json_typeof(data::json) = 'object')"},
  is_public INTEGER NOT NULL DEFAULT 0 CHECK (is_public IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (${now}),
  updated_at TEXT NOT NULL DEFAULT (${now})
);

CREATE INDEX IF NOT EXISTS idx_skin_presets_updated ON skin_presets(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_skin_presets_user_updated ON skin_presets(user_id, updated_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS login_captcha_challenges (
  request_hash TEXT PRIMARY KEY,
  email_hash TEXT NOT NULL,
  settings_hash TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  consumed_at BIGINT
);

CREATE INDEX IF NOT EXISTS idx_login_captcha_expires ON login_captcha_challenges(expires_at);

CREATE TABLE IF NOT EXISTS minecraft_auth_codes (
  code_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (${now})
);

CREATE TABLE IF NOT EXISTS minecraft_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (${now})
);
`
}
