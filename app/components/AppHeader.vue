<script setup lang="ts">
import { useDisplay } from 'vuetify'
import { THEME_MODES, type ThemeMode } from '../composables/useThemeMode'

const { loggedIn, user, clear } = useUserSession()
const { smAndDown } = useDisplay()
const toast = useToast()
const loggingOut = ref(false)
const mobileMenuOpen = ref(false)
const menuButton = ref<{ $el: HTMLButtonElement } | null>(null)
const mobileNavigation = ref<HTMLElement | null>(null)
const route = useRoute()
const activeItems = computed(() => ({
  home: route.path === '/',
  admin: route.path === '/admin' || route.path.startsWith('/admin/'),
  account: route.path === '/account',
  skins: route.path === '/my-skins',
  login: route.query.auth === 'login',
  register: route.query.auth === 'register'
}))
const mainNavigation = computed(() => [
  { to: '/', title: '首页', active: activeItems.value.home, icon: activeItems.value.home ? 'mdi-home' : 'mdi-home-outline' },
  ...(loggedIn.value && user.value?.role === 'admin'
    ? [{ to: '/admin', title: '控制台', active: activeItems.value.admin, icon: activeItems.value.admin ? 'mdi-view-dashboard' : 'mdi-view-dashboard-outline' }]
    : [])
])
const accountNavigation = computed(() => [
  { to: '/account', title: '个人资料', active: activeItems.value.account, icon: activeItems.value.account ? 'mdi-account-details' : 'mdi-account-details-outline' },
  { to: '/my-skins', title: '我的皮肤', active: activeItems.value.skins, icon: activeItems.value.skins ? 'mdi-image-multiple' : 'mdi-image-multiple-outline' }
])
const authNavigation = computed(() => [
  { to: '/?auth=login', title: '登录', active: activeItems.value.login, icon: activeItems.value.login ? 'mdi-account-arrow-right' : 'mdi-account-arrow-right-outline' },
  { to: '/?auth=register', title: '注册', active: activeItems.value.register, icon: activeItems.value.register ? 'mdi-account-plus' : 'mdi-account-plus-outline' }
])
const mobileItems = computed(() => [...mainNavigation.value, ...(loggedIn.value ? accountNavigation.value : authNavigation.value)])
const themeMode = useThemeMode()
const themeOptions: Record<ThemeMode, { label: string, icon: string }> = {
  light: { label: '浅色', icon: 'mdi-weather-sunny' },
  dark: { label: '深色', icon: 'mdi-weather-night' },
  system: { label: '跟随系统', icon: 'mdi-theme-light-dark' }
}
const nextThemeMode = computed(() => THEME_MODES[(THEME_MODES.indexOf(themeMode.value) + 1) % THEME_MODES.length] ?? 'system')
const themeButtonLabel = computed(() => `当前主题：${themeOptions[themeMode.value].label}，点击切换为${themeOptions[nextThemeMode.value].label}`)

useHead(() => ({
  htmlAttrs: { class: mobileMenuOpen.value ? 'mobile-navigation-open' : '' }
}))

watch([() => route.fullPath, loggedIn, smAndDown], () => {
  mobileMenuOpen.value = false
})

watch(mobileMenuOpen, async (open) => {
  if (open) {
    await nextTick()
    if (mobileMenuOpen.value) mobileNavigation.value?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
  } else if (smAndDown.value && mobileNavigation.value?.contains(document.activeElement)) {
    menuButton.value?.$el.focus({ preventScroll: true })
  }
})

