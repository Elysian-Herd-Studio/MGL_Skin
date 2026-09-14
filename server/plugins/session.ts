import { configuredDatabase } from '../utils/database-config'

export default defineNitroPlugin(async () => {
  process.env.NUXT_SESSION_PASSWORD = await getSiteSessionPassword()

  sessionHooks.hook('fetch', async (session, event) => {
    const user = session.user

    if (!user?.id) {
      return
    }

    const current = configuredDatabase() ? await findUserById(user.id) : undefined

    if (!current || current.sessionVersion !== user.sessionVersion) {
      await clearUserSession(event)
      delete session.user
      return
    }

    session.user = toSessionUser(current)
  })
})
