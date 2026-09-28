// Runs before matching requests (Next 16 renamed middleware.ts to proxy.ts).
// Quick check only: no session cookie -> go to /login. It doesn't verify the
// cookie; the real check is requireProfile() in each protected page.
import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/console/:path*"],
};
