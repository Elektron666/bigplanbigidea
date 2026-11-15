import type { Repository } from "@/lib/data/repository";
import { PAIRING_TTL_MINUTES, type Device, type DeviceQuality, type SyncStatus } from "@/lib/devices/pairing";
import { pageOfShops, type ShopQuery, type ShopRow, type ShopStatus } from "./shops";
import { hashToken, newCode, newToken, type AuditEntry, type AuditInput, type CentralStore, type ShopState } from "./types";

// ------------------------------------------------------------------ memory

export class MemoryCentral implements CentralStore {
  /** `repo` gives the catalogue store; without one (tests of pairing alone) there are no shops. */
  constructor(private repo?: () => Repository) {}

  private extra = new Map<string, Partial<ShopRow>>();
  private audit: AuditEntry[] = [];
  private pairings = new Map<string, { firmId: string; name: string; branch: string | null; expiresAt: string }>();
  /** keyed by the hash of the screen's secret */
  private devices = new Map<string, Device>();

  private async all(): Promise<ShopRow[]> {
    const repo = this.repo?.();
    if (!repo) return [];
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
          syncErrors: 0,
          products: picks.length + models.filter((m) => m.firmId === f.id).length,
          nextDue: null,
          ...this.extra.get(f.id),
          devices: [...this.devices.values()].filter((d) => d.firmId === f.id).length,
          lastSeen: [...this.devices.values()].filter((d) => d.firmId === f.id && d.lastSeenAt).map((d) => d.lastSeenAt!).sort().at(-1) ?? null,
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

  async getShopState(firmId: string): Promise<ShopState | null> {
    const s = await this.getShop(firmId);
    return s && { id: s.id, name: s.name, slug: s.slug, status: s.status, isActive: s.isActive, contentVersion: s.contentVersion, updateMode: s.updateMode, features: {}, settings: {} };
  }

  async createPairing(firmId: string, name: string, branch: string | null) {
    let code = newCode();
    while (this.pairings.has(code)) code = newCode();
    const expiresAt = new Date(Date.now() + PAIRING_TTL_MINUTES * 60_000).toISOString();
    this.pairings.set(code, { firmId, name, branch, expiresAt });
    return { code, expiresAt };
  }

  async claimPairing(code: string) {
    const p = this.pairings.get(code);
    // used or not, the code is gone after one try
    this.pairings.delete(code);
    if (!p || Date.parse(p.expiresAt) < Date.now()) return null;
    const token = newToken();
    const device: Device = { id: crypto.randomUUID(), firmId: p.firmId, name: p.name, branch: p.branch, quality: "oto", appVersion: null, contentVersion: null, syncStatus: "bekliyor", lastSeenAt: null, lastSyncAt: null, syncRequestedAt: null, createdAt: new Date().toISOString() };
    this.devices.set(hashToken(token), device);
    return { token, device: { ...device } };
  }

  async deviceByToken(token: string) {
    const d = this.devices.get(hashToken(token));
    return d ? { ...d } : null;
  }

  private byId(id: string) {
    return [...this.devices.values()].find((d) => d.id === id);
  }

  async checkIn(deviceId: string, report: { appVersion?: string | null; contentVersion?: number | null; syncStatus?: SyncStatus }) {
    const d = this.byId(deviceId);
    if (!d) return { syncRequested: false };
    const now = new Date().toISOString();
    const syncRequested = d.syncRequestedAt !== null;
    d.lastSeenAt = now;
    if (report.appVersion !== undefined) d.appVersion = report.appVersion;
    if (report.contentVersion !== undefined) d.contentVersion = report.contentVersion;
    if (report.syncStatus) {
      d.syncStatus = report.syncStatus;
      if (report.syncStatus === "guncel") d.lastSyncAt = now;
    }
    // the request is handed over once
    d.syncRequestedAt = null;
    return { syncRequested };
  }

  async listDevices(firmId: string) {
    return [...this.devices.values()].filter((d) => d.firmId === firmId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((d) => ({ ...d }));
  }

  async getDevice(id: string) {
    const d = this.byId(id);
    return d ? { ...d } : null;
  }

  async updateDevice(id: string, patch: { name?: string; branch?: string | null; quality?: DeviceQuality }) {
    const d = this.byId(id);
    if (d) Object.assign(d, patch);
  }

  async requestSync(deviceIds: string[]) {
    const now = new Date().toISOString();
    for (const id of deviceIds) {
      const d = this.byId(id);
      if (d) d.syncRequestedAt = now;
    }
  }

  async removeDevice(id: string) {
    for (const [hash, d] of this.devices) if (d.id === id) this.devices.delete(hash);
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

