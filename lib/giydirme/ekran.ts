import "server-only";
import { NextResponse } from "next/server";
import { currentDevice } from "@/lib/devices/session";
import { featureOn } from "@/lib/central/features";
import { getRepository } from "@/lib/data";
import { getProvider, type GiydirmeProvider } from "./saglayici";
import { getGiydirme, SESSION_CODE, type PhotoSession } from "./store";
import { sweepSessions } from "./uret";

// Who may use the photo try-on endpoints (job 5): a paired showroom screen
// whose shop has the feature on, while a provider is set. The shop is always
// the screen's own (from its secret); a session belongs to the screen that
// opened it, and only that screen gets its pictures.

type Screen = { deviceId: string; firmId: string; provider: GiydirmeProvider; features: Record<string, unknown> };

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });

export async function screen(): Promise<{ ok: true; s: Screen } | { ok: false; res: NextResponse }> {
  const who = await currentDevice();
  if (!who) return { ok: false, res: json({ error: "Bu ekran eşleşmemiş." }, 401) };
  if (who.shop.status === "askida" || who.shop.status === "ayrildi") return { ok: false, res: json({ error: "Mağaza şu an kapalı." }, 409) };
  const firm = await getRepository().getFirmById(who.shop.id);
  if (!firm || !featureOn(firm.features, "giydirme")) return { ok: false, res: json({ error: "Fotoğraftan deneme bu mağazada kapalı." }, 403) };
  const provider = await getProvider();
  if (!provider) return { ok: false, res: json({ error: "Fotoğraftan deneme henüz hazır değil." }, 503) };
  // sessions a screen left open are cleaned on the way (also daily, by the cron)
  void sweepSessions().catch(() => undefined);
  return { ok: true, s: { deviceId: who.device.id, firmId: firm.id, provider, features: firm.features ?? {} } };
}

/** The screen's own open session with this code, or an error response. */
export async function ownSession(s: Screen, code: string | null): Promise<{ ok: true; session: PhotoSession } | { ok: false; res: NextResponse }> {
  if (!code || !SESSION_CODE.test(code)) return { ok: false, res: json({ error: "Geçersiz oturum." }, 400) };
  const session = await getGiydirme().getSession(code);
  if (!session || session.firmId !== s.firmId || session.deviceId !== s.deviceId) return { ok: false, res: json({ error: "Oturum bulunamadı ya da süresi doldu." }, 404) };
  return { ok: true, session };
}
