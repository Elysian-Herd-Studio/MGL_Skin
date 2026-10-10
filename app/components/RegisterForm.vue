<script setup lang="ts">
import type { AuthView } from '~/composables/useAuthDialog'
import { isValidEmail, isValidPassword, isValidUsername } from '../../shared/utils/validation'

const props = withDefaults(defineProps<{ active?: boolean }>(), { active: true })

const emit = defineEmits<{
  switch: [view: AuthView]
  captcha: [active: boolean]
}>()

const toast = useToast()
const form = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const done = ref(false)

const {
  container, step, loading, challenge, captchaError,
  authenticate, prepareCaptcha, completeCaptcha, onCaptchaError, cancelChallenge
} = useAuthCaptcha('register', {
  active: () => props.active,
  onSuccess: () => {
    password.value = ''
    confirmPassword.value = ''
    done.value = true
    toast.success('注册请求已受理。如果该邮箱可用，请查收验证邮件并点击链接完成验证。')
  }
})

watch(() => Boolean(challenge.value), value => emit('captcha', value), { flush: 'sync' })

async function submit() {
  if (loading.value || done.value || !props.active) return
  if (!(await form.value?.validate())?.valid || loading.value || done.value || !props.active) return

  await authenticate({ username: username.value.trim(), email: email.value.trim(), password: password.value })
}
</script>

<template>
  <div ref="container">
    <v-btn v-if="done" color="primary" block size="large" @click="emit('switch', 'login')">
      前往登录
    </v-btn>

    <template v-else>
      <v-form ref="form" :disabled="loading" @submit.prevent="submit">
        <v-text-field
          v-model="username"
          label="用户名"
          autocomplete="username"
          prepend-inner-icon="mdi-account"
          maxlength="20"
          :rules="[value => isValidUsername(String(value ?? '').trim()) || '用户名需为 3-20 位字母、数字、下划线或连字符']"
          hint="3-20 位字母、数字、下划线或连字符"
          persistent-hint
          required
        />
        <v-text-field
          v-model="email"
          label="邮箱"
          type="email"
          autocomplete="email"
          prepend-inner-icon="mdi-email"
          maxlength="254"
          :rules="[value => isValidEmail(String(value ?? '').trim()) || '请填写有效的邮箱']"
          class="mt-4"
          required
        />
        <v-text-field
          v-model="password"
          label="密码"
          type="password"
          autocomplete="new-password"
          prepend-inner-icon="mdi-lock"
          maxlength="128"
          :rules="[value => isValidPassword(String(value ?? '')) || '密码长度需为 8-128 位']"
          hint="至少 8 位"
          persistent-hint
          required
        />
        <v-text-field
          v-model="confirmPassword"
          label="确认密码"
          type="password"
          autocomplete="new-password"
          prepend-inner-icon="mdi-lock-check"
          maxlength="128"
          :rules="[value => value === password || '两次输入的密码不一致']"
          class="mt-4"
          required
        />

        <v-btn type="submit" color="primary" block size="large" :loading="loading" :disabled="loading" class="mt-4">
          注册
        </v-btn>
      </v-form>

      <div class="d-flex align-center mt-4">
        <v-spacer />
        <v-btn variant="text" size="small" :disabled="loading" @click="emit('switch', 'login')">已有账号？登录</v-btn>
        <v-spacer />
      </div>
    </template>

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
