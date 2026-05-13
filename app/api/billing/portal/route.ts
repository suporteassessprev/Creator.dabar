import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createPortalSession } from '@/lib/stripe'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const user = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!user?.stripeCustomerId)
      return NextResponse.json({ error: 'Nenhuma assinatura Stripe encontrada' }, { status: 400 })

    const url = await createPortalSession({
      customerId: user.stripeCustomerId,
      returnUrl:  `${APP_URL}/billing`,
    })

    return NextResponse.json({ url })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
