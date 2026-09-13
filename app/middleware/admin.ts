export default defineNuxtRouteMiddleware(async (to) => {
  const { loggedIn, user, fetch: refreshSession } = useUserSession()
  await refreshSession()

  if (!loggedIn.value) {
    return navigateTo({ path: '/', query: { auth: 'login', redirect: to.fullPath } })
  }

  if (user.value?.role !== 'admin') {
    return navigateTo('/')
  }
})
