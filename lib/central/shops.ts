// Shops as the centre sees them (Showroom package, job 0): one row per shop
// for the list screen, and the search, filter and sort that go with it.
// Pure; the database does the same in public.atelier_shops for real data.

export const SHOP_STATUSES = ["pilot", "aktif", "askida", "ayrildi"] as const;
export type ShopStatus = (typeof SHOP_STATUSES)[number];
export const SHOP_STATUS_LABELS: Record<ShopStatus, string> = { pilot: "Pilot", aktif: "Aktif", askida: "Askıda", ayrildi: "Ayrıldı" };

export const SHOP_SORTS = ["ad", "kurulum", "son-gorulme", "vade"] as const;
export type ShopSort = (typeof SHOP_SORTS)[number];
export const SHOP_SORT_LABELS: Record<ShopSort, string> = { ad: "Ada göre", kurulum: "Kurulum tarihi", "son-gorulme": "Son görülme", vade: "Bakım vadesi" };

export const PAGE_SIZE = 50;

export interface ShopRow {
  id: string;
  name: string;
  slug: string;
  status: ShopStatus;
  city: string | null;
  region: string | null;
  isActive: boolean;
  contentVersion: number;
  updateMode: "otomatik" | "onayli";
  package: string | null;
  tags: string[];
  contact: string | null;
  /** YYYY-MM-DD */
  installedOn: string | null;
  devices: number;
  /** ISO time the shop's most recently seen screen checked in. */
  lastSeen: string | null;
  syncErrors: number;
  products: number;
  /** Earliest unpaid maintenance fee, YYYY-MM-DD. Null for ORMEN elemanı (never sent to them). */
  nextDue: string | null;
}

export interface ShopQuery {
  search?: string;
  status?: ShopStatus;
  city?: string;
  tag?: string;
  sort: ShopSort;
  page: number;
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

/** The list's query from the address; anything unknown falls back to the default. */
export function parseShopQuery(sp: Record<string, string | string[] | undefined>): ShopQuery {
  const status = first(sp.durum);
  const sort = first(sp.sira);
  const page = Number(first(sp.sayfa));
  return {
    search: first(sp.ara)?.slice(0, 60),
    status: (SHOP_STATUSES as readonly string[]).includes(status ?? "") ? (status as ShopStatus) : undefined,
    city: first(sp.sehir)?.slice(0, 60),
    tag: first(sp.etiket)?.slice(0, 40),
    sort: (SHOP_SORTS as readonly string[]).includes(sort ?? "") ? (sort as ShopSort) : "ad",
    page: Number.isInteger(page) && page >= 1 && page <= 10_000 ? page : 1,
  };
}

/** The same query back as an address, with one part changed (paging links, filter chips). */
export function shopQueryHref(q: ShopQuery, change: Partial<ShopQuery> = {}): string {
  const n = { ...q, ...change };
  const p = new URLSearchParams();
  if (n.search) p.set("ara", n.search);
  if (n.status) p.set("durum", n.status);
  if (n.city) p.set("sehir", n.city);
  if (n.tag) p.set("etiket", n.tag);
  if (n.sort !== "ad") p.set("sira", n.sort);
  if (n.page > 1) p.set("sayfa", String(n.page));
  const s = p.toString();
  return s ? `/panel/magazalar?${s}` : "/panel/magazalar";
}

const lower = (s: string) => s.toLocaleLowerCase("tr");

/** Search, filter, sort and one page of it; the in-memory twin of public.atelier_shops. */
export function pageOfShops(all: ShopRow[], q: ShopQuery, pageSize = PAGE_SIZE): { total: number; rows: ShopRow[] } {
  const needle = q.search ? lower(q.search) : null;
  const hit = all.filter(
    (s) =>
      (!needle || lower(s.name).includes(needle) || s.slug.includes(needle) || (s.contact ? lower(s.contact).includes(needle) : false)) &&
      (!q.status || s.status === q.status) &&
      (!q.city || s.city === q.city) &&
      (!q.tag || s.tags.includes(q.tag)),
  );
  const byName = (a: ShopRow, b: ShopRow) => a.name.localeCompare(b.name, "tr");
  // a shop without the date goes last, whichever way the dates run
  const dated = (key: "installedOn" | "lastSeen" | "nextDue", dir: 1 | -1) => (a: ShopRow, b: ShopRow) => {
    const [x, y] = [a[key], b[key]];
    if (x === y) return byName(a, b);
    if (!x) return 1;
    if (!y) return -1;
    return x < y ? -dir : dir;
  };
  const sorted = [...hit].sort(q.sort === "kurulum" ? dated("installedOn", -1) : q.sort === "son-gorulme" ? dated("lastSeen", -1) : q.sort === "vade" ? dated("nextDue", 1) : byName);
  return { total: sorted.length, rows: sorted.slice((q.page - 1) * pageSize, q.page * pageSize) };
}

/** A screen nobody has used for this long needs a look ("30 gündür kullanılmayan ekran"). */
export const STALE_DAYS = 30;

/** What on a shop's row asks for attention, in plain words; empty when all is well. */
export function shopAlerts(s: ShopRow, today: string, now = Date.now()): string[] {
  const out: string[] = [];
  if (s.status === "askida") out.push("Askıda");
  if (s.syncErrors > 0) out.push(`${s.syncErrors} ekranda eşitleme hatası`);
  if (s.devices > 0 && s.lastSeen && now - Date.parse(s.lastSeen) > STALE_DAYS * 86_400_000) out.push(`${STALE_DAYS} gündür açılmayan ekran`);
  if (s.nextDue && s.nextDue < today) out.push("Bakım vadesi geçti");
  return out;
}
