// The centre's own data (shops as accounts, screens, the change log): the
// interface both backings implement. No server-only imports, so the memory
// backing can be tested on its own.

import { createHash, randomBytes } from "node:crypto";
import type { ShopQuery, ShopRow, ShopStatus } from "./shops";
import { pairingCodeFrom, type Device, type DeviceQuality, type SyncStatus } from "@/lib/devices/pairing";

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

export interface ShopState {
  id: string;
  name: string;
  slug: string;
  status: ShopStatus;
  isActive: boolean;
  contentVersion: number;
  updateMode: "otomatik" | "onayli";
  features: Record<string, unknown>;
  settings: Record<string, unknown>;
}

/** Only the hash of a screen's secret is ever stored. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
export const newToken = () => randomBytes(32).toString("base64url");
export const newCode = () => pairingCodeFrom(randomBytes(24));

export interface CentralStore {
  /** One page of shops. `withFees` false leaves the maintenance date out (ORMEN elemanı). */
  listShops(q: ShopQuery, opts: { withFees: boolean }): Promise<{ total: number; rows: ShopRow[] }>;
  getShop(id: string): Promise<ShopRow | null>;
  setShopStatus(id: string, status: ShopStatus): Promise<void>;
  /** What a shop's screens need to know about it. Null for an unknown shop. */
  getShopState(firmId: string): Promise<ShopState | null>;

  /** A fresh 6-digit code that ties one new screen to the shop; lives PAIRING_TTL_MINUTES. */
  createPairing(firmId: string, name: string, branch: string | null): Promise<{ code: string; expiresAt: string }>;
  /** Exchanges a code for a screen and its secret. The code works once; null when it is wrong or too old. */
  claimPairing(code: string): Promise<{ token: string; device: Device } | null>;
  /** The screen that holds this secret, or null (unknown, or removed in the panel). */
  deviceByToken(token: string): Promise<Device | null>;
  /** A screen's regular check: stamps "seen", stores what it runs, and returns whether the panel asked it to sync. */
  checkIn(deviceId: string, report: { appVersion?: string | null; contentVersion?: number | null; syncStatus?: SyncStatus }): Promise<{ syncRequested: boolean }>;
  listDevices(firmId: string): Promise<Device[]>;
  getDevice(id: string): Promise<Device | null>;
  updateDevice(id: string, patch: { name?: string; branch?: string | null; quality?: DeviceQuality }): Promise<void>;
  /** "Şimdi eşitle": the screens act on it at their next check. */
  requestSync(deviceIds: string[]): Promise<void>;
  /** Takes the screen's access away for good; it asks for a code again. */
  removeDevice(id: string): Promise<void>;

  /** Stores the shop PIN (hashed). */
  setShopPin(firmId: string, pin: string): Promise<void>;
  hasShopPin(firmId: string): Promise<boolean>;
  /** True or false for a PIN tried against the shop's; null when the shop has no PIN yet. */
  checkShopPin(firmId: string, pin: string): Promise<boolean | null>;

  writeAudit(e: AuditInput): Promise<void>;
  /** Newest first. */
  listAudit(opts: { firmId?: string; limit?: number; offset?: number }): Promise<{ total: number; rows: AuditEntry[] }>;
  getAudit(id: string): Promise<AuditEntry | null>;
  /** Marks an entry undone; false when it already was (two clicks undo once). */
  markUndone(id: string): Promise<boolean>;
}

