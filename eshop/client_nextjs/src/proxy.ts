import { NextResponse, type NextRequest } from "next/server";

const ANON_COOKIE = "eshop_anon_session";
const ONE_YEAR = 60 * 60 * 24 * 365;

export function proxy(request: NextRequest) {
  const existing = request.cookies.get(ANON_COOKIE)?.value;
  if (existing) return NextResponse.next();

  const anonymousSession = crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  const cookie = requestHeaders.get("cookie");
  requestHeaders.set("cookie", cookie ? `${cookie}; ${ANON_COOKIE}=${anonymousSession}` : `${ANON_COOKIE}=${anonymousSession}`);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.set(ANON_COOKIE, anonymousSession, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  });
  return response;
}

export const config = {
  matcher: [
    "/((?!api/|_next/|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|css|js|map|txt|xml|json|woff|woff2|ttf|otf)$).*)",
  ],
};
