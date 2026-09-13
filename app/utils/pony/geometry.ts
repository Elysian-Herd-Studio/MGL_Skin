import { BufferGeometry, Euler, Float32BufferAttribute, Vector3 } from 'three'
import type { Cube, Face, FaceUV, Vector } from './types'

export interface GeometryBuffer {
  positions: number[]
  uvs: number[]
  indices: number[]
}

const faces: Record<Face, number[]> = {
  west: [6, 2, 0, 4], east: [3, 7, 5, 1],
  north: [2, 3, 1, 0], south: [7, 6, 4, 5],
  up: [6, 7, 3, 2], down: [0, 1, 5, 4]
}
const radians = Math.PI / 180

export function bonePivot(pivot: Vector) {
  return new Vector3(-pivot[0], pivot[1], pivot[2])
}

export function boneRotation(rotation: Vector = [0, 0, 0]) {
  return new Euler(-rotation[0] * radians, -rotation[1] * radians, rotation[2] * radians, 'ZYX')
}

function faceUV(cube: Cube, face: Face): FaceUV | undefined {
  if (!Array.isArray(cube.uv)) return cube.uv[face]
  const [u, v] = cube.uv
  const x = Math.floor(cube.size[0])
  const y = Math.floor(cube.size[1])
  const z = Math.floor(cube.size[2])
  const boxes: Record<Face, FaceUV> = {
    west: { uv: [u + z + x, v + z], uv_size: [z, y] },
    east: { uv: [u, v + z], uv_size: [z, y] },
    north: { uv: [u + z, v + z], uv_size: [x, y] },
    south: { uv: [u + z + x + z, v + z], uv_size: [x, y] },
    up: { uv: [u + z, v], uv_size: [x, z] },
    down: { uv: [u + z + x, v + z], uv_size: [x, -z] }
  }
  return boxes[face]
}

export function appendCube(buffer: GeometryBuffer, cube: Cube, pivot: Vector3, width: number, height: number, boneInflate = 0) {
  const inflate = cube.inflate ?? boneInflate
  const rotation = boneRotation(cube.rotation)
  const origin = new Vector3(-cube.origin[0] - cube.size[0], cube.origin[1], cube.origin[2])
  const center = bonePivot(cube.pivot ?? [0, 0, 0])
  const vertices = Array.from({ length: 8 }, (_, i) => new Vector3(
    origin.x + (i & 1 ? cube.size[0] + inflate : -inflate),
    origin.y + (i & 2 ? cube.size[1] + inflate : -inflate),
    origin.z + (i & 4 ? cube.size[2] + inflate : -inflate)
  ).sub(center).applyEuler(rotation).add(center).sub(pivot))

  for (const face of Object.keys(faces) as Face[]) {
    const uv = faceUV(cube, face)
    if (!uv) continue
    let direction = face
    if (cube.mirror) {
      if (face === 'east') direction = 'west'
      if (face === 'west') direction = 'east'
      if (!Array.isArray(cube.uv)) {
        if (face === 'up') direction = 'down'
        if (face === 'down') direction = 'up'
      }
    }
    const corners = faces[direction].map(index => vertices[index]!)
    const area = corners[1]!.clone().sub(corners[0]!).cross(corners[2]!.clone().sub(corners[0]!)).lengthSq()
    if (area < 1e-12) continue
    const [u, v] = uv.uv
    const [w, h] = uv.uv_size
    const firstU = cube.mirror ? u : u + w
    const secondU = cube.mirror ? u + w : u
    const coords = [[firstU, v], [secondU, v], [secondU, v + h], [firstU, v + h]]
    const turn = ((Math.round((uv.uv_rotation ?? 0) / 90) % 4) + 4) % 4
    const offset = buffer.positions.length / 3
    corners.forEach((point, i) => {
      buffer.positions.push(point.x, point.y, point.z)
      const coord = coords[(i + turn) % 4]!
      buffer.uvs.push(coord[0]! / width, coord[1]! / height)
    })
    buffer.indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3)
  }
}

export function buildGeometry(buffer: GeometryBuffer) {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(buffer.positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(buffer.uvs, 2))
  geometry.setIndex(buffer.indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  return geometry
}
