import { requireMinecraftUser } from '../../utils/minecraft'

export default defineEventHandler(async (event) => {
  const user = requireMinecraftUser(event)
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
  const db = useDatabase()
  const existing = db.prepare('SELECT id FROM skin_presets WHERE user_id = ? AND name = ?')
    .get(user.id, name) as { id: number } | undefined
  if (existing) {
    db.prepare("UPDATE skin_presets SET data = ?, updated_at = datetime('now') WHERE id = ?")
      .run(data, existing.id)
    return { id: existing.id, name }
  }
  const result = db.prepare(
    'INSERT INTO skin_presets (user_id, name, data) VALUES (?, ?, ?)'
  ).run(user.id, name, data)
  return { id: Number(result.lastInsertRowid), name }
})
