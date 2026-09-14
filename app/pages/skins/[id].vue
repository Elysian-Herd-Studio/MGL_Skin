<script setup lang="ts">
import type { SkinPresetDetail } from '../../../shared/types/skin'
import { parsePonyConfig } from '../../../shared/utils/pony'

definePageMeta({
  key: route => String(route.params.id),
  validate: route => /^[1-9]\d*$/.test(String(route.params.id)) && Number.isSafeInteger(Number(route.params.id))
})

const route = useRoute()
const { user } = useUserSession()
const { data: preset, pending, error, refresh } = await useFetch<SkinPresetDetail>(() => `/api/skins/${route.params.id}`, {
  key: computed(() => `skin-preset:${route.params.id}:${user.value?.id ?? 'guest'}`)
})
if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: '预设不存在或无权查看', fatal: true })
}

const config = computed(() => preset.value ? parsePonyConfig(preset.value.data) : null)
const isOwner = computed(() => Boolean(preset.value && user.value?.id === preset.value.userId))

useSeoMeta({
  title: () => preset.value ? `${preset.value.name} · MGL Skin` : '预设详情 · MGL Skin',
  description: () => preset.value ? `查看 ${preset.value.username} 上传的「${preset.value.name}」预设的基本信息与动态预览。` : '查看小马预设的基本信息。',
  robots: () => preset.value?.isPublic ? 'index, follow' : 'noindex, nofollow'
})

const dateFormat = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Shanghai' })

function formatDate(value: string) {
  const date = new Date(`${value.replace(' ', 'T')}Z`)
  return Number.isNaN(date.getTime()) ? '—' : dateFormat.format(date)
}
</script>

<template>
  <div class="py-3">
    <v-btn :to="isOwner ? '/my-skins' : '/'" variant="text" prepend-icon="mdi-arrow-left" class="mb-5">返回预设列表</v-btn>

    <v-row v-if="pending" aria-label="正在加载预设详情">
      <v-col cols="12" md="8"><v-skeleton-loader type="image, image, actions" class="rounded-xl" /></v-col>
      <v-col cols="12" md="4"><v-skeleton-loader type="heading, paragraph" class="rounded-xl" /></v-col>
    </v-row>

    <v-alert v-else-if="error" type="error" variant="tonal">
      <div class="d-flex flex-wrap align-center justify-space-between ga-3">
        <span>预设信息加载失败，请稍后重试。</span>
        <v-btn variant="text" prepend-icon="mdi-refresh" @click="refresh()">重新加载</v-btn>
      </div>
    </v-alert>

    <v-row v-else-if="preset" class="align-start">
      <v-col cols="12" md="8">
        <PonyViewer :config="config" :name="preset.name" />
      </v-col>

      <v-col cols="12" md="4">
        <div class="preset-details pa-1 pa-sm-3">
          <h1 class="text-h4 font-weight-bold mb-4">{{ preset.name }}</h1>

          <div class="d-flex align-center ga-3 mb-6" role="group" aria-label="上传者">
            <UserAvatar :src="preset.avatarUrl" :name="preset.username" :size="40" class="flex-shrink-0" />
            <span class="text-body-1 font-weight-medium">{{ preset.username }}</span>
          </div>

          <h2 class="text-subtitle-1 font-weight-bold mb-3">基本信息</h2>
          <dl class="preset-facts text-body-2">
            <dt>预设编号</dt><dd>#{{ preset.id }}</dd>
            <dt>可见范围</dt><dd>{{ preset.isPublic ? '公开展示' : '仅自己可见' }}</dd>
            <dt>上传时间</dt><dd>{{ formatDate(preset.created_at) }}</dd>
            <dt>更新时间</dt><dd>{{ formatDate(preset.updated_at) }}</dd>
          </dl>

          <v-btn v-if="isOwner" to="/my-skins" variant="tonal" prepend-icon="mdi-image-edit-outline" class="mt-6">
            管理我的皮肤
          </v-btn>
        </div>
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.preset-details {
  overflow-wrap: anywhere;
}

.preset-facts {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 14px 20px;
}

.preset-facts dt {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.preset-facts dd {
  margin: 0;
}
</style>
