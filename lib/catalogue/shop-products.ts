// A shared product as one shop shows it (Showroom package, job 0).
// The product itself (3D model, sizes, parts, metres) is defined once at the
// centre and is the same everywhere. A shop changes only how it is shown:
// its own name and code for it, a note, the order, whether it is brought
// forward, whether it is hidden. Pure, so it is tested on its own.

import type { FurnitureModel } from "@/lib/types";

export interface ShopProduct {
  modelId: string;
  /** The shop's own name for the product; missing = the centre's name. */
  displayName?: string;
  /** The shop's own product code. */
  productCode?: string;
  description?: string;
  /** Brought forward: the showroom loop and lists start with these. */
  featured: boolean;
  /** Assigned but not shown. */
  hidden: boolean;
  sortOrder: number;
}

export type ShopProductPatch = Partial<Pick<ShopProduct, "displayName" | "productCode" | "description" | "featured" | "hidden">>;

export const SHOP_PRODUCT_LIMITS = { displayName: 80, productCode: 40, description: 500 } as const;

const clean = (v: unknown) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "");

/**
 * Checks what the panel sent. An empty text clears the override (the centre's
 * value shows again), which is why cleared fields come back as `null`.
 */
export function validateShopProduct(raw: unknown): { ok: true; value: { displayName: string | null; productCode: string | null; description: string | null; featured: boolean; hidden: boolean } } | { ok: false; error: string } {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const displayName = clean(r.displayName);
  const productCode = clean(r.productCode);
  const description = clean(r.description);
  if (displayName.length > SHOP_PRODUCT_LIMITS.displayName) return { ok: false, error: `Görünen ad en çok ${SHOP_PRODUCT_LIMITS.displayName} karakter olabilir.` };
  if (productCode.length > SHOP_PRODUCT_LIMITS.productCode) return { ok: false, error: `Ürün kodu en çok ${SHOP_PRODUCT_LIMITS.productCode} karakter olabilir.` };
  if (description.length > SHOP_PRODUCT_LIMITS.description) return { ok: false, error: `Açıklama en çok ${SHOP_PRODUCT_LIMITS.description} karakter olabilir.` };
  return { ok: true, value: { displayName: displayName || null, productCode: productCode || null, description: description || null, featured: r.featured === true, hidden: r.hidden === true } };
}

/**
 * The shared products a shop shows, as the shop shows them: in the shop's
 * order, without the hidden ones, under the shop's names. Everything that
 * comes from the centre (model, sizes, metres) is passed through untouched.
 */
export function applyShopProducts(shared: FurnitureModel[], rows: ShopProduct[]): FurnitureModel[] {
  const byId = new Map(shared.map((m) => [m.id, m]));
  return [...rows]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .flatMap((row) => {
      const m = byId.get(row.modelId);
      if (!m || row.hidden) return [];
      return [
        {
          ...m,
          name: row.displayName ?? m.name,
          ...(row.displayName && row.displayName !== m.name ? { centralName: m.name } : {}),
          ...(row.productCode ? { productCode: row.productCode } : {}),
          ...(row.description ? { shopNote: row.description } : {}),
          ...(row.featured ? { featured: true } : {}),
        },
      ];
    });
}
