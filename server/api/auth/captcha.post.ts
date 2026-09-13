export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'login-captcha', 30, 60)
  const body = await readBody<{ email?: unknown }>(event)
  const email = typeof body?.email === 'string' ? normalizeEmail(body.email) : ''
  if (email.length > 254 || !isValidEmail(email)) {
    throw createError({ statusCode: 400, statusMessage: '请填写有效的邮箱' })
  }

  setResponseHeader(event, 'Cache-Control', 'no-store')
  return createLoginCaptchaChallenge(email)
})
