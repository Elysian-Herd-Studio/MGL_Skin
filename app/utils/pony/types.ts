export type Vector = [number, number, number]
export type Face = 'west' | 'east' | 'north' | 'south' | 'up' | 'down'

export interface FaceUV {
  uv: [number, number]
  uv_size: [number, number]
  uv_rotation?: number
}

export interface Cube {
  origin: Vector
  size: Vector
  pivot?: Vector
  rotation?: Vector
  mirror?: boolean
  inflate?: number
  uv: [number, number] | Partial<Record<Face, FaceUV>>
}

export interface Bone {
  name: string
  parent?: string
  pivot: Vector
  rotation?: Vector
  cubes?: Cube[]
  inflate?: number
}

export interface Geometry {
  description: { texture_width: number, texture_height: number }
  bones: Bone[]
}

export interface Keyframe {
  pre?: number | Vector
  post?: number | Vector
  lerp_mode?: 'linear' | 'catmullrom'
}

export type Channel = number | Vector | Record<string, number | Vector | Keyframe>

export interface Animation {
  animation_length: number
  bones: Record<string, Partial<Record<'rotation' | 'position' | 'scale', Channel>>>
}

export interface DyeMask {
  version: number
  texture_width: number
  texture_height: number
  regions: Array<{ part: 'FRONT' | 'BACK' | 'TAIL', channel: number, runs: Array<[number, number, number]> }>
}

export interface PonyAssets {
  geometry: Geometry
  animations: Record<string, Animation>
  base: ImageData
  mane: ImageData
}
