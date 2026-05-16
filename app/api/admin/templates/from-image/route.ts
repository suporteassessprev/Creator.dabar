/**
 * POST /api/admin/templates/from-image
 *
 * Admin-only. Receives an image (base64 data URL) and uses Gemini Vision
 * to extract a TemplateStructure. Returns the structure for the admin
 * to preview and refine in the visual editor before saving.
 *
 * Security:
 * - Admin session required
 * - Gemini key read EXCLUSIVELY from server env (never from body)
 * - Errors don't leak the key in any way
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import {
  getServerGeminiKey,
  GeminiKeyMissingError,
  MISSING_GEMINI_KEY_MESSAGE,
} from '@/lib/gemini'
import { extractTemplateFromImage } from '@/lib/template-from-image'

const MAX_IMAGE_BYTES = 8 * 1024 * 1024 // 8 MB

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { image } = body

    if (typeof image !== 'string' || !image.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Campo "image" deve ser um data URL (data:image/...;base64,...)' },
        { status: 400 }
      )
    }

    // Reject overly large images early
    const approxBytes = Math.ceil((image.length * 3) / 4)
    if (approxBytes > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: 'Imagem muito grande. Use uma menor que 8 MB.' },
        { status: 413 }
      )
    }

    const geminiKey = getServerGeminiKey()
    const extracted = await extractTemplateFromImage(image, geminiKey)

    console.log(`[api/admin/templates/from-image] admin=${session.userId} ok elements=${extracted.structure.elements.length} thumb=${!!extracted.previewImage}`)

    return NextResponse.json({
      structure: extracted.structure,
      previewImage: extracted.previewImage,
      previewImagePrompt: extracted.previewImagePrompt,
    })
  } catch (e: any) {
    if (e instanceof GeminiKeyMissingError) {
      return NextResponse.json({ error: MISSING_GEMINI_KEY_MESSAGE }, { status: 503 })
    }
    // Log only the message — never the full error chain (could contain the key)
    console.error('[api/admin/templates/from-image] error:', e?.message ?? 'unknown')
    return NextResponse.json(
      { error: e?.message ?? 'Erro ao gerar template a partir da imagem' },
      { status: 500 }
    )
  }
}
