import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/templates — public endpoint, returns published & active templates
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode') // 'creative' | 'carousel' | null

  const templates = await prisma.template.findMany({
    where: {
      published: true,
      active: true,
      ...(mode && mode !== 'all' ? { mode: { in: [mode, 'both'] } } : {}),
    },
    select: {
      id: true,
      name: true,
      description: true,
      mode: true,
      format: true,
      layout: true,
      style: true,
      palette: true,
      previewImage: true,
      structure: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(templates)
}
