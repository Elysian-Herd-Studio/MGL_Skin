import type { H3Event } from 'h3'
import type { SkinPreset } from '../../shared/types/skin'
import { userFromMinecraftToken } from './minecraft'
import { findUserById } from './users'

export type SkinPresetRow<T extends SkinPreset = SkinPreset> = Omit<T, 'isPublic'> & { is_public: number }

export function skinPresetResponse<T extends { is_public: number }>(row: T) {
  const { is_public, ...preset } = row
  return { ...preset, isPublic: is_public === 1 }
}

export async function currentSkinUser(event: H3Event) {
  if (getHeader(event, 'authorization') !== undefined) return userFromMinecraftToken(event)
  const { user } = await getUserSession(event)
  if (!user) return undefined
  const current = await findUserById(user.id)
  return current?.sessionVersion === user.sessionVersion ? current : undefined
}

export async function requireSkinUser(event: H3Event) {
  const user = await currentSkinUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: '请登录后管理云预设', data: { code: 'UNAUTHORIZED' } })
  }
  return user
}
