import type { AdminOverview } from '../../../shared/types/settings'

export default defineEventHandler(async (event): Promise<AdminOverview> => {
  await requireAdmin(event)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const db = await useDatabase()
  const counts = await db.prepare(`SELECT
    (SELECT CAST(COUNT(*) AS INTEGER) FROM users) AS users,
    (SELECT CAST(COUNT(*) AS INTEGER) FROM users WHERE role = 'admin') AS admins,
    (SELECT CAST(COUNT(*) AS INTEGER) FROM users WHERE email_verified = 0) AS "unverifiedUsers",
    (SELECT CAST(COUNT(*) AS INTEGER) FROM skin_presets) AS presets`).get() as Pick<AdminOverview, 'users' | 'admins' | 'unverifiedUsers' | 'presets'>
  const settings = await getSiteSettings()
  return {
    ...counts,
    database: db.provider,
    siteUrl: settings.siteUrl,
    mail: {
      transport: settings.mail.transport,
      preset: settings.mail.preset,
      from: settings.mail.from,
      configured: Boolean(settings.mail.from && (settings.mail.transport === 'api' ? settings.mail.apiKey : settings.mail.smtpHost))
    }
  }
})
