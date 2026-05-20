import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

async function getOwnedCarousel(id: string, userId: string) {
  const carousel = await prisma.carousel.findUnique({
    where: { id },
    include: { slides: { orderBy: { order: 'asc' } } },
  })
  if (!carousel) return null
  if (carousel.userId !== userId) return null
  return carousel
}

// GET /api/carousels/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const carousel = await getOwnedCarousel(params.id, session.userId)
  if (!carousel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(carousel)
}

// DELETE /api/carousels/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const carousel = await getOwnedCarousel(params.id, session.userId)
  if (!carousel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.carousel.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}

// PATCH /api/carousels/[id] — update status or title
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const carousel = await getOwnedCarousel(params.id, session.userId)
  if (!carousel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const data = await req.json()
    const update: Record<string, unknown> = {}
    if (data.status) update.status = data.status
    if (data.title)  update.title  = data.title

    const updated = await prisma.carousel.update({
      where: { id: params.id },
      data: update,
      include: { slides: { orderBy: { order: 'asc' } } },
    })

    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/**
 * PUT /api/carousels/[id]
 *
 * Full update — used by the editor's "Salvar" button. Persists the
 * whole carousel state: title, status, style, format, templateId,
 * templateStructure, and the full slide list (with each slide's
 * imageUrl, imageHistory, edits, etc).
 *
 * Slides are replaced atomically: delete-all-then-create. Simpler than
 * an upsert-and-reconcile, and the slide IDs are deterministic from the
 * client (createSlide() in lib/store.ts mints them).
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const carousel = await getOwnedCarousel(params.id, session.userId)
  if (!carousel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const data = await req.json()

    const update: Record<string, unknown> = {}
    if (typeof data.title             === 'string') update.title             = data.title
    if (typeof data.topic             === 'string') update.topic             = data.topic
    if (typeof data.mode              === 'string') update.mode              = data.mode
    if (typeof data.format            === 'string') update.format            = data.format
    if (typeof data.style             === 'string') update.style             = data.style
    if (typeof data.status            === 'string') update.status            = data.status
    if ('templateId'        in data)                update.templateId        = data.templateId ?? null
    if ('templateStructure' in data)                update.templateStructure = data.templateStructure ?? null

    await prisma.$transaction(async (tx) => {
      await tx.carousel.update({ where: { id: params.id }, data: update })

      if (Array.isArray(data.slides)) {
        // Replace the slide list atomically.
        await tx.slide.deleteMany({ where: { carouselId: params.id } })
        for (let i = 0; i < data.slides.length; i++) {
          const s = data.slides[i]
          await tx.slide.create({
            data: {
              id:              s.id,
              carouselId:      params.id,
              order:           i,
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
              templateStructure: s.templateStructure ?? null,
            },
          })
        }
      }
    })

    const updated = await prisma.carousel.findUnique({
      where: { id: params.id },
      include: { slides: { orderBy: { order: 'asc' } } },
    })
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Erro ao salvar carrossel' }, { status: 500 })
  }
}
