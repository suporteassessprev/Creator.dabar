import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

async function checkAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return null
  return session
}

// GET /api/admin/prompts
export async function GET(req: Request) {
  const session = await checkAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type   = searchParams.get('type')
  const active = searchParams.get('active')

  const where: Record<string, unknown> = {}
  if (type && type !== 'all') where.type = type
  if (active !== null && active !== '') where.active = active === 'true'

  const prompts = await prisma.promptConfig.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { versions: true } } },
  })

  return NextResponse.json(prompts)
}

// POST /api/admin/prompts
export async function POST(req: Request) {
  const session = await checkAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await req.json()

    if (!data.name?.trim())    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    if (!data.type?.trim())    return NextResponse.json({ error: 'Tipo é obrigatório' }, { status: 400 })
    if (!data.content?.trim()) return NextResponse.json({ error: 'Conteúdo é obrigatório' }, { status: 400 })

    // If this will be active, deactivate others of the same type
    if (data.active !== false) {
      await prisma.promptConfig.updateMany({
        where: { type: data.type, active: true },
        data: { active: false },
      })
    }

    const prompt = await prisma.promptConfig.create({
      data: {
        name:     data.name.trim(),
        type:     data.type,
        content:  data.content.trim(),
        active:   data.active ?? true,
        version:  1,
        authorId: session.userId,
      },
    })

    return NextResponse.json(prompt, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
