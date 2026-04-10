import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/auth-config";

export function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/login") && sessionToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/courses") ||
    pathname.startsWith("/runners") ||
    pathname.startsWith("/predictions") ||
    pathname.startsWith("/results") ||
    pathname.startsWith("/publications") ||
    pathname.startsWith("/logs")
  ) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/dashboard/:path*", "/courses/:path*", "/runners/:path*", "/predictions/:path*", "/results/:path*", "/publications/:path*", "/logs/:path*"]
};
