import { NextResponse, type NextRequest } from "next/server";
import { CSP } from "./lib/csp";

// First line of defence for the panel: without a session cookie the panel pages
// are not rendered at all (each page also checks the session itself; this is
// only the fast, optimistic check the Next.js docs recommend for proxy).

const SESSION_COOKIE = /^(ormen_panel|sb-.+-auth-token(\.\d+)?)$/;
// the shop panel: the demo owner's cookie, a Supabase session, or the yönetici's support view (with their panel session)
const SHOP_COOKIE = /^(ormen_magaza|ormen_destek|ormen_panel|sb-.+-auth-token(\.\d+)?)$/;

/** The web embed (job 16): may open only inside the shop's allowed sites. */
async function embed(request: NextRequest) {
  const slug = request.nextUrl.pathname.split("/")[2] ?? "";
  let ancestors = "'self'";
  try {
    const r = await fetch(new URL(`/api/gomme/izin?slug=${encodeURIComponent(slug)}`, request.url), { cache: "no-store" });
    if (r.ok) ancestors = ((await r.json()) as { ancestors?: string }).ancestors ?? ancestors;
  } catch {
    /* unknown: only this site */
  }
  const res = NextResponse.next();
  res.headers.set("Content-Security-Policy", `${CSP}; frame-ancestors ${ancestors}`);
  return res;
}

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/gomme/")) return embed(request);
  const shop = request.nextUrl.pathname.startsWith("/magaza");
  const pattern = shop ? SHOP_COOKIE : SESSION_COOKIE;
  const hasSession = request.cookies.getAll().some((c) => pattern.test(c.name) && c.value);
  if (hasSession) return NextResponse.next();
  return NextResponse.redirect(new URL(shop ? "/magaza/giris" : "/panel/giris", request.url));
}

export const config = {
  // every panel page except the login pages themselves
  matcher: ["/panel", "/panel/((?!giris).*)", "/magaza", "/magaza/((?!giris).*)", "/gomme/:path*"],
};
