import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getUserPlanInfo } from '@/lib/billing'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const info = await getUserPlanInfo(session.userId)
    return NextResponse.json(info)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
