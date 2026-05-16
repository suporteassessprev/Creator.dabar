/**
 * POST /api/admin/users/[id]/credits
 * Admin-only — grant or revoke credits for a specific user.
 *
 * Body: { amount: number, reason?: string }
 *   - Positive amount adds credits
 *   - Negative amount removes credits (won't go below 0)
 *
 * Side effects:
 *   - Updates the user's CreditBalance.credits
 *   - Creates a CreditTransaction record (type='admin_grant' or 'admin_revoke')
 *
 * Returns: { balance: number, transaction: { id, amount, balance, type, createdAt } }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const amount = Number(body.amount)
    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 280) : null

    if (!Number.isFinite(amount) || amount === 0) {
      return NextResponse.json({ error: 'amount deve ser um número diferente de zero' }, { status: 400 })
    }

    const userId = params.id
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Get or create CreditBalance
    let balance = await prisma.creditBalance.findUnique({ where: { userId } })
    if (!balance) {
      // Default 30-day window
      const periodEnd = new Date()
      periodEnd.setDate(periodEnd.getDate() + 30)
      balance = await prisma.creditBalance.create({
        data: { userId, credits: 0, periodEnd },
      })
    }

    const newCredits = Math.max(0, balance.credits + amount)
    const actualDelta = newCredits - balance.credits // may be less than `amount` if clamped to 0

    const [updated, transaction] = await prisma.$transaction([
      prisma.creditBalance.update({
        where: { userId },
        data: { credits: newCredits },
      }),
      prisma.creditTransaction.create({
        data: {
          userId,
          amount: actualDelta,
          balance: newCredits,
          type: actualDelta >= 0 ? 'admin_grant' : 'admin_revoke',
          description: reason ?? (actualDelta >= 0 ? 'Créditos adicionados pelo admin' : 'Créditos removidos pelo admin'),
        },
      }),
    ])

    console.log(`[admin/users/credits] admin=${session.userId} user=${userId} delta=${actualDelta} newBalance=${newCredits}`)

    return NextResponse.json({
      balance: updated.credits,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        balance: transaction.balance,
        type: transaction.type,
        createdAt: transaction.createdAt,
      },
    })
  } catch (e: any) {
    console.error('[admin/users/credits] error:', e?.message ?? 'unknown')
    return NextResponse.json({ error: e?.message ?? 'Erro ao atualizar créditos' }, { status: 500 })
  }
}
