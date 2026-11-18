// Per-shop features (task section 3: "Her yeni özellik firma bazında açılıp
// kapanabilmeli"). Stored in firms.features as { "teklif": false, … }; a key
// that is missing takes the feature's default. Pure.

export const FEATURES = ["teklif", "siparis", "kose", "kartela", "giydirme"] as const;
export type Feature = (typeof FEATURES)[number];

export const FEATURE_LABELS: Record<Feature, { name: string; hint: string }> = {
  teklif: { name: "Metraj ve teklif", hint: "Teklif ekranı, PDF ve telefona teklif." },
  siparis: { name: "ORMEN'e sipariş talebi", hint: "Showroom ekranındaki teklif, ORMEN'e kumaş siparişi olarak gönderilebilir." },
  kose: { name: "Köşe kurucu", hint: "Modüllerden ölçüye göre köşe takımı." },
  kartela: { name: "Kartela okut", hint: "Showroom ekranının kamerasıyla kartela etiketini okutma." },
  giydirme: { name: "Fotoğraftan dene", hint: "Yapay zekâ ile fotoğraftaki koltuğa kumaş. Bir sağlayıcı ve kota gerekir." },
};

/** On unless the panel switched it off; the paid one (giydirme) is off unless switched on. */
const DEFAULTS: Record<Feature, boolean> = { teklif: true, siparis: true, kose: true, kartela: true, giydirme: false };

export function featureOn(features: Record<string, unknown> | null | undefined, f: Feature): boolean {
  const v = features?.[f];
  return typeof v === "boolean" ? v : DEFAULTS[f];
}

/** Only known features, only true or false: what the panel may store. */
export function cleanFeatures(raw: unknown): Partial<Record<Feature, boolean>> {
  if (!raw || typeof raw !== "object") return {};
  const out: Partial<Record<Feature, boolean>> = {};
  for (const f of FEATURES) {
    const v = (raw as Record<string, unknown>)[f];
    if (typeof v === "boolean") out[f] = v;
  }
  return out;
}
