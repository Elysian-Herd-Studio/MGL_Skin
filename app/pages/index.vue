<script setup lang="ts">
import type { SkinPreset } from '../../shared/types/skin'
import { PONY_KINDS, parsePonyConfig, ponyKind } from '../../shared/utils/pony'

useSeoMeta({ title: '皮肤库 · MGL Skin', description: '搜索社区分享的小马皮肤，按类型筛选并查看动态预览。' })

const searchInput = ref<string | null>('')
const appliedSearch = ref('')
const selectedKind = ref('')
const kindOptions = [
  { title: '全部类型', value: '' },
  ...PONY_KINDS.map(kind => ({ title: kind, value: kind }))
]
const query = computed(() => ({ q: appliedSearch.value, kind: selectedKind.value }))
const hasFilters = computed(() => Boolean(appliedSearch.value || selectedKind.value))

watch(searchInput, (_, __, onCleanup) => {
  const timer = setTimeout(applySearch, 300)
  onCleanup(() => clearTimeout(timer))
})

function applySearch() {
  appliedSearch.value = (searchInput.value ?? '').trim()
}

function resetFilters() {
  searchInput.value = ''
  appliedSearch.value = ''
  selectedKind.value = ''
}

const { data, pending, error, refresh } = await useFetch<{ items: SkinPreset[] }>('/api/skins', { query })
const presets = computed(() => (data.value?.items ?? []).map(item => ({
  ...item, config: parsePonyConfig(item.data)
})))
</script>

<template>
  <div class="py-4">
    <header class="mb-8">
      <h1 class="text-h4 font-weight-bold mb-6">皮肤库</h1>
      <form class="skin-library__toolbar" role="search" @submit.prevent="applySearch">
        <v-text-field
          v-model="searchInput"
          label="搜索皮肤名称或分享者"
          type="search"
          prepend-inner-icon="mdi-magnify"
          variant="solo-filled"
          density="comfortable"
          rounded="xl"
          maxlength="100"
          autocomplete="off"
          single-line
          hide-details
          clearable
          flat
          class="skin-library__search"
        />
        <v-menu location="bottom end">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              type="button"
              variant="tonal"
              :color="selectedKind ? 'primary' : undefined"
              prepend-icon="mdi-filter-variant"
              rounded="xl"
              height="48"
              class="flex-shrink-0"
              :aria-label="selectedKind ? `过滤器：${selectedKind}` : '过滤器：全部类型'"
            >过滤器<span v-if="selectedKind" class="ml-1">(1)</span></v-btn>
          </template>
          <v-list :selected="[selectedKind]" min-width="220" rounded="xl" density="comfortable" color="primary">
            <v-list-subheader>小马类型</v-list-subheader>
            <v-list-item
              v-for="option in kindOptions"
              :key="option.value"
              :value="option.value"
              :title="option.title"
              :active="selectedKind === option.value"
              @click="selectedKind = option.value"
            >
              <template #append>
                <v-icon v-if="selectedKind === option.value" icon="mdi-check" size="18" />
              </template>
            </v-list-item>
          </v-list>
        </v-menu>
      </form>
    </header>

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
      <v-icon :icon="hasFilters ? 'mdi-magnify-close' : 'mdi-image-multiple-outline'" size="48" class="text-medium-emphasis mb-4" />
      <h2 class="text-h6 mb-2">{{ hasFilters ? '没有找到匹配的皮肤' : '暂无皮肤' }}</h2>
      <p class="text-body-2 text-medium-emphasis mb-0">
        {{ hasFilters ? '试试其他关键词，或调整过滤条件。' : '在游戏内分享预设后，会显示在这里。' }}
      </p>
      <v-btn v-if="hasFilters" variant="tonal" color="primary" class="mt-4" @click="resetFilters">清除搜索和过滤</v-btn>
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
.skin-library__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.skin-library__search {
  flex: 1 1 560px;
  min-width: 0;
  max-width: 560px;
}

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
