import { Box3, Group, Mesh, type ShaderMaterial } from 'three'
import type { PonyConfig } from '../../../shared/utils/pony'
import { createPonyAnimator } from './animation'
import { loadPonyAssets } from './assets'
import { appendCube, bonePivot, boneRotation, buildGeometry, type GeometryBuffer } from './geometry'
import { createPonyMaterials } from './materials'
import type { Bone } from './types'

const hiddenBones = new Set(['magic', 'Hat', 'Dress', 'TailDecorate', 'Opend', 'Style01FrontManeHighlight', 'Smeile', 'Style03Smile', 'Angry', 'close', 'ScrunchedEyes'])

function visible(name: string, config: PonyConfig) {
  if (hiddenBones.has(name)) return false
  if (name === 'Horn') return config.showHorn
  if (name === 'Wings') return config.showWings
  if (name === 'CommonFace') return config.eyeStyle === '01'
  if (name === 'Style02') return config.eyeStyle === '02'
  if (name === 'Style03') return config.eyeStyle === '03'
  const style = /^Style(\d{2})(FrontMane|BackMane|Tail)/.exec(name)
  if (!style) return true
  const part = style[2] === 'FrontMane' ? 'frontManeStyle' : style[2] === 'BackMane' ? 'backManeStyle' : 'tailStyle'
  return style[1] === config[part]
}

export async function createPonyModel(config: PonyConfig, baseURL: string) {
  const assets = await loadPonyAssets(baseURL)
  const materials = await createPonyMaterials(config, assets, baseURL)
  const root = new Group()
  const bones = new Map<string, Group>()
  const definitions = new Map<string, Bone>(assets.geometry.bones.map(bone => [bone.name, { ...bone }]))
  const aliases = {
    CommonFace: config.eyeStyle === '01' ? 'CommonFace' : `Style${config.eyeStyle}CommonFace`,
    leye: config.eyeStyle === '01' ? 'leye' : config.eyeStyle === '02' ? 'leye3' : 'leye2',
    reye: config.eyeStyle === '01' ? 'reye' : config.eyeStyle === '02' ? 'reye3' : 'reye2'
  }
  for (const side of ['leye', 'reye'] as const) {
    definitions.get(aliases[side])!.pivot = definitions.get(side)!.pivot
  }

  function dispose() {
    root.traverse((object) => {
      if (object instanceof Mesh) object.geometry.dispose()
    })
    materials.dispose()
    root.clear()
  }

  try {
    for (const definition of definitions.values()) {
      const group = new Group()
      group.name = definition.name
      group.visible = visible(definition.name, config)
      group.position.copy(bonePivot(definition.pivot))
      group.rotation.copy(boneRotation(definition.rotation))
      if ((definition.name === 'FrontMane' && config.frontManeMirrored)
        || (definition.name === 'BackMane' && config.backManeMirrored)
        || (definition.name === 'Tail' && config.tailMirrored)) group.scale.x = -1
      bones.set(definition.name, group)
    }
    for (const definition of definitions.values()) {
      const group = bones.get(definition.name)!
      const parent = definition.parent ? bones.get(definition.parent) : undefined
      if (parent) group.position.sub(bonePivot(definitions.get(definition.parent!)!.pivot))
      const container = parent ?? root
      container.add(group)
    }
    root.traverseVisible((object) => {
      const definition = definitions.get(object.name)
      if (!definition?.cubes) return
      const buffers = new Map<ShaderMaterial, GeometryBuffer>()
      for (const cube of definition.cubes) {
        const material = materials.get(definition.name, cube)
        let buffer = buffers.get(material)
        if (!buffer) {
          buffer = { positions: [], uvs: [], indices: [] }
          buffers.set(material, buffer)
        }
        appendCube(buffer, cube, bonePivot(definition.pivot),
          assets.geometry.description.texture_width, assets.geometry.description.texture_height, definition.inflate)
      }
      for (const [material, buffer] of buffers) {
        if (!buffer.positions.length) continue
        const mesh = new Mesh(buildGeometry(buffer), material)
        mesh.renderOrder = material.userData.renderOrder
        object.add(mesh)
      }
    })

    const animate = createPonyAnimator(bones, assets.animations, aliases)
    animate(0)
    root.updateMatrixWorld(true)
    const bounds = new Box3()
    root.traverseVisible((object) => {
      if (object instanceof Mesh && Math.abs(object.matrixWorld.determinant()) > 1e-8) {
        bounds.union(object.geometry.boundingBox!.clone().applyMatrix4(object.matrixWorld))
      }
    })
    if (bounds.isEmpty()) throw new Error('预设没有可显示的模型')
    return { root, bounds, animate, dispose }
  } catch (error) {
    dispose()
    throw error
  }
}

export type PonyModel = Awaited<ReturnType<typeof createPonyModel>>
