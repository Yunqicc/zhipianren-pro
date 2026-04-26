import { NextRequest, NextResponse } from "next/server";

const publicPaths = ["/login", "/register", "/api/auth", "/api/demo"];

const DEMO_MODE_COOKIE = "zhipianren_demo_user";

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (isPublic) {
    return NextResponse.next();
  }

  const isStatic =
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".");

  if (isStatic) {
    return NextResponse.next();
  }

  const sessionToken =
    req.cookies.get("better-auth.session_token")?.value ||
    req.cookies.get("better-auth.session-token")?.value;

  const demoUser = req.cookies.get(DEMO_MODE_COOKIE)?.value;

  if (!sessionToken && !demoUser) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
