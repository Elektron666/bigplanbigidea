import "server-only";
import { getRepository } from "@/lib/data";
import { supabaseEnabled } from "@/lib/supabase/config";
import { serviceClient } from "@/lib/supabase/server";
import { PAGE_SIZE, pageOfShops, type ShopQuery, type ShopRow, type ShopStatus } from "./shops";

// The centre's own data (shops as accounts, the change log). Like
// lib/data, one interface with two backings: Supabase when it is set up,
// otherwise memory, so the panel can be tried and tested without it.
// Every call here is made by the server after it has checked the panel
// user's role (lib/auth/roles.ts).

export const AUDIT_ENTITIES = ["magaza", "urun", "atama", "kumas", "cihaz", "abonelik", "sablon", "uye", "destek"] as const;
export type AuditEntity = (typeof AUDIT_ENTITIES)[number];

export interface AuditInput {
  actor: string;
  actorRole: "admin" | "staff" | "sahip" | "sistem";
  firmId?: string | null;
  entity: AuditEntity;
  entityId?: string | null;
  action: string;
  /** One plain Turkish sentence: what changed. Never a customer's name or phone. */
  summary: string;
  before?: unknown;
  after?: unknown;
  batchId?: string | null;
}

export interface AuditEntry extends AuditInput {
  id: string;
  at: string;
  undoneAt: string | null;
}

export interface CentralStore {
  /** One page of shops. `withFees` false leaves the maintenance date out (ORMEN elemanı). */
  listShops(q: ShopQuery, opts: { withFees: boolean }): Promise<{ total: number; rows: ShopRow[] }>;
  getShop(id: string): Promise<ShopRow | null>;
  setShopStatus(id: string, status: ShopStatus): Promise<void>;
  writeAudit(e: AuditInput): Promise<void>;
  /** Newest first. */
  listAudit(opts: { firmId?: string; limit?: number; offset?: number }): Promise<{ total: number; rows: AuditEntry[] }>;
}

// ------------------------------------------------------------------ memory

class MemoryCentral implements CentralStore {
  private extra = new Map<string, Partial<ShopRow>>();
  private audit: AuditEntry[] = [];

  private async all(): Promise<ShopRow[]> {
    const repo = getRepository();
    const [firms, models] = await Promise.all([repo.listFirms(), repo.listAllModels()]);
    return Promise.all(
      firms.map(async (f) => {
        const picks = await repo.getFirmShowcaseIds(f.id);
        return {
          id: f.id,
          name: f.name,
          slug: f.slug,
          status: "aktif" as ShopStatus,
          city: null,
          region: null,
          isActive: f.isActive,
          contentVersion: 1,
          updateMode: "otomatik" as const,
          package: null,
          tags: [],
          contact: null,
          installedOn: null,
          devices: 0,
          lastSeen: null,
          syncErrors: 0,
          products: picks.length + models.filter((m) => m.firmId === f.id).length,
          nextDue: null,
          ...this.extra.get(f.id),
        };
      }),
    );
  }

  async listShops(q: ShopQuery, opts: { withFees: boolean }) {
    const all = await this.all();
    return pageOfShops(opts.withFees ? all : all.map((s) => ({ ...s, nextDue: null })), q);
  }

  async getShop(id: string) {
    return (await this.all()).find((s) => s.id === id) ?? null;
  }

  async setShopStatus(id: string, status: ShopStatus) {
    const now = this.extra.get(id) ?? {};
    this.extra.set(id, { ...now, status, contentVersion: (now.contentVersion ?? 1) + 1 });
  }

  async writeAudit(e: AuditInput) {
    this.audit.unshift({ ...e, id: String(this.audit.length + 1), at: new Date().toISOString(), undoneAt: null });
  }

  async listAudit(opts: { firmId?: string; limit?: number; offset?: number }) {
    const hit = this.audit.filter((a) => !opts.firmId || a.firmId === opts.firmId);
    const offset = opts.offset ?? 0;
    return { total: hit.length, rows: hit.slice(offset, offset + (opts.limit ?? 50)) };
  }
}

// ------------------------------------------------------------------ Supabase

