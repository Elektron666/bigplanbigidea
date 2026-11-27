import "server-only";
import { getCentral } from "@/lib/central/store";
import { PIN_PAUSE_MS, PIN_TRIES, cleanPin } from "./pin";

// The shop PIN typed on a paired screen (the lock's settings, seller mode),
// with the wrong-try pause shared by both: a screen cannot guess one way and
// then the other. In this server's memory only.

const wrong = new Map<string, number[]>();

export async function checkScreenPin(deviceId: string, firmId: string, raw: string): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const now = Date.now();
  const recent = (wrong.get(deviceId) ?? []).filter((t) => now - t < PIN_PAUSE_MS);
  if (recent.length >= PIN_TRIES) return { ok: false, status: 429, error: "Çok fazla hatalı deneme. Birkaç dakika sonra yeniden deneyin." };
  if (raw.length > 100) return { ok: false, status: 413, error: "Geçersiz istek." };
  let pin: string | null = null;
  try {
    pin = cleanPin((JSON.parse(raw) as { pin?: unknown })?.pin);
  } catch {
    /* not JSON: a wrong PIN */
  }
  const result = pin ? await getCentral().checkShopPin(firmId, pin) : false;
  if (result === null) return { ok: false, status: 409, error: "Bu mağaza için PIN girilmemiş. ORMEN ile görüşün." };
  if (!result) {
    wrong.set(deviceId, [...recent, now]);
    return { ok: false, status: 403, error: "PIN hatalı." };
  }
  wrong.delete(deviceId);
  return { ok: true };
}
