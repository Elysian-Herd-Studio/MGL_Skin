import type { H3Event } from 'h3'
import type { UserRecord } from './users'

export function toSessionUser(user: UserRecord) {
  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    email: user.email,
    role: user.role,
    sessionVersion: user.sessionVersion
  }
}

export async function requireCurrentUser(event: H3Event) {
  const { user } = await requireUserSession(event)
  const current = findUserById(user.id)

  if (!current || current.sessionVersion !== user.sessionVersion) {
    await clearUserSession(event)
    throw createError({
      statusCode: 401,
      statusMessage: '登录已失效，请重新登录',
      data: { code: 'UNAUTHORIZED' }
    })
  }

  return current
}

export async function refreshProfileSession(event: H3Event) {
  const current = await requireCurrentUser(event)
  const { id: _id, ...session } = await getUserSession(event)
  const user = toSessionUser(current)
  await replaceUserSession(event, { ...session, user })
  return user
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
  const user = await requireCurrentUser(event)

  if (user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: '需要管理员权限',
      data: { code: 'FORBIDDEN' }
    })
  }

  return user
}
