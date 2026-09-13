export type ManePart = 'frontMane' | 'backMane' | 'tail'

const defaults = {
  frontManeStyle: '01',
  backManeStyle: '01',
  tailStyle: '01',
  eyeStyle: '01',
  frontManeMirrored: false,
  backManeMirrored: false,
  tailMirrored: false,
  showHorn: true,
  showWings: false,
  bodyColor: '#FFFFFF',
  neckColor: '#FFFFFF',
  headColor: '#FFFFFF',
  noseColor: '#FFFFFF',
  leftEarColor: '#FFFFFF',
  rightEarColor: '#FFFFFF',
  hornColor: '#FFFFFF',
  wingColor: '#FFFFFF',
  leftFrontLimbColor: '#FFFFFF',
  rightFrontLimbColor: '#FFFFFF',
  leftHindLimbColor: '#FFFFFF',
  rightHindLimbColor: '#FFFFFF',
  bodyShadingMode: 'soft',
  bodyShadowColor: '#E3E3E3',
  bodyHighlightColor: '#FFFFFF',
  bodyShadowColorLocked: true,
  bodyHighlightColorLocked: true,
  frontManeColor: '#FFFFFF',
  backManeColor: '#FFFFFF',
  tailColor: '#FFFFFF',
  maneShadingMode: 'soft',
  maneColorLinkVersion: 0,
  backManeColorLocked: true,
  tailColorLocked: true,
  frontManeShadowColor: '#E3E3E3',
  frontManeHighlightColor: '#FFFFFF',
  backManeShadowColor: '#E3E3E3',
  backManeHighlightColor: '#FFFFFF',
  tailShadowColor: '#E3E3E3',
  tailHighlightColor: '#FFFFFF',
  frontManeShadowColorLocked: true,
  frontManeHighlightColorLocked: true,
  backManeShadowColorLocked: true,
  backManeHighlightColorLocked: true,
  tailShadowColorLocked: true,
  tailHighlightColorLocked: true,
  maneDyeEnabled: false,
  maneDyeColor: '#E45AA5',
  maneDyeAccentColor: '#71318F',
  frontManeDyeColors: [] as Array<string | null>,
  backManeDyeColors: [] as Array<string | null>,
  tailDyeColors: [] as Array<string | null>,
  irisColor: '#516BD1',
  irisLightColor: '#7BA1D2',
  irisLightColorLocked: true,
  eyelashColor: '#000000',
  scleraColor: '#FFFFFF',
  pupilColor: '#000000',
  magicGlowColor: '#AA00FF',
  cutieMarkLeft: '',
  cutieMarkRight: '',
  cutieMarkLinked: true
}

export type PonyConfig = typeof defaults

const maneLegacy: Record<string, string> = { TS: '01', RD: '02', RR: '03', PP: '04', AJ: '05', FS: '06' }
const eyeLegacy: Record<string, string> = { TS: '01', RR: '02', FS: '03' }

export function ponyColor(value: unknown, fallback = '#FFFFFF'): string {
  if (typeof value !== 'string' || !/^#?(?:[\da-f]{6}|[\da-f]{8})$/i.test(value)) return fallback
  return `#${value.slice(-6).toUpperCase()}`
}

export function decodeCutieMark(value: unknown): Uint8Array | null {
  if (typeof value !== 'string' || value.length !== 768 || !/^[\dA-Za-z+/]+$/.test(value)) return null
  try {
    const bytes = Uint8Array.from(atob(value), character => character.charCodeAt(0))
    if (bytes.length !== 576) return null
    for (let i = 3; i < bytes.length; i += 4) {
      if (bytes[i] !== 0 && bytes[i] !== 255) return null
    }
    return bytes
  } catch {
    return null
  }
}

function styleId(value: unknown, part: ManePart | 'eye') {
  if (typeof value !== 'string') return '01'
  const legacy = part === 'eye' ? eyeLegacy : maneLegacy
  const id = Object.hasOwn(legacy, value) ? legacy[value]! : value
  const available = part === 'eye' ? ['01', '02', '03']
    : part === 'backMane' ? ['01', '02', '03', '04', '05', '06', '08']
      : part === 'tail' ? ['01', '02', '03', '04', '05', '06', '07']
        : ['01', '02', '03', '04', '05', '06', '07', '08']
  return available.includes(id) ? id : '01'
}

export function parsePonyConfig(data: string): PonyConfig | null {
  if (!data || data.length > 1_000_000) return null
  try {
    const source: unknown = JSON.parse(data)
    if (!source || typeof source !== 'object' || Array.isArray(source)) return null
    const input = source as Record<string, unknown>
    const result: Record<string, unknown> = { ...defaults }

    for (const [key, fallback] of Object.entries(defaults)) {
      const value = input[key]
      if (key.endsWith('Color')) result[key] = ponyColor(value, String(fallback))
      else if (typeof fallback === 'boolean') result[key] = typeof value === 'boolean' ? value : fallback
    }

    const config = result as PonyConfig
    for (const part of ['frontMane', 'backMane', 'tail'] as const) {
      config[`${part}Style`] = styleId(input[`${part}Style`], part)
      const colors = input[`${part}DyeColors`]
      config[`${part}DyeColors`] = Array.isArray(colors)
        ? Array.from({ length: 6 }, (_, i) => ponyColor(colors[i], '') || null)
        : [null, null, null, config.maneDyeColor, part === 'backMane' ? config.maneDyeAccentColor : config.maneDyeColor, null]
    }
    config.eyeStyle = styleId(input.eyeStyle, 'eye')
    config.bodyShadingMode = input.bodyShadingMode === 'legacy' ? 'legacy' : 'soft'
    config.maneShadingMode = input.maneShadingMode === 'legacy' ? 'legacy' : 'soft'
    if (input.bodyShadingMode === 'custom') {
      config.bodyShadowColorLocked = false
      config.bodyHighlightColorLocked = false
    }
    if (typeof input.maneColorLinkVersion !== 'number' || input.maneColorLinkVersion <= 0) {
      config.backManeColorLocked = config.frontManeColor === config.backManeColor
      config.tailColorLocked = config.frontManeColor === config.tailColor
    }
    config.maneColorLinkVersion = 1
    if (config.backManeColorLocked) config.backManeColor = config.frontManeColor
    if (config.tailColorLocked) config.tailColor = config.frontManeColor
    config.cutieMarkLeft = decodeCutieMark(input.cutieMarkLeft) ? String(input.cutieMarkLeft) : ''
    config.cutieMarkRight = !config.cutieMarkLinked && decodeCutieMark(input.cutieMarkRight) ? String(input.cutieMarkRight) : ''
    return config
  } catch {
    return null
  }
}

export function ponyKind(config: PonyConfig) {
  if (config.showHorn && config.showWings) return '天角兽'
  if (config.showHorn) return '独角兽'
  return config.showWings ? '飞马' : '陆马'
}
