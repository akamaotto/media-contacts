import { auth } from "./auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { PATHS } from "@/lib/constants"

export default auth((req: NextRequest & { auth: any }) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth
  
  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    if (!isLoggedIn || req.auth?.user?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL(PATHS.LOGIN, req.url))
    }
  }
  
  // Protect dashboard routes
  if (pathname.startsWith('/dashboard') || pathname === '/') {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL(PATHS.LOGIN, req.url))
    }
  }
  
  return NextResponse.next()
})

export const config = {
  matcher: [
    "/",
    "/((?!api|_next|auth).*)",
  ],
};
