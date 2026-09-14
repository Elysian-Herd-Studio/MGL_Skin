<script setup lang="ts">
import type { SetupStatus } from '../../shared/types/settings'
import type { DatabaseSettings } from '../../shared/types/database'
import { createDefaultMailSettings, isValidSiteUrl } from '../../shared/utils/settings'
import { isValidEmail, isValidPassword, isValidUsername } from '../../shared/utils/validation'

definePageMeta({ layout: 'auth' })
useSeoMeta({ title: '初始化 · MGL Skin', robots: 'noindex, nofollow' })

const form = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const database = ref<DatabaseSettings>({
  provider: 'sqlite',
  postgresql: { host: 'localhost', port: 5432, database: 'mgl_skin', username: 'postgres', password: '', ssl: false }
})
const settings = ref({ siteUrl: useRequestURL().origin, mail: createDefaultMailSettings() })
const loading = ref(false)
const error = ref('')
const status = useState<SetupStatus | null>('setup-status', () => null)
const { fetch: refreshSession } = useUserSession()

async function submit() {
  if (loading.value) return
  error.value = ''
  if (!(await form.value?.validate())?.valid) return
  loading.value = true

  try {
    const result = await $fetch<SetupStatus>('/api/setup', {
      method: 'POST',
      body: {
        username: username.value,
        email: email.value,
        password: password.value,
        settings: settings.value,
        database: status.value?.databaseProvider ? undefined : database.value
      },
      retry: false
    })
    status.value = result
    password.value = ''
    confirmPassword.value = ''
    database.value.postgresql.password = ''
    settings.value.mail.apiKey = ''
    settings.value.mail.smtpPassword = ''
    await refreshSession()
    await navigateTo('/admin', { replace: true })
  } catch (cause) {
    error.value = apiErrorMessage(cause)
    if (apiErrorCode(cause) === 'ALREADY_INITIALIZED') {
      status.value = { initialized: true }
      await navigateTo('/?auth=login&redirect=/admin', { replace: true })
    } else {
      const latestStatus = await $fetch<SetupStatus>('/api/setup/status', { retry: false }).catch(() => null)
      if (latestStatus) status.value = latestStatus
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="setup-page py-6">
    <header class="mb-8">
      <v-chip color="primary" variant="tonal" class="mb-4">首次使用</v-chip>
      <h1 class="text-h4 font-weight-bold mb-3">初始化 MGL Skin</h1>
      <p class="text-body-1 text-medium-emphasis">选择数据库，创建管理员账户并配置邮件服务，完成后即可开放你的皮肤库。</p>
    </header>

    <v-form ref="form" :disabled="loading" @submit.prevent="submit">
      <v-card class="mb-6">
        <v-card-text class="pa-6">
          <h2 class="text-h6 mb-2">数据库</h2>
          <p class="text-body-2 text-medium-emphasis mb-6">用于保存账户、皮肤和站点设置。</p>
          <v-alert v-if="status?.databaseProvider" type="info" variant="tonal" rounded="xl">
            已保存 {{ status.databaseProvider === 'postgresql' ? 'PostgreSQL' : 'SQLite' }} 连接配置，将使用此数据库继续初始化。
          </v-alert>
          <DatabaseSettingsForm v-else v-model="database" :disabled="loading" />
        </v-card-text>
      </v-card>

      <v-card class="mb-6">
        <v-card-text class="pa-6">
          <h2 class="text-h6 mb-2">管理员账户</h2>
          <p class="text-body-2 text-medium-emphasis mb-6">使用邮箱与密码登录控制台。此账户无需再次验证邮箱。</p>
          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="username"
                label="管理员用户名"
                autocomplete="username"
                maxlength="20"
                :rules="[value => isValidUsername(String(value ?? '').trim()) || '请输入 3-20 位字母、数字、下划线或连字符']"
                required
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="email"
                label="管理员邮箱"
                type="email"
                autocomplete="email"
                maxlength="254"
                :rules="[value => isValidEmail(String(value ?? '').trim()) || '请输入有效的邮箱']"
                required
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="password"
                label="管理员密码"
                type="password"
                autocomplete="new-password"
                maxlength="128"
                :rules="[value => isValidPassword(value) || '密码长度需为 8-128 位']"
                required
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="confirmPassword"
                label="确认密码"
                type="password"
                autocomplete="new-password"
                maxlength="128"
                :rules="[value => Boolean(value) && value === password || '两次输入的密码不一致']"
                required
              />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <v-card class="mb-6">
        <v-card-text class="pa-6">
          <h2 class="text-h6 mb-2">站点与邮件</h2>
          <p class="text-body-2 text-medium-emphasis mb-6">用于发送邮箱验证和密码重置邮件。完成后可在控制台修改配置并发送测试邮件。</p>
          <v-text-field
            v-model="settings.siteUrl"
            label="站点对外地址"
            placeholder="https://skin.example.com"
            hint="邮件中的验证和重置链接将使用此地址。"
            persistent-hint
            maxlength="2048"
            :rules="[value => isValidSiteUrl(String(value ?? '').trim()) || '请输入有效的 HTTP 或 HTTPS 站点地址']"
            class="mb-6"
            required
          />
          <MailSettingsForm v-model="settings.mail" :disabled="loading" />
        </v-card-text>
      </v-card>

      <FormAlert :message="error" type="error" />
      <v-btn type="submit" color="primary" size="large" :loading="loading" block>完成初始化并进入控制台</v-btn>
    </v-form>
  </div>
</template>

<style scoped>
.setup-page {
  width: 100%;
  max-width: 880px;
}
</style>
