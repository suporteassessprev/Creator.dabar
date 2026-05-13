import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

// DELETE — revoke API key
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const key = await prisma.apiKey.findUnique({ where: { id: params.id } })
  if (!key || key.userId !== session.userId)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.apiKey.update({
    where: { id: params.id },
    data:  { revokedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
