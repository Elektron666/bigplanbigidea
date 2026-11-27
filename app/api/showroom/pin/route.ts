import { NextResponse } from "next/server";
import { currentDevice } from "@/lib/devices/session";
import { checkScreenPin } from "@/lib/devices/pin-guard";

// The shop PIN typed on a paired screen (leaving the lock, the settings
// sheet). The shop is the screen's own; a screen cannot try another shop's PIN.

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const who = await currentDevice();
  if (!who) return NextResponse.json({ error: "eslesmemis" }, { status: 401 });
  const r = await checkScreenPin(who.device.id, who.device.firmId, await request.text());
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
