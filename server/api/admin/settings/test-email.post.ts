export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  enforceRateLimit(event, 'test-email', 5, 15 * 60, String(admin.id))
  const settings = parseSiteSettings(await readBody(event), getSiteSettings())
  await sendTestEmail(admin.email, settings.mail)
  return { message: `测试邮件已发送至 ${admin.email}，请检查收件箱。` }
})
