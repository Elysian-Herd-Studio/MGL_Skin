import type { SkinPreset, SkinPresetPage } from '../../../../shared/types/skin'

export default defineEventHandler(async (event): Promise<SkinPresetPage> => {
  const user = await requireCurrentUser(event)
  const query = getQuery(event)
  const pageValue = query.page ?? '1'
  const requestedPage = Number(pageValue)
  const search = typeof query.q === 'string' ? query.q.trim() : ''

  if (typeof pageValue !== 'string' || !/^[1-9]\d*$/.test(pageValue) || !Number.isSafeInteger(requestedPage)
    || (query.q !== undefined && typeof query.q !== 'string') || search.length > 100) {
    throw createError({ statusCode: 400, statusMessage: '搜索关键词或页码无效' })
  }

  const limit = 12
  const db = await useDatabase()
  const values: (string | number)[] = [user.id]
  let where = 'WHERE skin_presets.user_id = ?'

  if (search) {
    const contains = db.provider === 'sqlite' ? 'instr' : 'strpos'
    where += ` AND ${contains}(lower(skin_presets.name), lower(?)) > 0`
    values.push(search)
  }

  const { total } = await db.prepare(`SELECT CAST(COUNT(*) AS INTEGER) AS total FROM skin_presets ${where}`)
    .get(...values) as { total: number }
  const page = Math.min(requestedPage, Math.max(1, Math.ceil(total / limit)))
  const items = await db.prepare(`
    SELECT skin_presets.id, skin_presets.name, skin_presets.data,
      skin_presets.created_at, skin_presets.updated_at, users.username
    FROM skin_presets JOIN users ON users.id = skin_presets.user_id
    ${where}
    ORDER BY skin_presets.updated_at DESC, skin_presets.id DESC LIMIT ? OFFSET ?
  `).all(...values, limit, (page - 1) * limit) as unknown as SkinPreset[]

  setHeader(event, 'Cache-Control', 'private, no-store')
  return { items, total, page, limit }
})
