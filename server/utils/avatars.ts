import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import type { H3Event } from 'h3'
import { AVATAR_MAX_BYTES, AVATAR_MIME_TYPES } from '../../shared/utils/avatar'

interface AvatarRecord {
  content_type: string
  data: Uint8Array
  version: string
}

function detectAvatarType(data: Buffer) {
  if (data.length >= 33
    && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    && data.toString('ascii', 12, 16) === 'IHDR') {
    return 'image/png'
  }

  if (data.length >= 4 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return 'image/jpeg'
  }

  if (data.length >= 20
    && data.toString('ascii', 0, 4) === 'RIFF'
    && data.toString('ascii', 8, 12) === 'WEBP'
    && ['VP8 ', 'VP8L', 'VP8X'].includes(data.toString('ascii', 12, 16))) {
    return 'image/webp'
  }
}

export async function readAvatarUpload(event: H3Event) {
  const contentType = getRequestHeader(event, 'content-type')?.split(';')[0]?.trim().toLowerCase() ?? ''

  if (!AVATAR_MIME_TYPES.includes(contentType)) {
    throw createError({
      statusCode: 415,
      statusMessage: '头像仅支持 PNG、JPEG 或 WebP 图片',
      data: { code: 'INVALID_AVATAR_TYPE' }
    })
  }

  const tooLarge = () => createError({
    statusCode: 413,
    statusMessage: '头像大小不能超过 2 MB',
    data: { code: 'AVATAR_TOO_LARGE' }
  })

  if (Number(getRequestHeader(event, 'content-length')) > AVATAR_MAX_BYTES) {
    throw tooLarge()
  }

  const data = await readRawBody(event, false)

  if (data && data.length > AVATAR_MAX_BYTES) {
    throw tooLarge()
  }

  if (!data?.length || detectAvatarType(data) !== contentType) {
    throw createError({
      statusCode: 400,
      statusMessage: '图片内容无效，请选择有效的 PNG、JPEG 或 WebP 图片',
      data: { code: 'INVALID_AVATAR' }
    })
  }

  return { data, contentType, version: createHash('sha256').update(data).digest('hex') }
}

export function setUserAvatar(id: number, avatar: { data: Buffer, contentType: string, version: string }) {
  useDatabase().prepare(`
    INSERT INTO user_avatars (user_id, content_type, data, version) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      content_type = excluded.content_type, data = excluded.data, version = excluded.version
  `).run(id, avatar.contentType, avatar.data, avatar.version)
}

export function findUserAvatar(id: number) {
  return useDatabase()
    .prepare('SELECT content_type, data, version FROM user_avatars WHERE user_id = ?')
    .get(id) as AvatarRecord | undefined
}

export function deleteUserAvatar(id: number) {
  useDatabase().prepare('DELETE FROM user_avatars WHERE user_id = ?').run(id)
}
