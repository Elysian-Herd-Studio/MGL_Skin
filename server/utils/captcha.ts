import { createHash, randomBytes } from 'node:crypto'
import type { CaptchaProvider, LoginCaptchaProof, LoginCaptchaResponse } from '../../shared/types/captcha'
import type { SiteSettings } from '../../shared/types/settings'
import { LOGIN_CAPTCHA_ACTION } from '../../shared/utils/captcha'

const verifyUrls: Record<CaptchaProvider, string> = {
  recaptcha: 'https://www.google.com/recaptcha/api/siteverify',
  botflush: 'https://challenge.botflush.com/api/siteverify',
  turnstile: 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
}

interface CaptchaVerification {
  success?: boolean
  hostname?: string
  action?: string
  cdata?: string
  site_key?: string
  request_id?: string
}

function captchaHash(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function captchaSettingsHash(settings: SiteSettings) {
  return captchaHash(JSON.stringify([settings.siteUrl, settings.captcha.provider, settings.captcha.siteKey, settings.captcha.secretKey]))
}

function ensureCaptchaConfigured(settings: SiteSettings) {
  if (!settings.captcha.siteKey || !settings.captcha.secretKey || !verifyUrls[settings.captcha.provider]) {
    throw createError({ statusCode: 503, statusMessage: '登录验证码尚未配置完成，请联系管理员', data: { code: 'CAPTCHA_UNAVAILABLE' } })
  }
}

function invalidCaptcha(message = '验证码无效或已过期，请重新验证'): never {
  throw createError({ statusCode: 403, statusMessage: message, data: { code: 'CAPTCHA_INVALID' } })
}

export async function createLoginCaptchaChallenge(email: string): Promise<LoginCaptchaResponse> {
  const settings = await getSiteSettings()
  if (!settings.captcha.enabled) return { enabled: false }
  ensureCaptchaConfigured(settings)

  const now = Date.now()
  const requestId = randomBytes(32).toString('hex')
  const db = await useDatabase()
  await db.prepare('DELETE FROM login_captcha_challenges WHERE expires_at <= ?').run(now)
  await db.prepare(`INSERT INTO login_captcha_challenges (request_hash, email_hash, settings_hash, expires_at)
    VALUES (?, ?, ?, ?)`).run(captchaHash(requestId), captchaHash(email), captchaSettingsHash(settings), now + 5 * 60_000)

  return { enabled: true, provider: settings.captcha.provider, siteKey: settings.captcha.siteKey, requestId }
}

export async function verifyLoginCaptcha(email: string, proof: unknown) {
  const settings = await getSiteSettings()
  if (!settings.captcha.enabled) return
  ensureCaptchaConfigured(settings)

  const input = proof && typeof proof === 'object' && !Array.isArray(proof) ? proof as Partial<LoginCaptchaProof> : null
  if (!input || typeof input.requestId !== 'string' || !/^[a-f0-9]{64}$/.test(input.requestId)
    || typeof input.token !== 'string' || !input.token.trim() || input.token.length > 16384) {
    throw createError({ statusCode: 403, statusMessage: '请先完成登录验证码', data: { code: 'CAPTCHA_REQUIRED' } })
  }

  const requestHash = captchaHash(input.requestId)
  const emailHash = captchaHash(email)
  const settingsHash = captchaSettingsHash(settings)
  const db = await useDatabase()
  const challenge = await db.prepare(`SELECT request_hash FROM login_captcha_challenges
    WHERE request_hash = ? AND email_hash = ? AND settings_hash = ? AND consumed_at IS NULL AND expires_at > ?`)
    .get(requestHash, emailHash, settingsHash, Date.now())
  if (!challenge) invalidCaptcha()

  const { provider, secretKey, siteKey } = settings.captcha
  let result: CaptchaVerification

  try {
    if (provider === 'botflush') {
      result = await $fetch<CaptchaVerification>(verifyUrls.botflush, {
        method: 'POST',
        body: { secret: secretKey, token: input.token, action: LOGIN_CAPTCHA_ACTION, request_id: input.requestId },
        timeout: 10000,
        retry: 0,
        redirect: 'error'
      })
    } else {
      result = await $fetch<CaptchaVerification>(verifyUrls[provider], {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret: secretKey, response: input.token }).toString(),
        timeout: 10000,
        retry: 0,
        redirect: 'error'
      })
    }
  } catch {
    throw createError({ statusCode: 502, statusMessage: '验证码服务暂时不可用，请稍后重试', data: { code: 'CAPTCHA_UNAVAILABLE' } })
  }

  if (result?.success !== true) invalidCaptcha()
  if (provider === 'botflush') {
    if ((result.site_key !== undefined && result.site_key !== siteKey)
      || (result.action !== undefined && result.action !== LOGIN_CAPTCHA_ACTION)
      || (result.request_id !== undefined && result.request_id !== input.requestId)) invalidCaptcha()
  } else {
    if (typeof result.hostname !== 'string' || result.hostname.toLowerCase() !== new URL(settings.siteUrl).hostname.toLowerCase()) invalidCaptcha()
    if (provider === 'turnstile' && (result.action !== LOGIN_CAPTCHA_ACTION || result.cdata !== input.requestId)) invalidCaptcha()
  }

  const now = Date.now()
  const consumed = await db.prepare(`UPDATE login_captcha_challenges SET consumed_at = ?
    WHERE request_hash = ? AND email_hash = ? AND settings_hash = ? AND consumed_at IS NULL AND expires_at > ?`)
    .run(now, requestHash, emailHash, settingsHash, now)
  if (!consumed.changes) invalidCaptcha()
}
