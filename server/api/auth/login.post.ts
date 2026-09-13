export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string, password?: string, captcha?: unknown }>(event)
  const email = normalizeEmail(String(body?.email ?? ''))
  const password = String(body?.password ?? '')

  enforceRateLimit(event, 'login', 10, 15 * 60, email || 'anonymous')
  await verifyLoginCaptcha(email, body?.captcha)

  const user = findUserByEmail(email)
  const valid = user ? await verifyPassword(user.passwordHash, password) : false

  if (!user || !valid) {
    throw createError({
      statusCode: 401,
      statusMessage: '邮箱或密码错误',
      data: { code: 'INVALID_CREDENTIALS' }
    })
  }

  if (!user.emailVerified) {
    throw createError({
      statusCode: 403,
      statusMessage: '邮箱尚未验证，请先完成邮箱验证',
      data: { code: 'EMAIL_NOT_VERIFIED' }
    })
  }

  const current = syncAdminRole(user)
  recordLogin(current.id)

  await setUserSession(event, {
    user: toSessionUser(current),
    loggedInAt: Date.now()
  })

  return { user: toSessionUser(current) }
})
