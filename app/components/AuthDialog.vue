<script setup lang="ts">
import type { AuthView } from '~/composables/useAuthDialog'

const { view, redirect, open, close } = useAuthDialog()
const { fetch: refreshSession } = useUserSession()

const meta: Record<AuthView, { title: string, subtitle: string }> = {
  login: { title: '登录', subtitle: '使用邮箱与密码登录' },
  register: { title: '注册', subtitle: '创建账号后需要验证邮箱' },
  forgot: { title: '忘记密码', subtitle: '我们会向你的邮箱发送重置链接' }
}

const shownView = ref<AuthView | null>(null)

watch(view, value => {
  if (value) {
    shownView.value = value
  }
}, { immediate: true })

const title = computed(() => (shownView.value ? meta[shownView.value].title : ''))
const subtitle = computed(() => (shownView.value ? meta[shownView.value].subtitle : ''))

function switchTo(next: AuthView) {
  return open(next, { replace: true })
}

function onModelValue(value: boolean) {
  if (!value) {
    close()
  }
}

function onAfterLeave() {
  if (!view.value) {
    shownView.value = null
  }
}

async function onSuccess() {
  await refreshSession()
  await navigateTo(redirect.value)
}
</script>

<template>
  <v-dialog
    :model-value="Boolean(view)"
    max-width="440"
    :close-on-back="false"
    @update:model-value="onModelValue"
    @after-leave="onAfterLeave"
  >
    <AuthCard v-if="shownView" :title="title" :subtitle="subtitle">
      <LoginForm v-if="shownView === 'login'" @success="onSuccess" @switch="switchTo" />
      <RegisterForm v-else-if="shownView === 'register'" @switch="switchTo" />
      <ForgotPasswordForm v-else @switch="switchTo" />
    </AuthCard>
  </v-dialog>
</template>
