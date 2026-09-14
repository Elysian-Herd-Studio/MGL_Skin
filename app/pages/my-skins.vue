<script setup lang="ts">
import type { SkinPreset, SkinPresetPage } from '../../shared/types/skin'
import { parsePonyConfig } from '../../shared/utils/pony'

definePageMeta({ middleware: ['auth'] })
useSeoMeta({ title: '我的皮肤 · MGL Skin', robots: 'noindex, nofollow' })

type SkinAction = {
  type: 'rename' | 'delete'
  preset: Pick<SkinPreset, 'id' | 'name'>
}

const { user } = useUserSession()
const toast = useToast()
const searchInput = ref<string | null>('')
const appliedSearch = ref('')
const page = ref(1)
const action = ref<SkinAction | null>(null)
const nameInput = ref('')
const busy = ref(false)
const actionError = ref('')
const query = computed(() => ({ page: page.value, q: appliedSearch.value }))

const { data, pending, error, refresh } = await useFetch<SkinPresetPage>('/api/account/skins', {
  key: computed(() => `my-skins:${user.value?.id}`),
  query
})
const presets = computed(() => (data.value?.items ?? []).map(item => ({
  ...item, config: parsePonyConfig(item.data)
})))
const total = computed(() => data.value?.total ?? 0)
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / (data.value?.limit ?? 12))))
const canSubmit = computed(() => action.value?.type === 'delete' || (action.value?.type === 'rename'
  && nameInput.value.trim().length > 0 && nameInput.value.trim().length <= 64
  && nameInput.value.trim() !== action.value.preset.name))
const nameRules = [
  (value: string) => Boolean(value.trim()) || '请输入皮肤名称',
  (value: string) => value.trim().length <= 64 || '皮肤名称不能超过 64 个字符'
]
const dateFormat = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeZone: 'Asia/Shanghai' })

watch(searchInput, (_, __, onCleanup) => {
  const timer = setTimeout(applySearch, 300)
  onCleanup(() => clearTimeout(timer))
})

watch(data, (value) => {
  if (value && page.value !== value.page) page.value = value.page
})

function applySearch() {
  const search = (searchInput.value ?? '').trim()
  if (search === appliedSearch.value) return
  page.value = 1
  appliedSearch.value = search
}

function resetSearch() {
  searchInput.value = ''
  applySearch()
}

function formatDate(value: string) {
  const date = new Date(`${value.replace(' ', 'T')}Z`)
  return Number.isNaN(date.getTime()) ? '—' : dateFormat.format(date)
}

function openAction(type: SkinAction['type'], preset: SkinPreset) {
  if (busy.value) return
  action.value = { type, preset: { id: preset.id, name: preset.name } }
  nameInput.value = preset.name
  actionError.value = ''
}

function closeAction() {
  if (busy.value) return
  action.value = null
  actionError.value = ''
}

