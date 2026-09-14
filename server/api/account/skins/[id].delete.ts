import { lockUserForUpdate } from '../../../utils/users'

export default defineEventHandler(async (event) => {
  const user = await requireCurrentUser(event)
  const value = getRouterParam(event, 'id') ?? ''
  const id = Number(value)

  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)) {
    throw createError({ statusCode: 400, statusMessage: '无效的预设编号' })
  }

  const db = await useDatabase()
  await db.transaction(async transaction => {
    await lockUserForUpdate(transaction, user.id)
    const result = await transaction.prepare('DELETE FROM skin_presets WHERE id = ? AND user_id = ?').run(id, user.id)
    if (!result.changes) {
      throw createError({ statusCode: 404, statusMessage: '皮肤不存在或无权管理', data: { code: 'PRESET_NOT_FOUND' } })
    }
  })

  return { ok: true }
})
