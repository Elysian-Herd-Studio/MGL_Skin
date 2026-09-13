import { THEME_MODES, useThemeMode, type ThemeMode } from '../composables/useThemeMode'

export default defineNuxtPlugin({
  name: 'site-theme',
  enforce: 'pre',
  setup(nuxtApp) {
    const cookieOptions = {
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax' as const,
      path: useRuntimeConfig().app.baseURL
    }
    const preferenceCookie = useCookie<ThemeMode | null>('mgl-theme-mode', cookieOptions)
    const resolvedCookie = useCookie<'light' | 'dark' | null>('mgl-theme-resolved', cookieOptions)
    const mode = useThemeMode(THEME_MODES.find(value => value === preferenceCookie.value) ?? 'system')
    const initialTheme = useState<'light' | 'dark'>('site-theme-initial', () => mode.value === 'system'
      ? resolvedCookie.value === 'dark' ? 'dark' : 'light'
      : mode.value)

    nuxtApp.hook('vuetify:before-create', ({ vuetifyOptions }) => {
      if (vuetifyOptions.theme === false) return
      vuetifyOptions.theme ??= {}
      vuetifyOptions.theme.defaultTheme = initialTheme.value
    })

    if (import.meta.client) {
      nuxtApp.hook('vuetify:ready', (vuetify) => {
        const stopModeWatch = watch(mode, value => {
          preferenceCookie.value = value
          void vuetify.theme.change(value, false)
        }, { flush: 'sync' })
        const stopResolvedWatch = watch(vuetify.theme.name, value => {
          if (value === 'light' || value === 'dark') resolvedCookie.value = value
        }, { flush: 'sync' })

        nuxtApp.hook('app:mounted', () => {
          void vuetify.theme.change(mode.value, false)
          resolvedCookie.value = vuetify.theme.name.value === 'dark' ? 'dark' : 'light'
        })
        nuxtApp.vueApp.onUnmount(() => {
          stopModeWatch()
          stopResolvedWatch()
        })
      })
    }
  }
})
