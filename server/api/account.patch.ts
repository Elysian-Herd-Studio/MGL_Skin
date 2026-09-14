export default defineEventHandler(async (event) => {
  const current = await requireCurrentUser(event)
  enforceRateLimit(event, 'account-update', 10, 60, String(current.id))

  const body = await readBody<{ username?: unknown }>(event)
  const username = typeof body?.username === 'string' ? body.username.trim() : ''

  if (!isValidUsername(username)) {
    throw createError({
      statusCode: 400,
      statusMessage: '用户名需为 3-20 位字母、数字、下划线或连字符',
      data: { code: 'INVALID_USERNAME' }
    })
  }

  const user = await requireCurrentUser(event)

  if (!await setUserUsername(user.id, username)) {
    throw createError({
      statusCode: 409,
      statusMessage: '该用户名已被占用',
      data: { code: 'USERNAME_TAKEN' }
    })
  }

  return { user: await refreshProfileSession(event) }
})
