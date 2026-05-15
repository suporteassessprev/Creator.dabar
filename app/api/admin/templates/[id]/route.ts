import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { parseStructure, validateStructure } from '@/lib/template-structure'

function normalizeStructure(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null
  if (typeof raw !== 'string') throw new Error('structure deve ser string JSON')
  const parsed = parseStructure(raw)
  if (!parsed) throw new Error('structure JSON inválido')
  const errors = validateStructure(parsed)
  if (errors.length > 0) throw new Error(errors.map(e => e.message).join(' • '))
  return JSON.stringify(parsed)
}

async function checkAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return null
  return session
}

function buildStyle(palette: string | null | undefined): string {
  if (!palette) {
    return JSON.stringify({
      primaryColor: '#0ea5e9',
      secondaryColor: '#d946ef',
      backgroundColor: '#0f172a',
      textColor: '#ffffff',
      fontFamily: 'Inter',
      theme: 'dark',
    })
  }
  try {
    const p = JSON.parse(palette)
    return JSON.stringify({
      primaryColor: p.accent ?? '#0ea5e9',
      secondaryColor: '#d946ef',
      backgroundColor: p.bg ?? '#0f172a',
      textColor: p.text ?? '#ffffff',
      fontFamily: 'Inter',
      theme: p.theme ?? 'dark',
    })
  } catch {
    return JSON.stringify({
      primaryColor: '#0ea5e9',
      secondaryColor: '#d946ef',
      backgroundColor: '#0f172a',
      textColor: '#ffffff',
      fontFamily: 'Inter',
      theme: 'dark',
    })
  }
}

// GET /api/admin/templates/[id]
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await checkAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const template = await prisma.template.findUnique({ where: { id: params.id } })
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(template)
}

// PUT /api/admin/templates/[id]
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await checkAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await req.json()

    if (!data.name?.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    let structureJson: string | null
    try {
      structureJson = normalizeStructure(data.structure)
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }

    const template = await prisma.template.update({
      where: { id: params.id },
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        mode: data.mode || 'creative',
        format: data.format || 'square',
        layout: data.layout || 'headline-banner',
        style: buildStyle(data.palette),
        palette: data.palette || null,
        active: data.active ?? true,
        published: data.published ?? false,
        previewImage: data.previewImage || null,
        structure: structureJson,
      },
    })

    return NextResponse.json(template)
  } catch (e: any) {
    if (e.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE /api/admin/templates/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await checkAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await prisma.template.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PATCH /api/admin/templates/[id] — quick publish/active toggle
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await checkAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await req.json()
    const update: Record<string, unknown> = {}
    if (typeof data.published === 'boolean') update.published = data.published
    if (typeof data.active === 'boolean') update.active = data.active

    const template = await prisma.template.update({
      where: { id: params.id },
      data: update,
    })

    return NextResponse.json(template)
  } catch (e: any) {
    if (e.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
