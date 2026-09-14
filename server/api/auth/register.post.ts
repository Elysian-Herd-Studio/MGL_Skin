export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'register', 5, 60 * 60)

  const body = await readBody<{ username?: string, email?: string, password?: string }>(event)
  const username = String(body?.username ?? '').trim()
  const email = normalizeEmail(String(body?.email ?? ''))
  const password = String(body?.password ?? '')

  if (!isValidUsername(username)) {
    throw createError({
      statusCode: 400,
      statusMessage: '用户名需为 3-20 位字母、数字、下划线或连字符',
      data: { code: 'INVALID_USERNAME' }
    })
  }

  if (!isValidEmail(email)) {
    throw createError({
      statusCode: 400,
      statusMessage: '邮箱格式不正确',
      data: { code: 'INVALID_EMAIL' }
    })
  }

  if (!isValidPassword(password)) {
    throw createError({
      statusCode: 400,
      statusMessage: '密码长度需为 8-128 位',
      data: { code: 'INVALID_PASSWORD' }
    })
  }

  if (await usernameExists(username)) {
    throw createError({
      statusCode: 409,
      statusMessage: '该用户名已被占用',
      data: { code: 'USERNAME_TAKEN' }
    })
  }

  const existing = await findUserByEmail(email)

  if (existing) {
    if (existing.emailVerified) {
      await sendEmailInUseNotice(existing)
    } else {
      const token = await createToken(existing.id, 'email_verify')
      await sendVerificationEmail(existing, token)
    }

    return { ok: true, message: '如果该邮箱可用，我们已发送验证邮件' }
  }

  const user = await createUser({
    username,
    email,
    passwordHash: await hashPassword(password)
  })

  const token = await createToken(user.id, 'email_verify')
  await sendVerificationEmail(user, token)

  return { ok: true, message: '如果该邮箱可用，我们已发送验证邮件' }
})
