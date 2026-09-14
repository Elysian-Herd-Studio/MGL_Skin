<script setup lang="ts">
import type { LoginCaptchaChallenge, LoginCaptchaProof } from '../../shared/types/captcha'

defineProps<{ challenge: LoginCaptchaChallenge | null, verifying: boolean, refreshing: boolean, error: string }>()
const emit = defineEmits<{
  verified: [proof: LoginCaptchaProof]
  error: [message: string]
  retry: []
  cancel: []
}>()
</script>

<template>
  <v-dialog
    :model-value="Boolean(challenge)"
    max-width="420"
    :persistent="verifying"
    :close-on-back="false"
    :retain-focus="challenge?.provider === 'turnstile'"
    :capture-focus="false"
    aria-labelledby="login-captcha-title"
    @update:model-value="value => { if (!value && !verifying) emit('cancel') }"
  >
    <v-card>
      <v-card-item>
        <v-card-title id="login-captcha-title" class="text-h5">安全验证</v-card-title>
      </v-card-item>
      <v-card-text class="pt-4">
        <div v-if="refreshing" class="d-flex align-center justify-center ga-3 py-5" role="status">
          <v-progress-circular indeterminate size="24" width="2" color="primary" />
          <span class="text-body-2 text-medium-emphasis">正在准备新的验证码</span>
        </div>
        <CaptchaWidget
          v-else-if="challenge && !error"
          :key="challenge.requestId"
          :challenge="challenge"
          :disabled="verifying"
          @verified="emit('verified', $event)"
          @error="emit('error', $event)"
        />
        <p v-if="verifying" class="text-body-2 text-medium-emphasis text-center mt-4 mb-0" role="status">正在验证并登录…</p>
      </v-card-text>
      <v-card-actions class="px-4 pb-4">
        <v-btn v-if="error" variant="text" color="primary" :disabled="refreshing || verifying" @click="emit('retry')">重试</v-btn>
        <v-spacer />
        <v-btn variant="text" :disabled="verifying" @click="emit('cancel')">关闭</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
