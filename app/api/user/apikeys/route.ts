import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getUserPlanInfo } from '@/lib/billing'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// GET — list user's API keys
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const keys = await prisma.apiKey.findMany({
    where:   { userId: session.userId, revokedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, keyPrefix: true,
      lastUsedAt: true, expiresAt: true, createdAt: true,
    },
  })

  return NextResponse.json(keys)
}

// POST — create new API key
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const info = await getUserPlanInfo(session.userId)
  if (!info.canUseApi) {
    return NextResponse.json(
      { error: 'API keys são exclusivas do plano Business.', upgradeRequired: 'business' },
      { status: 403 }
    )
  }

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })

  // Check key limit (max 5 active keys)
  const count = await prisma.apiKey.count({ where: { userId: session.userId, revokedAt: null } })
  if (count >= 5) return NextResponse.json({ error: 'Limite de 5 API keys ativas atingido' }, { status: 400 })

  // Generate key: vp_live_<32 random hex>
  const rawKey   = `vp_live_${crypto.randomBytes(24).toString('hex')}`
  const keyHash  = await bcrypt.hash(rawKey, 10)
  const keyPrefix = rawKey.substring(0, 16) + '…'

  const apiKey = await prisma.apiKey.create({
    data: { userId: session.userId, name: name.trim(), keyHash, keyPrefix },
  })

  // Return the raw key ONCE — never stored
  return NextResponse.json({
    id:        apiKey.id,
    name:      apiKey.name,
    key:       rawKey,   // shown only once
    keyPrefix,
    createdAt: apiKey.createdAt,
  }, { status: 201 })
}
