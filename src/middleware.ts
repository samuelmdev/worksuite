import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // For now, we'll handle authentication on the client side
  // In a production app, you'd want to verify JWT tokens here
  
  // Protected routes that require authentication
  const protectedRoutes = ['/crm', '/time-tracking', '/projects', '/billing', '/team', '/settings']
  const isProtectedRoute = protectedRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  )

  // Auth routes
  const authRoutes = ['/auth/login', '/auth/signup']
  const isAuthRoute = authRoutes.includes(req.nextUrl.pathname)

  // For protected routes, we'll let the client-side auth handle the redirect
  // This middleware is mainly for future JWT verification
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
