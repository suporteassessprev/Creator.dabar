// Force Node.js runtime so that `jose` (which uses CompressionStream /
// DecompressionStream) doesn't trigger Edge Runtime warnings during build.
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const COOKIE_NAME = 'viralpost_session'

// Routes that require an authenticated user (any role)
const USER_PROTECTED_ROUTES = [
  '/dashboard',
  '/generator',
  '/editor',
  '/billing',
  '/settings',
  '/marketplace/submit',
]

async function verifyToken(token: string | undefined): Promise<{ valid: boolean; role?: string }> {
  if (!token) return { valid: false }
  const secret = process.env.JWT_SECRET
  if (!secret) return { valid: false }
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
    return { valid: true, role: payload.role as string }
  } catch {
    return { valid: false }
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get(COOKIE_NAME)?.value

  // ── User-protected routes ────────────────────────────────────────────────
  const isUserRoute = USER_PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  )

  if (isUserRoute) {
    const { valid } = await verifyToken(token)
    if (!valid) {
      const url = new URL('/login', req.url)
      url.searchParams.set('from', pathname)
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // ── Admin routes ─────────────────────────────────────────────────────────
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  // /admin/login is public — redirect already-logged-in admins to dashboard
  if (pathname === '/admin/login') {
    const { valid, role } = await verifyToken(token)
    if (valid && role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
    return NextResponse.next()
  }

  // All other /admin/* routes require ADMIN role
  const { valid, role } = await verifyToken(token)
  if (!valid || role !== 'ADMIN') {
    const url = new URL('/admin/login', req.url)
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/generator/:path*',
    '/editor/:path*',
    '/billing/:path*',
    '/settings/:path*',
    '/marketplace/submit/:path*',
    // Exact paths without trailing segments
    '/dashboard',
    '/generator',
    '/editor',
    '/billing',
    '/settings',
    '/marketplace/submit',
  ],
}
