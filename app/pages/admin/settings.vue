<script setup lang="ts">
import type { SiteSettings, SiteSettingsView } from '../../../shared/types/settings'
import { createDefaultMailSettings, isValidSiteUrl } from '../../../shared/utils/settings'

useSeoMeta({ title: '站点设置 · MGL Skin', robots: 'noindex, nofollow' })

const { data, error: loadError, refresh } = await useFetch<SiteSettingsView>('/api/admin/settings')
const form = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const settings = ref<SiteSettings>({ siteUrl: '', mail: createDefaultMailSettings() })
const saving = ref(false)
const testing = ref(false)
const busy = computed(() => saving.value || testing.value)
const error = ref('')
const success = ref('')

watch(data, value => {
  if (value) settings.value = { siteUrl: value.siteUrl, mail: { ...value.mail, apiKey: '', smtpPassword: '' } }
}, { immediate: true })

async function save() {
  if (busy.value) return
  error.value = ''
  success.value = ''
  if (!(await form.value?.validate())?.valid) return
  saving.value = true

  try {
    data.value = await $fetch<SiteSettingsView>('/api/admin/settings', { method: 'PUT', body: settings.value, retry: false })
    success.value = '设置已保存，新的邮件将使用此配置。'
  } catch (cause) {
    error.value = apiErrorMessage(cause)
  } finally {
    saving.value = false
  }
}

async function testEmail() {
  if (busy.value) return
  error.value = ''
  success.value = ''
  if (!(await form.value?.validate())?.valid) return
  testing.value = true

  try {
    const result = await $fetch('/api/admin/settings/test-email', { method: 'POST', body: settings.value, retry: false })
    success.value = result.message
  } catch (cause) {
    error.value = apiErrorMessage(cause)
  } finally {
    testing.value = false
  }
}
</script>

<template>
  <div class="admin-settings">
    <header class="mb-8">
      <h1 class="text-h4 font-weight-bold mb-3">站点设置</h1>
      <p class="text-body-1 text-medium-emphasis">管理对外地址与邮件服务，修改后即时生效。</p>
    </header>

    <v-alert v-if="loadError" type="error" variant="tonal" rounded="xl">
      <div class="d-flex align-center justify-space-between flex-wrap ga-3">
        <span>设置加载失败，请稍后重试。</span>
        <v-btn variant="text" @click="refresh()">重新加载</v-btn>
      </div>
    </v-alert>

    <v-form v-else-if="data" ref="form" :disabled="busy" @submit.prevent="save">
      <v-card class="mb-6">
        <v-card-text class="pa-6">
          <h2 class="text-h6 mb-4">站点地址</h2>
          <v-text-field
            v-model="settings.siteUrl"
            label="站点对外地址"
            placeholder="https://skin.example.com"
            hint="用于邮件中的邮箱验证和密码重置链接。"
            persistent-hint
            maxlength="2048"
            :rules="[value => isValidSiteUrl(String(value ?? '').trim()) || '请输入有效的 HTTP 或 HTTPS 站点地址']"
            required
          />
        </v-card-text>
      </v-card>

      <v-card class="mb-6">
        <v-card-text class="pa-6">
          <h2 class="text-h6 mb-2">邮件发送</h2>
          <p class="text-body-2 text-medium-emphasis mb-6">已保存的密钥和密码不会显示。保留原连接设置并留空凭据时，会沿用已保存的值。</p>
          <MailSettingsForm v-model="settings.mail" :saved="data.mail" :disabled="busy" />
        </v-card-text>
      </v-card>

      <div aria-live="polite">
        <FormAlert :message="error" type="error" />
        <FormAlert :message="success" type="success" />
      </div>
      <div class="d-flex flex-wrap align-center ga-3">
        <v-btn type="submit" color="primary" size="large" :loading="saving" :disabled="testing">保存设置</v-btn>
        <v-btn
          type="button"
          variant="tonal"
          size="large"
          prepend-icon="mdi-email-fast-outline"
          :loading="testing"
          :disabled="saving"
          @click="testEmail"
        >发送测试邮件</v-btn>
      </div>
      <p class="text-body-2 text-medium-emphasis mt-3">测试邮件使用表单中的当前配置，发送到你登录的管理员邮箱。</p>
    </v-form>
  </div>
</template>

<style scoped>
.admin-settings {
  max-width: 880px;
}
</style>
