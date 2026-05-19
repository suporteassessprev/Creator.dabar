import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/carousels — authenticated user's carousels
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') // 'draft' | 'ready' | 'published' | null
  const limit  = parseInt(searchParams.get('limit') ?? '50', 10)
  const cursor = searchParams.get('cursor') // last carousel id for pagination

  const where: Record<string, unknown> = { userId: session.userId }
  if (status && status !== 'all') where.status = status

  const carousels = await prisma.carousel.findMany({
    where,
    include: { slides: { orderBy: { order: 'asc' } } },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  })

  return NextResponse.json(carousels)
}

// POST /api/carousels — upsert (create or update by id)
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await req.json()
    const {
      id, title, topic, mode, format, style, status, slides,
      templateId, templateStructure,
    } = data

    if (!id)    return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
    if (!title) return NextResponse.json({ error: 'title obrigatório' }, { status: 400 })

    // Upsert carousel
    const carousel = await prisma.carousel.upsert({
      where: { id },
      create: {
        id,
        title,
        topic:             topic  ?? '',
        mode:              mode   ?? 'creative',
        format:            format ?? 'square',
        style:             typeof style === 'string' ? style : JSON.stringify(style ?? {}),
        status:            status ?? 'draft',
        templateId:        templateId        ?? null,
        templateStructure: templateStructure ?? null,
        userId:            session.userId,
      },
      update: {
        title,
        topic:             topic  ?? '',
        mode:              mode   ?? 'creative',
        format:            format ?? 'square',
        style:             typeof style === 'string' ? style : JSON.stringify(style ?? {}),
        status:            status ?? 'draft',
        templateId:        templateId        ?? null,
        templateStructure: templateStructure ?? null,
      },
    })

    // Sync slides if provided — wrapped in transaction to prevent data loss
    if (Array.isArray(slides) && slides.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.slide.deleteMany({ where: { carouselId: id } })
        await tx.slide.createMany({
          data: slides.map((s: any, idx: number) => ({
            id:              s.id,
            carouselId:      id,
            order:           s.order ?? idx,
            title:           s.title           ?? '',
            subtitle:        s.subtitle        ?? null,
            content:         s.content         ?? '',
            cta:             s.cta             ?? null,
            imageUrl:        s.imageUrl        ?? null,
            imagePrompt:     s.imagePrompt     ?? null,
            backgroundColor: s.backgroundColor ?? '#0f172a',
            textColor:       s.textColor       ?? '#ffffff',
            accentColor:     s.accentColor     ?? '#0ea5e9',
            fontFamily:      s.fontFamily      ?? 'Inter',
            layout:          s.layout          ?? 'headline-banner',
          })),
        })
      })
    }

    return NextResponse.json({ ok: true, id: carousel.id })
  } catch (e: any) {
    console.error('Carousel upsert error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
