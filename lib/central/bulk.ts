// Bulk work on shops (Showroom package, job 0: "Toplu işlem: seçili
// mağazalarda özellik açma ve kapama, koleksiyon açma, kota değiştirme,
// etiket ekleme, güncelleme gönderme"). Pure: what the panel may ask for and
// what each step does to one shop. Staged roll-out ("kademeli yayın") is the
// same step run first on a filtered group (Pilot, a tag), then on all.

import { FEATURES, FEATURE_LABELS, type Feature } from "./features";
import { cleanTags, type ShopRecord } from "./record";
import { SHOP_STATUSES, type ShopQuery, type ShopStatus } from "./shops";

export type BulkOp =
  | { kind: "ozellik"; feature: Feature; on: boolean }
  | { kind: "seri"; series: string; on: boolean }
  | { kind: "kota"; quota: number | null }
  | { kind: "etiket"; tag: string; on: boolean }
  | { kind: "guncelle" };

/** Which shops: the ticked ones, or every shop the list's filter finds. */
export type BulkTarget = { ids: string[] } | { query: Pick<ShopQuery, "search" | "status" | "city" | "tag"> };

export const MAX_BULK = 500;

export function parseBulkOp(raw: unknown): BulkOp | null {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  switch (r.kind) {
    case "ozellik":
      return (FEATURES as readonly unknown[]).includes(r.feature) && typeof r.on === "boolean" ? { kind: "ozellik", feature: r.feature as Feature, on: r.on } : null;
    case "seri":
      return typeof r.series === "string" && /^[A-ZÇĞİÖŞÜ0-9-]{2,30}$/.test(r.series) && typeof r.on === "boolean" ? { kind: "seri", series: r.series, on: r.on } : null;
    case "kota": {
      if (r.quota === null || r.quota === "") return { kind: "kota", quota: null };
      const n = typeof r.quota === "number" ? r.quota : Number(String(r.quota).trim());
      return Number.isInteger(n) && n >= 0 && n <= 100_000 ? { kind: "kota", quota: n } : null;
    }
    case "etiket": {
      const t = cleanTags([r.tag])[0];
      return t && typeof r.on === "boolean" ? { kind: "etiket", tag: t, on: r.on } : null;
    }
    case "guncelle":
      return { kind: "guncelle" };
    default:
      return null;
  }
}

export function parseBulkTarget(raw: unknown): BulkTarget | null {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (Array.isArray(r.ids)) {
    const ids = [...new Set(r.ids.filter((x): x is string => typeof x === "string" && /^[0-9a-zA-Z-]{1,40}$/.test(x)))];
    return ids.length && ids.length <= MAX_BULK ? { ids } : null;
  }
  if (r.query && typeof r.query === "object") {
    const q = r.query as Record<string, unknown>;
    const s = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
    const status = (SHOP_STATUSES as readonly unknown[]).includes(q.status) ? (q.status as ShopStatus) : undefined;
    return { query: { search: s(q.search, 60), status, city: s(q.city, 60), tag: s(q.tag, 40) } };
  }
  return null;
}

/** The step's words for the log and the panel: "Köşe kurucu açıldı". */
export function describeOp(op: BulkOp): string {
  switch (op.kind) {
    case "ozellik":
      return `${FEATURE_LABELS[op.feature].name} ${op.on ? "açıldı" : "kapandı"}`;
    case "seri":
      return `${op.series} serisi ${op.on ? "açıldı" : "kapandı"}`;
    case "kota":
      return op.quota === null ? "deneme kotası kaldırıldı" : `deneme kotası ${op.quota} oldu`;
    case "etiket":
      return `“${op.tag}” etiketi ${op.on ? "eklendi" : "çıkarıldı"}`;
    case "guncelle":
      return "güncelleme gönderildi";
  }
}

/**
 * A shop's fabric series after a series is switched on or off. An empty list
 * means "all series": switching one on there changes nothing; switching one
 * off turns it into "all the others".
 */
export function seriesAfter(current: string[], op: { series: string; on: boolean }, known: string[]): string[] {
  if (op.on) return current.length === 0 || current.includes(op.series) ? current : [...current, op.series];
  const base = current.length === 0 ? known : current;
  return base.filter((s) => s !== op.series);
}

/** A shop's record after a quota or tag step; null when the step leaves it as it was. */
export function recordAfter(rec: ShopRecord, op: BulkOp): ShopRecord | null {
  if (op.kind === "kota") return rec.aiQuota === op.quota ? null : { ...rec, aiQuota: op.quota };
  if (op.kind === "etiket") {
    const has = rec.tags.includes(op.tag);
    if (has === op.on) return null;
    // at most eight tags (record.ts): a ninth is refused for that shop, not squeezed in
    if (op.on && rec.tags.length >= 8) return null;
    return { ...rec, tags: op.on ? [...rec.tags, op.tag] : rec.tags.filter((t) => t !== op.tag) };
  }
  return null;
}
