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

  if (target.id === current.id) {
    throw createError({
      statusCode: 409,
      statusMessage: '不能删除自己的账号',
      data: { code: 'CANNOT_DELETE_SELF' }
    })
  }

  if (target.role === 'admin' && countAdmins() <= 1) {
    throw createError({
      statusCode: 409,
      statusMessage: '不能删除最后一个管理员',
      data: { code: 'LAST_ADMIN' }
    })
  }

  deleteUser(target.id)

  return { ok: true }
})
