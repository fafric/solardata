import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/", "/login", "/register", "/pending-approval", "/api/auth", "/api/register"];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublicPath = publicPaths.some(
    (path) =>
      pathname === path ||
      pathname.startsWith(`${path}/`) ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon")
  );

  if (isPublicPath) {
    return NextResponse.next();
  }

  const token = request.cookies.get("authjs.session-token") ?? request.cookies.get("__Secure-authjs.session-token");

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
