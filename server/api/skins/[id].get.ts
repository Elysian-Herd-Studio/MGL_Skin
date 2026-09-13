import type { SkinPresetDetail } from '../../../shared/types/skin'

export default defineEventHandler((event) => {
  const value = getRouterParam(event, 'id') ?? ''
  const id = Number(value)
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)) {
    throw createError({ statusCode: 400, statusMessage: '无效的预设编号' })
  }

  const preset = useDatabase().prepare(`
    SELECT skin_presets.id, skin_presets.name, skin_presets.data, skin_presets.user_id AS userId,
      skin_presets.created_at, skin_presets.updated_at, users.username,
      CASE WHEN user_avatars.version IS NOT NULL
        THEN '/api/users/' || users.id || '/avatar?v=' || user_avatars.version
        ELSE NULL
      END AS avatarUrl
    FROM skin_presets JOIN users ON users.id = skin_presets.user_id
    LEFT JOIN user_avatars ON user_avatars.user_id = users.id
    WHERE skin_presets.id = ?
  `).get(id) as unknown as SkinPresetDetail | undefined

  if (!preset) {
    throw createError({ statusCode: 404, statusMessage: '预设不存在或已被删除' })
  }
  return preset
})
