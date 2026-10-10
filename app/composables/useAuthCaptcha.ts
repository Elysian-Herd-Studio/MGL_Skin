import type { CaptchaAction, CaptchaChallenge, CaptchaProof, CaptchaResponse } from '../../shared/types/captcha'

interface AuthCredentials {
  email: string
  password: string
  username?: string
}

export function useAuthCaptcha(action: CaptchaAction, options: {
  active: () => boolean
  onSuccess: () => void
  onError?: (code: string | undefined) => void
}) {
  const toast = useToast()
  const container = ref<HTMLElement | null>(null)
  const step = ref<'idle' | 'preparing' | 'challenge' | 'submitting'>('idle')
  const loading = computed(() => step.value !== 'idle')
  const challenge = ref<CaptchaChallenge | null>(null)
  const captchaError = ref('')
  let credentials: AuthCredentials | null = null
  let request: AbortController | undefined
  let configurationRetried = false

  watch(options.active, (value) => {
    if (!value) cancelAttempt()
  })
  onBeforeUnmount(cancelAttempt)

  function newRequest() {
    request?.abort()
    request = new AbortController()
    return request
  }

  function isCurrent(controller: AbortController) {
    return options.active() && request === controller && !controller.signal.aborted
  }

  function cancelAttempt() {
    request?.abort()
    request = undefined
    credentials = null
    challenge.value = null
    captchaError.value = ''
    step.value = 'idle'
  }

  async function cancelChallenge() {
    if (step.value === 'submitting') return
    cancelAttempt()
    await nextTick()
    if (options.active()) container.value?.querySelector<HTMLButtonElement>('button[type="submit"]')?.focus()
  }

  function onCaptchaError(message: string) {
    if (!options.active() || !challenge.value || captchaError.value === message) return
    captchaError.value = message
    toast.error(message)
  }

  async function authenticate(values: AuthCredentials) {
    if (loading.value || !options.active()) return
    credentials = { ...values }
    configurationRetried = false
    await prepareCaptcha()
  }

  async function prepareCaptcha() {
    if (!credentials || !options.active() || step.value === 'submitting') return
    const controller = newRequest()
    step.value = 'preparing'
    captchaError.value = ''

    try {
      const result = await $fetch<CaptchaResponse>('/api/auth/captcha', {
        method: 'POST',
        body: { email: credentials.email, action },
        signal: controller.signal,
        timeout: 15000,
        retry: false
      })
      if (!isCurrent(controller)) return

      if (result.enabled) {
        challenge.value = result
        step.value = 'challenge'
      } else {
        challenge.value = null
        await submitCredentials()
      }
    } catch (cause) {
      if (!isCurrent(controller)) return
      if (challenge.value) {
        onCaptchaError(apiErrorMessage(cause))
        step.value = 'challenge'
      } else {
        toast.error(apiErrorMessage(cause))
        cancelAttempt()
      }
    }
  }

  async function completeCaptcha(proof: CaptchaProof) {
    if (step.value !== 'challenge' || proof.requestId !== challenge.value?.requestId) return
    await submitCredentials(proof)
  }

  async function submitCredentials(captcha?: CaptchaProof) {
    if (!credentials || !options.active() || step.value === 'submitting') return
    const controller = newRequest()
    step.value = 'submitting'
    captchaError.value = ''

    try {
      await $fetch(`/api/auth/${action}`, {
        method: 'POST',
        body: { ...credentials, captcha },
        signal: controller.signal,
        timeout: 20000,
        retry: false
      })
      if (!isCurrent(controller)) return

      cancelAttempt()
      options.onSuccess()
    } catch (cause) {
      if (!isCurrent(controller)) return
      const code = apiErrorCode(cause)
      if (code === 'CAPTCHA_REQUIRED' && !captcha && !configurationRetried) {
        configurationRetried = true
        step.value = 'preparing'
        await prepareCaptcha()
      } else if (challenge.value && (!code || code.startsWith('CAPTCHA_'))) {
        onCaptchaError(apiErrorMessage(cause))
        step.value = 'challenge'
      } else {
        toast.error(apiErrorMessage(cause))
        cancelAttempt()
        options.onError?.(code)
      }
    }
  }

  return { container, step, loading, challenge, captchaError, authenticate, prepareCaptcha, completeCaptcha, onCaptchaError, cancelChallenge }
}
