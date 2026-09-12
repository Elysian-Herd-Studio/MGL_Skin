<script setup lang="ts">
import type { AuthView } from '~/composables/useAuthDialog'

const emit = defineEmits<{
  switch: [view: AuthView]
}>()

const email = ref('')
const loading = ref(false)
const error = ref('')
const notice = ref('')

async function submit() {
  loading.value = true
  error.value = ''
  notice.value = ''

  try {
    const result = await $fetch('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: email.value }
    })
    notice.value = result.message
  } catch (cause) {
    error.value = apiErrorMessage(cause)
  } finally {
    loading.value = false
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

    <v-btn type="submit" color="primary" block size="large" :loading="loading" class="mt-4">
      发送重置邮件
    </v-btn>
  </v-form>

  <div class="d-flex align-center mt-4">
    <v-spacer />
    <v-btn variant="text" size="small" @click="emit('switch', 'login')">返回登录</v-btn>
    <v-spacer />
  </div>
</template>
