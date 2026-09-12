import type { H3Event } from 'h3'
import type { UserRecord } from './users'

export function toSessionUser(user: UserRecord) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    sessionVersion: user.sessionVersion
  }
}

export function isAdminEmail(email: string) {
  const list = useRuntimeConfig().adminEmails
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean)

  return list.includes(email.trim().toLowerCase())
}

export function syncAdminRole(user: UserRecord) {
  if (user.role !== 'admin' && isAdminEmail(user.email)) {
    setUserRole(user.id, 'admin')
    return { ...user, role: 'admin' as const }
  }

  return user
}

export async function requireAdmin(event: H3Event) {
  const { user } = await requireUserSession(event)

  if (user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: '需要管理员权限',
      data: { code: 'FORBIDDEN' }
    })
  }

  return user
}
