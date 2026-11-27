import "server-only";
import { burnLabel } from "./etiket";
import { privateFiles } from "./dosyalar";
import { monthStartIso, quotaState, TIMEOUT_MS } from "./kota";
import type { GiydirmeProvider } from "./saglayici";
import { getGiydirme, type PhotoSession } from "./store";

// "Müşterinin salonu" (Showroom package, job 15): the customer's room photo,
// from their phone by QR, and the product as the 3D shows it; the provider
// puts the product into the room. The same provider interface, quota and
// cost log as job 5. The picture carries "Ön izleme · ölçüler yaklaşıktır"
// inside it. The room photo is never kept: it goes with the session.

export function salonInstruction(p: { name: string; w: number; d: number; h: number; fabrics: string[] }): string {
  return [
    "Edit the first image, a photo of a living room: place the piece of furniture shown in the second image into it, standing on the floor in a plausible free spot.",
    `The piece: ${p.name}, ${p.w} cm wide, ${p.d} cm deep, ${p.h} cm high; upholstered in ${p.fabrics.join(", ")}.`,
    "Keep the piece exactly as shown: its shape, proportions, fabric colour and texture. Scale it to the room as well as the photo allows.",
    "Keep the room exactly as it is: walls, floor, windows, every other object, the light and the camera angle. Do not remove anything.",
    "The result must look like a real photograph of the same room.",
  ].join("\n");
}

const FAIL = "Salonunuzda ön izleme hazırlanamadı. Yeniden deneyin; deneme hakkınızdan düşmedi.";
const LATE = "Hizmet 60 saniyede cevap vermedi. Yeniden deneyin; deneme hakkınızdan düşmedi.";

export async function makeSalon(o: {
  session: PhotoSession;
  quota: number | null;
  room: Uint8Array;
  product: Uint8Array;
  instruction: string;
  provider: GiydirmeProvider;
  timeoutMs?: number;
}): Promise<{ ok: true; file: string } | { ok: false; status: number; error: string }> {
  const store = getGiydirme();
  const { session, provider } = o;
  if (!provider.placeInRoom) return { ok: false, status: 409, error: "Bu hizmet salon ön izlemesi yapmıyor." };
  const used = await store.countOk(session.firmId, monthStartIso(new Date()));
  const q = quotaState(o.quota, used, 1);
  if (!q.allowed) {
    await store.logCall({ kind: "salon", firmId: session.firmId, deviceId: session.deviceId, provider: provider.id, fabricCode: null, ms: 0, costUsd: 0, status: "kota" });
    return { ok: false, status: 429, error: q.message };
  }
  const started = Date.now();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), o.timeoutMs ?? TIMEOUT_MS);
  try {
    const out = await provider.placeInRoom({ room: o.room, product: o.product, instruction: o.instruction, signal: ac.signal });
    if (ac.signal.aborted) throw new DOMException("zaman aşımı", "AbortError");
    const labelled = await burnLabel(out.image, "salon");
    const file = `salon-${Date.now().toString(36)}`;
    await privateFiles().put(`oturum/${session.code}/${file}.jpg`, labelled.jpeg);
    await store.logCall({ kind: "salon", firmId: session.firmId, deviceId: session.deviceId, provider: provider.id, fabricCode: null, ms: Date.now() - started, costUsd: out.costUsd ?? provider.costPerImageUsd, status: "basarili" });
    return { ok: true, file };
  } catch (e) {
    const late = ac.signal.aborted || (e instanceof DOMException && e.name === "AbortError");
    // a failed or late call is logged and does not count against the quota
    await store.logCall({ kind: "salon", firmId: session.firmId, deviceId: session.deviceId, provider: provider.id, fabricCode: null, ms: Date.now() - started, costUsd: null, status: late ? "zaman-asimi" : "basarisiz", error: e instanceof Error ? e.message : String(e) });
    return { ok: false, status: 502, error: late ? LATE : FAIL };
  } finally {
    clearTimeout(timer);
  }
}
