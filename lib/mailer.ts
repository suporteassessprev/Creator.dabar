/**
 * Transactional email via Resend (preferred) or SMTP fallback.
 * Gracefully no-ops if neither is configured.
 */

const RESEND_KEY     = process.env.RESEND_API_KEY
const FROM_EMAIL     = process.env.EMAIL_FROM ?? 'ViralPost <noreply@viralpost.app>'
const APP_URL        = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export interface MailOptions {
  to:      string
  subject: string
  html:    string
}

export async function sendMail(opts: MailOptions): Promise<void> {
  if (!RESEND_KEY) {
    // Dev fallback — just log to console
    console.log(`[MAIL] To: ${opts.to} | Subject: ${opts.subject}`)
    console.log('[MAIL] (Set RESEND_API_KEY to actually send emails)')
    return
  }

  const { Resend } = await import('resend')
  const resend = new Resend(RESEND_KEY)

  const { error } = await resend.emails.send({
    from:    FROM_EMAIL,
    to:      opts.to,
    subject: opts.subject,
    html:    opts.html,
  })

  if (error) {
    console.error('[MAIL] Send error:', error)
    throw new Error(`Falha ao enviar email: ${error.message}`)
  }
}

// ─── Template helpers ────────────────────────────────────────

function baseLayout(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0f; color: #e5e7eb; }
    .wrapper { max-width: 520px; margin: 40px auto; padding: 0 20px; }
    .card { background: #111118; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 40px; }
    .logo { font-size: 24px; font-weight: 900; margin-bottom: 32px; }
    .logo span { background: linear-gradient(90deg,#3b82f6,#a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    h1 { font-size: 22px; font-weight: 700; margin: 0 0 12px; color: #fff; }
    p { font-size: 15px; line-height: 1.6; color: #9ca3af; margin: 0 0 16px; }
    .btn { display: inline-block; background: linear-gradient(90deg,#3b82f6,#8b5cf6); color: #fff !important; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 28px; border-radius: 12px; margin: 8px 0 24px; }
    .footer { text-align: center; font-size: 12px; color: #4b5563; margin-top: 32px; }
    code { background: #1e1e2e; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 2px 6px; font-size: 13px; color: #a5b4fc; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="logo"><span>ViralPost</span></div>
      ${content}
    </div>
    <div class="footer">© ${new Date().getFullYear()} ViralPost · <a href="${APP_URL}" style="color:#4b5563">viralpost.app</a></div>
  </div>
</body>
</html>`
}

export async function sendWelcomeEmail(to: string, name: string, verifyUrl: string) {
  return sendMail({
    to,
    subject: '🚀 Bem-vindo ao ViralPost!',
    html: baseLayout(`
      <h1>Bem-vindo, ${name || 'Criador'}! 👋</h1>
      <p>Sua conta foi criada com sucesso. Confirme seu email para começar a criar carrosséis virais com IA.</p>
      <a href="${verifyUrl}" class="btn">Verificar meu email</a>
      <p style="font-size:13px">Ou copie este link no navegador:<br><code>${verifyUrl}</code></p>
      <p style="font-size:13px;color:#6b7280">Este link expira em 24 horas.</p>
    `),
  })
}

export async function sendVerifyEmail(to: string, verifyUrl: string) {
  return sendMail({
    to,
    subject: '✉️ Verifique seu email — ViralPost',
    html: baseLayout(`
      <h1>Confirme seu email</h1>
      <p>Clique no botão abaixo para verificar seu endereço de email.</p>
      <a href="${verifyUrl}" class="btn">Verificar email</a>
      <p style="font-size:13px;color:#6b7280">Este link expira em 24 horas.</p>
    `),
  })
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  return sendMail({
    to,
    subject: '🔐 Redefinir senha — ViralPost',
    html: baseLayout(`
      <h1>Redefinir senha</h1>
      <p>Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo:</p>
      <a href="${resetUrl}" class="btn">Redefinir senha</a>
      <p style="font-size:13px;color:#6b7280">Este link expira em 1 hora. Se você não solicitou, ignore este email.</p>
    `),
  })
}

export async function sendSubscriptionConfirmEmail(to: string, planName: string) {
  return sendMail({
    to,
    subject: `✅ Assinatura ${planName} ativada — ViralPost`,
    html: baseLayout(`
      <h1>Assinatura ativada! 🎉</h1>
      <p>Seu plano <strong style="color:#fff">${planName}</strong> foi ativado com sucesso.</p>
      <p>Você agora tem acesso a todos os recursos do plano. Comece a criar!</p>
      <a href="${APP_URL}/generator" class="btn">Criar meu primeiro carrossel</a>
    `),
  })
}
