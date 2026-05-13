import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

async function checkAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return null
  return session
}

// GET /api/admin/prompts/[id]/versions
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await checkAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const versions = await prisma.promptVersion.findMany({
    where: { promptId: params.id },
    orderBy: { version: 'desc' },
  })

  return NextResponse.json(versions)
}