async function logout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await clear()
    mobileMenuOpen.value = false
    toast.success('已退出登录')
    await navigateTo('/')
  } catch (cause) {
    toast.error(apiErrorMessage(cause, '退出登录失败，请重试'))
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <v-navigation-drawer
    v-if="smAndDown"
    id="mobile-navigation"
    v-model="mobileMenuOpen"
    temporary
    retain-focus
    capture-focus
    touchless
    width="288"
    class="app-navigation d-md-none"
    aria-label="站点导航"
    @keydown.esc.stop.prevent="mobileMenuOpen = false"
  >
    <div ref="mobileNavigation">
      <div class="d-flex align-center justify-space-between pa-4">
        <span class="text-h6 font-weight-bold">MGL Skin</span>
        <v-btn icon="mdi-close" variant="text" aria-label="关闭导航" @click="mobileMenuOpen = false" />
      </div>
      <div v-if="loggedIn" class="app-navigation__user d-flex align-center ga-3 px-4 pb-4">
        <UserAvatar :src="user?.avatarUrl" :name="user?.username" :size="40" class="flex-shrink-0" />
        <span class="text-body-1 font-weight-medium">{{ user?.username }}</span>
      </div>
      <v-divider />
      <v-list nav color="primary" class="pa-3">
        <v-list-item
          v-for="item in mobileItems"
          :key="item.to"
          :to="item.to"
          :title="item.title"
          :active="item.active"
          :prepend-icon="item.icon"
          rounded="xl"
          @click="mobileMenuOpen = false"
        />
        <template v-if="loggedIn">
          <v-divider class="my-3" />
          <v-list-item
            prepend-icon="mdi-account-arrow-left-outline"
            title="退出登录"
            rounded="xl"
            :disabled="loggingOut"
            @click="logout"
          />
        </template>
      </v-list>
    </div>
  </v-navigation-drawer>

  <v-app-bar density="comfortable" class="app-header">
    <v-btn
      ref="menuButton"
      icon="mdi-menu"
      variant="text"
      class="d-md-none mr-2"
      :aria-label="mobileMenuOpen ? '关闭导航' : '打开导航'"
      :aria-expanded="mobileMenuOpen"
      aria-controls="mobile-navigation"
      @click="mobileMenuOpen = !mobileMenuOpen"
      @keydown.esc.stop.prevent="mobileMenuOpen = false"
    />
    <div class="app-header__brand">
      <v-app-bar-title class="ms-0">
        <NuxtLink to="/" class="text-decoration-none">MGL Skin</NuxtLink>
      </v-app-bar-title>
      <v-btn
        type="button"
        variant="text"
        size="small"
        :icon="themeOptions[themeMode].icon"
        :aria-label="themeButtonLabel"
        :title="themeButtonLabel"
        @click="themeMode = nextThemeMode"
      />
    </div>

    <v-spacer />

    <nav class="app-header__actions d-none d-md-flex" aria-label="站点导航">
      <template v-if="loggedIn">
        <v-btn
          v-for="item in mainNavigation"
          :key="item.to"
          :to="item.to"
          variant="text"
          :active="item.active"
          :prepend-icon="item.icon"
        >{{ item.title }}</v-btn>
        <v-menu>
          <template #activator="{ props }">
            <v-btn v-bind="props" variant="text">
              <template #prepend>
                <UserAvatar :src="user?.avatarUrl" :name="user?.username" :size="28" />
              </template>
              {{ user?.username }}
            </v-btn>
          </template>
          <v-list>
            <v-list-item
              v-for="item in accountNavigation"
              :key="item.to"
              :to="item.to"
              :title="item.title"
              :active="item.active"
              :prepend-icon="item.icon"
            />
            <v-list-item prepend-icon="mdi-account-arrow-left-outline" title="退出登录" :disabled="loggingOut" @click="logout" />
          </v-list>
        </v-menu>
      </template>

      <template v-else>
        <v-btn
          v-for="item in authNavigation"
          :key="item.to"
          :to="item.to"
          variant="text"
          :active="item.active"
          :prepend-icon="item.icon"
        >{{ item.title }}</v-btn>
      </template>
    </nav>
  </v-app-bar>
</template>

<style scoped>
.app-header :deep(.v-toolbar__content) {
  padding-inline: var(--site-gutter);
}

.app-header__actions {
  align-items: center;
  gap: 8px;
}

.app-header__brand {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 8px;
}

.app-navigation {
  max-width: calc(100vw - 32px);
}

.app-navigation__user {
  overflow-wrap: anywhere;
}

.app-navigation + .v-navigation-drawer__scrim {
  position: fixed;
}
</style>
