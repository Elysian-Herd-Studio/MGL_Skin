import { lockAdminChanges } from '../../../utils/users'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = Number.parseInt(String(getRouterParam(event, 'id') ?? ''), 10)

  if (!Number.isInteger(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: '用户 ID 无效',
      data: { code: 'INVALID_ID' }
    })
  }

  const db = await useDatabase()
  await db.transaction(async transaction => {
    await lockAdminChanges(transaction)
    const current = await requireAdmin(event, transaction)
    const target = await findUserById(id, transaction)

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

    if (target.role === 'admin' && await countAdmins(transaction) <= 1) {
      throw createError({
        statusCode: 409,
        statusMessage: '不能删除最后一个管理员',
        data: { code: 'LAST_ADMIN' }
      })
    }

    await deleteUser(target.id, transaction)
  })

  return { ok: true }
})
