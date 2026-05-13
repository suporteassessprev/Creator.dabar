import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const original = await prisma.template.findUnique({ where: { id: params.id } })
    if (!original) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { id: _id, createdAt: _ca, updatedAt: _ua, ...rest } = original

    const copy = await prisma.template.create({
      data: {
        ...rest,
        name: `${original.name} (cópia)`,
        published: false,
        authorId: session.userId,
      },
    })

    return NextResponse.json(copy, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
