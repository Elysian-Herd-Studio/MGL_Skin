import type { MailSettings } from '../types/settings'
import { isValidEmail } from './validation'

export function createDefaultMailSettings(): MailSettings {
  return {
    transport: 'api',
    preset: 'resend',
    from: '',
    apiUrl: 'https://api.resend.com/emails',
    apiKey: '',
    smtpHost: 'smtp.resend.com',
    smtpPort: 465,
    smtpSecurity: 'tls',
    smtpUsername: 'resend',
    smtpPassword: ''
  }
}

export function isValidSiteUrl(value: string) {
  try {
    const url = new URL(value)
    return value.length <= 2048 && !/[\r\n]/.test(value) && ['http:', 'https:'].includes(url.protocol)
      && !url.username && !url.password && !url.search && !url.hash
  } catch {
    return false
  }
}

export function isValidMailSender(value: string) {
  if (value.length > 320 || /[\r\n]/.test(value)) return false
  const match = value.trim().match(/^(?:[^<>]*<([^<>]+)>|([^<>]+))$/)
  return Boolean(match && isValidEmail((match[1] ?? match[2] ?? '').trim()))
}
