import { requireMinecraftUser } from '../../../utils/minecraft'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const user = await requireMinecraftUser(event)
  return { username: user.username, hasAvatar: Boolean(user.avatarUrl) }
})
