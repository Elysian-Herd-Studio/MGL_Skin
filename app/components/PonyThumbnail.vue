<script setup lang="ts">
import type { PonyConfig } from '../../shared/utils/pony'

const props = defineProps<{ config: PonyConfig | null, name: string }>()
const baseURL = useRuntimeConfig().app.baseURL
const container = ref<HTMLElement | null>(null)
const source = ref('')
const failed = ref(false)
let observer: IntersectionObserver | undefined
let controller: AbortController | undefined
let visible = false

async function load() {
  controller?.abort()
  const request = new AbortController()
  controller = request
  source.value = ''
  failed.value = false
  const config = props.config
  if (!config) {
    failed.value = true
    return
  }
  try {
    const { ponyThumbnail } = await import('../utils/pony/thumbnails')
    const url = await ponyThumbnail(config, baseURL, request.signal)
    if (!request.signal.aborted) source.value = url
  } catch {
    if (!request.signal.aborted) failed.value = true
  }
}

watch(() => props.config, () => {
  controller?.abort()
  source.value = ''
  failed.value = false
  if (visible) void load()
})

onMounted(() => {
  if (!container.value) return
  if (!('IntersectionObserver' in window)) {
    visible = true
    void load()
    return
  }
  observer = new IntersectionObserver((entries) => {
    if (!entries.some(entry => entry.isIntersecting)) return
    visible = true
    observer?.disconnect()
    void load()
  }, { rootMargin: '160px' })
  observer.observe(container.value)
})

onBeforeUnmount(() => {
  controller?.abort()
  observer?.disconnect()
})
</script>

<template>
  <div ref="container" class="pony-thumbnail" :aria-busy="!source && !failed">
    <img v-if="source" :src="source" :alt="`${name}的预览图`" width="480" height="384" decoding="async">
    <div v-else class="pony-thumbnail__placeholder text-medium-emphasis">
      <v-icon :icon="failed ? 'mdi-image-off-outline' : 'mdi-image-outline'" size="32" />
      <span class="text-caption">{{ failed ? '预览暂不可用' : '正在准备预览' }}</span>
    </div>
  </div>
</template>

<style scoped>
.pony-thumbnail {
  aspect-ratio: 5 / 4;
  overflow: hidden;
  border-radius: 24px;
  background: radial-gradient(ellipse at 50% 35%, rgb(var(--v-theme-preview-center)) 0%, rgb(var(--v-theme-preview-edge)) 100%);
}

.pony-thumbnail img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.pony-thumbnail__placeholder {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
}
</style>
