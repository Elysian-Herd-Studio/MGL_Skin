export type AuthView = 'login' | 'register' | 'forgot'

const authViews: AuthView[] = ['login', 'register', 'forgot']

export function useAuthDialog() {
  const route = useRoute()

  const view = computed<AuthView | null>(() => {
    const value = route.query.auth
    return typeof value === 'string' && (authViews as string[]).includes(value)
      ? value as AuthView
      : null
  })

  const redirect = computed(() => safeRedirect(route.query.redirect))

  function open(next: AuthView, options: { redirect?: string, replace?: boolean } = {}) {
    return navigateTo({
      path: route.path,
      query: {
        ...route.query,
        auth: next,
        ...(options.redirect ? { redirect: options.redirect } : {})
      }
    }, { replace: options.replace })
  }

  function close() {
    const query = { ...route.query }
    delete query.auth
    delete query.redirect
    return navigateTo({ path: route.path, query }, { replace: true })
  }

  return { view, redirect, open, close }
}
