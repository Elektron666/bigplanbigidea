// Fabric brands and the web embed (Showroom package, job 16). Pure.

import type { Fabric } from "@/lib/types";

export const DEFAULT_BRAND = "ORMEN";

/** The fabric's brand; fabrics from before brands are ORMEN's. */
export const brandOf = (f: Pick<Fabric, "brand">) => f.brand?.trim() || DEFAULT_BRAND;

/** Distinct brands of a fabric list, ORMEN first. */
export function brandsOf(fabrics: Pick<Fabric, "brand">[]): string[] {
  const all = [...new Set(fabrics.map(brandOf))];
  return [...all.filter((b) => b === DEFAULT_BRAND), ...all.filter((b) => b !== DEFAULT_BRAND).sort((a, b) => a.localeCompare(b, "tr"))];
}

/**
 * The fabrics of the brands a shop shows. null or undefined = every brand.
 * Strict: a brand switched off is never shown, even when nothing is left.
 */
export function filterByBrands<F extends Pick<Fabric, "brand">>(fabrics: F[], brands: string[] | null | undefined): F[] {
  if (!brands) return fabrics;
  const on = new Set(brands);
  return fabrics.filter((f) => on.has(brandOf(f)));
}

export function cleanBrand(s: unknown): string | null {
  const t = typeof s === "string" ? s.trim().replace(/\s+/g, " ") : "";
  return t.length >= 1 && t.length <= 40 ? t : null;
}

const HOST = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/** "https://www.ornek.com/koltuk, ornek.com.tr" → ["www.ornek.com", "ornek.com.tr"]; anything not a host name is an error. */
export function cleanDomains(raw: string): { ok: true; value: string[] } | { ok: false; error: string } {
  const out: string[] = [];
  for (const part of raw.split(/[\s,;]+/).filter(Boolean)) {
    let host = part.toLowerCase();
    try {
      if (/^https?:\/\//.test(host)) host = new URL(host).hostname;
    } catch {
      return { ok: false, error: `${part}: alan adı okunamadı.` };
    }
    host = host.replace(/\/.*$/, "");
    if (!HOST.test(host)) return { ok: false, error: `${part}: alan adı olmalı (ör. www.magazaniz.com).` };
    if (!out.includes(host)) out.push(host);
  }
  if (out.length > 10) return { ok: false, error: "En çok 10 alan adı." };
  return { ok: true, value: out };
}

/**
 * The CSP frame-ancestors of a shop's embed: this site and the shop's allowed
 * sites; none allowed = only this site. Host names without a scheme take this
 * site's own (https on the live site).
 */
export function frameAncestors(domains: string[]): string {
  return ["'self'", ...domains].join(" ");
}

/** The code the shop puts on its site. */
export function embedCode(site: string, slug: string): string {
  return `<iframe src="${site}/gomme/${slug}" title="Kumaşınızı koltuğun üstünde görün" style="width:100%;height:80vh;min-height:520px;border:0" allow="xr-spatial-tracking; fullscreen" loading="lazy"></iframe>`;
}
