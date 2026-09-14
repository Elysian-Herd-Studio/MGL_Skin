<script setup lang="ts">
import type { AuthView } from '~/composables/useAuthDialog'
import type { LoginCaptchaChallenge, LoginCaptchaProof, LoginCaptchaResponse } from '../../shared/types/captcha'
import { isValidEmail } from '../../shared/utils/validation'

const props = withDefaults(defineProps<{ active?: boolean }>(), { active: true })

const emit = defineEmits<{
  success: []
  switch: [view: AuthView]
  captcha: [active: boolean]
}>()

const container = ref<HTMLElement | null>(null)
const form = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const email = ref('')
const password = ref('')
const step = ref<'idle' | 'preparing' | 'challenge' | 'submitting'>('idle')
const resending = ref(false)
const loading = computed(() => step.value !== 'idle' || resending.value)
const error = ref('')
const notice = ref('')
const needsVerification = ref(false)
const challenge = ref<LoginCaptchaChallenge | null>(null)
const captchaError = ref('')
let credentials: { email: string, password: string } | null = null
let request: AbortController | undefined
let configurationRetried = false

watch(() => Boolean(challenge.value), value => emit('captcha', value), { flush: 'sync' })
watch(() => props.active, (value) => {
  if (!value) cancelAttempt()
})
onBeforeUnmount(cancelAttempt)

function newRequest() {
  request?.abort()
  request = new AbortController()
  return request
}

function isCurrent(controller: AbortController) {
  return props.active && request === controller && !controller.signal.aborted
}

function cancelAttempt() {
  request?.abort()
  request = undefined
  credentials = null
  challenge.value = null
  captchaError.value = ''
  step.value = 'idle'
}

async function cancelChallenge() {
  if (step.value === 'submitting') return
  cancelAttempt()
  await nextTick()
  if (props.active) container.value?.querySelector<HTMLButtonElement>('button[type="submit"]')?.focus()
}

async function submit() {
  if (loading.value || !props.active) return
  error.value = ''
  notice.value = ''
  needsVerification.value = false
  if (!(await form.value?.validate())?.valid || loading.value || !props.active) return

  credentials = { email: email.value.trim(), password: password.value }
  configurationRetried = false
  await prepareCaptcha()
}

async function prepareCaptcha() {
  if (!credentials || !props.active || step.value === 'submitting') return
  const controller = newRequest()
  step.value = 'preparing'
  captchaError.value = ''

  try {
    const result = await $fetch<LoginCaptchaResponse>('/api/auth/captcha', {
      method: 'POST',
      body: { email: credentials.email },
      signal: controller.signal,
      timeout: 15000,
      retry: false
    })
    if (!isCurrent(controller)) return

    if (result.enabled) {
      challenge.value = result
      step.value = 'challenge'
    } else {
      challenge.value = null
      await login()
    }
  } catch (cause) {
    if (!isCurrent(controller)) return
    if (challenge.value) {
      captchaError.value = apiErrorMessage(cause)
      step.value = 'challenge'
    } else {
      error.value = apiErrorMessage(cause)
      credentials = null
      step.value = 'idle'
    }
  }
}

async function completeCaptcha(proof: LoginCaptchaProof) {
  if (step.value !== 'challenge' || proof.requestId !== challenge.value?.requestId) return
  await login(proof)
}

async function login(captcha?: LoginCaptchaProof) {
  if (!credentials || !props.active || step.value === 'submitting') return
  const controller = newRequest()
  step.value = 'submitting'
  captchaError.value = ''

  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { ...credentials, captcha },
      signal: controller.signal,
      timeout: 20000,
      retry: false
    })
    if (!isCurrent(controller)) return

    credentials = null
    password.value = ''
    challenge.value = null
    step.value = 'idle'
    emit('success')
  } catch (cause) {
    if (!isCurrent(controller)) return
    const code = apiErrorCode(cause)
    if (code === 'CAPTCHA_REQUIRED' && !captcha && !configurationRetried) {
      configurationRetried = true
      step.value = 'preparing'
      await prepareCaptcha()
    } else if (challenge.value && code !== 'INVALID_CREDENTIALS' && code !== 'EMAIL_NOT_VERIFIED' && code !== 'RATE_LIMITED') {
      captchaError.value = apiErrorMessage(cause)
      step.value = 'challenge'
    } else {
      error.value = apiErrorMessage(cause)
      needsVerification.value = code === 'EMAIL_NOT_VERIFIED'
      credentials = null
      challenge.value = null
      step.value = 'idle'
    }
  }
}

async function resend() {
  if (loading.value) return
  resending.value = true
  notice.value = ''
  error.value = ''
  const controller = newRequest()

  try {
    const result = await $fetch('/api/auth/resend-verification', {
      method: 'POST',
      body: { email: email.value },
      signal: controller.signal,
      retry: false
    })
    if (isCurrent(controller)) notice.value = result.message
  } catch (cause) {
    if (isCurrent(controller)) error.value = apiErrorMessage(cause)
  } finally {
    resending.value = false
  }
}
</script>

<template>
  <div ref="container">
    <FormAlert :message="error" type="error" />
    <FormAlert :message="notice" type="success" />

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

    <LoginCaptchaDialog
      :challenge="challenge"
      :verifying="step === 'submitting'"
      :refreshing="step === 'preparing'"
      :error="captchaError"
      @verified="completeCaptcha"
      @cancel="cancelChallenge"
    />
  </div>
</template>
