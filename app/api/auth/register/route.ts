import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, signSession, setSessionCookie } from '@/lib/auth'
import { provisionFreePlan } from '@/lib/billing'
import { sendWelcomeEmail } from '@/lib/mailer'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function POST(req: Request) {
  // 5 registrations per hour per IP
  const rl = rateLimit(getClientIp(req), 'auth:register', 5, 60 * 60_000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Aguarde um momento e tente novamente.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }

  try {
    const { name, email, password } = await req.json()

    if (!email?.trim())    return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 })
    if (!password?.trim()) return NextResponse.json({ error: 'Senha é obrigatória' }, { status: 400 })
    if (password.trim().length < 8) return NextResponse.json({ error: 'Senha deve ter pelo menos 8 caracteres' }, { status: 400 })

    const normalEmail = email.trim().toLowerCase()

    const existing = await prisma.user.findUnique({ where: { email: normalEmail } })
    if (existing) return NextResponse.json({ error: 'Este email já está cadastrado' }, { status: 409 })

    const hashed = await hashPassword(password)

    // Create user + provision free plan in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          name:          name?.trim() || null,
          email:         normalEmail,
          password:      hashed,
          role:          'USER',
          emailVerified: false,
        },
      })
      return u
    })

    // Provision free plan
    await provisionFreePlan(user.id)

    // Create email verification token
    const token = crypto.randomBytes(32).toString('hex')
    await prisma.emailToken.create({
      data: {
        userId:    user.id,
        type:      'verify_email',
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })

    // Send welcome email (fire-and-forget)
    const verifyUrl = `${APP_URL}/verify-email?token=${token}`
    sendWelcomeEmail(normalEmail, user.name ?? '', verifyUrl).catch(console.error)

    // Auto-login
    const jwt = await signSession({
      userId: user.id,
      email:  user.email,
      role:   'USER',
      name:   user.name,
    })
    await setSessionCookie(jwt)

    return NextResponse.json({ ok: true, userId: user.id }, { status: 201 })
  } catch (e: any) {
    console.error('Register error:', e)
    return NextResponse.json({ error: e.message || 'Erro ao criar conta' }, { status: 500 })
  }
}
