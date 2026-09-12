export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'reset-password', 10, 60 * 60)

  const body = await readBody<{ token?: string, password?: string }>(event)
  const token = String(body?.token ?? '')
  const password = String(body?.password ?? '')

  if (!isValidPassword(password)) {
    throw createError({
      statusCode: 400,
      statusMessage: '密码长度需为 8-128 位',
      data: { code: 'INVALID_PASSWORD' }
    })
  }

  const result = consumeToken(token, 'password_reset')

  if (!result.ok) {
    throw createError({
      statusCode: result.reason === 'expired' ? 410 : 400,
      statusMessage: result.reason === 'expired' ? '重置链接已过期，请重新发起' : '重置链接无效',
      data: { code: result.reason === 'expired' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN' }
    })
  }

  setUserPassword(result.userId, await hashPassword(password))
  clearTokens(result.userId, 'password_reset')

  return { ok: true }
})
