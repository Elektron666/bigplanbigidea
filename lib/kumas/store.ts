import "server-only";
import { supabaseEnabled } from "@/lib/supabase/config";
import { serviceClient } from "@/lib/supabase/server";
import type { Fabric } from "@/lib/types";
import type { StockEntry, StockMap, StockStatus } from "./stok";

// Fabric stock and the links between fabrics (Showroom package, job 8; the
// "uyumlu" list is for job 6). Kept by fabric id, so a fabric whose code is
// corrected keeps its stock and its lists. One interface, two backings, as
// lib/data: Supabase when it is set up, otherwise memory.

export type LinkKind = "muadil" | "uyumlu";

export interface FabricExtrasStore {
  /** Stock by fabric id; a fabric with no entry is not in the map. */
  listStock(): Promise<Record<string, StockEntry>>;
  /** Sets the stock of these fabrics (others are left as they are); returns how many. */
  setStock(rows: { fabricId: string; status: StockStatus; leadDays?: number }[]): Promise<number>;
  /** Takes the stock entry off (back to "not entered"). */
  clearStock(fabricIds: string[]): Promise<void>;
  /** Lists of one kind by fabric id: the other fabrics' ids, in order. */
  listLinks(kind: LinkKind): Promise<Record<string, string[]>>;
  /** Replaces one fabric's list. */
  setLinks(kind: LinkKind, fabricId: string, otherIds: string[]): Promise<void>;
}

/** Stock by fabric code, for a screen: only the fabrics it shows. */
export function stockByCode(byId: Record<string, StockEntry>, fabrics: Fabric[]): StockMap {
  const out: StockMap = {};
  for (const f of fabrics) if (byId[f.id]) out[f.code] = byId[f.id];
  return out;
}

/** Lists by fabric code, for a screen: only fabrics it shows, on either side. */
export function linksByCode(byId: Record<string, string[]>, fabrics: Fabric[]): Record<string, string[]> {
  const code = new Map(fabrics.map((f) => [f.id, f.code]));
  const out: Record<string, string[]> = {};
  for (const [id, others] of Object.entries(byId)) {
    const c = code.get(id);
    const list = others.map((o) => code.get(o)).filter((x): x is string => !!x);
    if (c && list.length) out[c] = list;
  }
  return out;
}

// ------------------------------------------------------------------ memory

class MemoryExtras implements FabricExtrasStore {
  private stock = new Map<string, StockEntry>();
  private links: Record<LinkKind, Map<string, string[]>> = { muadil: new Map(), uyumlu: new Map() };

  async listStock() {
    return Object.fromEntries(this.stock);
  }

  async setStock(rows: { fabricId: string; status: StockStatus; leadDays?: number }[]) {
    const now = new Date().toISOString();
    for (const r of rows) this.stock.set(r.fabricId, { status: r.status, leadDays: r.leadDays, updatedAt: now });
    return rows.length;
  }

  async clearStock(ids: string[]) {
    for (const id of ids) this.stock.delete(id);
  }

  async listLinks(kind: LinkKind) {
    return Object.fromEntries(this.links[kind]);
  }

  async setLinks(kind: LinkKind, fabricId: string, otherIds: string[]) {
    const list = [...new Set(otherIds)].filter((o) => o !== fabricId);
    if (list.length) this.links[kind].set(fabricId, list);
    else this.links[kind].delete(fabricId);
  }
}

// ------------------------------------------------------------------ supabase

function check<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

class SupabaseExtras implements FabricExtrasStore {
  private get db() {
    return serviceClient();
  }

  async listStock() {
    const rows = check(await this.db.from("fabric_stock").select("fabric_id, status, lead_days, updated_at")) as { fabric_id: string; status: StockStatus; lead_days: number | null; updated_at: string }[];
    return Object.fromEntries(rows.map((r) => [r.fabric_id, { status: r.status, leadDays: r.lead_days ?? undefined, updatedAt: r.updated_at }]));
  }

  async setStock(rows: { fabricId: string; status: StockStatus; leadDays?: number }[]) {
    if (!rows.length) return 0;
    const now = new Date().toISOString();
    // one statement: the screens hear about it once
    check(await this.db.from("fabric_stock").upsert(rows.map((r) => ({ fabric_id: r.fabricId, status: r.status, lead_days: r.leadDays ?? null, updated_at: now })), { onConflict: "fabric_id" }));
    return rows.length;
  }

  async clearStock(ids: string[]) {
    if (ids.length) check(await this.db.from("fabric_stock").delete().in("fabric_id", ids));
  }

  async listLinks(kind: LinkKind) {
    const rows = check(await this.db.from("fabric_links").select("fabric_id, other_id, sort_order").eq("kind", kind).order("sort_order")) as { fabric_id: string; other_id: string }[];
    const out: Record<string, string[]> = {};
    for (const r of rows) (out[r.fabric_id] ??= []).push(r.other_id);
    return out;
  }

  async setLinks(kind: LinkKind, fabricId: string, otherIds: string[]) {
    const list = [...new Set(otherIds)].filter((o) => o !== fabricId);
    check(await this.db.from("fabric_links").delete().eq("fabric_id", fabricId).eq("kind", kind));
    if (list.length) check(await this.db.from("fabric_links").insert(list.map((other_id, i) => ({ fabric_id: fabricId, other_id, kind, sort_order: i }))));
  }
}

const holder = globalThis as unknown as { __ormenFabricExtras?: FabricExtrasStore };

export function getFabricExtras(): FabricExtrasStore {
  holder.__ormenFabricExtras ??= supabaseEnabled() ? new SupabaseExtras() : new MemoryExtras();
  return holder.__ormenFabricExtras;
}
