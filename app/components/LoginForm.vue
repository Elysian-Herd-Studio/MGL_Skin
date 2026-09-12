<script setup lang="ts">
import type { AuthView } from '~/composables/useAuthDialog'

const emit = defineEmits<{
  success: []
  switch: [view: AuthView]
}>()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const notice = ref('')
const needsVerification = ref(false)

async function submit() {
  loading.value = true
  error.value = ''
  notice.value = ''
  needsVerification.value = false

  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: email.value, password: password.value }
    })

    emit('success')
  } catch (cause) {
    error.value = apiErrorMessage(cause)
    needsVerification.value = apiErrorCode(cause) === 'EMAIL_NOT_VERIFIED'
  } finally {
    loading.value = false
  }
}

async function resend() {
  notice.value = ''
  error.value = ''

  try {
    const result = await $fetch('/api/auth/resend-verification', {
      method: 'POST',
      body: { email: email.value }
    })
    notice.value = result.message
  } catch (cause) {
    error.value = apiErrorMessage(cause)
  }
}
</script>

<template>
  <FormAlert :message="error" type="error" />
  <FormAlert :message="notice" type="success" />

  <v-form @submit.prevent="submit">
    <v-text-field
      v-model="email"
      label="邮箱"
      type="email"
      autocomplete="email"
      prepend-inner-icon="mdi-email"
      required
    />
    <v-text-field
      v-model="password"
      label="密码"
      type="password"
      autocomplete="current-password"
      prepend-inner-icon="mdi-lock"
      class="mt-2"
      required
    />

    <v-btn type="submit" color="primary" block size="large" :loading="loading" class="mt-4">
      登录
    </v-btn>
  </v-form>

  <div class="d-flex flex-wrap align-center ga-1 mt-4">
    <v-btn v-if="needsVerification" variant="text" size="small" @click="resend">
      重新发送验证邮件
    </v-btn>
    <v-spacer />
    <v-btn variant="text" size="small" @click="emit('switch', 'forgot')">忘记密码？</v-btn>
    <v-btn variant="text" size="small" @click="emit('switch', 'register')">没有账号？注册</v-btn>
  </div>
</template>
