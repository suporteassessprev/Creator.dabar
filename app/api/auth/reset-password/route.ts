import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json()
    if (!token || !password) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    if (password.length < 8) return NextResponse.json({ error: 'Senha deve ter pelo menos 8 caracteres' }, { status: 400 })

    const record = await prisma.emailToken.findUnique({ where: { token } })
    if (!record || record.type !== 'reset_password' || record.usedAt)
      return NextResponse.json({ error: 'Link inválido ou já utilizado' }, { status: 400 })

    if (new Date(record.expiresAt) < new Date())
      return NextResponse.json({ error: 'Link expirado. Solicite um novo.' }, { status: 400 })

    const hashed = await hashPassword(password)
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { password: hashed } }),
      prisma.emailToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ])

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
