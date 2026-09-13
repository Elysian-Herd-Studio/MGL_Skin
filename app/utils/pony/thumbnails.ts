import type { WebGLRenderer } from 'three'
import type { PonyConfig } from '../../../shared/utils/pony'
import { createPonyModel } from './model'
import { createPonyRenderer, createPonyStage } from './stage'

const cache = new Map<string, string>()
let renderer: WebGLRenderer | undefined
let queue = Promise.resolve()
let releaseTimer: ReturnType<typeof setTimeout> | undefined

function releaseRenderer() {
  renderer?.dispose()
  renderer?.forceContextLoss()
  renderer = undefined
}

export function ponyThumbnail(config: PonyConfig, baseURL: string, signal: AbortSignal): Promise<string> {
  const key = baseURL + JSON.stringify(config)
  const render = async () => {
    signal.throwIfAborted()
    const cached = cache.get(key)
    if (cached) {
      cache.delete(key)
      cache.set(key, cached)
      return cached
    }
    const model = await createPonyModel(config, baseURL)
    try {
      signal.throwIfAborted()
      clearTimeout(releaseTimer)
      if (renderer?.getContext().isContextLost()) releaseRenderer()
      renderer ??= createPonyRenderer()
      renderer.setSize(480, 384, false)
      const stage = createPonyStage(model)
      stage.resize(480, 384)
      renderer.render(stage.scene, stage.camera)
      const url = renderer.domElement.toDataURL('image/png')
      cache.set(key, url)
      if (cache.size > 80) cache.delete(cache.keys().next().value!)
      return url
    } finally {
      model.dispose()
      releaseTimer = setTimeout(releaseRenderer, 5_000)
    }
  }
  const pending = queue.then(render)
  queue = pending.then(() => undefined, () => undefined)
    .then(() => new Promise<void>(resolve => setTimeout(resolve, 0)))
  return pending
}
