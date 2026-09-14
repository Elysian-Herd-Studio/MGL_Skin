<script setup lang="ts">
import type { AuthView } from '~/composables/useAuthDialog'

const { view, redirect, open, close } = useAuthDialog()
const { fetch: refreshSession } = useUserSession()
const toast = useToast()

const meta: Record<AuthView, { title: string, subtitle: string }> = {
  login: { title: '登录', subtitle: '使用邮箱与密码登录' },
  register: { title: '注册', subtitle: '创建账号后需要验证邮箱' },
  forgot: { title: '忘记密码', subtitle: '我们会向你的邮箱发送重置链接' }
}

const shownView = ref<AuthView | null>(null)
const captchaActive = ref(false)

watch(view, value => {
  if (value !== 'login') captchaActive.value = false
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
  if (!value && !captchaActive.value) {
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
  toast.success('登录成功')
  await navigateTo(redirect.value)
}
</script>

<template>
  <v-dialog
    :model-value="Boolean(view)"
    max-width="440"
    :persistent="captchaActive"
    :retain-focus="!captchaActive"
    :capture-focus="!captchaActive"
    :close-on-back="false"
    @update:model-value="onModelValue"
    @after-leave="onAfterLeave"
  >
    <AuthCard
      v-if="shownView"
      :title="title"
      :subtitle="subtitle"
      class="auth-dialog__card"
      :class="{ 'auth-dialog__card--receded': captchaActive }"
      :inert="captchaActive || undefined"
      :aria-hidden="captchaActive || undefined"
    >
      <LoginForm v-if="shownView === 'login'" :active="view === 'login'" @captcha="captchaActive = $event" @success="onSuccess" @switch="switchTo" />
      <RegisterForm v-else-if="shownView === 'register'" @switch="switchTo" />
      <ForgotPasswordForm v-else @switch="switchTo" />
    </AuthCard>
  </v-dialog>
</template>

<style scoped>
.auth-dialog__card {
  transform-origin: center;
  transition: transform 240ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms ease;
}

.auth-dialog__card--receded {
  transform: scale(0.94);
  opacity: 0.8;
}

@media (prefers-reduced-motion: reduce) {
  .auth-dialog__card {
    transition: none;
  }
}
</style>
