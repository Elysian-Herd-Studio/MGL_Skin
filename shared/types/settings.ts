import type { CaptchaSettings, CaptchaSettingsView } from './captcha'
import type { DatabaseProvider } from './database'

export interface MailSettings {
  transport: 'api' | 'smtp'
  preset: 'resend' | 'custom'
  from: string
  apiUrl: string
  apiKey: string
  smtpHost: string
  smtpPort: number
  smtpSecurity: 'tls' | 'starttls' | 'none'
  smtpUsername: string
  smtpPassword: string
}

export interface MailSettingsView extends MailSettings {
  hasApiKey: boolean
  hasSmtpPassword: boolean
}

export interface SiteSettings {
  siteUrl: string
  mail: MailSettings
  captcha: CaptchaSettings
}

export interface SiteSettingsView {
  siteUrl: string
  mail: MailSettingsView
  captcha: CaptchaSettingsView
}

export interface SetupStatus {
  initialized: boolean
  databaseProvider?: DatabaseProvider
}

export interface AdminOverview {
  users: number
  admins: number
  unverifiedUsers: number
  presets: number
  database: DatabaseProvider
  siteUrl: string
  mail: {
    transport: MailSettings['transport']
    preset: MailSettings['preset']
    from: string
    configured: boolean
  }
}
