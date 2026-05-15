import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { parseStructure, validateStructure } from '@/lib/template-structure'

/**
 * Accept and validate the structure field. Returns either the
 * normalized JSON string (re-serialized to ensure shape) or null.
 * Throws with a user-readable message if invalid.
 */
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

// GET /api/admin/templates
export async function GET(req: Request) {
  const session = await checkAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode')
  const published = searchParams.get('published')
  const active = searchParams.get('active')

  const where: Record<string, unknown> = {}
  if (mode && mode !== 'all') where.mode = mode
  if (published !== null && published !== '') where.published = published === 'true'
  if (active !== null && active !== '') where.active = active === 'true'

  const templates = await prisma.template.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(templates)
}

// POST /api/admin/templates
export async function POST(req: Request) {
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

    const template = await prisma.template.create({
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
        authorId: session.userId,
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Erro ao criar template' }, { status: 500 })
  }
}
