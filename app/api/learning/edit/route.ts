import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { diffPct, isSignificantEdit, type EditCapturePayload } from '@/lib/learning'

/**
 * POST /api/learning/edit
 *
 * Records a CreativeEdit row capturing the diff between what the AI
 * generated and what the user actually saved. The editor calls this
 * fire-and-forget on save — must NEVER block the save flow.
 *
 * Sprint 1: only stores. Sprint 2 will read from here when building
 * the prompt to inject few-shot examples of the user's style.
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ ok: true }) // silent no-op for unauth — we don't break the editor

  try {
    const body = (await req.json()) as EditCapturePayload
    if (!body || !body.topic || !body.mode) {
      return NextResponse.json({ ok: false, error: 'invalid payload' }, { status: 400 })
    }
    // Skip trivial typo-level edits to keep the dataset clean.
    if (!isSignificantEdit(body.ai ?? {}, body.user ?? {})) {
      return NextResponse.json({ ok: true, skipped: 'trivial' })
    }

    await prisma.creativeEdit.create({
      data: {
        userId:          session.userId,
        carouselId:      body.carouselId ?? null,
        slideId:         body.slideId    ?? null,
        mode:            body.mode,
        topic:           body.topic,
        niche:           body.niche ?? null,
        aiHeadline:      body.ai.headline    ?? null,
        aiSubtitle:      body.ai.subtitle    ?? null,
        aiCta:           body.ai.cta         ?? null,
        aiImagePrompt:   body.ai.imagePrompt ?? null,
        userHeadline:    body.user.headline    ?? null,
        userSubtitle:    body.user.subtitle    ?? null,
        userCta:         body.user.cta         ?? null,
        userImagePrompt: body.user.imagePrompt ?? null,
        headlineDiffPct: diffPct(body.ai.headline,  body.user.headline),
        subtitleDiffPct: diffPct(body.ai.subtitle,  body.user.subtitle),
        ctaDiffPct:      diffPct(body.ai.cta,       body.user.cta),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    // Never let learning failures break the editor — return 200 anyway,
    // log server-side for debugging.
    console.error('[learning/edit] error:', e?.message ?? e)
    return NextResponse.json({ ok: false, error: 'internal' })
  }
}
