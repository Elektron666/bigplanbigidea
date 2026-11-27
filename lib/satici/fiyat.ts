// The shop's sale prices (Showroom package, job 7): per model, and per model
// and fabric price group. ORMEN puts each fabric in a price group (A, B, C…);
// the shop enters what it sells each model for, once for all groups and/or
// group by group. Nothing is guessed: a piece whose price was not entered has
// no price, and a quote with such a piece has no total (it says which piece).

import type { ZoneCodes } from "@/lib/three/zones";

export const PRICE_GROUP = /^[A-Z0-9]{1,3}$/;
export const MAX_PRICE = 100_000_000;

/** What a screen gets in seller mode: by model slug, the price for all groups and per group. */
export interface PriceTable {
  [modelSlug: string]: { base?: number; groups?: Record<string, number> };
}

export function cleanGroup(s: unknown): string | null {
  const g = typeof s === "string" ? s.trim().toLocaleUpperCase("tr-TR") : "";
  return PRICE_GROUP.test(g) ? g : null;
}

/** "48.500", "48500,50", "48 500 TL" → 48500 / 48500.5; empty → null; anything else → NaN. */
export function parsePrice(s: string): number | null {
  const t = s.replace(/\s|TL|₺/gi, "");
  if (!t) return null;
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(t)) return NaN;
  const n = Number(t.replace(/\./g, "").replace(",", "."));
  return n >= 0 && n <= MAX_PRICE ? Math.round(n * 100) / 100 : NaN;
}

/** The price of one model in one fabric group: the group's own, else the model's price for all groups, else none. */
export function priceFor(table: PriceTable, modelSlug: string, group: string | null | undefined): number | null {
  const row = table[modelSlug];
  if (!row) return null;
  if (group && row.groups?.[group] !== undefined) return row.groups[group];
  return row.base ?? null;
}

export interface PricedPiece {
  modelSlug: string;
  modelName: string;
  fabricCode: string;
  zones?: ZoneCodes;
}

export interface PieceLine {
  modelName: string;
  /** The group the price came from (the dearest of the piece's fabrics); null when the model's price for all groups was used or no group is set. */
  group: string | null;
  price: number | null;
}

/**
 * The quote's price, piece by piece. A piece in more than one fabric (arms,
 * cushions…) is priced at its dearest fabric's group. The total is given only
 * when every piece has a price.
 */
export function priceQuote(pieces: PricedPiece[], table: PriceTable, groupOf: (fabricCode: string) => string | null | undefined): { lines: PieceLine[]; total: number | null; missing: string[] } {
  const lines = pieces.map((p) => {
    const codes = [p.fabricCode, ...Object.values(p.zones ?? {}).filter((c): c is string => typeof c === "string")];
    let best: { price: number; group: string | null } | null = null;
    let unpriced = false;
    for (const code of new Set(codes)) {
      const group = groupOf(code) ?? null;
      const price = priceFor(table, p.modelSlug, group);
      if (price === null) {
        unpriced = true;
        continue;
      }
      const usedGroup = group && table[p.modelSlug]?.groups?.[group] !== undefined ? group : null;
      if (!best || price > best.price) best = { price, group: usedGroup };
    }
    // one of its fabrics without a price: the piece has none (never the cheaper one's)
    return { modelName: p.modelName, group: unpriced ? null : (best?.group ?? null), price: unpriced ? null : (best?.price ?? null) };
  });
  const missing = lines.filter((l) => l.price === null).map((l) => l.modelName);
  const total = missing.length ? null : Math.round(lines.reduce((s, l) => s + (l.price ?? 0), 0) * 100) / 100;
  return { lines, total, missing };
}

export const tl = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });
export const formatTl = (n: number) => `${tl.format(n)} TL`;
