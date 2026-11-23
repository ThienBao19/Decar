import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Sessions use the database strategy, so withAuth (JWT-only) can't read them.
// This is a cheap presence check; pages verify the session with getServerSession.
const SESSION_COOKIES = ['__Secure-next-auth.session-token', 'next-auth.session-token']

export function middleware(req: NextRequest) {
  const hasSession = SESSION_COOKIES.some((name) => req.cookies.has(name))
  if (hasSession) return NextResponse.next()
  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/profile/:path*'],
}
