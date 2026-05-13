import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

async function checkAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return null
  return session
}

// GET /api/admin/prompts/[id]
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await checkAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const prompt = await prisma.promptConfig.findUnique({
    where: { id: params.id },
    include: {
      versions: { orderBy: { version: 'desc' } },
      author: { select: { name: true, email: true } },
    },
  })
  if (!prompt) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(prompt)
}

// PUT /api/admin/prompts/[id] — full update, saves old version to history
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await checkAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await req.json()

    if (!data.name?.trim())    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    if (!data.content?.trim()) return NextResponse.json({ error: 'Conteúdo é obrigatório' }, { status: 400 })

    const existing = await prisma.promptConfig.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Save old content as a version snapshot
    await prisma.promptVersion.create({
      data: {
        promptId: params.id,
        version:  existing.version,
        content:  existing.content,
      },
    })

    // If setting active, deactivate siblings of same type
    if (data.active === true && !existing.active) {
      await prisma.promptConfig.updateMany({
        where: { type: existing.type, active: true, id: { not: params.id } },
        data: { active: false },
      })
    }

    const updated = await prisma.promptConfig.update({
      where: { id: params.id },
      data: {
        name:    data.name.trim(),
        content: data.content.trim(),
        active:  data.active ?? existing.active,
        version: existing.version + 1,
      },
    })

    return NextResponse.json(updated)
  } catch (e: any) {
    if (e.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE /api/admin/prompts/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await checkAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await prisma.promptConfig.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PATCH /api/admin/prompts/[id] — quick active toggle
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await checkAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await req.json()

    if (data.active === true) {
      // Deactivate siblings
      const existing = await prisma.promptConfig.findUnique({ where: { id: params.id } })
      if (existing) {
        await prisma.promptConfig.updateMany({
          where: { type: existing.type, active: true, id: { not: params.id } },
          data: { active: false },
        })
      }
    }

    const prompt = await prisma.promptConfig.update({
      where: { id: params.id },
      data: { active: data.active },
    })

    return NextResponse.json(prompt)
  } catch (e: any) {
    if (e.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
