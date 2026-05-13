import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const days = Math.min(parseInt(searchParams.get('days') ?? '30', 10), 90)

  const since = new Date(Date.now() - days * 86400 * 1000)

  const [total, byAction, recent] = await Promise.all([
    prisma.usageLog.count({ where: { userId: session.userId, createdAt: { gte: since } } }),
    prisma.usageLog.groupBy({
      by:      ['action'],
      where:   { userId: session.userId, createdAt: { gte: since } },
      _count:  { id: true },
      _sum:    { creditsUsed: true },
    }),
    prisma.usageLog.findMany({
      where:   { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      take:    10,
    }),
  ])

  return NextResponse.json({ total, byAction, recent, days })
}
