// https://nuxt.com/docs/api/configuration/nuxt-config
import { randomBytes } from 'node:crypto'

// 占位值仅为阻止 nuxt-auth-utils 在开发模式下自动生成 .env；运行时会由服务端插件替换为数据库中的会话密钥
process.env.NUXT_SESSION_PASSWORD ||= randomBytes(32).toString('hex')

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
        defaultTheme: 'system',
        themes: {
          light: {
            colors: {
              'app-header': '#EEEEEE',
              'surface-container': '#F5F5F5',
              'preview-center': '#FFFFFF',
              'preview-edge': '#F1F0F7'
            }
          },
          dark: {
            colors: {
              'app-header': '#1E1E24',
              'surface-container': '#25252D',
              'preview-center': '#30303C',
              'preview-edge': '#1B1B24'
            }
          }
        }
      },
      defaults: {
        VAlert: {
          rounded: 'xl'
        },
        VAppBar: {
          color: 'app-header',
          flat: true
        },
        VBtn: {
          rounded: 'xl'
        },
        VCard: {
          rounded: 'xl',
          elevation: 0
        },
        VField: {
          rounded: 'xl'
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
    session: {
      name: 'mgl-session',
      maxAge: 60 * 60 * 24 * 7,
      cookie: {
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  }
})
