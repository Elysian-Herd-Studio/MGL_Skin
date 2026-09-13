import type { Vector } from './types'

export const rgb = (color: string) => Number.parseInt(color.slice(-6), 16)
const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)))

function hsv(color: number): Vector {
  const r = (color >> 16 & 255) / 255
  const g = (color >> 8 & 255) / 255
  const b = (color & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const hue = delta === 0 ? 0 : max === r ? (g - b) / delta : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4
  return [(hue * 60 + 360) % 360, max === 0 ? 0 : delta / max, max]
}

function fromHsv(hue: number, saturation: number, value: number) {
  const h = ((hue % 360) + 360) % 360 / 60
  const f = h - Math.floor(h)
  const p = value * (1 - saturation)
  const q = value * (1 - saturation * f)
  const t = value * (1 - saturation * (1 - f))
  const channels: Vector[] = [[value, t, p], [q, value, p], [p, value, t], [p, q, value], [t, p, value], [value, p, q]]
  const [r, g, b] = channels[Math.floor(h)]!
  return clamp(r * 255) << 16 | clamp(g * 255) << 8 | clamp(b * 255)
}

export function automaticShadow(base: number) {
  let [h, s, v] = hsv(base)
  if (s > 0.02) {
    h += h < 90 || h >= 280 ? -6 : 6
    s = Math.min(1, s * 1.08)
  }
  return fromHsv(h, s, v * 0.89)
}

export function automaticHighlight(base: number) {
  const [h, s, v] = hsv(base)
  return fromHsv(h, s * 0.9, v + (1 - v) * 0.04)
}

function mix(a: number, b: number, amount: number) {
  return clamp((a >> 16 & 255) * (1 - amount) + (b >> 16 & 255) * amount) << 16
    | clamp((a >> 8 & 255) * (1 - amount) + (b >> 8 & 255) * amount) << 8
    | clamp((a & 255) * (1 - amount) + (b & 255) * amount)
}

export function colorRamp(base: number, shadow = automaticShadow(base), highlight = automaticHighlight(base)) {
  return Uint32Array.from({ length: 256 }, (_, level) => {
    if (level < 224) return mix(0, shadow, level / 224)
    if (level < 245) return mix(shadow, base, (level - 224) / 21)
    return mix(base, highlight, (level - 245) / 10)
  })
}

export function recolor(color: number, ramp: Uint32Array) {
  const r = color >> 16 & 255
  const g = color >> 8 & 255
  const b = color & 255
  if (Math.max(r, g, b) - Math.min(r, g, b) > 12) return color
  const level = (54 * r + 183 * g + 19 * b + 128) >> 8
  const mapped = ramp[level]!
  return clamp((mapped >> 16 & 255) + r - level) << 16
    | clamp((mapped >> 8 & 255) + g - level) << 8
    | clamp((mapped & 255) + b - level)
}

export function tint(color: number, base: number) {
  return clamp((color >> 16 & 255) * (base >> 16 & 255) / 255) << 16
    | clamp((color >> 8 & 255) * (base >> 8 & 255) / 255) << 8
    | clamp((color & 255) * (base & 255) / 255)
}

export function remapIris(source: number, reference: number, target: number) {
  if (reference === target) return source
  const [h, s, v] = hsv(source)
  const [rh, rs, rv] = hsv(reference)
  const [th, ts, tv] = hsv(target)
  return fromHsv(th + h - rh, Math.min(1, ts * s / rs), Math.min(1, Math.max(12 / 255, tv) * v / rv))
}

export function recolorEye(color: number, u: number, v: number, iris: number, light: number, dark: number, white: number) {
  if (u >= 2 && u < 4 && v >= 64 && v < 67) return remapIris(color, 0x516BD1, iris)
  if (u >= 1.5 && u < 2 && v >= 63.5 && v < 64) return remapIris(color, 0x7BA1D2, light)
  if (u < 0.5 && v >= 62 && v < 63) return tint(color, white)
  if (u >= 8 && u < 16 && v < 10) {
    const r = (dark >> 16 & 255) + (255 - (dark >> 16 & 255)) * (color >> 16 & 255) / 255
    const g = (dark >> 8 & 255) + (255 - (dark >> 8 & 255)) * (color >> 8 & 255) / 255
    const b = (dark & 255) + (255 - (dark & 255)) * (color & 255) / 255
    return clamp(r) << 16 | clamp(g) << 8 | clamp(b)
  }
  return color
}
