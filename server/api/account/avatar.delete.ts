export default defineEventHandler(async (event) => {
  const user = await requireCurrentUser(event)
  enforceRateLimit(event, 'avatar-update', 10, 60, String(user.id))
  await deleteUserAvatar(user.id)

  return { user: await refreshProfileSession(event) }
})
