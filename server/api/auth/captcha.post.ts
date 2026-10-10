export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'auth-captcha', 30, 60)
  const body = await readBody<{ email?: unknown, action?: unknown }>(event)
  const action = body?.action ?? 'login'
  if (action !== 'login' && action !== 'register') {
    throw createError({ statusCode: 400, statusMessage: '人机验证用途无效' })
  }
  const email = typeof body?.email === 'string' ? normalizeEmail(body.email) : ''
  if (email.length > 254 || !isValidEmail(email)) {
    throw createError({ statusCode: 400, statusMessage: '请填写有效的邮箱' })
  }

  setResponseHeader(event, 'Cache-Control', 'no-store')
  return createAuthCaptchaChallenge(email, action)
})
