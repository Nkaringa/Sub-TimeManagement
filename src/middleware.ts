import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { SessionData, sessionOptions } from '@/lib/session'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes — no session needed
  if (
    pathname.startsWith('/login') ||
    pathname === '/admin/login' ||
    pathname.startsWith('/api/auth')
  ) {
    return NextResponse.next()
  }

  const response = NextResponse.next()
  const session = await getIronSession<SessionData>(request, response, sessionOptions)

  // Not authenticated
  if (!session.userId) {
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const { role, mustChangePin } = session

  // Must change PIN — lock to /change-pin
  if (mustChangePin && pathname !== '/change-pin') {
    return NextResponse.redirect(new URL('/change-pin', request.url))
  }

  // /change-pin — redirect to dashboard if pin is already fine
  if (pathname === '/change-pin') {
    if (!mustChangePin) {
      return NextResponse.redirect(new URL(dashboardFor(role), request.url))
    }
    return NextResponse.next()
  }

  // Role-based route guards
  if (
    pathname.startsWith('/employee') ||
    pathname.startsWith('/api/employee') ||
    pathname === '/api/punch'
  ) {
    if (role !== 'EMPLOYEE') return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname.startsWith('/manager') || pathname.startsWith('/api/manager')) {
    if (role !== 'MANAGER') return NextResponse.redirect(new URL('/login', request.url))
  }

  if (
    (pathname.startsWith('/admin') && pathname !== '/admin/login') ||
    pathname.startsWith('/api/admin')
  ) {
    if (role !== 'SUPER_ADMIN') return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return response
}

function dashboardFor(role: SessionData['role']): string {
  if (role === 'SUPER_ADMIN') return '/admin/dashboard'
  if (role === 'MANAGER') return '/manager/dashboard'
  return '/employee/dashboard'
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
