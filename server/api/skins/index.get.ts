import type { SkinPreset } from '../../../shared/types/skin'
import { PONY_KINDS } from '../../../shared/utils/pony'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const search = typeof query.q === 'string' ? query.q.trim() : ''
  const kind = typeof query.kind === 'string' ? query.kind : ''

  if (search.length > 100 || (kind && !PONY_KINDS.some(value => value === kind))) {
    throw createError({ statusCode: 400, statusMessage: '搜索关键词或过滤条件无效' })
  }

  const conditions: string[] = []
  const values: (string | number)[] = []

  if (search) {
    conditions.push('(instr(lower(skin_presets.name), lower(?)) > 0 OR instr(lower(users.username), lower(?)) > 0)')
    values.push(search, search)
  }

  if (kind) {
    conditions.push(`CASE WHEN json_valid(skin_presets.data) THEN
      json_type(skin_presets.data) = 'object'
      AND length(skin_presets.data) <= 1000000
      AND (json_type(skin_presets.data, '$.showHorn') IS NOT 'false') = ?
      AND (json_type(skin_presets.data, '$.showWings') IS 'true') = ?
      ELSE 0 END`)
    values.push(kind === '独角兽' || kind === '天角兽' ? 1 : 0, kind === '飞马' || kind === '天角兽' ? 1 : 0)
  }

  const rows = useDatabase().prepare(`
    SELECT skin_presets.id, skin_presets.name, skin_presets.data,
      skin_presets.created_at, skin_presets.updated_at, users.username
    FROM skin_presets JOIN users ON users.id = skin_presets.user_id
    ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
    ORDER BY skin_presets.updated_at DESC, skin_presets.id DESC LIMIT 100
  `).all(...values) as unknown as SkinPreset[]
  return { items: rows }
})
