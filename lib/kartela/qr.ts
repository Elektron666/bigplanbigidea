// "Sihirli kartela" (Showroom package, job 2): the QR on a swatch card.
//
// The label carries a short address on our own site:
//   /k/SIENA-04              any phone: ORMEN's page with that fabric on the sofa
//   /k/firma-adi/SIENA-04    any phone: that shop's page with the fabric on
// A showroom screen that reads it takes only the fabric code and dresses its
// own shop's sofa; the shop part is for phones. Older labels (the hanger
// labels' /f/firma?k=CODE) and a bare code are read the same way. Pure.

import { codeUpper } from "@/lib/i18n/tr";

const CODE = /^[A-ZÇĞİÖŞÜ0-9-]{2,24}$/;
const SLUG = /^[a-z0-9-]{2,60}$/;

export function kartelaPath(code: string, firmSlug?: string | null): string {
  const c = encodeURIComponent(codeUpper(code));
  return firmSlug ? `/k/${firmSlug}/${c}` : `/k/${c}`;
}

/** The parts of a /k/… path, or null when it is not one of ours. */
export function parseKartelaPath(segments: string[]): { code: string; firmSlug: string | null } | null {
  const decoded = segments.map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return "";
    }
  });
  if (decoded.length === 1) {
    const code = codeUpper(decoded[0]);
    return CODE.test(code) ? { code, firmSlug: null } : null;
  }
  if (decoded.length === 2 && SLUG.test(decoded[0])) {
    const code = codeUpper(decoded[1]);
    return CODE.test(code) ? { code, firmSlug: decoded[0] } : null;
  }
  return null;
}

/**
 * The fabric code a scanned QR names, or null. Accepts our /k/ addresses on
 * any host (a label printed before the domain changed still works), the
 * older ?k= links, and a bare code.
 */
export function codeFromScan(text: string): string | null {
  const raw = text.trim();
  if (!raw || raw.length > 500) return null;
  let url: URL | null = null;
  try {
    url = new URL(raw, "https://kartela.invalid");
  } catch {
    url = null;
  }
  if (url) {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "k") return parseKartelaPath(parts.slice(1))?.code ?? null;
    const k = url.searchParams.get("k");
    if (k) {
      const code = codeUpper(k);
      return CODE.test(code) ? code : null;
    }
  }
  const bare = codeUpper(raw);
  return CODE.test(bare) ? bare : null;
}
