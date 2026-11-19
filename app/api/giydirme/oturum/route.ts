import { getGiydirme } from "@/lib/giydirme/store";
import { endSession } from "@/lib/giydirme/uret";
import { json, ownSession, screen } from "@/lib/giydirme/ekran";
import { siteUrl, siteUrlIsFinal } from "@/lib/site";

// A photo try-on session on a showroom screen (job 5): opened when "Fotoğraftan
// dene" starts, ended (and its files deleted) when the showroom loop starts.

export async function POST(request: Request) {
  const g = await screen();
  if (!g.ok) return g.res;
  const session = await getGiydirme().createSession(g.s.firmId, g.s.deviceId);
  const origin = new URL(request.url).origin;
  // the phone opens this page by the QR on the screen (the site's own address when it is set)
  const base = siteUrlIsFinal() ? siteUrl() : origin;
  const photos = await getGiydirme().listFirmPhotos(g.s.firmId);
  return json({ code: session.code, phoneUrl: `${base.replace(/\/$/, "")}/y/${session.code}`, expiresAt: session.expiresAt, saved: photos.map((p) => p.id) }, 201);
}

/** Has a photo arrived (from the phone)? The screen asks every few seconds. */
export async function GET(request: Request) {
  const g = await screen();
  if (!g.ok) return g.res;
  const o = await ownSession(g.s, new URL(request.url).searchParams.get("kod"));
  if (!o.ok) return o.res;
  return json({ photo: !!o.session.photoPath, from: o.session.photoFrom, keep: o.session.keep });
}

export async function DELETE(request: Request) {
  const g = await screen();
  if (!g.ok) return g.res;
  const o = await ownSession(g.s, new URL(request.url).searchParams.get("kod"));
  if (!o.ok) return o.res;
  return json(await endSession(o.session.code));
}
