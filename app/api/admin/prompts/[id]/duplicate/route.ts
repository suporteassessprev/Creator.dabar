import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

async function checkAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return null
  return session
}

// POST /api/admin/prompts/[id]/duplicate
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await checkAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const original = await prisma.promptConfig.findUnique({ where: { id: params.id } })
    if (!original) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const copy = await prisma.promptConfig.create({
      data: {
        name:     `${original.name} (cópia)`,
        type:     original.type,
        content:  original.content,
        active:   false, // duplicates start inactive
        version:  1,
        authorId: session.userId,
      },
    })

    return NextResponse.json(copy, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
