export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn, user } = useUserSession()

  if (!loggedIn.value) {
    return navigateTo({ path: '/', query: { auth: 'login', redirect: to.fullPath } })
  }

  if (user.value?.role !== 'admin') {
    return navigateTo('/')
  }
})
