import { NextResponse } from "next/server";
import { getCentral } from "@/lib/central/store";
import { cleanPairingCode } from "@/lib/devices/pairing";
import { rememberDevice } from "@/lib/devices/session";
import { blocked, callerKey, recordFailure } from "@/lib/rate-limit";

// A new showroom screen types the 6-digit code from the panel. A right code
// ties the screen to that shop for good; the code itself stops working.

export async function POST(request: Request) {
  const key = callerKey(request.headers);
  // a million codes, ten wrong tries per quarter hour: guessing does not pay
  if (blocked("esles", key, 10, 15 * 60_000)) return NextResponse.json({ error: "Çok fazla deneme yapıldı. 15 dakika sonra yeniden deneyin." }, { status: 429 });
  const text = await request.text();
  if (text.length > 200) return NextResponse.json({ error: "Geçersiz istek." }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const code = cleanPairingCode((body as { code?: unknown })?.code);
  if (!code) return NextResponse.json({ error: "Paneldeki 6 haneli kodu yazın." }, { status: 422 });
  const central = getCentral();
  const claimed = await central.claimPairing(code);
  if (!claimed) {
    recordFailure("esles", key);
    return NextResponse.json({ error: "Kod hatalı ya da süresi geçti. Panelden yeni bir kod alın." }, { status: 404 });
  }
  await rememberDevice(claimed.token);
  await central.writeAudit({
    actor: claimed.device.name,
    actorRole: "sistem",
    firmId: claimed.device.firmId,
    entity: "cihaz",
    entityId: claimed.device.id,
    action: "eslesti",
    summary: `“${claimed.device.name}” ekranı eşleşti`,
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
