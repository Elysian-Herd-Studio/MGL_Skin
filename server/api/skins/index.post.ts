import { requireMinecraftUser } from '../../utils/minecraft'
import { lockUserForUpdate } from '../../utils/users'
import { skinPresetResponse } from '../../utils/skins'

type UploadedPreset = { id: number, name: string, is_public: number }

export default defineEventHandler(async (event) => {
  const user = await requireMinecraftUser(event)
  const body = await readBody<{ name?: string, data?: string }>(event)
  const name = String(body?.name ?? '').trim()
  const data = String(body?.data ?? '')
  if (!name || name.length > 64 || !data || data.length > 1_000_000) {
    throw createError({ statusCode: 400, statusMessage: '预设名称或数据无效', data: { code: 'INVALID_PRESET' } })
  }
  try {
    const parsed = JSON.parse(data)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid')
  } catch {
    throw createError({ statusCode: 400, statusMessage: '预设数据不是有效 JSON', data: { code: 'INVALID_PRESET' } })
  }
  const db = await useDatabase()
  return db.transaction(async transaction => {
    await lockUserForUpdate(transaction, user.id)
    const existing = await transaction.prepare('SELECT id FROM skin_presets WHERE user_id = ? AND name = ?')
      .get<{ id: number }>(user.id, name)
    if (existing) {
      const updated = await transaction.prepare(`UPDATE skin_presets SET data = ?, updated_at = ${transaction.now}
        WHERE id = ? AND user_id = ? RETURNING id, name, is_public`)
        .get<UploadedPreset>(data, existing.id, user.id)
      return skinPresetResponse(updated!)
    }
    const result = await transaction.prepare(
      'INSERT INTO skin_presets (user_id, name, data, is_public) VALUES (?, ?, ?, 0) RETURNING id, name, is_public'
    ).get<UploadedPreset>(user.id, name, data)
    return skinPresetResponse(result!)
  })
})
