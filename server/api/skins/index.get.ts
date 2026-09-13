export default defineEventHandler(() => {
  const rows = useDatabase().prepare(`
    SELECT skin_presets.id, skin_presets.name, skin_presets.data, users.username
    FROM skin_presets JOIN users ON users.id = skin_presets.user_id
    ORDER BY skin_presets.updated_at DESC, skin_presets.id DESC LIMIT 100
  `).all() as Array<{ id: number, name: string, data: string, username: string }>
  return { items: rows }
})
