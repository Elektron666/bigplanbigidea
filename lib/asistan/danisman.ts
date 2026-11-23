// The sofa advisor (Showroom package, job 10, "Koltuk danışmanı"): a few
// questions answered with big buttons, then three of the shop's own models,
// each with a fabric and a one-sentence reason. Pure and rule based: every
// point a model or fabric gets is a rule written here, and every word of the
// reason comes from what was entered in the panel (sizes, tags, the fabric's
// own figures). Nothing is guessed: a fabric whose wear figure was not entered
// is never called durable, a model without tags is never called "modern".

import type { ColorFamily, Fabric, FurnitureModel } from "@/lib/types";
import { COLOR_FAMILY_LABELS, FABRIC_TYPE_LABELS } from "@/lib/i18n/tr";
import { STYLE_LABELS, STYLE_TAGS, type StyleTag } from "./etiketler";

export type Wall = "2" | "3" | "4" | "genis";
export type Use = "az" | "orta" | "yogun";
export type Tone = "acik" | "koyu" | "sicak" | "soguk" | "renkli" | "farketmez";

export interface Answers {
  /** The length of the wall the sofa goes against. */
  wall: Wall;
  /** Children or pets at home. */
  kids: boolean;
  use: Use;
  style: StyleTag | "farketmez";
  tone: Tone;
}

export const WALL_LABELS: Record<Wall, string> = { "2": "2 m'den kısa", "3": "2–3 m", "4": "3–4 m", genis: "4 m'den uzun" };
/** The longest sofa each wall answer allows, cm (the wall itself; nothing is assumed about the room). */
const WALL_MAX: Record<Wall, number> = { "2": 200, "3": 300, "4": 400, genis: Infinity };
export const USE_ANSWER_LABELS: Record<Use, string> = { az: "Ara sıra", orta: "Her gün", yogun: "Her gün, kalabalık" };
export const TONE_LABELS: Record<Tone, string> = { acik: "Açık tonlar", koyu: "Koyu tonlar", sicak: "Sıcak renkler", soguk: "Soğuk renkler", renkli: "Canlı renkler", farketmez: "Fark etmez" };
const TONES: Record<Exclude<Tone, "farketmez">, ColorFamily[]> = {
  acik: ["beyaz-krem", "bej-kum", "gri"],
  koyu: ["kahve", "antrasit-siyah"],
  sicak: ["kahve", "sari-hardal", "turuncu-kiremit", "kirmizi-bordo", "pembe"],
  soguk: ["gri", "mavi", "yesil", "mor"],
  renkli: ["sari-hardal", "turuncu-kiremit", "kirmizi-bordo", "mavi", "yesil", "pembe", "mor"],
};

/** The styles worth asking about: only those some model of this shop carries. */
export function styleChoices(models: FurnitureModel[]): StyleTag[] {
  const have = new Set(models.flatMap((m) => m.styleTags ?? []));
  return STYLE_TAGS.filter((t) => have.has(t));
}

export interface Suggestion {
  model: FurnitureModel;
  fabric: Fabric;
  reason: string;
  score: number;
}

export type AdvisorResult = { ok: true; suggestions: Suggestion[] } | { ok: false; message: string };

const nf = new Intl.NumberFormat("tr-TR");

