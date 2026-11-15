// Tying a showroom screen to a shop (Showroom package, job 1).
// The panel shows a 6-digit code that lives a few minutes; typed once on the
// screen, it is exchanged for a long random secret the screen keeps in a
// cookie it cannot read from script. The database stores only the secret's
// hash, so a copy of the table cannot be used to pose as a screen.
// Pure helpers; the stores are in lib/central/store.ts.

export const PAIRING_TTL_MINUTES = 10;
export const PAIRING_CODE = /^[0-9]{6}$/;
export const DEVICE_COOKIE = "ormen_cihaz";
/** Two years: a screen is paired once and never asked again. */
export const DEVICE_COOKIE_MAX_AGE = 2 * 365 * 24 * 60 * 60;
export const DEVICE_TOKEN = /^[A-Za-z0-9_-]{43}$/;

export const DEVICE_QUALITIES = ["oto", "hafif", "tam"] as const;
export type DeviceQuality = (typeof DEVICE_QUALITIES)[number];
export const DEVICE_QUALITY_LABELS: Record<DeviceQuality, string> = { oto: "Kendisi seçsin", hafif: "Hafif", tam: "Tam" };

export const SYNC_STATUSES = ["guncel", "bekliyor", "indiriyor", "hata"] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];
export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = { guncel: "Güncel", bekliyor: "Bekliyor", indiriyor: "İndiriyor", hata: "Hata" };

export interface Device {
  id: string;
  firmId: string;
  name: string;
  branch: string | null;
  quality: DeviceQuality;
  appVersion: string | null;
  contentVersion: number | null;
  syncStatus: SyncStatus;
  lastSeenAt: string | null;
  lastSyncAt: string | null;
  /** The panel asked this screen to sync or reload; it does so at its next check. */
  syncRequestedAt: string | null;
  createdAt: string;
}

/** What the screen typed, as a code: spaces and dashes are forgiven, anything else is not a code. */
export function cleanPairingCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/[\s-]/g, "");
  return PAIRING_CODE.test(digits) ? digits : null;
}

/** A 6-digit code from random bytes, without the bias a plain modulo would add. */
export function pairingCodeFrom(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) {
    // 250 is the largest multiple of 10 that fits a byte; bytes above it are skipped
    if (b < 250) out += String(b % 10);
    if (out.length === 6) return out;
  }
  throw new Error("not enough random bytes for a pairing code");
}

export function validateDeviceName(raw: unknown): { ok: true; name: string; branch: string | null } | { ok: false; error: string } {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const name = typeof r.name === "string" ? r.name.trim().replace(/\s+/g, " ") : "";
  const branch = typeof r.branch === "string" ? r.branch.trim().replace(/\s+/g, " ") : "";
  if (name.length < 1) return { ok: false, error: "Ekrana bir ad verin (ör. Giriş ekranı)." };
  if (name.length > 60 || branch.length > 60) return { ok: false, error: "Ad ve şube en çok 60 karakter olabilir." };
  return { ok: true, name, branch: branch || null };
}

/**
 * What the panel says about a screen. A screen that last checked in more
 * than a quarter of an hour ago is off (or offline): its last sync status is
 * old news.
 */
export const ONLINE_WINDOW_MS = 15 * 60_000;

export function deviceState(d: Pick<Device, "lastSeenAt" | "syncStatus" | "contentVersion">, shopVersion: number, now = Date.now()): { online: boolean; label: string; tone: "neutral" | "warn" | "off" } {
  if (!d.lastSeenAt) return { online: false, label: "Henüz açılmadı", tone: "off" };
  const online = now - Date.parse(d.lastSeenAt) <= ONLINE_WINDOW_MS;
  if (!online) return { online, label: "Kapalı", tone: "off" };
  if (d.syncStatus === "hata") return { online, label: "Eşitleme hatası", tone: "warn" };
  if (d.syncStatus === "indiriyor") return { online, label: "İndiriyor", tone: "neutral" };
  if (d.contentVersion !== shopVersion) return { online, label: "Güncelleme bekliyor", tone: "warn" };
  return { online, label: "Güncel", tone: "neutral" };
}
