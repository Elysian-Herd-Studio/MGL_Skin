export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()

  if (!loggedIn.value) {
    return navigateTo({ path: '/', query: { auth: 'login', redirect: to.fullPath } })
  }
})
