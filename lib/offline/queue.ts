// The showroom screen's outbox (Showroom package, job 1, "Çevrimdışı").
// Records made while the internet is down wait on the device and go when it
// comes back. Every record carries an id made on the device, and the server
// stores an id once, so retrying is always safe. Pure rules here; the
// IndexedDB store is lib/offline/outbox.ts.

export interface QueuedItem {
  /** The record's device-made id (also inside the body). */
  id: string;
  url: string;
  body: string;
  /** When it was made (ms). */
  at: number;
  tries: number;
}

/** Only these addresses may be queued: our own record endpoints, nothing else. */
export const QUEUE_URLS = ["/api/olay", "/api/teklif"] as const;
export type QueueUrl = (typeof QUEUE_URLS)[number];

export const QUEUE_MAX = 2000;
export const QUEUE_MAX_AGE_MS = 30 * 24 * 60 * 60_000;

/**
 * What to do with a queued record after a try. `null` = no answer (offline,
 * timed out): keep it. The server answered and it was refused for good
 * (a 4xx other than "too many" or "timeout"): drop it, retrying cannot help.
 * Accepted: drop it. A server fault or "too many": keep it for later.
 */
export function afterSend(status: number | null): "sil" | "tut" {
  if (status === null) return "tut";
  if (status >= 200 && status < 300) return "sil";
  if (status === 408 || status === 429) return "tut";
  if (status >= 400 && status < 500) return "sil";
  return "tut";
}

/** The records to throw away so the outbox never grows without end: too old, or beyond the newest QUEUE_MAX. */
export function prune(items: QueuedItem[], now: number): string[] {
  const fresh = items.filter((i) => now - i.at <= QUEUE_MAX_AGE_MS).sort((a, b) => b.at - a.at);
  const keep = new Set(fresh.slice(0, QUEUE_MAX).map((i) => i.id));
  return items.filter((i) => !keep.has(i.id)).map((i) => i.id);
}

/** A device-made record id: 32 letters and digits. */
export function newClientId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}
