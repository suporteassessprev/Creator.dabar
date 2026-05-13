import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100)

  const [balance, transactions] = await Promise.all([
    prisma.creditBalance.findUnique({ where: { userId: session.userId } }),
    prisma.creditTransaction.findMany({
      where:   { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      take:    limit,
    }),
  ])

  return NextResponse.json({ balance, transactions })
}