async function submitAction() {
  const target = action.value
  if (!target || busy.value || !canSubmit.value) return
  busy.value = true
  actionError.value = ''

  try {
    if (target.type === 'rename') {
      await $fetch(`/api/account/skins/${target.preset.id}`, {
        method: 'PATCH',
        body: { name: nameInput.value.trim() },
        retry: false
      })
    } else {
      await $fetch(`/api/account/skins/${target.preset.id}`, { method: 'DELETE', retry: false })
    }

    clearNuxtData(key => key === 'skin-library' || key === `skin-preset:${target.preset.id}`)
    toast.success(target.type === 'rename' ? '皮肤名称已更新' : '皮肤已删除')
    action.value = null
    await refresh()
  } catch (cause) {
    actionError.value = apiErrorMessage(cause)
    if (apiErrorCode(cause) === 'PRESET_NOT_FOUND') await refresh()
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="py-4">
    <header class="mb-8">
      <div class="d-flex flex-wrap align-center justify-space-between ga-4 mb-6">
        <h1 class="text-h4 font-weight-bold">我的皮肤</h1>
        <v-btn to="/" variant="tonal" prepend-icon="mdi-image-multiple-outline">浏览皮肤库</v-btn>
      </div>
      <form class="my-skins__toolbar" role="search" @submit.prevent="applySearch">
        <v-text-field
          v-model="searchInput"
          label="搜索自己的皮肤"
          type="search"
          prepend-inner-icon="mdi-magnify"
          variant="solo-filled"
          density="comfortable"
          rounded="xl"
          maxlength="100"
          autocomplete="off"
          :disabled="busy"
          single-line
          hide-details
          clearable
          flat
          class="my-skins__search"
        />
        <span v-if="data && !error" class="text-body-2 text-medium-emphasis flex-shrink-0" aria-live="polite">
          {{ appliedSearch ? '找到' : '共' }} {{ total }} 款皮肤
        </span>
      </form>
    </header>

    <v-row v-if="pending" aria-label="正在加载我的皮肤">
      <v-col v-for="item in 8" :key="item" cols="12" sm="6" md="4" lg="3">
        <v-skeleton-loader type="image, list-item-two-line, actions" class="rounded-xl" />
      </v-col>
    </v-row>

    <v-alert v-else-if="error" type="error" variant="tonal" rounded="xl">
      <div class="d-flex flex-wrap align-center justify-space-between ga-3">
        <span>{{ apiErrorMessage(error, '皮肤加载失败，请稍后重试。') }}</span>
        <v-btn variant="text" prepend-icon="mdi-refresh" @click="refresh()">重新加载</v-btn>
      </div>
    </v-alert>

    <v-sheet v-else-if="!presets.length" class="text-center pa-12" rounded="xl">
      <v-icon :icon="appliedSearch ? 'mdi-magnify-close' : 'mdi-image-multiple-outline'" size="48" class="text-medium-emphasis mb-4" />
      <h2 class="text-h6 mb-2">{{ appliedSearch ? '没有找到匹配的皮肤' : '还没有上传皮肤' }}</h2>
      <p class="text-body-2 text-medium-emphasis mb-0">
        {{ appliedSearch ? '试试其他关键词，或清除搜索。' : '使用当前账号在游戏内分享预设后，即可在这里管理。' }}
      </p>
      <v-btn v-if="appliedSearch" variant="tonal" color="primary" class="mt-4" @click="resetSearch">清除搜索</v-btn>
    </v-sheet>

    <v-row v-else>
      <v-col v-for="item in presets" :key="item.id" cols="12" sm="6" md="4" lg="3">
        <v-card class="my-skin-card">
          <v-card :to="`/skins/${item.id}`" rounded="xl" :aria-label="`查看皮肤：${item.name}`" class="flex-grow-1">
            <PonyThumbnail :config="item.config" :name="item.name" />
            <div class="pa-4">
              <h2 class="text-subtitle-1 font-weight-bold text-truncate mb-2" :title="item.name">{{ item.name }}</h2>
              <p class="text-body-2 text-medium-emphasis mb-0">更新于 {{ formatDate(item.updated_at) }}</p>
            </div>
          </v-card>
          <v-card-actions class="px-3 pb-3">
            <v-btn
              variant="text"
              size="small"
              prepend-icon="mdi-pencil-outline"
              :aria-label="`重命名皮肤：${item.name}`"
              :disabled="busy"
              @click="openAction('rename', item)"
            >重命名</v-btn>
            <v-spacer />
            <v-btn
              variant="text"
              size="small"
              color="error"
              prepend-icon="mdi-delete-outline"
              :aria-label="`删除皮肤：${item.name}`"
              :disabled="busy"
              @click="openAction('delete', item)"
            >删除</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-pagination
      v-if="!error && pageCount > 1"
      v-model="page"
      :length="pageCount"
      :total-visible="5"
      :disabled="busy || pending"
      size="small"
      class="mt-6"
    />

    <v-dialog :model-value="Boolean(action)" :persistent="busy" max-width="480" aria-labelledby="skin-action-title" @update:model-value="closeAction">
      <v-card>
        <v-form @submit.prevent="submitAction">
          <v-card-title id="skin-action-title">{{ action?.type === 'delete' ? '删除皮肤' : '重命名皮肤' }}</v-card-title>
          <v-card-text>
            <div aria-live="polite">
              <FormAlert :message="actionError" type="error" />
            </div>
            <v-text-field
              v-if="action?.type === 'rename'"
              v-model="nameInput"
              label="皮肤名称"
              :rules="nameRules"
              :disabled="busy"
              :counter="64"
              maxlength="64"
              validate-on="blur"
              autocomplete="off"
              autofocus
              required
            />
            <p v-else class="my-skins__delete-message mb-0">
              确定删除「{{ action?.preset.name }}」吗？删除后将从皮肤库移除，此操作无法撤销。
            </p>
          </v-card-text>
          <v-card-actions class="px-4 pb-4">
            <v-spacer />
            <v-btn type="button" variant="text" :disabled="busy" @click="closeAction">取消</v-btn>
            <v-btn
              type="submit"
              variant="tonal"
              :color="action?.type === 'delete' ? 'error' : 'primary'"
              :loading="busy"
              :disabled="busy || !canSubmit"
            >{{ action?.type === 'delete' ? '删除' : '保存名称' }}</v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.my-skins__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.my-skins__search {
  flex: 1 1 320px;
  min-width: 0;
  max-width: 560px;
}

.my-skin-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.my-skins__delete-message {
  overflow-wrap: anywhere;
}
</style>
