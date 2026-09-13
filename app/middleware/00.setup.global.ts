import type { SetupStatus } from '../../shared/types/settings'

export default defineNuxtRouteMiddleware(async (to) => {
  const status = useState<SetupStatus | null>('setup-status', () => null)
  if (!status.value?.initialized || to.path === '/setup') {
    status.value = await useRequestFetch()<SetupStatus>('/api/setup/status', { retry: false })
  }

  if (!status.value.initialized && to.path !== '/setup') {
    return navigateTo('/setup', { replace: true })
  }
  if (status.value.initialized && to.path === '/setup') {
    const { user } = useUserSession()
    return navigateTo(user.value?.role === 'admin' ? '/admin' : '/', { replace: true })
  }
})
