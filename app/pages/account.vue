<script setup lang="ts">
import type { User } from '#auth-utils'
import { AVATAR_MAX_BYTES, AVATAR_MIME_TYPES } from '../../shared/utils/avatar'
import { isValidUsername } from '../../shared/utils/validation'

definePageMeta({ middleware: ['auth'] })
useSeoMeta({ title: '个人资料 · MGL Skin' })

type ProfileAction = 'username' | 'avatar' | 'remove-avatar'

const { user, session, clear } = useUserSession()
const username = ref(user.value?.username ?? '')
const avatarInput = ref<HTMLInputElement | null>(null)
const saving = ref<ProfileAction | null>(null)
const loggingOut = ref(false)
const error = ref('')
const success = ref('')
const busy = computed(() => saving.value !== null || loggingOut.value)
const usernameChanged = computed(() => username.value.trim() !== user.value?.username)
const usernameValid = computed(() => isValidUsername(username.value.trim()))
const usernameRules = [
  (value: string) => isValidUsername(value.trim()) || '用户名需为 3-20 位字母、数字、下划线或连字符'
]

watch(() => user.value?.username, (value, previous) => {
  if (username.value === (previous ?? '')) username.value = value ?? ''
})

async function updateProfile(action: ProfileAction, request: () => Promise<{ user: User }>, message: string) {
  if (busy.value) return
  error.value = ''
  success.value = ''
  saving.value = action

  try {
    const { user: updated } = await request()
    if (session.value) session.value = { ...session.value, user: updated }
    if (action === 'username') username.value = updated.username
    success.value = message
  } catch (cause) {
    error.value = apiErrorMessage(cause)
  } finally {
    saving.value = null
  }
}

async function saveUsername() {
  if (!usernameChanged.value || !usernameValid.value) return

  await updateProfile('username', () => $fetch('/api/account', {
    method: 'PATCH',
    body: { username: username.value.trim() }
  }), '用户名已更新')
}

async function uploadAvatar(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || busy.value) return
  error.value = ''
  success.value = ''

  if (!AVATAR_MIME_TYPES.includes(file.type)) {
    error.value = '头像仅支持 PNG、JPEG 或 WebP 图片'
    return
  }

  if (!file.size || file.size > AVATAR_MAX_BYTES) {
    error.value = file.size ? '头像大小不能超过 2 MB' : '请选择非空的图片文件'
    return
  }

  await updateProfile('avatar', () => $fetch('/api/account/avatar', {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
    retry: false
  }), '头像已更新')
}

async function removeAvatar() {
  await updateProfile('remove-avatar', () => $fetch('/api/account/avatar', {
    method: 'DELETE'
  }), '头像已移除')
}

async function logout() {
  if (busy.value) return
  error.value = ''
  success.value = ''
  loggingOut.value = true

  try {
    await clear()
    await navigateTo('/')
  } catch (cause) {
    error.value = apiErrorMessage(cause)
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <v-card max-width="720" class="mx-auto bg-transparent">
    <v-card-item>
      <v-card-title>个人资料</v-card-title>
      <v-card-subtitle>管理头像与账户信息</v-card-subtitle>
    </v-card-item>

    <v-card-text>
      <div aria-live="polite">
        <FormAlert :message="error" type="error" />
        <FormAlert :message="success" type="success" />
      </div>

      <div class="d-flex flex-wrap align-center ga-5 my-4">
        <UserAvatar :src="user?.avatarUrl" :name="user?.username" :size="96" />
        <div>
          <h2 class="text-subtitle-1 font-weight-bold mb-1">头像</h2>
          <p class="text-body-2 text-medium-emphasis mb-3">支持 PNG、JPEG、WebP，最大 2 MB</p>
          <input
            ref="avatarInput"
            type="file"
            :accept="AVATAR_MIME_TYPES.join(',')"
            :disabled="busy"
            aria-label="选择头像"
            class="d-none"
            @change="uploadAvatar"
          >
          <div class="d-flex flex-wrap ga-2">
            <v-btn
              color="primary"
              variant="tonal"
              prepend-icon="mdi-camera-outline"
              :loading="saving === 'avatar'"
              :disabled="busy"
              @click="avatarInput?.click()"
            >{{ user?.avatarUrl ? '更换头像' : '上传头像' }}</v-btn>
            <v-btn
              v-if="user?.avatarUrl"
              variant="text"
              color="error"
              prepend-icon="mdi-delete-outline"
              :loading="saving === 'remove-avatar'"
              :disabled="busy"
              @click="removeAvatar"
            >移除头像</v-btn>
          </div>
        </div>
      </div>

      <v-divider class="my-6" />

      <v-form @submit.prevent="saveUsername">
        <v-text-field
          v-model="username"
          label="用户名"
          autocomplete="username"
          prepend-inner-icon="mdi-account-outline"
          hint="3-20 位字母、数字、下划线或连字符"
          persistent-hint
          maxlength="20"
          :rules="usernameRules"
          validate-on="blur"
          :disabled="busy"
          required
        />
        <div class="d-flex justify-end mt-3">
          <v-btn
            type="submit"
            color="primary"
            variant="tonal"
            :loading="saving === 'username'"
            :disabled="busy || !usernameChanged || !usernameValid"
          >保存用户名</v-btn>
        </div>
      </v-form>

      <v-divider class="my-6" />

      <v-list lines="two" class="bg-transparent">
        <v-list-item title="邮箱" :subtitle="user?.email" prepend-icon="mdi-email" />
        <v-list-item
          title="角色"
          :subtitle="user?.role === 'admin' ? '管理员' : '普通用户'"
          prepend-icon="mdi-shield-account"
        />
      </v-list>
    </v-card-text>

    <v-card-actions class="flex-wrap px-4 pb-4">
      <v-btn to="/my-skins" variant="tonal" prepend-icon="mdi-image-multiple-outline">我的皮肤</v-btn>
      <v-btn v-if="user?.role === 'admin'" to="/admin/users" variant="tonal" prepend-icon="mdi-account-cog">
        用户管理
      </v-btn>
      <v-spacer />
      <v-btn color="error" variant="tonal" prepend-icon="mdi-logout" :loading="loggingOut" :disabled="busy" @click="logout">
        退出登录
      </v-btn>
    </v-card-actions>
  </v-card>
</template>
