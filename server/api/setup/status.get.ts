import { readDatabaseConfig } from '../../utils/database-config'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const initialized = await isSiteInitialized()
  return { initialized, databaseProvider: initialized ? undefined : readDatabaseConfig()?.provider }
})
