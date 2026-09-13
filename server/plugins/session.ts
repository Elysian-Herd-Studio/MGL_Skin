export default defineNitroPlugin(() => {
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
