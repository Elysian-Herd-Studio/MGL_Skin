// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  devServer: {
    port: 4300
  },
  modules: ['vuetify-nuxt-module', 'nuxt-auth-utils'],
  css: ['~/assets/css/main.css'],
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    layoutTransition: { name: 'layout', mode: 'out-in' }
  },
  vite: {
    $server: {
      build: {
        rolldownOptions: {
          makeAbsoluteExternalsRelative: false
        }
      }
    }
  },
  nitro: {
    rollupConfig: {
      external: ['node:sqlite']
    }
  },
  vuetify: {
    moduleOptions: {
      enableRules: false,
      prefixComposables: ['useLayout']
    },
    vuetifyOptions: {
      theme: {
        defaultTheme: 'light'
      },
      defaults: {
        VAppBar: {
          color: 'grey-lighten-3',
          flat: true
        },
        VBtn: {
          rounded: 'xl'
        },
        VCard: {
          rounded: 'xl',
          elevation: 0
        }
      },
      icons: {
        defaultSet: 'mdi'
      },
      locale: {
        locale: 'zhHans',
        fallback: 'en'
      },
      localeMessages: 'zhHans'
    }
  },
  runtimeConfig: {
    resendApiKey: '',
    mailFrom: '',
    adminEmails: '',
    databasePath: './.data/mgl.sqlite',
    session: {
      password: '',
      name: 'mgl-session',
      maxAge: 60 * 60 * 24 * 7,
      cookie: {
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    public: {
      siteUrl: 'http://localhost:4300'
    }
  }
})
