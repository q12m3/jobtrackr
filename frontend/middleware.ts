import { NextRequest, NextResponse } from 'next/server'

const AUTH_ROUTES = ['/login', '/register']
const PUBLIC_ROUTES = ['/login', '/register']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasToken = request.cookies.has('access_token')

  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r))
  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r))

  if (!hasToken && !isPublic) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (hasToken && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icons).*)'],
}
