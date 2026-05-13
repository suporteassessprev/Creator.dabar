import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

// POST /api/admin/marketplace/[id]/review — approve or reject a submission
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { action, reviewNote } = await req.json()  // action: 'approve' | 'reject'
    if (!['approve', 'reject'].includes(action))
      return NextResponse.json({ error: 'action deve ser approve ou reject' }, { status: 400 })

    const submission = await prisma.templateSubmission.findUnique({ where: { id: params.id } })
    if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (submission.status !== 'pending')
      return NextResponse.json({ error: 'Já revisado' }, { status: 400 })

    if (action === 'reject') {
      await prisma.templateSubmission.update({
        where: { id: params.id },
        data:  { status: 'rejected', reviewNote: reviewNote || null, reviewedAt: new Date() },
      })
      return NextResponse.json({ ok: true, status: 'rejected' })
    }

    // Approve: create Template linked to submission
    const styleObj = (() => {
      try { return typeof submission.style === 'string' ? JSON.parse(submission.style) : submission.style }
      catch { return { primaryColor:'#0ea5e9', secondaryColor:'#d946ef', backgroundColor:'#0f172a', textColor:'#ffffff', fontFamily:'Inter', theme:'dark' } }
    })()
    const paletteObj = submission.palette ? (() => {
      try { return JSON.parse(submission.palette as string) } catch { return null }
    })() : null

    const template = await prisma.$transaction(async (tx) => {
      const t = await tx.template.create({
        data: {
          name:         submission.name,
          description:  submission.description,
          mode:         submission.mode,
          layout:       submission.layout,
          style:        JSON.stringify({
            primaryColor:    paletteObj?.accent ?? styleObj?.primaryColor ?? '#0ea5e9',
            secondaryColor:  '#d946ef',
            backgroundColor: paletteObj?.bg    ?? styleObj?.backgroundColor ?? '#0f172a',
            textColor:       paletteObj?.text  ?? styleObj?.textColor ?? '#ffffff',
            fontFamily:      'Inter',
            theme:           paletteObj?.theme ?? styleObj?.theme ?? 'dark',
          }),
          palette:      submission.palette,
          format:       submission.format,
          active:       true,
          published:    true,
          previewImage: submission.previewImage,
          authorId:     submission.userId,
          submissionId: submission.id,
        },
      })
      await tx.templateSubmission.update({
        where: { id: params.id },
        data:  { status: 'approved', reviewNote: reviewNote || null, reviewedAt: new Date() },
      })
      return t
    })

    return NextResponse.json({ ok: true, status: 'approved', template })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
