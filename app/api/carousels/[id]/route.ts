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
