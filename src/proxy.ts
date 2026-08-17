import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readSessionToken, SESSION_COOKIE } from "@/lib/session-token";

/**
 * Vse strani zahtevajo prijavo. Podpis piškotka preverimo tukaj (Node.js runtime),
 * uporabnika pa naloži `getSessionUser()` na strani sami.
 */
export function proxy(request: NextRequest) {
  const userId = readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  const isLoginRoute = request.nextUrl.pathname === "/login";

  if (!userId && !isLoginRoute) {
    const loginUrl = new URL("/login", request.url);
    if (request.nextUrl.pathname !== "/") loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (userId && isLoginRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/uploadthing|_next/static|_next/image|favicon.ico).*)"],
};
