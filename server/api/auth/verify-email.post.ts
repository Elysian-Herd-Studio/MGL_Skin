export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'verify-email', 30, 60 * 60)

  const body = await readBody<{ token?: string }>(event)
  const token = String(body?.token ?? '')

  const result = await consumeToken(token, 'email_verify')

  if (!result.ok) {
    throw createError({
      statusCode: result.reason === 'expired' ? 410 : 400,
      statusMessage: result.reason === 'expired' ? '验证链接已过期，请重新发送' : '验证链接无效',
      data: { code: result.reason === 'expired' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN' }
    })
  }

  await setUserEmailVerified(result.userId, true)

  const user = await findUserById(result.userId)
  if (user) {
    await syncAdminRole(user)
  }

  return { ok: true }
})
