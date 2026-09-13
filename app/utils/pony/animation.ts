import type { Group } from 'three'
import type { Animation, Channel, Keyframe, Vector } from './types'

interface Sample {
  time: number
  before: Vector
  after: Vector
  smooth: boolean
}

function vector(value: number | Vector | undefined, fallback: number): Vector {
  return Array.isArray(value) ? value : [value ?? fallback, value ?? fallback, value ?? fallback]
}

function samples(channel: Channel, fallback: number): Sample[] {
  if (typeof channel === 'number' || Array.isArray(channel)) {
    const value = vector(channel, fallback)
    return [{ time: 0, before: value, after: value, smooth: false }]
  }
  return Object.entries(channel).map(([time, value]) => {
    const frame: Keyframe = typeof value === 'number' || Array.isArray(value) ? { post: value } : value
    return {
      time: Number(time),
      before: vector(frame.pre ?? frame.post, fallback),
      after: vector(frame.post ?? frame.pre, fallback),
      smooth: frame.lerp_mode === 'catmullrom'
    }
  }).sort((a, b) => a.time - b.time)
}

function sample(frames: Sample[], time: number): Vector {
  if (time < frames[0]!.time) return frames[0]!.before
  const next = frames.findIndex(frame => frame.time > time)
  if (next < 0) return frames[frames.length - 1]!.after
  const a = frames[next - 1]!
  const b = frames[next]!
  const amount = (time - a.time) / (b.time - a.time)
  return a.after.map((start, axis) => {
    const end = b.before[axis]!
    if (!a.smooth && !b.smooth) return start + (end - start) * amount
    const previous = frames[Math.max(0, next - 2)]!.after[axis]!
    const following = frames[Math.min(frames.length - 1, next + 1)]!.before[axis]!
    return 0.5 * ((2 * start) + (-previous + end) * amount
      + (2 * previous - 5 * start + 4 * end - following) * amount ** 2
      + (-previous + 3 * start - 3 * end + following) * amount ** 3)
  }) as Vector
}

export function createPonyAnimator(bones: Map<string, Group>, animations: Record<string, Animation>, aliases: Record<string, string>) {
  const initial = new Map(Array.from(bones.values(), bone => [bone, {
    position: bone.position.clone(), rotation: bone.rotation.clone(), scale: bone.scale.clone()
  }]))
  const clips = ['idle', 'face.neutral', 'tail_parallel', 'blink_parallel', 'ear_parallel'].map((name) => {
    const animation = animations[name]
    if (!animation) throw new Error('动画资源不完整')
    const tracks = Object.entries(animation.bones).flatMap(([boneName, channels]) => {
      const bone = bones.get(aliases[boneName] ?? boneName)
      if (!bone) return []
      return Object.entries(channels).map(([property, channel]) => ({
        bone, property, frames: samples(channel, property === 'scale' ? 1 : 0)
      })).filter(track => track.frames.length)
    })
    return { length: animation.animation_length || 1, tracks, weight: name === 'ear_parallel' ? 0.35 : 1 }
  })

  return (seconds: number) => {
    initial.forEach((state, bone) => {
      bone.position.copy(state.position)
      bone.rotation.copy(state.rotation)
      bone.scale.copy(state.scale)
    })
    for (const clip of clips) {
      const time = seconds % clip.length
      for (const track of clip.tracks) {
        const [x, y, z] = sample(track.frames, time)
        const state = initial.get(track.bone)!
        if (track.property === 'rotation') {
          const factor = Math.PI / 180 * clip.weight
          track.bone.rotation.set(state.rotation.x - x * factor, state.rotation.y - y * factor, state.rotation.z + z * factor, 'ZYX')
        } else if (track.property === 'position') {
          track.bone.position.set(state.position.x - x, state.position.y + y, state.position.z + z)
        } else if (track.property === 'scale') {
          track.bone.scale.set(state.scale.x * x, state.scale.y * y, state.scale.z * z)
        }
      }
    }
  }
}
