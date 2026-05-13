import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.redirect(new URL('/login?error=token_missing', req.url))

  const record = await prisma.emailToken.findUnique({ where: { token } })
  if (!record || record.type !== 'verify_email' || record.usedAt)
    return NextResponse.redirect(new URL('/login?error=token_invalid', req.url))

  if (new Date(record.expiresAt) < new Date())
    return NextResponse.redirect(new URL('/login?error=token_expired', req.url))

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
    prisma.emailToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ])

  return NextResponse.redirect(new URL('/dashboard?verified=1', req.url))
}
