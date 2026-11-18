import "server-only";
import { getRepository } from "@/lib/data";
import { supabaseEnabled } from "@/lib/supabase/config";
import { serviceClient } from "@/lib/supabase/server";
import { PAGE_SIZE, type ShopQuery, type ShopRow, type ShopStatus } from "./shops";
import { PAIRING_TTL_MINUTES, type Device, type DeviceQuality, type SyncStatus } from "@/lib/devices/pairing";
import { hashPin, verifyPin } from "@/lib/devices/pin";
import { MemoryCentral } from "./memory";
import { hashToken, newCode, newToken, type AuditEntity, type AuditInput, type CentralStore, type ShopState } from "./types";

export * from "./types";
export { MemoryCentral };

// The centre's own data (shops as accounts, the change log). Like
// lib/data, one interface with two backings: Supabase when it is set up,
// otherwise memory, so the panel can be tried and tested without it.
// Every call here is made by the server after it has checked the panel
// user's role (lib/auth/roles.ts).

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

interface DeviceRow {
  id: string; firm_id: string; name: string; branch: string | null; quality: DeviceQuality; app_version: string | null; content_version: number | null;
  sync_status: SyncStatus; last_seen_at: string | null; last_sync_at: string | null; sync_requested_at: string | null; created_at: string;
}

function deviceFromRow(r: DeviceRow): Device {
  return {
    id: r.id, firmId: r.firm_id, name: r.name, branch: r.branch, quality: r.quality, appVersion: r.app_version,
    contentVersion: r.content_version === null ? null : Number(r.content_version), syncStatus: r.sync_status,
    lastSeenAt: r.last_seen_at, lastSyncAt: r.last_sync_at, syncRequestedAt: r.sync_requested_at, createdAt: r.created_at,
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

  async getShopState(firmId: string): Promise<ShopState | null> {
    const r = check(await this.db.from("firms").select("id, name, slug, status, is_active, content_version, update_mode, features, settings").eq("id", firmId).maybeSingle()) as
      | { id: string; name: string; slug: string; status: ShopStatus; is_active: boolean; content_version: number; update_mode: "otomatik" | "onayli"; features: Record<string, unknown> | null; settings: Record<string, unknown> | null }
      | null;
    return r && { id: r.id, name: r.name, slug: r.slug, status: r.status, isActive: r.is_active, contentVersion: Number(r.content_version), updateMode: r.update_mode, features: r.features ?? {}, settings: r.settings ?? {} };
  }

  async createPairing(firmId: string, name: string, branch: string | null) {
    const expiresAt = new Date(Date.now() + PAIRING_TTL_MINUTES * 60_000).toISOString();
    // old codes are cleared on the way, so the table never grows
    await this.db.from("device_pairings").delete().lt("expires_at", new Date().toISOString());
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = newCode();
      const res = await this.db.from("device_pairings").insert({ code, firm_id: firmId, name, branch, expires_at: expiresAt });
      if (!res.error) return { code, expiresAt };
      if (res.error.code !== "23505") throw new Error(res.error.message);
    }
    throw new Error("Eşleştirme kodu üretilemedi; yeniden deneyin.");
  }

  async claimPairing(code: string) {
    // deleting and reading in one statement: two screens cannot both use the same code
    const rows = check(await this.db.from("device_pairings").delete().eq("code", code).select("firm_id, name, branch, expires_at")) as { firm_id: string; name: string; branch: string | null; expires_at: string }[];
    const p = rows[0];
    if (!p || Date.parse(p.expires_at) < Date.now()) return null;
    const token = newToken();
    const row = check(await this.db.from("devices").insert({ firm_id: p.firm_id, name: p.name, branch: p.branch, token_hash: hashToken(token) }).select("*").single()) as DeviceRow;
    return { token, device: deviceFromRow(row) };
  }

  async deviceByToken(token: string) {
    const r = check(await this.db.from("devices").select("*").eq("token_hash", hashToken(token)).maybeSingle()) as DeviceRow | null;
    return r ? deviceFromRow(r) : null;
  }

  async checkIn(deviceId: string, report: { appVersion?: string | null; contentVersion?: number | null; syncStatus?: SyncStatus }) {
    const now = new Date().toISOString();
    const before = check(await this.db.from("devices").select("sync_requested_at").eq("id", deviceId).maybeSingle()) as { sync_requested_at: string | null } | null;
    if (!before) return { syncRequested: false };
    check(
      await this.db
        .from("devices")
        .update({
          last_seen_at: now,
          sync_requested_at: null,
          ...(report.appVersion !== undefined ? { app_version: report.appVersion } : {}),
          ...(report.contentVersion !== undefined ? { content_version: report.contentVersion } : {}),
          ...(report.syncStatus ? { sync_status: report.syncStatus } : {}),
          ...(report.syncStatus === "guncel" ? { last_sync_at: now } : {}),
        })
        .eq("id", deviceId),
    );
    return { syncRequested: before.sync_requested_at !== null };
  }

  async listDevices(firmId: string) {
    return (check(await this.db.from("devices").select("*").eq("firm_id", firmId).order("created_at")) as DeviceRow[]).map(deviceFromRow);
  }

  async getDevice(id: string) {
    const r = check(await this.db.from("devices").select("*").eq("id", id).maybeSingle()) as DeviceRow | null;
    return r ? deviceFromRow(r) : null;
  }

  async updateDevice(id: string, patch: { name?: string; branch?: string | null; quality?: DeviceQuality }) {
    check(await this.db.from("devices").update(patch).eq("id", id));
  }

  async requestSync(deviceIds: string[]) {
    if (deviceIds.length) check(await this.db.from("devices").update({ sync_requested_at: new Date().toISOString() }).in("id", deviceIds));
  }

  async removeDevice(id: string) {
    check(await this.db.from("devices").delete().eq("id", id));
  }

  async setShopPin(firmId: string, pin: string) {
    check(await this.db.from("firm_admin").upsert({ firm_id: firmId, pin_hash: hashPin(pin) }, { onConflict: "firm_id" }));
  }

  async hasShopPin(firmId: string) {
    const r = check(await this.db.from("firm_admin").select("pin_hash").eq("firm_id", firmId).maybeSingle()) as { pin_hash: string | null } | null;
    return !!r?.pin_hash;
  }

  async checkShopPin(firmId: string, pin: string) {
    const r = check(await this.db.from("firm_admin").select("pin_hash").eq("firm_id", firmId).maybeSingle()) as { pin_hash: string | null } | null;
    return r?.pin_hash ? verifyPin(pin, r.pin_hash) : null;
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
  holder.__ormenCentral ??= supabaseEnabled() ? new SupabaseCentral() : new MemoryCentral(getRepository);
  return holder.__ormenCentral;
}
