import type { AdminOverview } from '../../../shared/types/settings'

export default defineEventHandler(async (event): Promise<AdminOverview> => {
  await requireAdmin(event)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const counts = useDatabase().prepare(`SELECT
    (SELECT COUNT(*) FROM users) AS users,
    (SELECT COUNT(*) FROM users WHERE role = 'admin') AS admins,
    (SELECT COUNT(*) FROM users WHERE email_verified = 0) AS unverifiedUsers,
    (SELECT COUNT(*) FROM skin_presets) AS presets`).get() as Pick<AdminOverview, 'users' | 'admins' | 'unverifiedUsers' | 'presets'>
  const settings = getSiteSettings()
  return {
    ...counts,
    siteUrl: settings.siteUrl,
    mail: {
      transport: settings.mail.transport,
      preset: settings.mail.preset,
      from: settings.mail.from,
      configured: Boolean(settings.mail.from && (settings.mail.transport === 'api' ? settings.mail.apiKey : settings.mail.smtpHost))
    }
  }
})
