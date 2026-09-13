import { Buffer } from 'node:buffer'

export default defineEventHandler((event) => {
  const value = getRouterParam(event, 'id') ?? ''
  const id = Number(value)

  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: '用户 ID 无效',
      data: { code: 'INVALID_ID' }
    })
  }

  const avatar = findUserAvatar(id)

  if (!avatar) {
    throw createError({
      statusCode: 404,
      statusMessage: '该用户尚未设置头像',
      data: { code: 'AVATAR_NOT_FOUND' }
    })
  }

  setResponseHeaders(event, {
    'Content-Type': avatar.content_type,
    'X-Content-Type-Options': 'nosniff'
  })

  if (handleCacheHeaders(event, {
    etag: `"${avatar.version}"`,
    maxAge: 0,
    cacheControls: ['must-revalidate']
  })) return

  return Buffer.from(avatar.data)
})
