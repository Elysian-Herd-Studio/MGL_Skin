<script setup lang="ts">
import type { SkinPreset } from '../../shared/types/skin'
import { parsePonyConfig, ponyKind } from '../../shared/utils/pony'

useSeoMeta({ title: '共享预设 · MGL Skin', description: '浏览社区分享的小马预设，查看外观和动态预览。' })

const { data, pending, error, refresh } = await useFetch<{ items: SkinPreset[] }>('/api/skins')
const presets = computed(() => (data.value?.items ?? []).map(item => ({
  ...item, config: parsePonyConfig(item.data)
})))
</script>

<template>
  <div class="py-4">
    <div class="d-flex flex-wrap align-center justify-space-between ga-4 mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-2">共享预设</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">浏览小马外观，点击预设查看动态预览与详细信息。</p>
      </div>
      <v-chip v-if="!pending && !error" variant="tonal" size="small">{{ presets.length }} 个预设</v-chip>
    </div>

    <v-row v-if="pending" aria-label="正在加载预设">
      <v-col v-for="item in 8" :key="item" cols="12" sm="6" md="4" lg="3">
        <v-skeleton-loader type="image, list-item-two-line" class="rounded-xl" />
      </v-col>
    </v-row>

    <v-alert v-else-if="error" type="error" variant="tonal" rounded="lg">
      <div class="d-flex flex-wrap align-center justify-space-between ga-3">
        <span>预设加载失败，请稍后重试。</span>
        <v-btn variant="text" prepend-icon="mdi-refresh" @click="refresh()">重新加载</v-btn>
      </div>
    </v-alert>

    <v-sheet v-else-if="!presets.length" class="text-center pa-12" rounded="xl" border>
      <v-icon icon="mdi-image-multiple-outline" size="48" class="text-medium-emphasis mb-4" />
      <h2 class="text-h6 mb-2">暂无共享预设</h2>
      <p class="text-body-2 text-medium-emphasis mb-0">在游戏内分享预设后，会显示在这里。</p>
    </v-sheet>

    <v-row v-else>
      <v-col v-for="item in presets" :key="item.id" cols="12" sm="6" md="4" lg="3">
        <v-card :to="`/skins/${item.id}`" rounded="xl" class="preset-card" :aria-label="`查看预设：${item.name}`">
          <PonyThumbnail :config="item.config" :name="item.name" />
          <div class="pa-4">
            <div class="d-flex align-center ga-2 mb-2">
              <h2 class="preset-card__title text-subtitle-1 font-weight-bold" :title="item.name">{{ item.name }}</h2>
              <v-chip v-if="item.config" size="x-small" variant="tonal" class="flex-shrink-0">{{ ponyKind(item.config) }}</v-chip>
            </div>
            <p class="text-body-2 text-medium-emphasis text-truncate mb-0">
              <v-icon icon="mdi-account-outline" size="16" class="mr-1" />{{ item.username }}
            </p>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.preset-card {
  height: 100%;
}

.preset-card__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
