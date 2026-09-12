export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'forgot-password', 3, 60 * 60)

  const body = await readBody<{ email?: string }>(event)
  const email = normalizeEmail(String(body?.email ?? ''))

  if (!isValidEmail(email)) {
    throw createError({
      statusCode: 400,
      statusMessage: '邮箱格式不正确',
      data: { code: 'INVALID_EMAIL' }
    })
  }

  const user = findUserByEmail(email)

  if (user) {
    const token = createToken(user.id, 'password_reset')
    await sendPasswordResetEmail(user, token)
  }

  return { ok: true, message: '如果该邮箱已注册，我们已发送重置邮件' }
})
