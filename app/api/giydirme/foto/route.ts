import { currentDevice } from "@/lib/devices/session";
import { privateFiles } from "@/lib/giydirme/dosyalar";
import { cleanPhoto } from "@/lib/giydirme/etiket";
import { json, ownSession, screen } from "@/lib/giydirme/ekran";
import { getGiydirme, SESSION_CODE } from "@/lib/giydirme/store";
import { allow, callerKey } from "@/lib/rate-limit";

// The photo of a try-on session (job 5). From the screen's camera (the
// screen's own session), from a phone (the session's one-time code, one photo,
// with the customer's consent ticked), or one of the shop's kept photos.
// Every photo is made upright, at most 2048 px, JPEG, without its location data.

const MAX = 12 * 1024 * 1024;

export async function POST(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("kod");
  if (!code || !SESSION_CODE.test(code)) return json({ error: "Geçersiz oturum." }, 400);
  const store = getGiydirme();
  const who = await currentDevice();

  // one of the shop's kept photos, chosen on the screen
  const saved = url.searchParams.get("kayitli");
  if (saved) {
    const g = await screen();
    if (!g.ok) return g.res;
    const o = await ownSession(g.s, code);
    if (!o.ok) return o.res;
    const photo = (await store.listFirmPhotos(g.s.firmId)).find((p) => p.id === saved);
    if (!photo) return json({ error: "Fotoğraf bulunamadı." }, 404);
    const path = `oturum/${code}/foto.jpg`;
    if (!(await privateFiles().copy(photo.path, path))) return json({ error: "Fotoğraf okunamadı." }, 500);
    await store.setPhoto(code, path, "kayitli");
    return json({ ok: true });
  }

  const len = Number(request.headers.get("content-length") ?? 0);
  if (len > MAX) return json({ error: "Fotoğraf çok büyük (en çok 12 MB)." }, 413);
  const data = new Uint8Array(await request.arrayBuffer());
  if (!data.length || data.length > MAX) return json({ error: "Fotoğraf okunamadı." }, 400);

  let from: "ekran" | "telefon";
  if (who) {
    const g = await screen();
    if (!g.ok) return g.res;
    const o = await ownSession(g.s, code);
    if (!o.ok) return o.res;
    from = "ekran";
  } else {
    // a phone: no account, only the code; one photo per code, with consent
    if (!allow("giydirme-telefon", callerKey(request.headers), 10, 10 * 60_000)) return json({ error: "Çok sık gönderildi; biraz sonra deneyin." }, 429);
    if (url.searchParams.get("onay") !== "1") return json({ error: "Fotoğrafı göndermek için onay kutusunu işaretleyin." }, 400);
    const session = await store.getSession(code);
    if (!session) return json({ error: "Bu kodun süresi doldu. Ekrandaki yeni kodu okutun." }, 404);
    if (!(await store.takePhoneTurn(code))) return json({ error: "Bu kodla fotoğraf zaten gönderildi. Ekrandaki yeni kodu okutun." }, 409);
    from = "telefon";
  }
  let clean;
  try {
    clean = await cleanPhoto(data);
  } catch {
    return json({ error: "Bu dosya bir fotoğraf olarak açılamadı. JPEG ya da PNG gönderin." }, 415);
  }
  if (Math.min(clean.width, clean.height) < 320) return json({ error: "Fotoğraf çok küçük; koltuğu daha yakından çekin." }, 422);
  const path = `oturum/${code}/foto.jpg`;
  await privateFiles().put(path, clean.jpeg);
  await store.setPhoto(code, path, from);
  return json({ ok: true, from }, 201);
}
