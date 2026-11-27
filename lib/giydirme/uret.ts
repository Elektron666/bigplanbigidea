import "server-only";
import type { Fabric } from "@/lib/types";
import { burnLabel } from "./etiket";
import { privateFiles } from "./dosyalar";
import { MAX_FABRICS, monthStartIso, quotaState, TIMEOUT_MS } from "./kota";
import type { GiydirmeProvider } from "./saglayici";
import { getGiydirme, type CallRow, type CallStatus, type PhotoSession } from "./store";
import { fabricBrief, instruction } from "./talimat";

// One "Üret" (job 5): the quota is checked first, for all the fabrics at once
// (a shop never pays for a try it had no right to); then every fabric is made
// at the same time, each given TIMEOUT_MS; every picture gets its label burnt
// in; every call is written to the log. A failed or timed-out call does not
// count against the quota.

export interface TryResult {
  fabricCode: string;
  status: CallStatus;
  /** The picture's name in the session ("sonuc-MISSO-05"), when made. */
  file?: string;
  ms: number;
  error?: string;
}

const FAIL = "Bu kumaşla fotoğraf hazırlanamadı. Yeniden deneyin; deneme hakkınızdan düşmedi.";
const LATE = "Hizmet 60 saniyede cevap vermedi. Yeniden deneyin; deneme hakkınızdan düşmedi.";

/** The fabric's real photo from the panel (its albedo texture), at 1k. */
async function fabricPicture(f: Fabric, origin: string): Promise<Uint8Array> {
  const url = f.texture.maps.albedo["1k"];
  const res = await fetch(new URL(url, origin), { cache: "no-store" });
  if (!res.ok) throw new Error(`${f.code} kumaş fotoğrafı okunamadı.`);
  return new Uint8Array(await res.arrayBuffer());
}

/**
 * One picture: the provider call within the time limit, the label burnt in.
 * Writes nothing: the caller stores the picture and logs the call.
 */
export async function makeOne(o: {
  provider: GiydirmeProvider;
  photo: Uint8Array;
  fabric: Fabric;
  origin: string;
  timeoutMs?: number;
  loadSwatch?: (f: Fabric) => Promise<Uint8Array>;
}): Promise<{ status: Exclude<CallStatus, "kota">; jpeg?: Uint8Array; ms: number; costUsd: number | null; error?: string; detail?: string }> {
  const started = Date.now();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), o.timeoutMs ?? TIMEOUT_MS);
  try {
    const swatch = await (o.loadSwatch ?? ((x: Fabric) => fabricPicture(x, o.origin)))(o.fabric);
    const out = await o.provider.generate({ photo: o.photo, fabricImage: swatch, instruction: instruction(fabricBrief(o.fabric)), signal: ac.signal });
    if (ac.signal.aborted) throw new DOMException("zaman aşımı", "AbortError");
    const labelled = await burnLabel(out.image);
    return { status: "basarili", jpeg: labelled.jpeg, ms: Date.now() - started, costUsd: out.costUsd ?? o.provider.costPerImageUsd };
  } catch (e) {
    const late = ac.signal.aborted || (e instanceof DOMException && e.name === "AbortError");
    return { status: late ? "zaman-asimi" : "basarisiz", ms: Date.now() - started, costUsd: null, error: late ? LATE : FAIL, detail: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timer);
  }
}

export async function makeTries(opts: {
  kind: CallRow["kind"];
  session: PhotoSession;
  /** The shop's monthly quota (null = ORMEN set none); ignored for the panel's test bench. */
  quota: number | null;
  photo: Uint8Array;
  fabrics: Fabric[];
  provider: GiydirmeProvider;
  origin: string;
  timeoutMs?: number;
  /** Reads the fabric's reference picture (tests give their own). */
  loadSwatch?: (f: Fabric) => Promise<Uint8Array>;
}): Promise<{ ok: true; results: TryResult[] } | { ok: false; reason: "kota-yok" | "kota-doldu" | "kumas"; error: string }> {
  const store = getGiydirme();
  const { session, provider } = opts;
  if (!opts.fabrics.length || opts.fabrics.length > MAX_FABRICS) return { ok: false, reason: "kumas", error: `1–${MAX_FABRICS} kumaş seçin.` };
  if (opts.kind === "giydirme") {
    const used = await store.countOk(session.firmId, monthStartIso(new Date()));
    const q = quotaState(opts.quota, used, opts.fabrics.length);
    if (!q.allowed) {
      // refused before any call: nothing is spent; the refusal is kept for the panel ("kotası dolan mağaza")
      await store.logCall({ kind: opts.kind, firmId: session.firmId, deviceId: session.deviceId, provider: provider.id, fabricCode: null, ms: 0, costUsd: 0, status: "kota" });
      return { ok: false, reason: q.reason, error: q.message };
    }
  }
  const files = privateFiles();
  const results = await Promise.all(
    opts.fabrics.map(async (f): Promise<TryResult> => {
      const one = await makeOne({ provider, photo: opts.photo, fabric: f, origin: opts.origin, timeoutMs: opts.timeoutMs, loadSwatch: opts.loadSwatch });
      const file = `sonuc-${f.code}`;
      if (one.jpeg) await files.put(`oturum/${session.code}/${file}.jpg`, one.jpeg);
      await store.logCall({ kind: opts.kind, firmId: session.firmId, deviceId: session.deviceId, provider: provider.id, fabricCode: f.code, ms: one.ms, costUsd: one.costUsd, status: one.status, error: one.detail });
      return one.status === "basarili" ? { fabricCode: f.code, status: one.status, file, ms: one.ms } : { fabricCode: f.code, status: one.status, ms: one.ms, error: one.error };
    }),
  );
  return { ok: true, results };
}

/**
 * Ends a session: a photo the shop chose to keep becomes one of its product
 * photos; every file of the session is deleted from the server. Safe to call
 * twice (the second call finds nothing).
 */
export async function endSession(code: string): Promise<{ removed: number; kept: boolean }> {
  const store = getGiydirme();
  const files = privateFiles();
  const s = await store.endSession(code);
  if (!s) return { removed: 0, kept: false };
  let kept = false;
  if (s.keep && s.photoPath && s.purpose !== "salon") {
    const to = `magaza/${s.firmId}/${crypto.randomUUID()}.jpg`;
    if (await files.copy(s.photoPath, to)) {
      await store.addFirmPhoto(s.firmId, to);
      kept = true;
    }
  }
  const removed = await files.removeFolder(`oturum/${s.code}/`);
  return { removed, kept };
}

/** Sessions left open past their time (a screen switched off mid-try): their files go. */
export async function sweepSessions(now = new Date()): Promise<number> {
  const open = await getGiydirme().expiredSessions(now);
  let n = 0;
  for (const s of open) n += (await endSession(s.code)).removed;
  return n;
}
