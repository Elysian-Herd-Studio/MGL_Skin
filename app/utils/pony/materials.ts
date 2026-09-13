import {
  AlwaysStencilFunc, DataTexture, DoubleSide, EqualStencilFunc, KeepStencilOp,
  NearestFilter, NoColorSpace, ReplaceStencilOp, ShaderMaterial
} from 'three'
import { decodeCutieMark, type ManePart, type PonyConfig } from '../../../shared/utils/pony'
import { loadDyeMask } from './assets'
import { automaticHighlight, automaticShadow, colorRamp, recolor, recolorEye, remapIris, rgb, tint } from './palette'
import type { Cube, DyeMask, PonyAssets } from './types'

const eyeBones = new Set(['CommonFace', 'Style02CommonFace', 'Style03CommonFace', 'Smeile', 'Style03Smile', 'Angry', 'close', 'ScrunchedEyes', 'shut'])
const pupilBone = /^[lr]eye[23]?$/
const partNames = { frontMane: 'FRONT', backMane: 'BACK', tail: 'TAIL' } as const
const bodyColors: Record<string, keyof PonyConfig> = {
  Body: 'bodyColor', Neck: 'neckColor', Head: 'headColor', Nose: 'noseColor',
  LeftEar: 'leftEarColor', RightEar: 'rightEarColor', Horn: 'hornColor'
}

const vertexShader = `
varying vec2 atlasUv;
varying vec3 lightNormal;
void main() {
  atlasUv = uv;
  lightNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const fragmentShader = `
