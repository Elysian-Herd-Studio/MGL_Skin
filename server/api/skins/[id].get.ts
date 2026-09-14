import type { SkinPresetDetail } from '../../../shared/types/skin'
import { currentSkinUser, skinPresetResponse, type SkinPresetRow } from '../../utils/skins'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const value = getRouterParam(event, 'id') ?? ''
  const id = Number(value)
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)) {
    throw createError({ statusCode: 400, statusMessage: '无效的预设编号' })
  }

  const db = await useDatabase()
  const user = await currentSkinUser(event)
  const preset = await db.prepare(`
    SELECT skin_presets.id, skin_presets.name, skin_presets.data, skin_presets.is_public, skin_presets.user_id AS "userId",
      skin_presets.created_at, skin_presets.updated_at, users.username,
      CASE WHEN user_avatars.version IS NOT NULL
        THEN '/api/users/' || users.id || '/avatar?v=' || user_avatars.version
        ELSE NULL
      END AS "avatarUrl"
    FROM skin_presets JOIN users ON users.id = skin_presets.user_id
    LEFT JOIN user_avatars ON user_avatars.user_id = users.id
    WHERE skin_presets.id = ? AND (skin_presets.is_public = 1 OR skin_presets.user_id = ?)
  `).get<SkinPresetRow<SkinPresetDetail>>(id, user?.id ?? null)

  if (!preset) {
    throw createError({ statusCode: 404, statusMessage: '预设不存在或无权查看' })
  }
  return skinPresetResponse(preset)
})
