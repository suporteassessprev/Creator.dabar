import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPassword, signSession, setSessionCookie } from '@/lib/auth'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(req: Request) {
  // 10 attempts per minute per IP
  const rl = rateLimit(getClientIp(req), 'auth:login', 10, 60_000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Aguarde um momento e tente novamente.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }

  try {
    const { email, password } = await req.json()

    if (!email || !password)
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    })

    if (!user || !(await verifyPassword(password, user.password)))
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })

    const token = await signSession({
      userId: user.id,
      email:  user.email,
      role:   user.role as 'ADMIN' | 'USER',
      name:   user.name,
    })
    await setSessionCookie(token)

    return NextResponse.json({
      ok:   true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro ao fazer login' }, { status: 500 })
  }
}
