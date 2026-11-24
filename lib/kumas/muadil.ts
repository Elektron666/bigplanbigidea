// Alternatives to a fabric (Showroom package, job 8, "Muadil"). ORMEN's own
// list comes first, labelled "Muadil". Only when that list is empty does the
// screen offer fabrics of the same type and colour family, nearest colour
// first, labelled "Benzer": a look-alike by rule, never presented as ORMEN's choice. Fabrics
// known to be out of stock are not offered as a way out of being out of stock.

import type { Fabric } from "@/lib/types";
import type { StockMap } from "./stok";

export interface Alternative {
  fabric: Fabric;
  kind: "muadil" | "benzer";
}

function rgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** CIE Lab of an sRGB colour (D65). */
function lab(hex: string): [number, number, number] | null {
  const c = rgb(hex);
  if (!c) return null;
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

/** How far apart two colours look (ΔE 1976); Infinity when either is unreadable. */
export function colourDistance(a: string, b: string): number {
  const p = lab(a);
  const q = lab(b);
  if (!p || !q) return Infinity;
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/**
 * Up to `max` alternatives to `fabric` among `fabrics` (the ones the screen
 * may show). `listed` is ORMEN's muadil list (codes, in order).
 */
export function alternativesFor(fabric: Fabric, fabrics: Fabric[], listed: string[] | undefined, stock: StockMap | undefined, max = 3): Alternative[] {
  const inStock = (f: Fabric) => stock?.[f.code]?.status !== "yok";
  const byCode = new Map(fabrics.map((f) => [f.code, f]));
  if (listed?.length) {
    // ORMEN's list as it is, only what this screen has and is not out of stock itself
    return listed
      .map((c) => byCode.get(c))
      .filter((f): f is Fabric => !!f && f.code !== fabric.code && inStock(f))
      .slice(0, max)
      .map((f) => ({ fabric: f, kind: "muadil" as const }));
  }
  return fabrics
    // same type and same colour family, the closest colour first
    .filter((f) => f.code !== fabric.code && f.type === fabric.type && f.colorFamily === fabric.colorFamily && !f.isPlaceholder && inStock(f))
    .map((f) => ({ f, d: colourDistance(fabric.texture.avgColor, f.texture.avgColor) }))
    .filter((x) => Number.isFinite(x.d))
    .sort((a, b) => a.d - b.d || a.f.code.localeCompare(b.f.code))
    .slice(0, max)
    .map(({ f }) => ({ fabric: f, kind: "benzer" as const }));
}
