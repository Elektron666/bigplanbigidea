// The central product catalogue as a list (Showroom package, job 0): search,
// filter, one page of it, and the rule for giving products to shops.
// Pure; the database twin is public.atelier_products.

export const PRODUCT_CATEGORIES = ["koltuk-takimi", "kanepe", "kose", "berjer", "puf", "diger"] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = { "koltuk-takimi": "Koltuk takımı", kanepe: "Kanepe", kose: "Köşe", berjer: "Berjer", puf: "Puf", diger: "Diğer" };

export const PRODUCT_PAGE_SIZE = 50;

export interface ProductRow {
  id: string;
  name: string;
  slug: string;
  /** null = "ortak" (can be given to many shops); set = that shop's own design. */
  firmId: string | null;
  /** The owning shop's name, for a shop's own product. */
  ownerName: string | null;
  manufacturer: string | null;
  category: ProductCategory | null;
  isActive: boolean;
  /** How many shops were given this product. */
  shops: number;
  widthCm: number;
  depthCm: number;
  heightCm: number;
}

export interface ProductQuery {
  search?: string;
  owner?: "ortak" | "ozel";
  category?: ProductCategory;
  manufacturer?: string;
  /** Only products in this shop (given to it, or its own). */
  shop?: string;
  /** Only shared products no shop has. */
  unassigned: boolean;
  page: number;
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export function parseProductQuery(sp: Record<string, string | string[] | undefined>): ProductQuery {
  const owner = first(sp.sahip);
  const category = first(sp.kategori);
  const shop = first(sp.magaza);
  const page = Number(first(sp.sayfa));
  return {
    search: first(sp.ara)?.slice(0, 60),
    owner: owner === "ortak" || owner === "ozel" ? owner : undefined,
    category: (PRODUCT_CATEGORIES as readonly string[]).includes(category ?? "") ? (category as ProductCategory) : undefined,
    manufacturer: first(sp.uretici)?.slice(0, 80),
    shop: shop && /^[0-9a-zA-Z-]{1,60}$/.test(shop) ? shop : undefined,
    unassigned: first(sp.atanmamis) === "1",
    page: Number.isInteger(page) && page >= 1 && page <= 10_000 ? page : 1,
  };
}

export function productQueryHref(q: ProductQuery, change: Partial<ProductQuery> = {}): string {
  const n = { ...q, ...change };
  const p = new URLSearchParams();
  if (n.search) p.set("ara", n.search);
  if (n.owner) p.set("sahip", n.owner);
  if (n.category) p.set("kategori", n.category);
  if (n.manufacturer) p.set("uretici", n.manufacturer);
  if (n.shop) p.set("magaza", n.shop);
  if (n.unassigned) p.set("atanmamis", "1");
  if (n.page > 1) p.set("sayfa", String(n.page));
  const s = p.toString();
  return s ? `/panel/katalog?${s}` : "/panel/katalog";
}

const lower = (s: string) => s.toLocaleLowerCase("tr");

/** `inShop`: the ids of the products the filtered shop has (given or own); only read when q.shop is set. */
export function pageOfProducts(all: ProductRow[], q: ProductQuery, inShop: ReadonlySet<string> = new Set(), pageSize = PRODUCT_PAGE_SIZE): { total: number; rows: ProductRow[] } {
  const needle = q.search ? lower(q.search) : null;
  const hit = all
    .filter(
      (p) =>
        (!needle || lower(p.name).includes(needle) || p.slug.includes(needle) || (p.manufacturer ? lower(p.manufacturer).includes(needle) : false)) &&
        (!q.owner || (q.owner === "ortak") === (p.firmId === null)) &&
        (!q.category || p.category === q.category) &&
        (!q.manufacturer || p.manufacturer === q.manufacturer) &&
        (!q.shop || inShop.has(p.id)) &&
        (!q.unassigned || (p.firmId === null && p.shops === 0)),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  return { total: hit.length, rows: hit.slice((q.page - 1) * pageSize, q.page * pageSize) };
}

export const BULK_LIMITS = { products: 500, shops: 200 } as const;

/**
 * Checks a bulk assignment before anything is written. A shop's own product
 * can never be given to another shop: one such product in the selection
 * refuses the whole action (nothing half-done), and the caller logs the attempt.
 */
export function checkBulkAssign(
  productIds: readonly string[],
  shopIds: readonly string[],
  products: ReadonlyMap<string, { name: string; firmId: string | null }>,
  shops: ReadonlySet<string>,
): { ok: true; productIds: string[]; shopIds: string[] } | { ok: false; error: string; private?: string[] } {
  const p = [...new Set(productIds)];
  const s = [...new Set(shopIds)];
  if (!p.length) return { ok: false, error: "En az bir ürün seçin." };
  if (!s.length) return { ok: false, error: "En az bir mağaza seçin." };
  if (p.length > BULK_LIMITS.products || s.length > BULK_LIMITS.shops) return { ok: false, error: `Tek işlemde en çok ${BULK_LIMITS.products} ürün ve ${BULK_LIMITS.shops} mağaza seçilebilir.` };
  if (p.some((id) => !products.has(id))) return { ok: false, error: "Seçilen ürünlerden biri bulunamadı. Sayfayı yenileyin." };
  if (s.some((id) => !shops.has(id))) return { ok: false, error: "Seçilen mağazalardan biri bulunamadı. Sayfayı yenileyin." };
  const own = p.filter((id) => products.get(id)!.firmId !== null);
  if (own.length) {
    const names = own.map((id) => products.get(id)!.name);
    return { ok: false, error: `Mağazaya özel ürün başka mağazaya atanamaz: ${names.slice(0, 3).join(", ")}${names.length > 3 ? ` ve ${names.length - 3} ürün daha` : ""}.`, private: own };
  }
  return { ok: true, productIds: p, shopIds: s };
}
