export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname.replace(/\/+$/, '').toLowerCase()
  if (!path.startsWith('/api/') || await isSiteInitialized()) return
  if (['/api/setup', '/api/setup/status', '/api/_auth/session'].includes(path)) return

  throw createError({
    statusCode: 503,
    statusMessage: '请先完成站点初始化',
    data: { code: 'SETUP_REQUIRED' }
  })
})
