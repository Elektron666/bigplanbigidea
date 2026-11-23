// The tags a model carries for the advisor (Showroom package, job 10: "Panelde
// modele tarz ve kullanım etiketleri"). Fixed lists, so the advisor's
// questions and the panel's switches always match. ORMEN or the shop sets
// them; a model without tags is still offered, it only gets no tag points.

export const STYLE_TAGS = ["modern", "klasik", "iskandinav", "endustriyel", "rustik", "minimal"] as const;
export type StyleTag = (typeof STYLE_TAGS)[number];
export const STYLE_LABELS: Record<StyleTag, string> = { modern: "Modern", klasik: "Klasik", iskandinav: "İskandinav", endustriyel: "Endüstriyel", rustik: "Rustik", minimal: "Sade" };

export const USE_TAGS = ["gunluk-yogun", "kucuk-alan", "genis-aile", "misafir"] as const;
export type UseTag = (typeof USE_TAGS)[number];
export const USE_LABELS: Record<UseTag, string> = { "gunluk-yogun": "Günlük yoğun kullanım", "kucuk-alan": "Küçük alana uygun", "genis-aile": "Kalabalık aile", misafir: "Misafir odası" };

export function cleanTags<T extends string>(raw: unknown, allowed: readonly T[]): T[] {
  return [...new Set(Array.isArray(raw) ? raw : [])].filter((t): t is T => (allowed as readonly unknown[]).includes(t));
}
