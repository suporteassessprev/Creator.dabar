import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getUserPlanInfo } from '@/lib/billing'

// POST /api/marketplace/submit — submit a template for approval
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const info = await getUserPlanInfo(session.userId)
  if (!info.canSubmitTemplates) {
    return NextResponse.json(
      { error: 'Submissão de templates é exclusiva dos planos Pro e Business.', upgradeRequired: 'pro' },
      { status: 403 }
    )
  }

  try {
    const data = await req.json()
    if (!data.name?.trim()) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })

    // style is optional from the form — use default if omitted
    const defaultStyle = JSON.stringify({
      primaryColor: '#0ea5e9', secondaryColor: '#d946ef',
      backgroundColor: '#0f172a', textColor: '#ffffff',
      fontFamily: 'Inter', theme: 'dark',
    })
    const styleValue = data.style
      ? (typeof data.style === 'string' ? data.style : JSON.stringify(data.style))
      : defaultStyle

    const submission = await prisma.templateSubmission.create({
      data: {
        userId:      session.userId,
        name:        data.name.trim(),
        description: data.description?.trim() || null,
        mode:        data.mode || 'creative',
        layout:      data.layout || 'headline-banner',
        style:       styleValue,
        palette:     data.palette || null,
        format:      data.format || 'square',
        previewImage:data.previewImage || null,
        status:      'pending',
      },
    })

    return NextResponse.json(submission, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// GET /api/marketplace/submit — user's own submissions
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const submissions = await prisma.templateSubmission.findMany({
    where:   { userId: session.userId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(submissions)
}
