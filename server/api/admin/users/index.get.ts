export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const query = getQuery(event)
  const page = Math.max(1, Number.parseInt(String(query.page ?? '1'), 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(query.limit ?? '20'), 10) || 20))
  const search = String(query.q ?? '').trim()

  const { items, total } = listUsers({
    limit,
    offset: (page - 1) * limit,
    query: search
  })

  return {
    items: items.map(toAdminUser),
    total,
    page,
    limit
  }
})
