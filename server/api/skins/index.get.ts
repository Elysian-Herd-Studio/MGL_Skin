import { PONY_KINDS } from '../../../shared/utils/pony'
import { skinPresetResponse, type SkinPresetRow } from '../../utils/skins'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const query = getQuery(event)
  const search = typeof query.q === 'string' ? query.q.trim() : ''
  const kind = typeof query.kind === 'string' ? query.kind : ''

  if (search.length > 100 || (kind && !PONY_KINDS.some(value => value === kind))) {
    throw createError({ statusCode: 400, statusMessage: '搜索关键词或过滤条件无效' })
  }

  const conditions: string[] = ['skin_presets.is_public = 1']
  const values: (string | number)[] = []
  const db = await useDatabase()

  if (search) {
    const contains = db.provider === 'sqlite' ? 'instr' : 'strpos'
    conditions.push(`(${contains}(lower(skin_presets.name), lower(?)) > 0 OR ${contains}(lower(users.username), lower(?)) > 0)`)
    values.push(search, search)
  }

  if (kind) {
    conditions.push(db.provider === 'sqlite' ? `CASE WHEN json_valid(skin_presets.data) THEN
      json_type(skin_presets.data) = 'object'
      AND length(skin_presets.data) <= 1000000
      AND (json_type(skin_presets.data, '$.showHorn') IS NOT 'false') = ?
      AND (json_type(skin_presets.data, '$.showWings') IS 'true') = ?
      ELSE 0 END` : `length(skin_presets.data) <= 1000000
      AND CAST((skin_presets.data::json -> 'showHorn')::text IS DISTINCT FROM 'false' AS INTEGER) = ?
      AND CAST((skin_presets.data::json -> 'showWings')::text IS NOT DISTINCT FROM 'true' AS INTEGER) = ?`)
    values.push(kind === '独角兽' || kind === '天角兽' ? 1 : 0, kind === '飞马' || kind === '天角兽' ? 1 : 0)
  }

  const rows = await db.prepare(`
    SELECT skin_presets.id, skin_presets.name, skin_presets.data, skin_presets.is_public,
      skin_presets.created_at, skin_presets.updated_at, users.username
    FROM skin_presets JOIN users ON users.id = skin_presets.user_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY skin_presets.updated_at DESC, skin_presets.id DESC LIMIT 100
  `).all<SkinPresetRow>(...values)
  return { items: rows.map(skinPresetResponse) }
})
