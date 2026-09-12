import { Resend } from 'resend'

let client: Resend | undefined

function getClient() {
  const { resendApiKey } = useRuntimeConfig()
  return resendApiKey ? (client ??= new Resend(resendApiKey)) : undefined
}

function siteUrl() {
  return useRuntimeConfig().public.siteUrl.replace(/\/+$/, '')
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
  const button = action
    ? `<p style="margin:24px 0"><a href="${action.url}" style="display:inline-block;padding:12px 24px;background:#1867c0;color:#fff;border-radius:4px;text-decoration:none">${action.label}</a></p>
       <p style="margin:0 0 16px;color:#666;font-size:13px">如果按钮无法点击，请复制以下链接到浏览器打开：<br>${action.url}</p>`
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

async function sendMail(input: { to: string, subject: string, html: string, link?: string }) {
  const { mailFrom } = useRuntimeConfig()
  const resend = getClient()

  if (!resend) {
    console.info(`[mail] 未配置 NUXT_RESEND_API_KEY，邮件改为输出到控制台\n  收件人: ${input.to}\n  主题: ${input.subject}${input.link ? `\n  链接: ${input.link}` : ''}`)
    return
  }

  try {
    const { error } = await resend.emails.send({
      from: mailFrom,
      to: input.to,
      subject: input.subject,
      html: input.html
    })

    if (error) {
      throw new Error(error.message)
    }
  } catch (cause) {
    console.error('[mail] 发送失败，邮件改为输出到控制台', cause)
    console.info(`  收件人: ${input.to}\n  主题: ${input.subject}${input.link ? `\n  链接: ${input.link}` : ''}`)
  }
}

export function sendVerificationEmail(user: { username: string, email: string }, token: string) {
  const url = `${siteUrl()}/verify-email?token=${encodeURIComponent(token)}`

  return sendMail({
    to: user.email,
    subject: '验证你的邮箱',
    link: url,
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
    link: url,
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
