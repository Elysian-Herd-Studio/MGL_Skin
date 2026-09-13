<script setup lang="ts">
import type { PonyConfig } from '../../shared/utils/pony'
import type { PonyViewer } from '../utils/pony/viewer'

const props = defineProps<{ config: PonyConfig | null, name: string }>()
const baseURL = useRuntimeConfig().app.baseURL
const stage = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const canvasKey = ref(0)
const status = ref<'loading' | 'ready' | 'error'>('loading')
const playing = ref(true)
let viewer: PonyViewer | undefined
let controller: AbortController | undefined
let resizeObserver: ResizeObserver | undefined
let visibilityObserver: IntersectionObserver | undefined
let mounted = false
let visible = true

function release() {
  controller?.abort()
  viewer?.dispose()
  viewer = undefined
}

function resize() {
  if (!stage.value) return
  const { width, height } = stage.value.getBoundingClientRect()
  viewer?.resize(width, height)
}

function fail() {
  status.value = 'error'
  release()
}

async function load() {
  status.value = 'loading'
  release()
  const request = new AbortController()
  controller = request
  canvasKey.value++
  await nextTick()
  if (request.signal.aborted || !canvas.value || !mounted) return
  const surface = canvas.value
  const config = props.config
  if (!config) {
    status.value = 'error'
    return
  }
  try {
    const { createPonyViewer } = await import('../utils/pony/viewer')
    request.signal.throwIfAborted()
    const instance = await createPonyViewer(surface, config, baseURL, request.signal, () => {
      if (!request.signal.aborted) fail()
    })
    if (request.signal.aborted) {
      instance.dispose()
      return
    }
    viewer = instance
    status.value = 'ready'
    viewer.setPlaying(playing.value)
    viewer.setVisible(visible)
    resize()
  } catch {
    if (!request.signal.aborted) fail()
  }
}

function contextLost() {
  if (status.value === 'ready') fail()
}

function rotate(horizontal: number, vertical: number) {
  viewer?.rotate(horizontal * Math.PI / 12, vertical * Math.PI / 12)
}

watch(playing, value => viewer?.setPlaying(value))
watch(() => props.config, () => { if (mounted) void load() })

onMounted(() => {
  mounted = true
  playing.value = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (stage.value) {
    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(resize)
      resizeObserver.observe(stage.value)
    }
    if ('IntersectionObserver' in window) {
      visibilityObserver = new IntersectionObserver(([entry]) => {
        visible = Boolean(entry?.isIntersecting)
        viewer?.setVisible(visible)
      })
      visibilityObserver.observe(stage.value)
    }
  }
  window.addEventListener('resize', resize)
  void load()
})

onBeforeUnmount(() => {
  mounted = false
  status.value = 'loading'
  resizeObserver?.disconnect()
  visibilityObserver?.disconnect()
  window.removeEventListener('resize', resize)
  release()
})
</script>

<template>
  <div class="pony-viewer">
    <div ref="stage" class="pony-viewer__stage" :aria-busy="status === 'loading'">
      <canvas
        v-show="status === 'ready'"
        :key="canvasKey"
        ref="canvas"
        class="pony-viewer__canvas"
        tabindex="0"
        role="img"
        :aria-label="`${name}的实时 3D 预览`"
        @webglcontextlost.prevent="contextLost"
        @keydown.left.prevent="rotate(-1, 0)"
        @keydown.right.prevent="rotate(1, 0)"
        @keydown.up.prevent="rotate(0, -1)"
        @keydown.down.prevent="rotate(0, 1)"
        @keydown.home.prevent="viewer?.reset()"
      />
      <div v-if="status !== 'ready'" class="pony-viewer__message" role="status">
        <template v-if="status === 'loading'">
          <v-progress-circular indeterminate color="primary" size="32" width="3" />
          <span class="text-body-2 text-medium-emphasis">正在加载预览…</span>
        </template>
        <template v-else>
          <v-icon icon="mdi-cube-off-outline" size="40" class="text-medium-emphasis" />
          <span class="text-body-2">{{ config ? '暂时无法显示 3D 预览' : '该预设的数据无法解析' }}</span>
          <v-btn v-if="config" variant="tonal" size="small" prepend-icon="mdi-refresh" @click="load">重试预览</v-btn>
        </template>
      </div>
    </div>
    <div class="pony-viewer__toolbar pa-3">
      <div class="d-flex ga-1 align-center">
        <v-btn
          variant="text"
          size="small"
          :disabled="status !== 'ready'"
          :prepend-icon="playing ? 'mdi-pause' : 'mdi-play'"
          :aria-pressed="playing"
          @click="playing = !playing"
        >{{ playing ? '暂停动画' : '播放动画' }}</v-btn>
        <v-btn variant="text" size="small" prepend-icon="mdi-restore" :disabled="status !== 'ready'" @click="viewer?.reset()">
          重置视角
        </v-btn>
      </div>
      <div class="d-flex ga-1">
        <v-btn icon="mdi-minus" variant="text" size="small" aria-label="缩小预览" :disabled="status !== 'ready'" @click="viewer?.zoom(1 / 1.2)" />
        <v-btn icon="mdi-plus" variant="text" size="small" aria-label="放大预览" :disabled="status !== 'ready'" @click="viewer?.zoom(1.2)" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.pony-viewer__stage {
  position: relative;
  height: clamp(320px, 62vh, 640px);
  overflow: hidden;
  border-radius: 24px;
  background: radial-gradient(ellipse at 50% 35%, #fff 0%, #f1f0f7 100%);
}

.pony-viewer__canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: grab;
}

.pony-viewer__canvas:active {
  cursor: grabbing;
}

.pony-viewer__canvas:focus-visible {
  outline: none;
  background-color: rgba(var(--v-theme-primary), 0.06);
}

.pony-viewer__message {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px;
  text-align: center;
}

.pony-viewer__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
</style>
