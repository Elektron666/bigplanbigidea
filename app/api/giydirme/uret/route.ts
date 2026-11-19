import { loadCatalogue, getRepository } from "@/lib/data";
import { getCentral } from "@/lib/central/store";
import { privateFiles } from "@/lib/giydirme/dosyalar";
import { json, ownSession, screen } from "@/lib/giydirme/ekran";
import { MAX_FABRICS } from "@/lib/giydirme/kota";
import { makeTries } from "@/lib/giydirme/uret";
import { codeUpper } from "@/lib/i18n/tr";

// "Üret" (job 5): the session's photo in up to four of the shop's fabrics.
// The fabrics must be on the shop's page; the quota and the provider are the
// server's to check. Long: each fabric may take up to 60 s (in parallel).
export const maxDuration = 90;

export async function POST(request: Request) {
  const url = new URL(request.url);
  const g = await screen();
  if (!g.ok) return g.res;
  const o = await ownSession(g.s, url.searchParams.get("kod"));
  if (!o.ok) return o.res;
  if (!o.session.photoPath) return json({ error: "Önce bir fotoğraf çekin ya da yükleyin." }, 409);
  let codes: string[] = [];
  try {
    const body = (await request.json()) as { kumaslar?: unknown };
    codes = Array.isArray(body.kumaslar) ? [...new Set(body.kumaslar.filter((c): c is string => typeof c === "string").map(codeUpper))] : [];
  } catch {
    return json({ error: "Geçersiz istek." }, 400);
  }
  if (!codes.length || codes.length > MAX_FABRICS) return json({ error: `1–${MAX_FABRICS} kumaş seçin.` }, 422);
  const firm = await getRepository().getFirmById(g.s.firmId);
  const cat = firm ? await loadCatalogue(firm.slug) : null;
  const byCode = new Map((cat?.fabrics ?? []).map((f) => [f.code, f]));
  const fabrics = codes.map((c) => byCode.get(c));
  if (fabrics.some((f) => !f)) return json({ error: "Seçilen kumaşlardan biri bu mağazada yok." }, 422);
  const photo = await privateFiles().get(o.session.photoPath);
  if (!photo) return json({ error: "Fotoğraf bulunamadı; yeniden çekin." }, 409);
  const rec = await getCentral().getShopRecord(g.s.firmId);
  const r = await makeTries({ kind: "giydirme", session: o.session, quota: rec?.aiQuota ?? null, photo, fabrics: fabrics as NonNullable<(typeof fabrics)[number]>[], provider: g.s.provider, origin: url.origin });
  if (!r.ok) return json({ error: r.error, reason: r.reason }, r.reason === "kumas" ? 422 : 429);
  return json({ results: r.results });
}
