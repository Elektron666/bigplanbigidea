import { NextResponse } from "next/server";
import { getCentral } from "@/lib/central/store";
import { SYNC_STATUSES, type SyncStatus } from "@/lib/devices/pairing";
import { currentDevice } from "@/lib/devices/session";
import { appVersion } from "@/lib/devices/app-version";
import type { SyncAnswer } from "@/lib/devices/sync";

// A paired screen's regular check. It reports what it runs; the answer says
// what the shop's current content is, so the screen can catch up. The shop is
// taken from the screen's secret, never from the request.

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const who = await currentDevice();
  // removed in the panel, or never paired: the screen goes back to the code screen
  if (!who) return NextResponse.json({ error: "eslesmemis" }, { status: 401 });
  const text = await request.text();
  if (text.length > 500) return NextResponse.json({ error: "Geçersiz istek." }, { status: 413 });
  let body: Record<string, unknown> = {};
  try {
    body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const version = Number(body.contentVersion);
  const status = (SYNC_STATUSES as readonly string[]).includes(String(body.syncStatus)) ? (body.syncStatus as SyncStatus) : undefined;
  const { syncRequested } = await getCentral().checkIn(who.device.id, {
    appVersion: typeof body.appVersion === "string" ? body.appVersion.slice(0, 40) : undefined,
    contentVersion: Number.isSafeInteger(version) && version >= 0 ? version : undefined,
    syncStatus: status,
  });
  const answer: SyncAnswer = {
    status: who.shop.status,
    contentVersion: who.shop.contentVersion,
    updateMode: who.shop.updateMode,
    appVersion: appVersion(),
    syncRequested,
  };
  return NextResponse.json(answer, { headers: { "cache-control": "no-store" } });
}
