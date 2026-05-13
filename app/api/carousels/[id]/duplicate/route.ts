import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

// POST /api/carousels/[id]/duplicate
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const original = await prisma.carousel.findUnique({
      where: { id: params.id },
      include: { slides: { orderBy: { order: 'asc' } } },
    })

    if (!original) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (original.userId !== session.userId)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const newId = uuidv4()

    const copy = await prisma.carousel.create({
      data: {
        id:     newId,
        title:  `${original.title} (cópia)`,
        topic:  original.topic,
        mode:   original.mode,
        format: original.format,
        style:  original.style,
        status: 'draft',
        userId: session.userId,
        slides: {
          create: original.slides.map(s => ({
            id:              uuidv4(),
            order:           s.order,
            title:           s.title,
            subtitle:        s.subtitle,
            content:         s.content,
            cta:             s.cta,
            imageUrl:        s.imageUrl,
            imagePrompt:     s.imagePrompt,
            backgroundColor: s.backgroundColor,
            textColor:       s.textColor,
            accentColor:     s.accentColor,
            fontFamily:      s.fontFamily,
            layout:          s.layout,
          })),
        },
      },
      include: { slides: { orderBy: { order: 'asc' } } },
    })

    return NextResponse.json(copy, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
