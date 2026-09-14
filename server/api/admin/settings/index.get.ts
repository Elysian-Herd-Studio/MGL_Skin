export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return toSiteSettingsView(await getSiteSettings())
})
