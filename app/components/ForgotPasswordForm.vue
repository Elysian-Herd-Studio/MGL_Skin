<script setup lang="ts">
import type { AuthView } from '~/composables/useAuthDialog'

const emit = defineEmits<{
  switch: [view: AuthView]
}>()

const toast = useToast()
const email = ref('')
const loading = ref(false)

async function submit() {
  if (loading.value) return
  loading.value = true

  try {
    const result = await $fetch('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: email.value }
    })
    toast.success(result.message)
  } catch (cause) {
    toast.error(apiErrorMessage(cause))
  } finally {
    loading.value = false
  }
}
</script>

<template>
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
