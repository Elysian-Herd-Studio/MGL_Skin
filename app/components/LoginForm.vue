<script setup lang="ts">
import type { AuthView } from '~/composables/useAuthDialog'
import { isValidEmail } from '../../shared/utils/validation'

const props = withDefaults(defineProps<{ active?: boolean }>(), { active: true })
const toast = useToast()

const emit = defineEmits<{
  success: []
  switch: [view: AuthView]
  captcha: [active: boolean]
}>()

const form = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const email = ref('')
const password = ref('')
const resending = ref(false)
const needsVerification = ref(false)
let resendRequest: AbortController | undefined

const {
  container, step, loading: authenticating, challenge, captchaError,
  authenticate, prepareCaptcha, completeCaptcha, onCaptchaError, cancelChallenge
} = useAuthCaptcha('login', {
  active: () => props.active,
  onSuccess: () => {
    password.value = ''
    emit('success')
  },
  onError: (code) => {
    needsVerification.value = code === 'EMAIL_NOT_VERIFIED'
  }
})
const loading = computed(() => authenticating.value || resending.value)

watch(() => Boolean(challenge.value), value => emit('captcha', value), { flush: 'sync' })
watch(() => props.active, (value) => {
  if (!value) resendRequest?.abort()
})
onBeforeUnmount(() => resendRequest?.abort())

async function submit() {
  if (loading.value || !props.active) return
  needsVerification.value = false
  if (!(await form.value?.validate())?.valid || loading.value || !props.active) return

  await authenticate({ email: email.value.trim(), password: password.value })
}

async function resend() {
  if (loading.value || !props.active) return
  resending.value = true
  const controller = new AbortController()
  resendRequest = controller

  try {
    const result = await $fetch('/api/auth/resend-verification', {
      method: 'POST',
      body: { email: email.value },
      signal: controller.signal,
      retry: false
    })
    if (props.active && !controller.signal.aborted) toast.success(result.message)
  } catch (cause) {
    if (props.active && !controller.signal.aborted) toast.error(apiErrorMessage(cause))
  } finally {
    resending.value = false
    if (resendRequest === controller) resendRequest = undefined
  }
}
</script>

<template>
  <div ref="container">
    <v-form ref="form" :disabled="loading" @submit.prevent="submit">
      <v-text-field
        v-model="email"
        label="邮箱"
        type="email"
        autocomplete="email"
        prepend-inner-icon="mdi-email"
        maxlength="254"
        :rules="[value => isValidEmail(String(value ?? '').trim()) || '请填写有效的邮箱']"
        required
      />
      <v-text-field
        v-model="password"
        label="密码"
        type="password"
        autocomplete="current-password"
        prepend-inner-icon="mdi-lock"
        maxlength="128"
        :rules="[value => Boolean(value) || '请输入密码']"
        class="mt-2"
        required
      />

      <v-btn type="submit" color="primary" block size="large" :loading="loading" :disabled="loading" class="mt-4">
        登录
      </v-btn>
    </v-form>

    <div class="d-flex flex-wrap align-center ga-1 mt-4">
      <v-btn v-if="needsVerification" variant="text" size="small" :loading="resending" :disabled="loading" @click="resend">
        重新发送验证邮件
      </v-btn>
      <v-spacer />
      <v-btn variant="text" size="small" :disabled="loading" @click="emit('switch', 'forgot')">忘记密码？</v-btn>
      <v-btn variant="text" size="small" :disabled="loading" @click="emit('switch', 'register')">没有账号？注册</v-btn>
    </div>

    <CaptchaDialog
      :challenge="challenge"
      :verifying="step === 'submitting'"
      :refreshing="step === 'preparing'"
      :error="captchaError"
      @verified="completeCaptcha"
      @error="onCaptchaError"
      @retry="prepareCaptcha"
      @cancel="cancelChallenge"
    />
  </div>
</template>
