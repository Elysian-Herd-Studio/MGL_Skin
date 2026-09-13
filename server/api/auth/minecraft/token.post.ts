import { consumeMinecraftAuthCode, createMinecraftToken, minecraftUserResponse } from '../../../utils/minecraft'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ code?: string }>(event)
  const code = String(body?.code ?? '')
  if (!code || code.length > 256) throw createError({ statusCode: 400, statusMessage: '授权码无效', data: { code: 'INVALID_CODE' } })
  const user = consumeMinecraftAuthCode(code)
  if (!user) throw createError({ statusCode: 400, statusMessage: '授权码无效或已过期', data: { code: 'INVALID_CODE' } })
  return { token: createMinecraftToken(user.id), user: minecraftUserResponse(user) }
})
