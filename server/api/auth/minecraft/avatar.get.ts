import { Buffer } from 'node:buffer'
import sharp from 'sharp'
import { findUserAvatar } from '../../../utils/avatars'
import { requireMinecraftUser } from '../../../utils/minecraft'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const user = await requireMinecraftUser(event)
  const avatar = await findUserAvatar(user.id)
  if (!avatar) {
    throw createError({ statusCode: 404, statusMessage: '尚未设置头像', data: { code: 'AVATAR_NOT_FOUND' } })
  }

  let image: Buffer
  try {
    image = await sharp(Buffer.from(avatar.data), { limitInputPixels: 16_777_216 })
      .rotate().resize(128, 128, { fit: 'cover' }).ensureAlpha().png().toBuffer()
  } catch {
    throw createError({ statusCode: 422, statusMessage: '头像无法显示', data: { code: 'INVALID_AVATAR' } })
  }
  setHeader(event, 'Content-Type', 'image/png')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  return image
})
