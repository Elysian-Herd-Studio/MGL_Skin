import type { CaptchaSettings } from '../../shared/types/captcha'
import type { MailSettings, SiteSettings, SiteSettingsView } from '../../shared/types/settings'
import { CAPTCHA_PROVIDERS, createDefaultCaptchaSettings } from '../../shared/utils/captcha'
import { createDefaultMailSettings, isValidMailSender, isValidSiteUrl } from '../../shared/utils/settings'
import { connectDatabase, useDatabase, type DatabaseSession } from './db'
import { configuredDatabase, getBootstrapSessionPassword, parseDatabaseSettings, persistDatabaseConfig, readDatabaseConfig } from './database-config'
import { findUserById } from './users'

async function readSetting(key: string, database?: DatabaseSession) {
  const db = database ?? await useDatabase()
  const row = await db.prepare('SELECT value FROM app_settings WHERE key = ?').get<{ value: string }>(key)
  return row?.value
}

async function writeSetting(key: string, value: string, database?: DatabaseSession) {
  const db = database ?? await useDatabase()
  await db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value)
}

export async function isSiteInitialized() {
  if (!configuredDatabase()) return false
  return Boolean(await readSetting('initialized_at'))
}

export async function getSiteSessionPassword() {
  if (!configuredDatabase()) return getBootstrapSessionPassword()
  const existing = await readSetting('session_password')
  if (existing) return existing

  const db = await useDatabase()
  await db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING')
    .run('session_password', getBootstrapSessionPassword())
  return (await readSetting('session_password'))!
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const stored = await readSetting('site')
  if (!stored) {
    throw createError({ statusCode: 503, statusMessage: '请先完成站点初始化', data: { code: 'SETUP_REQUIRED' } })
  }
  const settings = JSON.parse(stored) as SiteSettings
  return { ...settings, captcha: { ...createDefaultCaptchaSettings(), ...settings.captcha } }
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
    },
    captcha: {
      ...settings.captcha,
      secretKey: '',
      hasSecretKey: Boolean(settings.captcha.secretKey)
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

function parseCaptchaSettings(input: unknown, previous?: CaptchaSettings): CaptchaSettings {
  if (input === undefined) return previous ?? createDefaultCaptchaSettings()
  const body = settingsObject(input)
  const provider = CAPTCHA_PROVIDERS.find(value => value.value === body.provider)?.value
  if (typeof body.enabled !== 'boolean' || !provider) invalidSettings('登录验证码开关或服务商无效')

  const siteKey = settingsText(body.siteKey, 1024)
  const secretKey = settingsText(body.secretKey, 4096)
    || (previous?.provider === provider && previous.siteKey === siteKey ? previous.secretKey : '')

  if (/\s/.test(siteKey) || /\s/.test(secretKey)) invalidSettings('验证码密钥不能包含空白字符')
  if (body.enabled && (!siteKey || !secretKey)) invalidSettings('启用登录验证码前，请填写站点密钥和服务端密钥')
  return { enabled: body.enabled, provider, siteKey, secretKey }
}

export function parseSiteSettings(input: unknown, previous?: SiteSettings): SiteSettings {
  const body = settingsObject(input)
  const siteUrl = settingsText(body.siteUrl)
  if (!isValidSiteUrl(siteUrl)) invalidSettings('请填写有效的站点对外地址，不包含查询参数或锚点')
  return {
    siteUrl: new URL(siteUrl).href.replace(/\/+$/, ''),
    mail: parseMailSettings(body.mail, previous?.mail),
    captcha: parseCaptchaSettings(body.captcha, previous?.captcha)
  }
}

export async function saveSiteSettings(settings: SiteSettings, database?: DatabaseSession) {
  await writeSetting('site', JSON.stringify(settings), database)
}

let initializing = false

export async function initializeSite(admin: { username: string, email: string, passwordHash: string }, settings: SiteSettings, databaseInput: unknown) {
  if (initializing) {
    throw createError({ statusCode: 409, statusMessage: '正在初始化，请稍候', data: { code: 'SETUP_IN_PROGRESS' } })
  }
  initializing = true
  try {
    if (await isSiteInitialized()) {
      throw createError({ statusCode: 409, statusMessage: '站点已完成初始化', data: { code: 'ALREADY_INITIALIZED' } })
    }
    const connection = readDatabaseConfig() ?? parseDatabaseSettings(databaseInput)
    const sessionPassword = await getSiteSessionPassword()
    const db = await connectDatabase(connection)
    return await db.transaction(async transaction => {
      const initialized = await transaction.prepare(`INSERT INTO app_settings (key, value)
        VALUES ('initialized_at', ?) ON CONFLICT(key) DO NOTHING RETURNING key`).get(new Date().toISOString())
      if (!initialized) {
        throw createError({ statusCode: 409, statusMessage: '目标数据库已完成初始化', data: { code: 'DATABASE_ALREADY_INITIALIZED' } })
      }
      const result = await transaction.prepare(`INSERT INTO users (username, email, password_hash, email_verified, role, last_login_at)
        VALUES (?, ?, ?, 1, 'admin', ${transaction.now}) RETURNING id`).get<{ id: number }>(admin.username, admin.email, admin.passwordHash)
      await saveSiteSettings(settings, transaction)
      await writeSetting('session_password', sessionPassword, transaction)
      const user = (await findUserById(result!.id, transaction))!
      persistDatabaseConfig(connection)
      return user
    })
  } finally {
    initializing = false
  }
}
