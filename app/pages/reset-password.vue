<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const route = useRoute()
const toast = useToast()
const token = typeof route.query.token === 'string' ? route.query.token : ''

const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const done = ref(false)

async function submit() {
  error.value = ''

  if (password.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致'
    return
  }

  loading.value = true

  try {
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: { token, password: password.value }
    })
    done.value = true
    toast.success('密码已重置')
  } catch (cause) {
    error.value = apiErrorMessage(cause)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthCard title="重置密码" subtitle="设置一个新密码">
    <FormAlert :message="error" type="error" />

    <template v-if="!token">
      <v-alert type="warning" variant="tonal">
        链接中缺少重置令牌，请确认你点击了邮件里的完整链接。
      </v-alert>
    </template>

    <template v-else-if="done">
      <v-alert type="success" variant="tonal">
        密码已重置，请使用新密码登录。为安全起见，其他设备上的登录状态已失效。
      </v-alert>
    </template>

    <v-form v-else @submit.prevent="submit">
      <v-text-field
        v-model="password"
        label="新密码"
        type="password"
        autocomplete="new-password"
        prepend-inner-icon="mdi-lock"
        hint="至少 8 位"
        persistent-hint
        required
      />
      <v-text-field
        v-model="confirmPassword"
        label="确认新密码"
        type="password"
        autocomplete="new-password"
        prepend-inner-icon="mdi-lock-check"
        class="mt-4"
        required
      />

      <v-btn type="submit" color="primary" block size="large" :loading="loading" class="mt-4">
        重置密码
      </v-btn>
    </v-form>

    <v-btn to="/?auth=login" color="primary" block size="large" class="mt-4">前往登录</v-btn>
  </AuthCard>
</template>
