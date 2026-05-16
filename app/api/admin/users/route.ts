/**
 * GET /api/admin/users
 * Admin-only — returns the list of regular users with their plan,
 * carousel count, and current credit balance. Used by the admin
 * /admin/users page to show a manageable view + grant credits action.
 */
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const users = await prisma.user.findMany({
    where:   { role: 'USER' },
    orderBy: { createdAt: 'desc' },
    take:    200,
    include: {
      subscription:  { include: { plan: { select: { name: true, displayName: true } } } },
      creditBalance: { select: { credits: true } },
      _count:        { select: { carousels: true } },
    },
  })

  const out = users.map(u => ({
    id:            u.id,
    name:          u.name,
    email:         u.email,
    emailVerified: u.emailVerified,
    createdAt:     u.createdAt,
    subscription:  u.subscription ? {
      plan: {
        name:        u.subscription.plan.name,
        displayName: u.subscription.plan.displayName,
      },
    } : null,
    _count:  { carousels: u._count.carousels },
    credits: u.creditBalance?.credits ?? 0,
  }))

  return NextResponse.json(out)
}
