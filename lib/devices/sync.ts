// What a showroom screen is told at each check (Showroom package, job 0,
// "uzaktan güncelleme"), and what it should do about it. Pure.

import type { ShopStatus } from "@/lib/central/shops";

export interface SyncAnswer {
  /** "askida": the screen shows a calm notice until the shop is switched back on. */
  status: ShopStatus;
  contentVersion: number;
  updateMode: "otomatik" | "onayli";
  /** The app build the server runs; a screen on another build renews itself when idle. */
  appVersion: string;
  /** The panel asked this screen to sync now. */
  syncRequested: boolean;
}

export type SyncStep =
  /** nothing new */
  | { do: "bekle" }
  /** new content or app: take it now (nobody is using the screen) */
  | { do: "uygula" }
  /** new content, but the customer is at the screen: keep what is shown, apply when the screen goes idle */
  | { do: "bosta-uygula" }
  /** approved mode: tell the salesperson, apply only when they say so */
  | { do: "onay-bekle" };

/**
 * What the screen does with the server's answer.
 *  - A screen in use is never changed under the customer's hands.
 *  - In approved mode nothing is applied until the salesperson taps "Şimdi yükle",
 *    unless the panel itself sent "şimdi eşitle".
 *  - A screen that missed many versions takes the latest one in a single step:
 *    only "different from mine" matters, never how far behind it is.
 */
export function nextSyncStep(a: SyncAnswer, mine: { contentVersion: number | null; appVersion: string | null }, screen: { idle: boolean; approved?: boolean }): SyncStep {
  const stale = a.contentVersion !== mine.contentVersion || (mine.appVersion !== null && a.appVersion !== mine.appVersion);
  if (!stale && !a.syncRequested) return { do: "bekle" };
  if (a.updateMode === "onayli" && !screen.approved && !a.syncRequested) return { do: "onay-bekle" };
  return screen.idle ? { do: "uygula" } : { do: "bosta-uygula" };
}

/** How often an open screen asks (it also asks when the showroom loop starts). */
export const SYNC_EVERY_MS = 2 * 60_000;
