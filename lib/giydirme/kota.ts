// The monthly photo try-on quota (Showroom package, job 5). Pure. ORMEN sets
// the number per shop in the panel; a shop without a number makes no try-ons
// (no default is invented). Only successful pictures count: a failed one
// costs the shop nothing.

export type QuotaState = { allowed: true; left: number } | { allowed: false; reason: "kota-yok" | "kota-doldu"; message: string };

export function quotaState(quota: number | null, usedThisMonth: number, asking = 1): QuotaState {
  if (quota === null) return { allowed: false, reason: "kota-yok", message: "Bu mağaza için fotoğraf denemesi kotası belirlenmedi. ORMEN'e haber verin." };
  const left = Math.max(0, quota - usedThisMonth);
  if (left < asking) return { allowed: false, reason: "kota-doldu", message: left === 0 ? "Bu ayın fotoğraf denemesi hakkı doldu. Yeni ay başında yenilenir." : `Bu ay ${left} deneme hakkı kaldı; daha az kumaş seçin.` };
  return { allowed: true, left };
}

/** The first moment of the month `at` falls in, in Istanbul (UTC+3 all year), as an ISO time. */
export function monthStartIso(at: Date): string {
  const tr = new Date(at.getTime() + 3 * 3_600_000);
  return new Date(Date.UTC(tr.getUTCFullYear(), tr.getUTCMonth(), 1) - 3 * 3_600_000).toISOString();
}

export const MAX_FABRICS = 4;
/** Each provider call gives up after this long (the brief: 60 s). */
export const TIMEOUT_MS = 60_000;
