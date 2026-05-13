import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

async function checkAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return null
  return session
}

// POST /api/admin/prompts/[id]/restore — body: { versionId }
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await checkAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { versionId } = await req.json()
    if (!versionId) return NextResponse.json({ error: 'versionId obrigatório' }, { status: 400 })

    const [existing, snap] = await Promise.all([
      prisma.promptConfig.findUnique({ where: { id: params.id } }),
      prisma.promptVersion.findUnique({ where: { id: versionId, promptId: params.id } }),
    ])

    if (!existing) return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })
    if (!snap)     return NextResponse.json({ error: 'Version not found' }, { status: 404 })

    // Save current content as a new version snapshot before restoring
    await prisma.promptVersion.create({
      data: {
        promptId: params.id,
        version:  existing.version,
        content:  existing.content,
      },
    })

    const restored = await prisma.promptConfig.update({
      where: { id: params.id },
      data: {
        content: snap.content,
        version: existing.version + 1,
      },
    })

    return NextResponse.json(restored)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
