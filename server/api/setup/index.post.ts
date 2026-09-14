export default defineEventHandler(async (event) => {
  if (await isSiteInitialized()) {
    throw createError({ statusCode: 409, statusMessage: '站点已完成初始化', data: { code: 'ALREADY_INITIALIZED' } })
  }
  enforceRateLimit(event, 'setup', 10, 15 * 60)
  if (getHeader(event, 'content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json') {
    throw createError({ statusCode: 415, statusMessage: '请使用 JSON 提交初始化设置' })
  }

  const body = await readBody<{ username?: unknown, email?: unknown, password?: unknown, settings?: unknown, database?: unknown }>(event)
  const username = typeof body?.username === 'string' ? body.username.trim() : ''
  const email = typeof body?.email === 'string' ? normalizeEmail(body.email) : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!isValidUsername(username)) {
    throw createError({ statusCode: 400, statusMessage: '用户名需为 3-20 位字母、数字、下划线或连字符' })
  }
  if (!isValidEmail(email) || email.length > 254) {
    throw createError({ statusCode: 400, statusMessage: '请填写有效的管理员邮箱' })
  }
  if (!isValidPassword(password)) {
    throw createError({ statusCode: 400, statusMessage: '密码长度需为 8-128 位' })
  }

  const settings = parseSiteSettings(body?.settings)
  const passwordHash = await hashPassword(password)
  const user = await initializeSite({ username, email, passwordHash }, settings, body?.database)
  await replaceUserSession(event, { user: toSessionUser(user), loggedInAt: Date.now() })
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return { initialized: true }
})
