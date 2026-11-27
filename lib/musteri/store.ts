import "server-only";
import { supabaseEnabled } from "@/lib/supabase/config";
import { serviceClient, sessionClient } from "@/lib/supabase/server";
import type { ShopUser } from "@/lib/auth/shop";
import type { LeadInput } from "./kayit";

// Interested customers (job 13): the shop's own. Added by the server after
// the customer ticked the consent box; read and deleted by the shop's owner
// with their own session (row rules: own shop only, no ORMEN rule). ORMEN's
// panel gets counts only (counts()), never a name or a phone.

export interface Lead {
  id: string;
  name: string;
  phone: string;
  product: string | null;
  createdAt: string;
}

export interface LeadStore {
  add(firmId: string, lead: LeadInput, product: string | null): Promise<void>;
  list(u: ShopUser): Promise<Lead[]>;
  remove(u: ShopUser, ids: string[]): Promise<number>;
  retention(firmId: string): Promise<number | null>;
  setRetention(u: ShopUser, days: number | null): Promise<void>;
  /** Per shop, how many: for ORMEN's panel. No name, no phone leaves here. */
  counts(): Promise<Record<string, number>>;
  /** Deletes what is older than each shop's period; returns how many. */
  purge(now?: Date): Promise<number>;
}

const READ_ONLY = "Destek görünümünde değişiklik yapılmaz.";

class MemoryLeads implements LeadStore {
  private rows: (Lead & { firmId: string })[] = [];
  private days = new Map<string, number | null>();
  async add(firmId: string, lead: LeadInput, product: string | null) {
    this.rows.unshift({ id: crypto.randomUUID(), firmId, ...lead, product, createdAt: new Date().toISOString() });
  }
  async list(u: ShopUser) {
    // as in the database: the support view is ORMEN's, and ORMEN has no rule here
    if (u.support) return [];
    return this.rows.filter((r) => r.firmId === u.firmId).map(({ firmId: _f, ...r }) => (void _f, r));
  }
  async remove(u: ShopUser, ids: string[]) {
    if (u.support) throw new Error(READ_ONLY);
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => !(r.firmId === u.firmId && ids.includes(r.id)));
    return before - this.rows.length;
  }
  async retention(firmId: string) {
    return this.days.get(firmId) ?? null;
  }
  async setRetention(u: ShopUser, days: number | null) {
    if (u.support) throw new Error(READ_ONLY);
    this.days.set(u.firmId, days);
  }
  async counts() {
    const out: Record<string, number> = {};
    for (const r of this.rows) out[r.firmId] = (out[r.firmId] ?? 0) + 1;
    return out;
  }
  async purge(now = new Date()) {
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => {
      const d = this.days.get(r.firmId);
      // no period set: nothing was collected under it; anything left goes
      return d ? Date.parse(r.createdAt) > now.getTime() - d * 86_400_000 : false;
    });
    return before - this.rows.length;
  }
}

class SupabaseLeads implements LeadStore {
  async add(firmId: string, lead: LeadInput, product: string | null) {
    const res = await serviceClient().from("customer_leads").insert({ firm_id: firmId, name: lead.name, phone: lead.phone, product });
    if (res.error) throw new Error(res.error.message);
  }
  async list(u: ShopUser) {
    const res = await (await sessionClient()).from("customer_leads").select("id, name, phone, product, created_at").eq("firm_id", u.firmId).order("created_at", { ascending: false }).limit(1000);
    if (res.error) throw new Error(res.error.message);
    return (res.data as { id: string; name: string; phone: string; product: string | null; created_at: string }[]).map((r) => ({ id: r.id, name: r.name, phone: r.phone, product: r.product, createdAt: r.created_at }));
  }
  async remove(u: ShopUser, ids: string[]) {
    if (u.support) throw new Error(READ_ONLY);
    const res = await (await sessionClient()).from("customer_leads").delete().eq("firm_id", u.firmId).in("id", ids).select("id");
    if (res.error) throw new Error(res.error.message);
    return res.data?.length ?? 0;
  }
  async retention(firmId: string) {
    const res = await serviceClient().from("firms").select("lead_retention_days").eq("id", firmId).maybeSingle();
    return (res.data as { lead_retention_days: number | null } | null)?.lead_retention_days ?? null;
  }
  async setRetention(u: ShopUser, days: number | null) {
    if (u.support) throw new Error(READ_ONLY);
    const res = await (await sessionClient()).rpc("shop_set_lead_retention", { p_firm_id: u.firmId, p_days: days });
    if (res.error) throw new Error(res.error.message);
  }
  async counts() {
    // only the shop column travels: no name, no phone
    const res = await serviceClient().from("customer_leads").select("firm_id").limit(100_000);
    if (res.error) throw new Error(res.error.message);
    const out: Record<string, number> = {};
    for (const r of res.data as { firm_id: string }[]) out[r.firm_id] = (out[r.firm_id] ?? 0) + 1;
    return out;
  }
  async purge(now = new Date()) {
    const db = serviceClient();
    const firms = (await db.from("firms").select("id, lead_retention_days")).data as { id: string; lead_retention_days: number | null }[] | null;
    let n = 0;
    for (const f of firms ?? []) {
      const before = new Date(now.getTime() - (f.lead_retention_days ?? 0) * 86_400_000).toISOString();
      const q = db.from("customer_leads").delete().eq("firm_id", f.id);
      const res = await (f.lead_retention_days ? q.lt("created_at", before) : q).select("id");
      n += res.data?.length ?? 0;
    }
    return n;
  }
}

const holder = globalThis as unknown as { __ormenLeads?: LeadStore };

export function getLeads(): LeadStore {
  holder.__ormenLeads ??= supabaseEnabled() ? new SupabaseLeads() : new MemoryLeads();
  return holder.__ormenLeads;
}
