import { getRepository, loadCatalogue } from "@/lib/data";
import { getCentral } from "@/lib/central/store";
import { featureOn } from "@/lib/central/features";
import { privateFiles } from "@/lib/giydirme/dosyalar";
import { json, ownSession, screen } from "@/lib/giydirme/ekran";
import { makeSalon, salonInstruction } from "@/lib/giydirme/salon";
import { cleanPhoto } from "@/lib/giydirme/etiket";
import { codeUpper } from "@/lib/i18n/tr";

// "Müşterinin salonu" (job 15): the session's room photo and the product as
// the screen's 3D shows it (a JPEG the screen sends), put together by the
// provider. Only a model and fabrics of the shop; quota and log as job 5.
export const maxDuration = 90;
const MAX_BYTES = 4_000_000;

export async function POST(request: Request) {
  const url = new URL(request.url);
  const g = await screen();
  if (!g.ok) return g.res;
  const o = await ownSession(g.s, url.searchParams.get("kod"));
  if (!o.ok) return o.res;
  if (!o.session.photoPath) return json({ error: "Önce salonun fotoğrafını telefondan gönderin." }, 409);
  const firm = await getRepository().getFirmById(g.s.firmId);
  if (!firm || !featureOn(firm.features, "salon")) return json({ error: "Bu özellik bu mağazada kapalı." }, 403);
  let body: { urun?: unknown; model?: unknown; kumaslar?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "Geçersiz istek." }, 400);
  }
  const m = typeof body.urun === "string" ? /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec(body.urun) : null;
  if (!m) return json({ error: "Ürün görüntüsü yok." }, 422);
  const raw = Buffer.from(m[2], "base64");
  if (raw.length > MAX_BYTES) return json({ error: "Ürün görüntüsü çok büyük." }, 413);
  const cat = await loadCatalogue(firm.slug);
  const model = cat?.models.find((x) => x.slug === body.model);
  const codes = Array.isArray(body.kumaslar) ? body.kumaslar.filter((c): c is string => typeof c === "string").map(codeUpper).slice(0, 6) : [];
  const fabrics = codes.map((c) => cat?.fabrics.find((f) => f.code === c));
  if (!model || !fabrics.length || fabrics.some((f) => !f)) return json({ error: "Ürün ya da kumaş bu mağazada yok." }, 422);
  const room = await privateFiles().get(o.session.photoPath);
  if (!room) return json({ error: "Fotoğraf bulunamadı; yeniden gönderin." }, 409);
  const product = (await cleanPhoto(new Uint8Array(raw))).jpeg;
  const rec = await getCentral().getShopRecord(g.s.firmId);
  const r = await makeSalon({
    session: o.session,
    quota: rec?.aiQuota ?? null,
    room,
    product,
    instruction: salonInstruction({ name: model.name, ...model.dimensionsCm, fabrics: fabrics.map((f) => `${f!.colorName} ${f!.type} (ORMEN ${f!.code})`) }),
    provider: g.s.provider,
  });
  if (!r.ok) return json({ error: r.error }, r.status);
  return json({ file: r.file });
}
