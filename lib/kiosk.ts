// Showroom kiosk: the configurator on a touch screen in a furniture shop.
// Opened with ?kiosk (90 s idle) or ?kiosk=<seconds> on any configurator page.

export const KIOSK_DEFAULT_IDLE = 90;
export const KIOSK_WARNING = 10; // seconds of "Hâlâ burada mısınız?" before the reset

export interface KioskOptions {
  idleSeconds: number;
}

export function parseKiosk(params: Record<string, string | string[] | undefined>): KioskOptions | null {
  const v = params.kiosk;
  if (v === undefined) return null;
  const raw = Array.isArray(v) ? v[0] : v;
  const n = Number(raw);
  // "", "1", "evet" → default; a number of seconds is clamped to 30 s – 10 min
  const idleSeconds = Number.isFinite(n) && n >= 30 ? Math.min(600, Math.round(n)) : KIOSK_DEFAULT_IDLE;
  return { idleSeconds };
}

/** Seconds left before the reset, and whether the warning should show. */
export function idleState(idleMs: number, idleSeconds: number): { remaining: number; warn: boolean; reset: boolean } {
  const remaining = Math.max(0, Math.ceil(idleSeconds - idleMs / 1000));
  return { remaining, warn: remaining > 0 && remaining <= KIOSK_WARNING, reset: remaining === 0 };
}

/**
 * The longest a fabric still loading on the 3D sofa holds the idle count, ms:
 * the visitor touched and is waiting for the screen, not gone; but a load that
 * never ends must not keep the screen from its loop for ever.
 */
export const LOAD_HOLD_MS = 60_000;

/** Whether a load that began at `since` (null: none going on) still holds the idle count. */
export function loadHolds(since: number | null, now: number): boolean {
  return since !== null && now - since < LOAD_HOLD_MS;
}

// Showroom loop (acil toplantı, 11 Oct): while the welcome screen waits for
// someone, the sofa turns slowly and wears ORMEN's real fabrics in turn, so
// the screen draws people in. Placeholders never take part: the shop window
// shows only what can be ordered.

export const ATTRACT_STEP_SECONDS = 6;
export const ATTRACT_MAX = 12;

/** The fabrics the loop goes through, or none when fewer than two real ones exist. */
export function attractFabrics<T extends { code: string; isPlaceholder: boolean }>(fabrics: T[]): T[] {
  const real = fabrics.filter((f) => !f.isPlaceholder).slice(0, ATTRACT_MAX);
  return real.length >= 2 ? real : [];
}

/** The fabric after `current` in the loop (the first one when `current` is not in it). */
export function nextAttract<T extends { code: string }>(list: T[], current: string): T | undefined {
  if (!list.length) return undefined;
  const i = list.findIndex((f) => f.code === current);
  return list[(i + 1) % list.length];
}

// Paired showroom screens (Showroom package, job 1): the idle time is a shop
// setting ("vitrinSn"), 60 s unless the shop was given another.
export const SHOWROOM_DEFAULT_IDLE = 60;

export function showroomIdleSeconds(settings: Record<string, unknown> | null | undefined): number {
  const n = Number(settings?.vitrinSn);
  return Number.isFinite(n) && n >= 30 && n <= 600 ? Math.round(n) : SHOWROOM_DEFAULT_IDLE;
}

// Showroom loop, models (task section 4): every few fabrics the sofa makes way
// for the next model the shop brought forward; a shop that brought none
// forward shows all its models in turn. A single model simply stays.
export const ATTRACT_MODEL_EVERY = 3;

export function attractModels<M extends { slug: string; featured?: boolean }>(models: M[]): M[] {
  const featured = models.filter((m) => m.featured);
  return featured.length ? featured : models;
}

/** Whether this step of the loop changes the model (and not only the fabric). */
export function attractChangesModel(step: number, modelCount: number): boolean {
  return modelCount > 1 && step > 0 && step % ATTRACT_MODEL_EVERY === 0;
}

/** The model after `current` in the loop (the first one when `current` is not in it). */
export function nextAttractModel<M extends { slug: string }>(list: M[], current: string): M | undefined {
  if (!list.length) return undefined;
  const i = list.findIndex((m) => m.slug === current);
  return list[(i + 1) % list.length];
}
