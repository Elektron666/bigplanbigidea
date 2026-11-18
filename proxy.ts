import { NextResponse, type NextRequest } from "next/server";

// First line of defence for the panel: without a session cookie the panel pages
// are not rendered at all (each page also checks the session itself; this is
// only the fast, optimistic check the Next.js docs recommend for proxy).

const SESSION_COOKIE = /^(ormen_panel|sb-.+-auth-token(\.\d+)?)$/;
// the shop panel: the demo owner's cookie, a Supabase session, or the yönetici's support view (with their panel session)
const SHOP_COOKIE = /^(ormen_magaza|ormen_destek|ormen_panel|sb-.+-auth-token(\.\d+)?)$/;

export function proxy(request: NextRequest) {
  const shop = request.nextUrl.pathname.startsWith("/magaza");
  const pattern = shop ? SHOP_COOKIE : SESSION_COOKIE;
  const hasSession = request.cookies.getAll().some((c) => pattern.test(c.name) && c.value);
  if (hasSession) return NextResponse.next();
  return NextResponse.redirect(new URL(shop ? "/magaza/giris" : "/panel/giris", request.url));
}

export const config = {
  // every panel page except the login pages themselves
  matcher: ["/panel", "/panel/((?!giris).*)", "/magaza", "/magaza/((?!giris).*)"],
};
