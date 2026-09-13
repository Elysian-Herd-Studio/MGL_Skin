export type CaptchaProvider = 'recaptcha' | 'botflush' | 'turnstile'

export interface CaptchaSettings {
  enabled: boolean
  provider: CaptchaProvider
  siteKey: string
  secretKey: string
}

export interface CaptchaSettingsView extends CaptchaSettings {
  hasSecretKey: boolean
}

export interface LoginCaptchaChallenge {
  enabled: true
  provider: CaptchaProvider
  siteKey: string
  requestId: string
}

export type LoginCaptchaResponse = { enabled: false } | LoginCaptchaChallenge

export interface LoginCaptchaProof {
  requestId: string
  token: string
}
