import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendPasswordResetEmail } from '@/lib/mailer'
import crypto from 'crypto'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function POST(req: Request) {
  // 5 password resets per 15 minutes per IP
  const rl = rateLimit(getClientIp(req), 'auth:forgot-password', 5, 15 * 60_000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Aguarde um momento e tente novamente.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }

  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })

    // Always return 200 to avoid user enumeration
    if (!user) return NextResponse.json({ ok: true })

    const token = crypto.randomBytes(32).toString('hex')
    await prisma.emailToken.create({
      data: {
        userId:    user.id,
        type:      'reset_password',
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    })

    const resetUrl = `${APP_URL}/reset-password?token=${token}`
    await sendPasswordResetEmail(user.email, resetUrl).catch(console.error)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
