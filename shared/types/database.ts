export type DatabaseProvider = 'sqlite' | 'postgresql'

export interface PostgreSQLSettings {
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl: boolean
}

export interface DatabaseSettings {
  provider: DatabaseProvider
  postgresql: PostgreSQLSettings
}