/** The model's fabrics, best first for the answers, each with why in words. */
function rankFabrics(fabrics: Fabric[], a: Answers): { fabric: Fabric; why: string[] }[] {
  const tone = a.tone === "farketmez" ? null : TONES[a.tone];
  const wantsWear = a.kids || a.use === "yogun";
  return fabrics
    .map((f) => {
      let s = 0;
      if (tone?.includes(f.colorFamily)) s += 3;
      // only an entered wear figure counts; the higher, the better
      if (wantsWear && f.martindale) s += Math.min(3, f.martindale / 20_000);
      if (!f.isPlaceholder) s += 0.5;
      const why: string[] = [];
      if (tone?.includes(f.colorFamily)) why.push(`${COLOR_FAMILY_LABELS[f.colorFamily].toLocaleLowerCase("tr-TR")} bir ${FABRIC_TYPE_LABELS[f.type].toLocaleLowerCase("tr-TR")}`);
      if (wantsWear && f.martindale) why.push(`aşınma dayanımı ${nf.format(f.martindale)} Martindale`);
      return { fabric: f, why, s };
    })
    .sort((x, y) => y.s - x.s || x.fabric.sortOrder - y.fabric.sortOrder || x.fabric.code.localeCompare(y.fabric.code))
    .map(({ fabric, why }) => ({ fabric, why }));
}

/**
 * Three suggestions (fewer when the shop has fewer that fit), or a plain
 * message saying why there is none. Never an empty screen.
 */
export function advise(models: FurnitureModel[], fabricsFor: (m: FurnitureModel) => Fabric[], a: Answers, max = 3): AdvisorResult {
  const usable = models.filter((m) => m.isActive && m.kurulum === undefined);
  if (!usable.length) return { ok: false, message: "Bu mağazada henüz önerilecek bir model yok." };
  const limit = WALL_MAX[a.wall];
  const fits = usable.filter((m) => m.dimensionsCm.w <= limit);
  if (!fits.length) {
    const narrowest = [...usable].sort((x, y) => x.dimensionsCm.w - y.dimensionsCm.w)[0];
    return { ok: false, message: `Bu duvara sığan model yok. En dar model ${narrowest.name}: ${narrowest.dimensionsCm.w} cm.` };
  }
  const scored = fits.flatMap((m) => {
    const fabrics = rankFabrics(fabricsFor(m), a);
    if (!fabrics.length) return [];
    let score = 0;
    const why: string[] = [];
    if (a.style !== "farketmez" && m.styleTags?.includes(a.style)) {
      score += 4;
      why.push(`${STYLE_LABELS[a.style].toLocaleLowerCase("tr-TR")} çizgide`);
    }
    if ((a.use === "yogun" || a.kids) && m.useTags?.includes("gunluk-yogun")) {
      score += 3;
      why.push("günlük yoğun kullanım için işaretli");
    }
    if (a.wall === "2" && m.useTags?.includes("kucuk-alan")) {
      score += 2;
      why.push("küçük alana uygun");
    }
    if (a.use === "yogun" && m.useTags?.includes("genis-aile")) score += 1;
    // a longer sofa uses more of a long wall: a small nudge, never above the tags
    score += Math.min(1, m.dimensionsCm.w / (Number.isFinite(limit) ? limit : 400));
    if (m.featured) score += 0.5;
    return [{ model: m, fabrics, why, score: score + (fabrics[0].why.length ? 0.5 : 0) }];
  });
  if (!scored.length) return { ok: false, message: "Bu modeller için kumaş bulunamadı. Mağaza görevlisine sorun." };
  scored.sort((x, y) => y.score - x.score || x.model.name.localeCompare(y.model.name, "tr"));
  // each suggestion its own fabric where it can: three times the same fabric is no advice
  const used = new Set<string>();
  const suggestions = scored.slice(0, max).map((x) => {
    const pick = x.fabrics.find((f) => !used.has(f.fabric.code)) ?? x.fabrics[0];
    used.add(pick.fabric.code);
    const reasonParts = [`${x.model.dimensionsCm.w} cm ile duvara sığıyor`, ...x.why];
    const fabricWhy = pick.why.length ? `; ${pick.fabric.code} ${pick.why.join(", ")}` : `; ${pick.fabric.code} bu modelin kumaşlarından`;
    return { model: x.model, fabric: pick.fabric, score: x.score, reason: `${capital(reasonParts.join(", "))}${fabricWhy}.` };
  });
  return { ok: true, suggestions };
}

const capital = (s: string) => s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1);
