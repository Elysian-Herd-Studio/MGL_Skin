import { randomBytes } from 'node:crypto'
import type { MailSettings, SiteSettings, SiteSettingsView } from '../../shared/types/settings'
import { createDefaultMailSettings, isValidMailSender, isValidSiteUrl } from '../../shared/utils/settings'
import { useDatabase } from './db'
import { findUserById } from './users'

function readSetting(key: string) {
  const row = useDatabase().prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value
}

function writeSetting(key: string, value: string) {
  useDatabase().prepare('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value)
}

export function isSiteInitialized() {
  return Boolean(readSetting('initialized_at'))
}

export function getSiteSessionPassword() {
  const existing = readSetting('session_password')
  if (existing) return existing

  useDatabase().prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)')
    .run('session_password', randomBytes(48).toString('hex'))
  return readSetting('session_password') as string
}

export function getSiteSettings(): SiteSettings {
  const stored = readSetting('site')
  if (stored) return JSON.parse(stored) as SiteSettings

  const config = useRuntimeConfig()
  return {
    siteUrl: config.public.siteUrl.replace(/\/+$/, ''),
    mail: {
      ...createDefaultMailSettings(),
      from: config.mailFrom,
      apiKey: config.resendApiKey
    }
  }
}

export function toSiteSettingsView(settings: SiteSettings): SiteSettingsView {
  return {
    siteUrl: settings.siteUrl,
    mail: {
      ...settings.mail,
      apiKey: '',
      smtpPassword: '',
      hasApiKey: Boolean(settings.mail.apiKey),
      hasSmtpPassword: Boolean(settings.mail.smtpPassword)
    }
  }
}

function invalidSettings(message: string): never {
  throw createError({ statusCode: 400, statusMessage: message, data: { code: 'INVALID_SETTINGS' } })
}

function settingsObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalidSettings('设置格式不正确')
  return value as Record<string, unknown>
}

function settingsText(value: unknown, maximum = 2048) {
  if (value === undefined) return ''
  if (typeof value !== 'string') invalidSettings('设置字段格式不正确')
  if (value.length > maximum) invalidSettings('设置内容超出长度限制')
  return value.trim()
}

function parseMailSettings(input: unknown, previous?: MailSettings): MailSettings {
  const body = settingsObject(input)
  if (body.transport !== 'api' && body.transport !== 'smtp') invalidSettings('请选择 API 或 SMTP 发送邮件')
  if (body.preset !== 'resend' && body.preset !== 'custom') invalidSettings('邮件服务预设无效')

  const mail = createDefaultMailSettings()
  mail.transport = body.transport
  mail.preset = body.preset
  mail.from = settingsText(body.from, 320)
  if (!isValidMailSender(mail.from)) invalidSettings('请填写有效的发件人邮箱，可使用 名称 <邮箱> 格式')

  if (mail.transport === 'api') {
    mail.apiUrl = mail.preset === 'resend' ? mail.apiUrl : settingsText(body.apiUrl)
    try {
      const url = new URL(mail.apiUrl)
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash) throw new Error()
    } catch {
      invalidSettings('请填写有效的 HTTP 或 HTTPS 邮件 API 地址')
    }
    mail.apiKey = settingsText(body.apiKey, 4096)
      || (previous?.transport === 'api' && previous.apiUrl === mail.apiUrl ? previous.apiKey : '')
    if (!mail.apiKey || /[\r\n]/.test(mail.apiKey)) invalidSettings('请填写有效的 API 密钥')
    return mail
  }

  mail.smtpHost = mail.preset === 'resend' ? mail.smtpHost : settingsText(body.smtpHost, 253)
  if (!mail.smtpHost || /[\s/\\?#@]/.test(mail.smtpHost)) invalidSettings('SMTP 主机地址无效')
  if (typeof body.smtpPort !== 'number' && typeof body.smtpPort !== 'string') invalidSettings('SMTP 端口格式不正确')
  mail.smtpPort = Number(body.smtpPort)
  if (!Number.isInteger(mail.smtpPort) || mail.smtpPort < 1 || mail.smtpPort > 65535) invalidSettings('SMTP 端口需为 1-65535')
  if (body.smtpSecurity !== 'tls' && body.smtpSecurity !== 'starttls' && body.smtpSecurity !== 'none') invalidSettings('SMTP 加密方式无效')
  mail.smtpSecurity = body.smtpSecurity
  mail.smtpUsername = mail.preset === 'resend' ? mail.smtpUsername : settingsText(body.smtpUsername, 320)
  if (body.smtpPassword !== undefined && typeof body.smtpPassword !== 'string') invalidSettings('SMTP 密码格式不正确')
  mail.smtpPassword = typeof body.smtpPassword === 'string' ? body.smtpPassword : ''
  if (mail.smtpPassword.length > 4096) invalidSettings('SMTP 密码超出长度限制')
  if (!mail.smtpPassword && previous?.transport === 'smtp' && previous.smtpHost === mail.smtpHost
    && previous.smtpPort === mail.smtpPort && previous.smtpSecurity === mail.smtpSecurity
    && previous.smtpUsername === mail.smtpUsername) {
    mail.smtpPassword = previous.smtpPassword
  }
  if (Boolean(mail.smtpUsername) !== Boolean(mail.smtpPassword) || (mail.preset === 'resend' && !mail.smtpPassword)) {
    invalidSettings('请同时填写 SMTP 用户名与密码；Resend 的 SMTP 密码为 API 密钥')
  }
  return mail
}

export function parseSiteSettings(input: unknown, previous?: SiteSettings): SiteSettings {
  const body = settingsObject(input)
  const siteUrl = settingsText(body.siteUrl)
  if (!isValidSiteUrl(siteUrl)) invalidSettings('请填写有效的站点对外地址，不包含查询参数或锚点')
  return { siteUrl: new URL(siteUrl).href.replace(/\/+$/, ''), mail: parseMailSettings(body.mail, previous?.mail) }
}

export function saveSiteSettings(settings: SiteSettings) {
  writeSetting('site', JSON.stringify(settings))
}

export function initializeSite(admin: { username: string, email: string, passwordHash: string }, settings: SiteSettings) {
  const db = useDatabase()
  let userId: number
  db.exec('BEGIN IMMEDIATE')
  try {
    if (isSiteInitialized()) {
      throw createError({ statusCode: 409, statusMessage: '站点已完成初始化', data: { code: 'ALREADY_INITIALIZED' } })
    }
    const result = db.prepare(`INSERT INTO users (username, email, password_hash, email_verified, role, last_login_at)
      VALUES (?, ?, ?, 1, 'admin', datetime('now'))`).run(admin.username, admin.email, admin.passwordHash)
    userId = Number(result.lastInsertRowid)
    saveSiteSettings(settings)
    writeSetting('initialized_at', new Date().toISOString())
    db.exec('COMMIT')
  } catch (cause) {
    db.exec('ROLLBACK')
    throw cause
  }
  return findUserById(userId)!
}
