<script setup lang="ts">
const route = useRoute()
const { loggedIn } = useUserSession()
const { open } = useAuthDialog()
const status = ref('正在准备登录...')
const finishing = ref(false)

const callback = computed(() => typeof route.query.callback === 'string' ? route.query.callback : '')
const state = computed(() => typeof route.query.state === 'string' ? route.query.state : '')

onMounted(() => {
  if (!isAllowedCallback(callback.value) || !state.value) {
    status.value = '登录链接无效，请返回游戏重试。'
    return
  }
  if (!loggedIn.value) {
    status.value = '请登录 MGL Skin，完成后会自动返回游戏。'
    open('login', { redirect: route.fullPath, replace: true })
  } else {
    finishLogin()
  }
})

function isAllowedCallback(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' && (url.hostname === '127.0.0.1' || url.hostname === 'localhost')
      && url.pathname === '/callback'
  } catch {
    return false
  }
}

watch(loggedIn, value => {
  if (value) finishLogin()
})

async function finishLogin() {
  if (finishing.value || !isAllowedCallback(callback.value) || !state.value) return
  finishing.value = true
  status.value = '正在返回游戏...'
  try {
    const result = await $fetch<{ code: string }>('/api/auth/minecraft/authorize', { method: 'POST' })
    const target = new URL(callback.value)
    target.searchParams.set('code', result.code)
    target.searchParams.set('state', state.value)
    window.location.href = target.toString()
  } catch {
    finishing.value = false
    status.value = '授权失败，请返回游戏重试。'
  }
}
</script>

<template>
  <v-container class="py-12">
    <v-card max-width="520" class="mx-auto">
      <v-card-title>返回 Magical Land</v-card-title>
      <v-card-text>{{ status }}</v-card-text>
    </v-card>
  </v-container>
</template>
