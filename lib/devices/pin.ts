// The shop PIN (Showroom package, job 1): leaving the locked screen and,
// later, seller mode. 4 to 6 digits, typed on the screen's own pad. Only a
// salted scrypt hash is stored (firm_admin.pin_hash).

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const PIN = /^[0-9]{4,6}$/;
/** Taps on the logo that open the PIN pad, and the time they must fall within. */
export const EXIT_TAPS = 5;
export const EXIT_TAP_WINDOW_MS = 3000;
/** Wrong PINs allowed per screen before a pause. */
export const PIN_TRIES = 5;
export const PIN_PAUSE_MS = 5 * 60_000;

export function cleanPin(raw: unknown): string | null {
  return typeof raw === "string" && PIN.test(raw) ? raw : null;
}

/** PINs a visitor would try first are refused when the shop sets one. */
export function weakPin(pin: string): boolean {
  if (/^(\d)\1+$/.test(pin)) return true;
  return "0123456789".includes(pin) || "9876543210".includes(pin);
}

export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  return `scrypt:${salt.toString("base64url")}:${scryptSync(pin, salt, 32).toString("base64url")}`;
}

export function verifyPin(pin: string, stored: string | null | undefined): boolean {
  const [kind, salt, hash] = (stored ?? "").split(":");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const want = Buffer.from(hash, "base64url");
  const got = scryptSync(pin, Buffer.from(salt, "base64url"), want.length || 32);
  return want.length === got.length && timingSafeEqual(want, got);
}

/** Counts the taps that fall within the window; true on the one that completes the gesture. */
export function exitGesture(taps: number[], now: number): { taps: number[]; open: boolean } {
  const recent = [...taps.filter((t) => now - t < EXIT_TAP_WINDOW_MS), now];
  return recent.length >= EXIT_TAPS ? { taps: [], open: true } : { taps: recent, open: false };
}
