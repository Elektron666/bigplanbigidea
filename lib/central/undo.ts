// Undo from the change log (Showroom package, job 0: "Ayar ve atama
// değişiklikleri günlükten geri alınabilir"). Pure: what undoing an entry
// means, or null when it cannot be undone (a PIN, a removed screen, a refused
// attempt). The server applies it and writes the undo to the log as well.

import type { AuditEntry } from "./types";
import { SHOP_STATUSES, type ShopStatus } from "./shops";
import { cleanFeatures } from "./features";

export type UndoStep =
  | { kind: "durum"; firmId: string; status: ShopStatus }
  | { kind: "gosterim"; firmId: string; modelId: string; patch: { displayName: string | null; productCode: string | null; description: string | null; featured: boolean; hidden: boolean } }
  | { kind: "atama"; mode: "ekle" | "cikar"; productIds: string[]; shopIds: string[] }
  | { kind: "ozellik"; firmId: string; features: Record<string, boolean> }
  | { kind: "fire"; waste: { duz: number | null; donuk: number | null; raporlu: number | null; roundStep: number } }
  | { kind: "kalite"; deviceId: string; quality: "oto" | "hafif" | "tam" };

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const ids = (v: unknown) => (Array.isArray(v) && v.every((x) => typeof x === "string") ? (v as string[]) : null);
const numOrNull = (v: unknown) => (v === null ? null : typeof v === "number" ? v : undefined);

export function undoStep(e: AuditEntry): UndoStep | null {
  if (e.undoneAt) return null;
  const before = obj(e.before);
  switch (e.action) {
    case "askiya-alindi":
    case "geri-acildi":
    case "durum-degisti": {
      const status = before.status;
      return e.firmId && (SHOP_STATUSES as readonly unknown[]).includes(status) ? { kind: "durum", firmId: e.firmId, status: status as ShopStatus } : null;
    }
    case "gosterim-degisti": {
      if (!e.firmId || !e.entityId) return null;
      const s = (k: string) => (typeof before[k] === "string" ? (before[k] as string) : null);
      return { kind: "gosterim", firmId: e.firmId, modelId: e.entityId, patch: { displayName: s("displayName"), productCode: s("productCode"), description: s("description"), featured: before.featured === true, hidden: before.hidden === true } };
    }
    case "toplu-eklendi":
    case "toplu-cikarildi": {
      const productIds = ids(before.productIds);
      const shopIds = ids(before.shopIds);
      if (!productIds || !shopIds) return null;
      // the other way round
      return { kind: "atama", mode: e.action === "toplu-eklendi" ? "cikar" : "ekle", productIds, shopIds };
    }
    case "ozellik-acildi":
    case "ozellik-kapandi":
      return e.firmId ? { kind: "ozellik", firmId: e.firmId, features: cleanFeatures(before) } : null;
    case "fire-degisti": {
      const [duz, donuk, raporlu] = [numOrNull(before.duz), numOrNull(before.donuk), numOrNull(before.raporlu)];
      if (duz === undefined || donuk === undefined || raporlu === undefined || typeof before.roundStep !== "number") return null;
      return { kind: "fire", waste: { duz, donuk, raporlu, roundStep: before.roundStep } };
    }
    case "kalite-degisti": {
      const q = before.quality;
      return e.entityId && (q === "oto" || q === "hafif" || q === "tam") ? { kind: "kalite", deviceId: e.entityId, quality: q } : null;
    }
    default:
      return null;
  }
}

/** Undoing the waste figures is the yönetici's (they are ORMEN's own figures); the rest is setup work. */
export function undoPermission(step: UndoStep): "geri-al" | "fiyat" {
  return step.kind === "fire" ? "fiyat" : "geri-al";
}
