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

  const body = await readBody<{ role?: string, emailVerified?: boolean }>(event)
  const db = await useDatabase()
  return db.transaction(async transaction => {
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

      if (target.role === 'admin' && body.role === 'user' && await countAdmins(transaction) <= 1) {
        throw createError({
          statusCode: 409,
          statusMessage: '不能降级最后一个管理员',
          data: { code: 'LAST_ADMIN' }
        })
      }

      await setUserRole(target.id, body.role, transaction)
    }

    if (body.emailVerified !== undefined) {
      await setUserEmailVerified(target.id, Boolean(body.emailVerified), transaction)
    }

    const updated = (await findUserById(target.id, transaction))!
    return { user: toAdminUser(updated) }
  })
})
