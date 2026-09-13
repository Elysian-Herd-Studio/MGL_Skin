export default defineEventHandler(async (event) => {
  const current = await requireCurrentUser(event)
  enforceRateLimit(event, 'avatar-update', 10, 60, String(current.id))

  const avatar = await readAvatarUpload(event)
  const user = await requireCurrentUser(event)
  setUserAvatar(user.id, avatar)

  return { user: await refreshProfileSession(event) }
})
