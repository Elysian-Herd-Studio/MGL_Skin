export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const settings = parseSiteSettings(await readBody(event), await getSiteSettings())
  await saveSiteSettings(settings)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return toSiteSettingsView(settings)
})
