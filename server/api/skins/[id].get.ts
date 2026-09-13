import type { SkinPreset } from '../../../shared/types/skin'

export default defineEventHandler((event) => {
  const value = getRouterParam(event, 'id') ?? ''
  const id = Number(value)
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)) {
    throw createError({ statusCode: 400, statusMessage: '无效的预设编号' })
  }

  const preset = useDatabase().prepare(`
    SELECT skin_presets.id, skin_presets.name, skin_presets.data,
      skin_presets.created_at, skin_presets.updated_at, users.username
    FROM skin_presets JOIN users ON users.id = skin_presets.user_id
    WHERE skin_presets.id = ?
  `).get(id) as unknown as SkinPreset | undefined

  if (!preset) {
    throw createError({ statusCode: 404, statusMessage: '预设不存在或已被删除' })
  }
  return preset
})