uniform sampler2D atlas;
varying vec2 atlasUv;
varying vec3 lightNormal;
void main() {
  vec4 color = texture2D(atlas, atlasUv);
  if (color.a < 0.1) discard;
  vec3 n = normalize(lightNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  float key = max(0.0, dot(n, normalize(vec3(-0.5, 0.5, 0.7071068))));
  float fill = max(0.0, dot(n, normalize(vec3(0.35, 0.2, 0.9151503))));
  gl_FragColor = vec4(color.rgb * min(1.0, 0.4 + (key + fill) * 0.6), color.a);
}`

function textureFrom(source: ImageData, map?: (color: number, x: number, y: number) => number) {
  const pixels = new Uint8Array(source.data)
  if (map) {
    for (let offset = 0; offset < pixels.length; offset += 4) {
      if (!pixels[offset + 3]) continue
      const index = offset / 4
      const original = pixels[offset]! << 16 | pixels[offset + 1]! << 8 | pixels[offset + 2]!
      const color = map(original, index % source.width, Math.floor(index / source.width))
      pixels[offset] = color >> 16 & 255
      pixels[offset + 1] = color >> 8 & 255
      pixels[offset + 2] = color & 255
    }
  }
  const texture = new DataTexture(pixels, source.width, source.height)
  texture.flipY = false
  texture.magFilter = NearestFilter
  texture.minFilter = NearestFilter
  texture.generateMipmaps = false
  texture.colorSpace = NoColorSpace
  texture.needsUpdate = true
  return texture
}

function channelsFor(mask: DyeMask, part: ManePart) {
  const channels = new Uint8Array(mask.texture_width * mask.texture_height)
  for (const region of mask.regions) {
    if (region.part !== partNames[part]) continue
    const channel = mask.version < 3 ? region.channel === 1 ? 4 : 5 : region.channel
    for (const [y, start, end] of region.runs) {
      channels.fill(channel, y * mask.texture_width + start, y * mask.texture_width + end)
    }
  }
  return channels
}

function isPupil(cube: Cube) {
  if (!Array.isArray(cube.uv)) return false
  const [u, v] = cube.uv
  const width = (Math.floor(cube.size[0]) + Math.floor(cube.size[2])) * 2
  const height = Math.floor(cube.size[1]) + Math.floor(cube.size[2])
  return u >= 7.99 && u + width <= 16.01 && v >= 4.99 && v + height <= 10.01 && width > 5
}

function isSclera(cube: Cube) {
  if (Array.isArray(cube.uv)) return false
  const face = cube.uv.north
  if (!face) return false
  const [u, v] = face.uv
  const [w, h] = face.uv_size
  return Math.min(u, u + w) >= 0 && Math.max(u, u + w) <= 0.5
    && Math.min(v, v + h) >= 62 && Math.max(v, v + h) <= 63
}

export async function createPonyMaterials(config: PonyConfig, assets: PonyAssets, baseURL: string) {
  const masks = new Map<ManePart, { mask: DyeMask, channels: Uint8Array }>()
  if (config.maneDyeEnabled) {
    await Promise.all((['frontMane', 'backMane', 'tail'] as const).map(async (part) => {
      const mask = await loadDyeMask(config[`${part}Style`], baseURL)
      masks.set(part, { mask, channels: channelsFor(mask, part) })
    }))
  }

  const textures = new Map<string, DataTexture>()
  const materials = new Map<string, ShaderMaterial>()

  function material(key: string, makeTexture: () => DataTexture, role: 'body' | 'eye' | 'mask' | 'pupil' = 'body') {
    const id = `${key}:${role}`
    let result = materials.get(id)
    if (result) return result
    let texture = textures.get(key)
    if (!texture) {
      texture = makeTexture()
      textures.set(key, texture)
    }
    result = new ShaderMaterial({
      uniforms: { atlas: { value: texture } },
      vertexShader,
      fragmentShader,
      side: DoubleSide,
      stencilWrite: role === 'mask' || role === 'pupil',
      stencilRef: 1,
      stencilFunc: role === 'pupil' ? EqualStencilFunc : AlwaysStencilFunc,
      stencilWriteMask: 0xff,
      stencilFail: KeepStencilOp,
      stencilZFail: KeepStencilOp,
      stencilZPass: role === 'mask' ? ReplaceStencilOp : KeepStencilOp
    })
    result.userData.renderOrder = { body: 0, mask: 1, pupil: 2, eye: 3 }[role]
    materials.set(id, result)
    return result
  }

  function eyeMaterial(cube: Cube, role: 'eye' | 'mask' | 'pupil') {
    const black = isPupil(cube) ? config.pupilColor : config.eyelashColor
    return material(`eye:${black}`, () => {
      const iris = rgb(config.irisColor)
      const light = config.irisLightColorLocked ? remapIris(0x7BA1D2, 0x516BD1, iris) : rgb(config.irisLightColor)
      return textureFrom(assets.base, (color, x, y) => recolorEye(color,
        (x + 0.5) * 128 / assets.base.width, (y + 0.5) * 128 / assets.base.height,
        iris, light, rgb(black), rgb(config.scleraColor)))
    }, role)
  }

  function maneMaterial(part: ManePart) {
    return material(part, () => {
      const linked = part !== 'frontMane' && config[`${part}ColorLocked`]
      const palettePart = linked ? 'frontMane' : part
      const base = rgb(config[`${palettePart}Color`])
      const shadow = config[`${palettePart}ShadowColorLocked`] ? automaticShadow(base) : rgb(config[`${palettePart}ShadowColor`])
      const highlight = config[`${palettePart}HighlightColorLocked`] ? automaticHighlight(base) : rgb(config[`${palettePart}HighlightColor`])
      const baseRamp = colorRamp(base, shadow, highlight)
      const colors = [base, ...config[`${part}DyeColors`].map(color => color ? rgb(color) : base)]
      const ramps = colors.map(color => color === base ? baseRamp : colorRamp(color))
      const dye = masks.get(part)
      return textureFrom(assets.mane, (color, x, y) => {
        const channel = dye ? dye.channels[
          Math.floor((y + 0.5) * dye.mask.texture_height / assets.mane.height) * dye.mask.texture_width
          + Math.floor((x + 0.5) * dye.mask.texture_width / assets.mane.width)
        ]! : 0
        return config.maneShadingMode === 'legacy' ? tint(color, colors[channel]!) : recolor(color, ramps[channel]!)
      })
    })
  }

  function bodyMaterial(name: string) {
    const field = bodyColors[name]
      ?? (/^L(?:Front|ForeLeg)/.test(name) ? 'leftFrontLimbColor'
        : /^R(?:Front|ForeLeg)/.test(name) ? 'rightFrontLimbColor'
          : name.startsWith('LHind') ? 'leftHindLimbColor'
            : name.startsWith('RHind') ? 'rightHindLimbColor'
              : /wing/i.test(name) ? 'wingColor' : undefined)
    if (!field) return material('base', () => textureFrom(assets.base))
    const base = rgb(String(config[field]))
    const side = name === 'LHindLeg' ? 'left' : name === 'RHindLeg' ? 'right' : ''
    const mark = side ? decodeCutieMark(side === 'left' || config.cutieMarkLinked ? config.cutieMarkLeft : config.cutieMarkRight) : null
    return material(`body:${base}:${mark ? side : ''}`, () => {
      const main = base === rgb(config.bodyColor)
      const shadow = main && !config.bodyShadowColorLocked ? rgb(config.bodyShadowColor) : automaticShadow(base)
      const highlight = main && !config.bodyHighlightColorLocked ? rgb(config.bodyHighlightColor) : automaticHighlight(base)
      const ramp = colorRamp(base, shadow, highlight)
      return textureFrom(assets.base, (original, x, y) => {
        const color = config.bodyShadingMode === 'legacy' ? tint(original, base) : recolor(original, ramp)
        if (!mark) return color
        const dx = Math.floor(x * 256 / assets.base.width) - (side === 'left' ? 88 : 56)
        const dy = Math.floor(y * 256 / assets.base.height) - (side === 'left' ? 54 : 78)
        if (dx < 0 || dx >= 12 || dy < 0 || dy >= 12) return color
        const index = (dy * 12 + 11 - dx) * 4
        if (mark[index + 3] !== 255) return color
        const shade = (54 * (original >> 16 & 255) + 183 * (original >> 8 & 255) + 19 * (original & 255) + 128) >> 8
        return tint(mark[index]! << 16 | mark[index + 1]! << 8 | mark[index + 2]!, shade * 0x010101)
      })
    })
  }

  return {
    get(name: string, cube: Cube) {
      if (pupilBone.test(name)) return eyeMaterial(cube, 'pupil')
      if (eyeBones.has(name)) return eyeMaterial(cube, isSclera(cube) ? 'mask' : 'eye')
      if (/tail/i.test(name)) return maneMaterial('tail')
      if (/backmane/i.test(name)) return maneMaterial('backMane')
      if (/mane/i.test(name)) return maneMaterial('frontMane')
      return bodyMaterial(name)
    },
    dispose() {
      materials.forEach(item => item.dispose())
      textures.forEach(item => item.dispose())
      materials.clear()
      textures.clear()
    }
  }
}
