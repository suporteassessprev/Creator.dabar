import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createCheckoutSession, getOrCreateCustomer } from '@/lib/stripe'
import { getPlan } from '@/lib/plans'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const { planName } = await req.json()
    if (!planName) return NextResponse.json({ error: 'planName é obrigatório' }, { status: 400 })

    const plan = getPlan(planName)
    if (!plan.stripePriceId)
      return NextResponse.json({ error: 'Plano não disponível para compra' }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId
    if (!customerId) {
      customerId = await getOrCreateCustomer({ email: user.email, name: user.name, userId: user.id })
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } })
    }

    const url = await createCheckoutSession({
      priceId:    plan.stripePriceId,
      userId:     user.id,
      email:      user.email,
      customerId,
      successUrl: `${APP_URL}/billing?success=1&plan=${planName}`,
      cancelUrl:  `${APP_URL}/pricing`,
    })

    return NextResponse.json({ url })
  } catch (e: any) {
    console.error('Checkout error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
