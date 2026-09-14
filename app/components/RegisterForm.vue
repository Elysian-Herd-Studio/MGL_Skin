<script setup lang="ts">
import type { AuthView } from '~/composables/useAuthDialog'

const emit = defineEmits<{
  switch: [view: AuthView]
}>()

const toast = useToast()
const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const done = ref(false)

async function submit() {
  if (loading.value) return

  if (password.value !== confirmPassword.value) {
    toast.error('两次输入的密码不一致')
    return
  }

  loading.value = true

  try {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: {
        username: username.value,
        email: email.value,
        password: password.value
      }
    })

    done.value = true
    toast.success('注册请求已受理。如果该邮箱可用，请查收验证邮件并点击链接完成验证。')
  } catch (cause) {
    toast.error(apiErrorMessage(cause))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-btn v-if="done" color="primary" block size="large" @click="emit('switch', 'login')">
    前往登录
  </v-btn>

  <template v-else>
    <v-form @submit.prevent="submit">
      <v-text-field
        v-model="username"
        label="用户名"
        autocomplete="username"
        prepend-inner-icon="mdi-account"
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
        class="mt-4"
        required
      />
      <v-text-field
        v-model="password"
        label="密码"
        type="password"
        autocomplete="new-password"
        prepend-inner-icon="mdi-lock"
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
        class="mt-4"
        required
      />

      <v-btn type="submit" color="primary" block size="large" :loading="loading" class="mt-4">
        注册
      </v-btn>
    </v-form>

    <div class="d-flex align-center mt-4">
      <v-spacer />
      <v-btn variant="text" size="small" @click="emit('switch', 'login')">已有账号？登录</v-btn>
      <v-spacer />
    </div>
  </template>
</template>
