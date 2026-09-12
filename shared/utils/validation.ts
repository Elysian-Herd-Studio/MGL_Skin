export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isValidUsername(username: string) {
  return /^[A-Za-z0-9_-]{3,20}$/.test(username)
}

export function isValidPassword(password: string) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 128
}

export function safeRedirect(value: unknown, fallback = '/') {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : fallback
}
