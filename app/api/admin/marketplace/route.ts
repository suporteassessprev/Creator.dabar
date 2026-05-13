import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/admin/marketplace — list all submissions
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') // 'pending'|'approved'|'rejected'|null

  const submissions = await prisma.templateSubmission.findMany({
    where:   status ? { status } : {},
    include: {
      user:            { select: { name: true, email: true } },
      approvedTemplate: { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(submissions)
}
