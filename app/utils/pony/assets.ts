import type { Animation, DyeMask, Geometry, PonyAssets } from './types'

const assets = new Map<string, Promise<PonyAssets>>()
const masks = new Map<string, Promise<DyeMask>>()

function assetUrl(baseURL: string, path: string) {
  return `${baseURL.replace(/\/$/, '')}/pony/${path}`
}

async function loadJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error('模型资源加载失败')
  return response.json()
}

function loadImage(url: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const timer = window.setTimeout(() => {
      image.onload = null
      image.onerror = null
      image.src = ''
      reject(new Error('贴图加载超时'))
    }, 20_000)
    image.onload = () => {
      window.clearTimeout(timer)
      try {
        const canvas = document.createElement('canvas')
        canvas.width = image.naturalWidth
        canvas.height = image.naturalHeight
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) throw new Error('无法读取模型贴图')
        context.drawImage(image, 0, 0)
        resolve(context.getImageData(0, 0, canvas.width, canvas.height))
      } catch (error) {
        reject(error)
      }
    }
    image.onerror = () => {
      window.clearTimeout(timer)
      reject(new Error('贴图加载失败'))
    }
    image.src = url
  })
}

export function loadPonyAssets(baseURL: string) {
  let pending = assets.get(baseURL)
  if (!pending) {
    pending = Promise.all([
      loadJson<{ 'minecraft:geometry': Geometry[] }>(assetUrl(baseURL, 'geo/mare_geo.json')),
      loadJson<{ animations: Record<string, Animation> }>(assetUrl(baseURL, 'animations/mare_animation.json')),
      loadImage(assetUrl(baseURL, 'textures/entity/base.png')),
      loadImage(assetUrl(baseURL, 'textures/entity/mane.png'))
    ]).then(([model, animation, base, mane]) => {
      const geometry = model['minecraft:geometry'][0]
      if (!geometry?.bones.length) throw new Error('模型数据无效')
      return { geometry, animations: animation.animations, base, mane }
    }).catch((error) => {
      assets.delete(baseURL)
      throw error
    })
    assets.set(baseURL, pending)
  }
  return pending
}

export function loadDyeMask(style: string, baseURL: string) {
  const url = assetUrl(baseURL, `mane_dyes/${style === '01' ? 'stripe01' : `style${style}`}.json`)
  let pending = masks.get(url)
  if (!pending) {
    pending = loadJson<DyeMask>(url).catch((error) => {
      masks.delete(url)
      throw error
    })
    masks.set(url, pending)
  }
  return pending
}
