export default defineEventHandler(async (event) => {
  const current = await requireAdmin(event)

  const id = Number.parseInt(String(getRouterParam(event, 'id') ?? ''), 10)

  if (!Number.isInteger(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: '用户 ID 无效',
      data: { code: 'INVALID_ID' }
    })
  }

  const target = findUserById(id)

  if (!target) {
    throw createError({
      statusCode: 404,
      statusMessage: '用户不存在',
      data: { code: 'USER_NOT_FOUND' }
    })
  }

  const body = await readBody<{ role?: string, emailVerified?: boolean }>(event)

  if (body.role !== undefined) {
    if (body.role !== 'user' && body.role !== 'admin') {
      throw createError({
        statusCode: 400,
        statusMessage: '角色无效',
        data: { code: 'INVALID_ROLE' }
      })
    }

    if (target.id === current.id) {
      throw createError({
        statusCode: 409,
        statusMessage: '不能修改自己的角色',
        data: { code: 'CANNOT_CHANGE_OWN_ROLE' }
      })
    }

    if (target.role === 'admin' && body.role === 'user' && countAdmins() <= 1) {
      throw createError({
        statusCode: 409,
        statusMessage: '不能降级最后一个管理员',
        data: { code: 'LAST_ADMIN' }
      })
    }

    setUserRole(target.id, body.role)
  }

  if (body.emailVerified !== undefined) {
    setUserEmailVerified(target.id, Boolean(body.emailVerified))
  }

  const updated = findUserById(target.id) as UserRecord

  return { user: toAdminUser(updated) }
})
