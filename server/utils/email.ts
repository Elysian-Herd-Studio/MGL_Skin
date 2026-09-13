import { Resend } from 'resend'
import { createTransport } from 'nodemailer'
import type { MailSettings } from '../../shared/types/settings'

function siteUrl() {
  return getSiteSettings().siteUrl.replace(/\/+$/, '')
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function shell(title: string, paragraphs: string[], action?: { label: string, url: string }) {
  const body = paragraphs.map(text => `<p style="margin:0 0 16px">${text}</p>`).join('')
  const actionUrl = action ? escapeHtml(action.url) : ''
  const button = action
    ? `<p style="margin:24px 0"><a href="${actionUrl}" style="display:inline-block;padding:12px 24px;background:#1867c0;color:#fff;border-radius:4px;text-decoration:none">${action.label}</a></p>
       <p style="margin:0 0 16px;color:#666;font-size:13px">如果按钮无法点击，请复制以下链接到浏览器打开：<br>${actionUrl}</p>`
    : ''

  return `<!doctype html>
<html lang="zh-CN">
<body style="margin:0;padding:24px;background:#f5f5f5;font-family:system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,'PingFang SC','Microsoft YaHei',sans-serif;color:#212121">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:32px">
    <h1 style="margin:0 0 24px;font-size:20px">${title}</h1>
    ${body}
    ${button}
  </div>
</body>
</html>`
}

async function sendMail(input: { to: string, subject: string, html: string }, settings: MailSettings = getSiteSettings().mail) {
  if (!settings.from || (settings.transport === 'api' ? !settings.apiKey : !settings.smtpHost)) {
    throw createError({ statusCode: 503, statusMessage: '邮件服务尚未配置，请联系管理员', data: { code: 'MAIL_NOT_CONFIGURED' } })
  }

  try {
    const message = { from: settings.from, to: [input.to], subject: input.subject, html: input.html }
    if (settings.transport === 'smtp') {
      const transport = createTransport({
        host: settings.smtpHost,
        port: settings.smtpPort,
        secure: settings.smtpSecurity === 'tls',
        requireTLS: settings.smtpSecurity === 'starttls',
        ignoreTLS: settings.smtpSecurity === 'none',
        auth: settings.smtpUsername ? { user: settings.smtpUsername, pass: settings.smtpPassword } : undefined,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
        disableFileAccess: true,
        disableUrlAccess: true
      })
      try {
        const result = await transport.sendMail(message)
        if (!result.accepted.length) throw new Error('SMTP rejected the recipient')
      } finally {
        transport.close()
      }
      return
    }

    if (settings.preset === 'resend') {
      const { error } = await new Resend(settings.apiKey).emails.send(message)
      if (error) throw new Error(error.message)
      return
    }

    const result = await $fetch<{ error?: unknown }>(settings.apiUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${settings.apiKey}` },
      body: message,
      timeout: 15000,
      retry: 0,
      redirect: 'error'
    })
    if (result?.error) throw new Error('Mail API rejected the message')
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: settings.transport === 'smtp'
        ? '邮件发送失败，请检查 SMTP 地址、端口、凭据和发件人设置'
        : '邮件发送失败，请检查 API 地址、密钥和发件人设置',
      data: { code: 'MAIL_SEND_FAILED' }
    })
  }
}

export function sendVerificationEmail(user: { username: string, email: string }, token: string) {
  const url = `${siteUrl()}/verify-email?token=${encodeURIComponent(token)}`

  return sendMail({
    to: user.email,
    subject: '验证你的邮箱',
    html: shell('验证你的邮箱', [
      `${escapeHtml(user.username)}，欢迎加入 MGL Skin。`,
      '请点击下面的按钮完成邮箱验证，链接 24 小时内有效。',
      '如果这不是你本人的操作，忽略本邮件即可。'
    ], { label: '验证邮箱', url })
  })
}

export function sendPasswordResetEmail(user: { username: string, email: string }, token: string) {
  const url = `${siteUrl()}/reset-password?token=${encodeURIComponent(token)}`

  return sendMail({
    to: user.email,
    subject: '重置你的密码',
    html: shell('重置你的密码', [
      `${escapeHtml(user.username)}，我们收到了重置密码的请求。`,
      '请点击下面的按钮设置新密码，链接 1 小时内有效。',
      '如果这不是你本人的操作，可以忽略本邮件，你的密码不会改变。'
    ], { label: '重置密码', url })
  })
}

export function sendEmailInUseNotice(user: { username: string, email: string }) {
  return sendMail({
    to: user.email,
    subject: '有人尝试使用你的邮箱注册',
    html: shell('有人尝试使用你的邮箱注册', [
      `${escapeHtml(user.username)}，有人尝试使用这个邮箱注册 MGL Skin，但该邮箱已经注册过了。`,
      '如果这是你本人，请直接登录；如果忘记了密码，可以使用「忘记密码」功能重置。',
      '如果这不是你本人的操作，忽略本邮件即可。'
    ])
  })
}

export function sendTestEmail(to: string, settings: MailSettings) {
  return sendMail({
    to,
    subject: 'MGL Skin 邮件配置测试',
    html: shell('邮件配置测试', ['如果你收到了这封邮件，说明当前邮件发送配置可以正常使用。'])
  }, settings)
}
