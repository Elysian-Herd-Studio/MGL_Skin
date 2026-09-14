<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const route = useRoute()
const toast = useToast()

const status = ref<'pending' | 'success' | 'expired' | 'invalid' | 'missing'>('pending')
const message = ref('')

onMounted(async () => {
  const token = typeof route.query.token === 'string' ? route.query.token : ''

  if (!token) {
    status.value = 'missing'
    return
  }

  try {
    await $fetch('/api/auth/verify-email', {
      method: 'POST',
      body: { token }
    })
    status.value = 'success'
    toast.success('邮箱验证成功')
  } catch (cause) {
    message.value = apiErrorMessage(cause)
    status.value = apiErrorCode(cause) === 'TOKEN_EXPIRED' ? 'expired' : 'invalid'
  }
})
</script>

<template>
  <AuthCard title="邮箱验证">
    <div v-if="status === 'pending'" class="d-flex align-center justify-center py-6">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <template v-else>
      <v-alert v-if="status === 'success'" type="success" variant="tonal">
        邮箱验证成功，现在可以登录了。
      </v-alert>
      <v-alert v-else-if="status === 'expired'" type="warning" variant="tonal">
        验证链接已过期，请到「登录」页重新发送验证邮件。
      </v-alert>
      <v-alert v-else-if="status === 'missing'" type="warning" variant="tonal">
        链接中缺少验证令牌，请确认你点击了邮件里的完整链接。
      </v-alert>
      <v-alert v-else type="error" variant="tonal">
        {{ message || '验证链接无效或已被使用' }}
      </v-alert>
    </template>

    <v-btn to="/?auth=login" color="primary" block size="large" class="mt-4">前往登录</v-btn>
  </AuthCard>
</template>
