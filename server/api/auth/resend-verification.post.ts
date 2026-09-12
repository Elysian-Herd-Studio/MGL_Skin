export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'resend-verification', 5, 60 * 60)

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

  if (user && !user.emailVerified) {
    const token = createToken(user.id, 'email_verify')
    await sendVerificationEmail(user, token)
  }

  return { ok: true, message: '如果该邮箱需要验证，我们已发送邮件' }
})
