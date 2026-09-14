import { lockUserForUpdate } from '../../../utils/users'
import { requireSkinUser, skinPresetResponse } from '../../../utils/skins'

type OwnedPreset = { id: number, name: string, is_public: number, updated_at: string }

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const user = await requireSkinUser(event)
  const value = getRouterParam(event, 'id') ?? ''
  const id = Number(value)

  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)) {
    throw createError({ statusCode: 400, statusMessage: '无效的预设编号' })
  }

  const body = await readBody<{ name?: unknown, isPublic?: unknown }>(event)
  const name = typeof body?.name === 'string' ? body.name.trim() : undefined
  const isPublic = body?.isPublic

  if (body?.name !== undefined && (!name || name.length > 64)) {
    throw createError({ statusCode: 400, statusMessage: '皮肤名称需为 1-64 个字符', data: { code: 'INVALID_PRESET_NAME' } })
  }
  if ((isPublic !== undefined && typeof isPublic !== 'boolean') || (name === undefined && isPublic === undefined)) {
    throw createError({ statusCode: 400, statusMessage: '请提供有效的名称或公开展示设置', data: { code: 'INVALID_PRESET' } })
  }

  const db = await useDatabase()
  return db.transaction(async transaction => {
    await lockUserForUpdate(transaction, user.id)
    const owned = await transaction.prepare('SELECT id, name, is_public, updated_at FROM skin_presets WHERE id = ? AND user_id = ?')
      .get<OwnedPreset>(id, user.id)
    if (!owned) {
      throw createError({ statusCode: 404, statusMessage: '皮肤不存在或无权管理', data: { code: 'PRESET_NOT_FOUND' } })
    }

    if (name !== undefined && name !== owned.name) {
      const duplicate = await transaction.prepare('SELECT id FROM skin_presets WHERE user_id = ? AND name = ? AND id <> ?')
        .get(user.id, name, id)
      if (duplicate) {
        throw createError({ statusCode: 409, statusMessage: '你已上传同名皮肤，请使用其他名称', data: { code: 'PRESET_NAME_TAKEN' } })
      }
    }
    const updated = await transaction.prepare(`
      UPDATE skin_presets SET name = ?, is_public = ?, updated_at = ${transaction.now}
      WHERE id = ? AND user_id = ? RETURNING id, name, is_public, updated_at
    `).get<OwnedPreset>(name ?? owned.name, isPublic === undefined ? owned.is_public : isPublic ? 1 : 0, id, user.id)
    return skinPresetResponse(updated!)
  })
})
