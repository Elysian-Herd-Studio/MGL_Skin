import { closeDatabases } from '../utils/db'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('close', closeDatabases)
})
