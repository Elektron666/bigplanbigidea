import type { Repository } from "@/lib/data/repository";
import { PAIRING_TTL_MINUTES, type Device, type DeviceQuality, type SyncStatus } from "@/lib/devices/pairing";
import { hashPin, verifyPin } from "@/lib/devices/pin";
import { pageOfShops, type ShopQuery, type ShopRow, type ShopStatus } from "./shops";
import { EMPTY_RECORD, nextDue, type ShopRecord, type ShopTemplate, type Subscription } from "./record";
import { hashToken, newCode, newPassword, newToken, type ShopOwner, type AuditEntry, type AuditInput, type CentralStore, type ShopState } from "./types";

// ------------------------------------------------------------------ memory

const pub = (x: Subscription): Subscription => ({ id: x.id, amount: x.amount, period: x.period, dueOn: x.dueOn, paidOn: x.paidOn, note: x.note });

export class MemoryCentral implements CentralStore {
  /** `repo` gives the catalogue store; without one (tests of pairing alone) there are no shops. */
  constructor(private repo?: () => Repository) {}

  private extra = new Map<string, Partial<ShopRow>>();
  private audit: AuditEntry[] = [];
  private pins = new Map<string, string>();
  private records = new Map<string, ShopRecord>();
  private subs = new Map<string, Subscription & { firmId: string }>();
  private templates: ShopTemplate[] = [];
  private owners: (ShopOwner & { firmId: string })[] = [];
  /** ORMEN's own accounts (the memory store has the demo one only). */
  staffEmails = new Set<string>(["demo@ormen.local"]);
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
          isActive: f.isActive,
          contentVersion: 1,
          syncErrors: 0,
          products: picks.length + models.filter((m) => m.firmId === f.id).length,
          ...this.recordCols(f.id),
          nextDue: nextDue([...this.subs.values()].filter((x) => x.firmId === f.id)),
          ...this.extra.get(f.id),
          devices: [...this.devices.values()].filter((d) => d.firmId === f.id).length,
          lastSeen: [...this.devices.values()].filter((d) => d.firmId === f.id && d.lastSeenAt).map((d) => d.lastSeenAt!).sort().at(-1) ?? null,
        };
      }),
    );
  }

  private recordCols(firmId: string) {
    const r = this.records.get(firmId) ?? EMPTY_RECORD;
    return { city: r.city, region: r.region, package: r.package, tags: r.tags, contact: r.contact, installedOn: r.installedOn, updateMode: r.updateMode };
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
    if (!s) return null;
    const firm = await this.repo?.().getFirmById(firmId);
    const rec = this.records.get(firmId);
    const settings = { ...(rec?.vitrinSn ? { vitrinSn: rec.vitrinSn } : {}), ...(rec?.gecisCm ? { gecisCm: rec.gecisCm } : {}) };
    return { id: s.id, name: s.name, slug: s.slug, status: s.status, isActive: s.isActive, contentVersion: s.contentVersion, updateMode: s.updateMode, features: firm?.features ?? {}, settings };
  }

  async getShopRecord(firmId: string) {
    if (!(await this.getShop(firmId))) return null;
    return structuredClone(this.records.get(firmId) ?? EMPTY_RECORD);
  }

  async saveShopRecord(firmId: string, rec: ShopRecord) {
    this.records.set(firmId, structuredClone(rec));
    const now = this.extra.get(firmId) ?? {};
    this.extra.set(firmId, { ...now, contentVersion: (now.contentVersion ?? 1) + 1 });
  }

  async listSubscriptions(firmId: string) {
    return [...this.subs.values()]
      .filter((x) => x.firmId === firmId)
      .sort((a, b) => b.dueOn.localeCompare(a.dueOn))
      .map(pub);
  }

  async addSubscription(firmId: string, s: Omit<Subscription, "id" | "paidOn">) {
    const row = { ...s, id: crypto.randomUUID(), paidOn: null, firmId };
    this.subs.set(row.id, row);
    return pub(row);
  }

  async setPaid(id: string, paidOn: string | null) {
    const row = this.subs.get(id);
    if (!row) return null;
    const before = pub(row);
    row.paidOn = paidOn;
    return { firmId: row.firmId, before };
  }

  async deviceBeats() {
    return [...this.devices.values()].map((d) => ({ id: d.id, name: d.name, firmId: d.firmId, lastSeenAt: d.lastSeenAt, syncStatus: d.syncStatus, createdAt: d.createdAt }));
  }

  async unpaidFees() {
    return [...this.subs.values()].filter((x) => !x.paidOn).map((x) => ({ firmId: x.firmId, amount: x.amount, dueOn: x.dueOn }));
  }

  async shopNames() {
    return (await this.all()).map((s) => ({ id: s.id, name: s.name, status: s.status }));
  }

  /** Tests only: a screen's last check-in as if it happened at `at`. */
  _setSeen(deviceId: string, at: string | null, syncStatus?: SyncStatus) {
    const d = this.byId(deviceId);
    if (d) {
      d.lastSeenAt = at;
      if (syncStatus) d.syncStatus = syncStatus;
    }
  }

  async listOwners(firmId: string) {
    return this.owners.filter((o) => o.firmId === firmId).map(({ userId, email, since }) => ({ userId, email, since }));
  }

  async addOwner(firmId: string, email: string) {
    if (this.staffEmails.has(email)) return { ok: false as const, error: "Bu bir ORMEN hesabı; mağaza hesabı olarak eklenemez." };
    const known = this.owners.find((o) => o.email === email);
    if (this.owners.some((o) => o.email === email && o.firmId === firmId)) return { ok: false as const, error: "Bu hesap zaten bu mağazanın." };
    const owner = { userId: known?.userId ?? crypto.randomUUID(), email, since: new Date().toISOString() };
    this.owners.push({ ...owner, firmId });
    return { ok: true as const, owner, password: known ? null : newPassword() };
  }

  async removeOwner(firmId: string, userId: string) {
    const o = this.owners.find((x) => x.firmId === firmId && x.userId === userId);
    if (!o) return null;
    this.owners = this.owners.filter((x) => x !== o);
    return { userId: o.userId, email: o.email, since: o.since };
  }

  async listTemplates() {
    return structuredClone([...this.templates].sort((a, b) => a.name.localeCompare(b.name, "tr")));
  }

  async getTemplate(id: string) {
    const t = this.templates.find((x) => x.id === id);
    return t ? structuredClone(t) : null;
  }

  async saveTemplate(t: Omit<ShopTemplate, "id">) {
    const same = this.templates.find((x) => x.name.toLocaleLowerCase("tr") === t.name.toLocaleLowerCase("tr"));
    const row: ShopTemplate = { ...structuredClone(t), id: same?.id ?? crypto.randomUUID() };
    this.templates = [...this.templates.filter((x) => x !== same), row];
    return structuredClone(row);
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

  async setShopPin(firmId: string, pin: string) {
    this.pins.set(firmId, hashPin(pin));
  }

  async hasShopPin(firmId: string) {
    return this.pins.has(firmId);
  }

  async checkShopPin(firmId: string, pin: string) {
    const stored = this.pins.get(firmId);
    return stored ? verifyPin(pin, stored) : null;
  }

  async writeAudit(e: AuditInput) {
    this.audit.unshift({ ...e, id: String(this.audit.length + 1), at: new Date().toISOString(), undoneAt: null });
  }

  async getAudit(id: string) {
    return this.audit.find((a) => a.id === id) ?? null;
  }

  async markUndone(id: string) {
    const a = this.audit.find((x) => x.id === id);
    if (!a || a.undoneAt) return false;
    a.undoneAt = new Date().toISOString();
    return true;
  }

  async listAudit(opts: { firmId?: string; limit?: number; offset?: number; withFees?: boolean }) {
    const hit = this.audit.filter((a) => (!opts.firmId || a.firmId === opts.firmId) && (opts.withFees !== false || a.entity !== "abonelik"));
    const offset = opts.offset ?? 0;
    return { total: hit.length, rows: hit.slice(offset, offset + (opts.limit ?? 50)) };
  }
}