type ShopJson = {
  id: string; name: string; slug: string; status: ShopStatus; city: string | null; region: string | null; is_active: boolean; content_version: number;
  update_mode: "otomatik" | "onayli"; package: string | null; tags: string[] | null; contact: string | null; installed_on: string | null;
  devices: number; last_seen: string | null; sync_errors: number; products: number; next_due: string | null;
};

function shopFromJson(r: ShopJson, withFees: boolean): ShopRow {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    status: r.status,
    city: r.city,
    region: r.region,
    isActive: r.is_active,
    contentVersion: Number(r.content_version),
    updateMode: r.update_mode,
    package: r.package,
    tags: r.tags ?? [],
    contact: r.contact,
    installedOn: r.installed_on,
    devices: Number(r.devices),
    lastSeen: r.last_seen,
    syncErrors: Number(r.sync_errors),
    products: Number(r.products),
    nextDue: withFees ? r.next_due : null,
  };
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

class SupabaseCentral implements CentralStore {
  private get db() {
    return serviceClient();
  }

  async listShops(q: ShopQuery, opts: { withFees: boolean }) {
    const data = check(
      await this.db.rpc("atelier_shops", {
        p_search: q.search ?? null,
        p_status: q.status ?? null,
        p_city: q.city ?? null,
        p_tag: q.tag ?? null,
        // without the fee column there is nothing to sort by
        p_sort: q.sort === "vade" && !opts.withFees ? "ad" : q.sort,
        p_limit: PAGE_SIZE,
        p_offset: (q.page - 1) * PAGE_SIZE,
      }),
    ) as { total: number; rows: ShopJson[] };
    return { total: Number(data.total), rows: data.rows.map((r) => shopFromJson(r, opts.withFees)) };
  }

  async getShop(id: string) {
    const firm = check(await this.db.from("firms").select("name").eq("id", id).maybeSingle()) as { name: string } | null;
    if (!firm) return null;
    const page = await this.listShops({ search: firm.name, sort: "ad", page: 1 }, { withFees: false });
    return page.rows.find((s) => s.id === id) ?? null;
  }

  async setShopStatus(id: string, status: ShopStatus) {
    check(await this.db.from("firms").update({ status }).eq("id", id));
  }

  async writeAudit(e: AuditInput) {
    check(
      await this.db.from("audit_log").insert({
        actor: e.actor.slice(0, 120),
        actor_role: e.actorRole,
        firm_id: e.firmId ?? null,
        entity: e.entity,
        entity_id: e.entityId ?? null,
        action: e.action,
        summary: e.summary.slice(0, 300),
        before: e.before ?? null,
        after: e.after ?? null,
        batch_id: e.batchId ?? null,
      }),
    );
  }

  async listAudit(opts: { firmId?: string; limit?: number; offset?: number }) {
    const offset = opts.offset ?? 0;
    let q = this.db.from("audit_log").select("*", { count: "exact" }).order("at", { ascending: false }).range(offset, offset + (opts.limit ?? 50) - 1);
    if (opts.firmId) q = q.eq("firm_id", opts.firmId);
    const res = await q;
    if (res.error) throw new Error(res.error.message);
    type Row = { id: number; at: string; actor: string; actor_role: AuditInput["actorRole"]; firm_id: string | null; entity: AuditEntity; entity_id: string | null; action: string; summary: string; before: unknown; after: unknown; batch_id: string | null; undone_at: string | null };
    return {
      total: res.count ?? 0,
      rows: ((res.data ?? []) as Row[]).map((r) => ({ id: String(r.id), at: r.at, actor: r.actor, actorRole: r.actor_role, firmId: r.firm_id, entity: r.entity, entityId: r.entity_id, action: r.action, summary: r.summary, before: r.before, after: r.after, batchId: r.batch_id, undoneAt: r.undone_at })),
    };
  }
}

// one store for pages and route handlers alike (see lib/data/index.ts)
const holder = globalThis as unknown as { __ormenCentral?: CentralStore };

export function getCentral(): CentralStore {
  holder.__ormenCentral ??= supabaseEnabled() ? new SupabaseCentral() : new MemoryCentral();
  return holder.__ormenCentral;
}
