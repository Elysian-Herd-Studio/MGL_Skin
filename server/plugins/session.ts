export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()
  const passwordEnv = `${config.nitro?.envPrefix || 'NUXT_'}SESSION_PASSWORD`
  process.env[passwordEnv] ||= config.session.password || getSiteSessionPassword()

  sessionHooks.hook('fetch', async (session, event) => {
    const user = session.user

    if (!user?.id) {
      return
    }

    const current = findUserById(user.id)

    if (!current || current.sessionVersion !== user.sessionVersion) {
      await clearUserSession(event)
      delete session.user
      return
    }

    session.user = toSessionUser(current)
  })
})
