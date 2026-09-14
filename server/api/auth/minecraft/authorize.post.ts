import { createMinecraftAuthCode } from '../../../utils/minecraft'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  return { code: await createMinecraftAuthCode(user.id), expiresIn: 300 }
})
