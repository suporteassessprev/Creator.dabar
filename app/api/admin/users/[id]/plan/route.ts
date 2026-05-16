/**
 * POST /api/admin/users/[id]/plan
 *
 * Admin-only — change a user's subscription plan (free|pro|business).
 * Does NOT touch Stripe — this is for testing/comping users only.
 * If the user has no Subscription record, creates one.
 *
 * Body: { planName: 'free' | 'pro' | 'business' }
 *
 * Returns: { plan: { name, displayName } }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

const ALLOWED_PLAN_NAMES = ['free', 'pro', 'business'] as const
type AllowedPlanName = typeof ALLOWED_PLAN_NAMES[number]

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
    const planName = String(body.planName ?? '').toLowerCase() as AllowedPlanName
    if (!ALLOWED_PLAN_NAMES.includes(planName)) {
      return NextResponse.json({ error: `planName deve ser um de: ${ALLOWED_PLAN_NAMES.join(', ')}` }, { status: 400 })
    }

    const userId = params.id
    const [user, plan] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.plan.findUnique({ where: { name: planName } }),
    ])
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    if (!plan) return NextResponse.json({ error: `Plano "${planName}" não encontrado` }, { status: 404 })

    // Upsert subscription
    const periodEnd = new Date()
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    const subscription = await prisma.subscription.upsert({
      where: { userId },
      update: {
        planId: plan.id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      },
      create: {
        userId,
        planId: plan.id,
        status: 'active',
        currentPeriodEnd: periodEnd,
      },
    })

    console.log(`[admin/users/plan] admin=${session.userId} user=${userId} plan=${planName}`)

    return NextResponse.json({
      plan: { name: plan.name, displayName: plan.displayName },
      subscription: { status: subscription.status },
    })
  } catch (e: any) {
    console.error('[admin/users/plan] error:', e?.message ?? 'unknown')
    return NextResponse.json({ error: e?.message ?? 'Erro ao mudar plano' }, { status: 500 })
  }
}
