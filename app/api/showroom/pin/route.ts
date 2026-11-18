import { NextResponse } from "next/server";
import { getCentral } from "@/lib/central/store";
import { PIN_PAUSE_MS, PIN_TRIES, cleanPin } from "@/lib/devices/pin";
import { currentDevice } from "@/lib/devices/session";

// The shop PIN typed on a paired screen (leaving the lock, the settings
// sheet). The shop is the screen's own; a screen cannot try another shop's PIN.

export const dynamic = "force-dynamic";

// wrong tries per screen, in this server's memory only
const wrong = new Map<string, number[]>();

export async function POST(request: Request) {
  const who = await currentDevice();
  if (!who) return NextResponse.json({ error: "eslesmemis" }, { status: 401 });
  const now = Date.now();
  const recent = (wrong.get(who.device.id) ?? []).filter((t) => now - t < PIN_PAUSE_MS);
  if (recent.length >= PIN_TRIES) return NextResponse.json({ error: "Çok fazla hatalı deneme. Birkaç dakika sonra yeniden deneyin." }, { status: 429 });
  const text = await request.text();
  if (text.length > 100) return NextResponse.json({ error: "Geçersiz istek." }, { status: 413 });
  let pin: string | null = null;
  try {
    pin = cleanPin((JSON.parse(text) as { pin?: unknown })?.pin);
  } catch {
    /* not JSON: treated as a wrong PIN below */
  }
  const result = pin ? await getCentral().checkShopPin(who.device.firmId, pin) : false;
  if (result === null) return NextResponse.json({ error: "Bu mağaza için PIN girilmemiş. ORMEN ile görüşün." }, { status: 409 });
  if (!result) {
    wrong.set(who.device.id, [...recent, now]);
    return NextResponse.json({ error: "PIN hatalı." }, { status: 403 });
  }
  wrong.delete(who.device.id);
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
