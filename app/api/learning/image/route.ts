import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { ImageGenCapturePayload } from '@/lib/learning'

/**
 * POST /api/learning/image
 *
 * Records (or updates) an ImageGeneration row tracking a single
 * image_slot's prompt + the user's behavior:
 *   - approved=true   → the image was kept as the slide.imageUrl on save
 *   - approved=false  → user deleted / replaced it
 *   - regenCount      → how many times the user clicked "regenerate"
 *
 * The editor fires this:
 *   - once when an image is first generated (regenCount=0, approved=null)
 *   - on each "Gerar nova variação" click (regenCount++, approved=null)
 *   - on Salvar (approved set per slot)
 *
 * Sprint 3 mines this to extract common modifiers from approved prompts
 * (filtered by niche) and inject them into Nano Banana prompts of
 * future generations.
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ ok: true })

  try {
    const body = (await req.json()) as ImageGenCapturePayload
    if (!body || !body.promptText) {
      return NextResponse.json({ ok: false, error: 'invalid payload' }, { status: 400 })
    }

    await prisma.imageGeneration.create({
      data: {
        userId:     session.userId,
        slideId:    body.slideId ?? null,
        promptText: body.promptText,
        approved:   body.approved ?? null,
        niche:      body.niche    ?? null,
        regenCount: body.regenCount ?? 0,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[learning/image] error:', e?.message ?? e)
    return NextResponse.json({ ok: false, error: 'internal' })
  }
}
