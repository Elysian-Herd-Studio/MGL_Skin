import { lockUserForUpdate } from '../../../utils/users'

export default defineEventHandler(async (event) => {
  const user = await requireCurrentUser(event)
  const value = getRouterParam(event, 'id') ?? ''
  const id = Number(value)

  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)) {
    throw createError({ statusCode: 400, statusMessage: '无效的预设编号' })
  }

  const body = await readBody<{ name?: unknown }>(event)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''

  if (!name || name.length > 64) {
    throw createError({ statusCode: 400, statusMessage: '皮肤名称需为 1-64 个字符', data: { code: 'INVALID_PRESET_NAME' } })
  }

  const db = await useDatabase()
  return db.transaction(async transaction => {
    await lockUserForUpdate(transaction, user.id)
    const updated = await transaction.prepare(`
      UPDATE skin_presets SET name = ?, updated_at = ${transaction.now}
      WHERE id = ? AND user_id = ? AND NOT EXISTS (
        SELECT 1 FROM skin_presets WHERE user_id = ? AND name = ? AND id <> ?
      )
      RETURNING id, name, updated_at
    `).get(name, id, user.id, user.id, name, id)

    if (updated) return updated

    const owned = await transaction.prepare('SELECT id FROM skin_presets WHERE id = ? AND user_id = ?').get(id, user.id)
    if (!owned) {
      throw createError({ statusCode: 404, statusMessage: '皮肤不存在或无权管理', data: { code: 'PRESET_NOT_FOUND' } })
    }

    throw createError({ statusCode: 409, statusMessage: '你已上传同名皮肤，请使用其他名称', data: { code: 'PRESET_NAME_TAKEN' } })
  })
})
