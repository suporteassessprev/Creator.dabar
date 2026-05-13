import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { checkCanGenerate, consumeCredit } from '@/lib/billing'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { carouselId } = await req.json()

  const check = await checkCanGenerate(session.userId, 'export_zip')
  if (!check.allowed) {
    return NextResponse.json({ error: check.reason, upgradeRequired: check.upgradeRequired }, { status: 402 })
  }

  await consumeCredit(session.userId, 'export_zip', {
    carouselId,
    description: 'Exportação ZIP de slides',
  })

  return NextResponse.json({ ok: true })
}
