import "server-only";
import { supabaseEnabled } from "@/lib/supabase/config";
import { serviceClient } from "@/lib/supabase/server";
import type { SetInput, SofaSet } from "./takim";

// Sofa sets (job 6), per shop. One interface, two backings, as lib/data.

export interface SetStore {
  forFirm(firmId: string, opts?: { includeInactive?: boolean }): Promise<SofaSet[]>;
  save(firmId: string, input: SetInput, id?: string): Promise<{ ok: true; id: string } | { ok: false; error: string }>;
  remove(firmId: string, id: string): Promise<SofaSet | null>;
}

const SLUG_TAKEN = "Bu bağlantı adı bu mağazada başka bir takımda kullanılıyor.";

class MemorySets implements SetStore {
  private rows: SofaSet[] = [];
  async forFirm(firmId: string, opts?: { includeInactive?: boolean }) {
    return structuredClone(this.rows.filter((s) => s.firmId === firmId && (opts?.includeInactive || s.isActive)));
  }
  async save(firmId: string, input: SetInput, id?: string) {
    if (this.rows.some((s) => s.firmId === firmId && s.slug === input.slug && s.id !== id)) return { ok: false as const, error: SLUG_TAKEN };
    if (id && !this.rows.some((s) => s.id === id && s.firmId === firmId)) return { ok: false as const, error: "Takım bulunamadı." };
    const row: SofaSet = { id: id ?? crypto.randomUUID(), firmId, ...structuredClone(input) };
    this.rows = id ? this.rows.map((s) => (s.id === id ? row : s)) : [...this.rows, row];
    return { ok: true as const, id: row.id };
  }
  async remove(firmId: string, id: string) {
    const s = this.rows.find((x) => x.id === id && x.firmId === firmId) ?? null;
    if (s) this.rows = this.rows.filter((x) => x !== s);
    return s;
  }
}

type Row = { id: string; firm_id: string; slug: string; name: string; pieces: SofaSet["pieces"]; is_active: boolean };
const fromRow = (r: Row): SofaSet => ({ id: r.id, firmId: r.firm_id, slug: r.slug, name: r.name, pieces: r.pieces, isActive: r.is_active });

class SupabaseSets implements SetStore {
  async forFirm(firmId: string, opts?: { includeInactive?: boolean }) {
    let q = serviceClient().from("firm_sets").select("id, firm_id, slug, name, pieces, is_active").eq("firm_id", firmId).order("sort_order").order("name");
    if (!opts?.includeInactive) q = q.eq("is_active", true);
    const res = await q;
    if (res.error) throw new Error(res.error.message);
    return (res.data as Row[]).map(fromRow);
  }
  async save(firmId: string, input: SetInput, id?: string) {
    const row = { firm_id: firmId, slug: input.slug, name: input.name, pieces: input.pieces, is_active: input.isActive };
    const db = serviceClient().from("firm_sets");
    const res = id ? await db.update(row).eq("id", id).eq("firm_id", firmId).select("id").maybeSingle() : await db.insert(row).select("id").single();
    if (res.error?.code === "23505") return { ok: false as const, error: SLUG_TAKEN };
    if (res.error) throw new Error(res.error.message);
    if (!res.data) return { ok: false as const, error: "Takım bulunamadı." };
    return { ok: true as const, id: (res.data as { id: string }).id };
  }
  async remove(firmId: string, id: string) {
    const res = await serviceClient().from("firm_sets").delete().eq("id", id).eq("firm_id", firmId).select("id, firm_id, slug, name, pieces, is_active").maybeSingle();
    if (res.error) throw new Error(res.error.message);
    return res.data ? fromRow(res.data as Row) : null;
  }
}

const holder = globalThis as unknown as { __ormenSets?: SetStore };

export function getSets(): SetStore {
  holder.__ormenSets ??= supabaseEnabled() ? new SupabaseSets() : new MemorySets();
  return holder.__ormenSets;
}
