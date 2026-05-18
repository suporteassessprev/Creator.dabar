import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { TEMPLATE_PRESETS } from '@/lib/template-presets'
import { serializeStructure } from '@/lib/template-structure'

/**
 * POST /api/admin/templates/seed-presets
 *
 * Inserts the curated set from lib/template-presets.ts into the
 * Template table. Idempotent: skips presets whose `name` already
 * exists. Returns { created, skipped, total }.
 *
 * Each preset is created as `published: false, active: true` so the
 * admin can preview and publish after seeding.
 */
export async function POST() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const existing = await prisma.template.findMany({
    where: { name: { in: TEMPLATE_PRESETS.map(p => p.name) } },
    select: { name: true },
  })
  const existingNames = new Set(existing.map(t => t.name))

  const toCreate = TEMPLATE_PRESETS.filter(p => !existingNames.has(p.name))

  const created: string[] = []
  for (const preset of toCreate) {
    const style = JSON.stringify({
      primaryColor:    preset.palette.accent,
      secondaryColor:  '#d946ef',
      backgroundColor: preset.palette.bg,
      textColor:       preset.palette.text,
      fontFamily:      'Inter',
      theme:           preset.palette.theme,
    })

    await prisma.template.create({
      data: {
        name:         preset.name,
        description:  preset.description,
        mode:         preset.mode,
        format:       preset.format,
        layout:       'headline-banner',
        style,
        palette:      JSON.stringify(preset.palette),
        active:       true,
        published:    false,
        structure:    serializeStructure(preset.structure),
        authorId:     session.userId,
      },
    })
    created.push(preset.name)
  }

  return NextResponse.json({
    created: created.length,
    skipped: existingNames.size,
    total:   TEMPLATE_PRESETS.length,
    names:   created,
  })
}
