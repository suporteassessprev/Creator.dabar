import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/marketplace/templates — public listing of approved marketplace templates
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode   = searchParams.get('mode')
  const format = searchParams.get('format')

  const templates = await prisma.template.findMany({
    where: {
      published:    true,
      active:       true,
      submissionId: { not: null },  // marketplace only
      ...(mode   && mode   !== 'all' ? { mode: { in: [mode, 'both'] } } : {}),
      ...(format && format !== 'all' ? { format } : {}),
    },
    include: {
      submission: { select: { userId: true, status: true } },
      author:     { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(templates)
}
