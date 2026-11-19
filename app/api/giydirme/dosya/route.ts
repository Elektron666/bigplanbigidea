import { privateFiles } from "@/lib/giydirme/dosyalar";
import { json, ownSession, screen } from "@/lib/giydirme/ekran";
import { getGiydirme } from "@/lib/giydirme/store";

const jpeg = (data: Uint8Array) => new Response(data as BodyInit, { headers: { "content-type": "image/jpeg", "cache-control": "private, no-store" } });

// A session's photo or picture, to the screen that opened the session only;
// or one of the shop's kept photos, to the shop's own screens.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const g = await screen();
  if (!g.ok) return g.res;
  const saved = url.searchParams.get("kayitli");
  if (saved) {
    const p = (await getGiydirme().listFirmPhotos(g.s.firmId)).find((x) => x.id === saved);
    const data = p ? await privateFiles().get(p.path) : null;
    return data ? jpeg(data) : json({ error: "Dosya yok." }, 404);
  }
  const o = await ownSession(g.s, url.searchParams.get("kod"));
  if (!o.ok) return o.res;
  const name = url.searchParams.get("ad") ?? "";
  if (!/^(foto|sonuc-[A-ZÇĞİÖŞÜ0-9-]{2,24})$/.test(name)) return json({ error: "Geçersiz dosya." }, 400);
  const data = await privateFiles().get(`oturum/${o.session.code}/${name}.jpg`);
  if (!data) return json({ error: "Dosya yok." }, 404);
  return jpeg(data);
}
