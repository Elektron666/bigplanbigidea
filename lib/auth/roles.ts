// Who may do what in the panels, as one table (Showroom package, job 0).
// Pure, so it is tested on its own. The same rules stand in the database
// (supabase/migrations/20261115000000_merkez.sql) for anyone who talks to
// Supabase directly; this table is for the server's own actions, which use
// the service key and therefore pass the row rules.
//
//   admin  ORMEN yöneticisi: everything
//   staff  ORMEN elemanı: setup and content; no price, subscription or delete
//   sahip  shop owner: their own shop only (the shop panel)
// A salesperson has no account: a paired screen plus the shop PIN.

export const ROLES = ["admin", "staff", "sahip"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABELS: Record<Role, string> = { admin: "ORMEN yöneticisi", staff: "ORMEN elemanı", sahip: "Mağaza sahibi" };

export const PERMISSIONS = [
  /** fabrics, models, shop pages, assignments, templates */
  "icerik",
  /** opening a shop, pairing a screen, feature flags, quotas, sending updates */
  "kurulum",
  /** a shop's selling prices */
  "fiyat",
  /** maintenance fee records */
  "abonelik",
  /** removing anything for good (a request, a message, a screen, a shop) */
  "sil",
  /** turning a shop's own product into a shared one */
  "ortak-yap",
  /** opening a shop's panel as that shop, for support */
  "magaza-gibi",
  /** giving or taking panel access */
  "uye",
  /** undoing a change from the change log */
  "geri-al",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const TABLE: Record<Role, readonly Permission[]> = {
  admin: PERMISSIONS,
  staff: ["icerik", "kurulum", "geri-al"],
  // inside their own shop only; which shop is decided elsewhere (firm_members), never by this table
  sahip: ["fiyat"],
};

export function can(role: Role | null | undefined, permission: Permission): boolean {
  return !!role && TABLE[role].includes(permission);
}

/** A profile row's role text as a panel role; anything unknown gets the narrower one. */
export function staffRole(raw: string | null | undefined): "admin" | "staff" {
  return raw === "admin" ? "admin" : "staff";
}

export const DENIED = "Bu işlem için yetkiniz yok.";
