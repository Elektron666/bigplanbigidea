// The assistant's free questions (Showroom package; Fatih Bey: "soru
// sorabileceği, fikir alacağı, metraj hesaplatacağı"). Pure, and free: no
// language model. It knows a set of Turkish question shapes (how many metres,
// is it durable, what is the difference, which fabric, in which colour…), finds
// the fabric codes and model names in the sentence, and answers only from
// what the panel holds: an unentered figure is said to be unentered, never
// guessed. Metres come from the same function as the quote. A question it does
// not understand gets the questions it can answer.
//
// A language model can be put in front of this later (with ORMEN's approval):
// it would call these same answers as tools, so the facts stay the panel's.

import type { ColorFamily, Fabric, FurnitureModel } from "@/lib/types";
import { COLOR_FAMILY_LABELS, FABRIC_TYPE_LABELS, foldTr } from "@/lib/i18n/tr";
import { quoteMetres, type WasteSettings } from "@/lib/teklif/metraj";
import { propertyLabels, PROPERTY_LABELS, type PropertyKey } from "@/lib/kumas/ozellik";

export interface Context {
  models: FurnitureModel[];
  fabrics: Fabric[];
  /** The piece on the screen and its fabric: "bu kumaş", "bu koltuk". */
  currentModel: FurnitureModel | null;
  currentFabric: Fabric | null;
  /** ORMEN's waste figures (the shop page's); without them the metres are given without waste. */
  waste: WasteSettings | null;
  /** Which fabrics a model may wear (the page's own rule). */
  fabricsFor: (m: FurnitureModel) => Fabric[];
}

export type Intent = "metraj" | "karsilastir" | "ozellik" | "renk" | "oneri" | "bilinmiyor";

export interface Answer {
  intent: Intent;
  lines: string[];
  fabrics?: Fabric[];
  models?: FurnitureModel[];
  /** Start the advisor's questions. */
  startAdvisor?: boolean;
}

export const EXAMPLES = ["Bu koltuğa kaç metre kumaş gider?", "Bu kumaş dayanıklı mı?", "MISSO-05 ile LUMA-02 arasındaki fark ne?", "Gri kumaşları göster", "Bana koltuk öner"];

const nf = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });
const m = (n: number) => `${nf.format(n)} m`;

const COLOR_WORDS: [RegExp, ColorFamily][] = [
  [/\b(beyaz|krem|ekru)/, "beyaz-krem"],
  [/\b(bej|kum)\b/, "bej-kum"],
  [/\b(kahve|kahverengi|tarcin)/, "kahve"],
  [/\bgri\b/, "gri"],
  [/\b(antrasit|siyah)/, "antrasit-siyah"],
  [/\b(yesil|haki|zumrut)/, "yesil"],
  [/\b(mavi|lacivert|petrol)/, "mavi"],
  [/\b(kirmizi|bordo)/, "kirmizi-bordo"],
  [/\b(sari|hardal)/, "sari-hardal"],
  [/\b(turuncu|kiremit)/, "turuncu-kiremit"],
  [/\b(pembe|pudra)/, "pembe"],
  [/\b(mor|lila)/, "mor"],
];

/** Fabric codes in a sentence: "MISSO-05", "misso 5", "Misso05" all find MISSO-05. */
export function findFabrics(text: string, fabrics: Fabric[]): Fabric[] {
  const t = foldTr(text);
  const byKey = new Map(fabrics.map((f) => [foldTr(f.code).replace(/[^a-z0-9]/g, ""), f]));
  const found: Fabric[] = [];
  for (const hit of t.matchAll(/([a-z]{2,})[\s-]*0*(\d{1,3})\b/g)) {
    for (const width of [2, 3, 1]) {
      const f = byKey.get(`${hit[1]}${hit[2].padStart(width, "0")}`);
      if (f) {
        if (!found.includes(f)) found.push(f);
        break;
      }
    }
  }
  return found;
}

/** Model names in a sentence (the longest name first, so "Köşe Takımı" wins over "Köşe"). */
export function findModels(text: string, models: FurnitureModel[]): FurnitureModel[] {
  const t = foldTr(text);
  const found: FurnitureModel[] = [];
  for (const model of [...models].sort((a, b) => b.name.length - a.name.length)) {
    const name = foldTr(model.name);
    if (name.length >= 3 && t.includes(name) && !found.some((x) => foldTr(x.name).includes(name))) found.push(model);
  }
  return found;
}

/** What the panel holds about a fabric, line by line; nothing that was not entered. */
export function fabricFacts(f: Fabric): string[] {
  const out = [`Tip: ${FABRIC_TYPE_LABELS[f.type]}`, `Renk: ${f.colorName} (${COLOR_FAMILY_LABELS[f.colorFamily]})`];
  if (f.widthCm) out.push(`En: ${f.widthCm} cm`);
  if (f.composition) out.push(`Bileşim: ${f.composition}`);
  if (f.martindale) out.push(`Aşınma dayanımı: ${new Intl.NumberFormat("tr-TR").format(f.martindale)} Martindale`);
  if (f.weightGsm) out.push(`Ağırlık: ${f.weightGsm} g/m²`);
  if (f.fireRating) out.push(`Yanmazlık: ${f.fireRating}`);
  const marks = propertyLabels(f);
  if (marks.length) out.push(`Özellikler: ${marks.join(", ")}`);
  if (f.pattern === "desenli") out.push(f.patternRepeatCm ? `Desen tekrarı: ${f.patternRepeatCm.w} × ${f.patternRepeatCm.h} cm` : "Desenli (tekrar ölçüsü girilmemiş)");
  if (f.pattern === "duz") out.push("Düz (desensiz)");
  return out;
}

const NOT_ENTERED = (f: Fabric, what: string) => `${f.code} için ${what} panelde girilmemiş. Kesin bilgi için mağaza görevlisine sorun ya da numune isteyin.`;

type Property = { re: RegExp; answer: (f: Fabric) => string };

/** A property ORMEN marks yes or no; unmarked is said to be unmarked. */
function mark(f: Fabric, k: PropertyKey): string {
  const label = PROPERTY_LABELS[k].toLocaleLowerCase("tr-TR");
  if (f[k] === true) return `${f.code} panelde “${label}” olarak işaretli.`;
  if (f[k] === false) return `${f.code} panelde “${label}” olarak işaretlenmemiş (hayır girilmiş).`;
  return NOT_ENTERED(f, `“${label}” bilgisi`);
}
const PROPERTIES: Property[] = [
  // the marked properties first: "evcil hayvana dayanıklı mı" is about the mark, not only the wear figure
  { re: /kedi|kopek|tirnak|evcil|hayvan/, answer: (f) => [mark(f, "petResistant"), ...(f.martindale ? [`Aşınma dayanımı ${new Intl.NumberFormat("tr-TR").format(f.martindale)} Martindale.`] : [])].join(" ") },
  { re: /leke/, answer: (f) => mark(f, "stainResistant") },
  { re: /yika|temizl|bakim/, answer: (f) => mark(f, "easyClean") },
  {
    // "aşınma" only at a word start: "kumaşın" folds to "kumasin", which also holds "asin"
    re: /dayan|saglam|\basin|martindale|yipran|cocuk/,
    answer: (f) =>
      f.martindale
        ? `${f.code}: aşınma dayanımı ${new Intl.NumberFormat("tr-TR").format(f.martindale)} Martindale (panelde girilen değer). Evcil hayvan ve çocuk için kesin karar numuneyle verilir.`
        : NOT_ENTERED(f, "aşınma dayanımı"),
  },
  { re: /icerik|bilesim|pamuk|polyester|yun\b|viskon/, answer: (f) => (f.composition ? `${f.code} bileşimi: ${f.composition}.` : NOT_ENTERED(f, "bileşim")) },
  { re: /yanmaz|alev|yangin/, answer: (f) => (f.fireRating ? `${f.code} yanmazlık: ${f.fireRating}.` : NOT_ENTERED(f, "yanmazlık bilgisi")) },
  { re: /agirlik|gram|gsm/, answer: (f) => (f.weightGsm ? `${f.code} ağırlığı ${f.weightGsm} g/m².` : NOT_ENTERED(f, "ağırlık")) },
  { re: /\ben\b|eni\b|genislig/, answer: (f) => (f.widthCm ? `${f.code} kumaşın eni ${f.widthCm} cm.` : NOT_ENTERED(f, "kumaş eni")) },
  { re: /desen|rapor|tekrar/, answer: (f) => (f.pattern === "desenli" ? (f.patternRepeatCm ? `${f.code} desenli; desen tekrarı ${f.patternRepeatCm.w} × ${f.patternRepeatCm.h} cm.` : `${f.code} desenli; tekrar ölçüsü girilmemiş.`) : f.pattern === "duz" ? `${f.code} düz, desensiz bir kumaş.` : NOT_ENTERED(f, "desen bilgisi")) },
];

function metres(model: FurnitureModel, fabric: Fabric, waste: WasteSettings | null): string[] {
  const noWaste: WasteSettings = { duz: null, donuk: null, raporlu: null, roundStep: 0.5 };
  const r = quoteMetres([{ model, fabric }], waste ?? noWaste);
  const t = r.totals[0];
  if (!t || t.total === null) return [`${model.name} için ${fabric.code} metrajı hesaplanamadı: ${(t?.reasons ?? ["metraj girilmemiş"]).join(" ")} Kesin metrajı usta hesaplar.`];
  return [`${model.name} için ${fabric.code}: ${m(t.total)}.`, ...t.explanation, ...(t.wasteMissing ? ["Fire dahil değildir."] : [])];
}

export function answer(question: string, ctx: Context): Answer {
  const t = foldTr(question);
  const fabrics = findFabrics(question, ctx.fabrics);
  const models = findModels(question, ctx.models);
  const fabric = fabrics[0] ?? (/(bu|su|secili|bunun|bunu)\b/.test(t) || !fabrics.length ? ctx.currentFabric : null);
  const model = models[0] ?? ctx.currentModel;

  if (/kac metre|metraj|ne kadar kumas|kac m\b|kumas gider|kumas lazim/.test(t)) {
    if (!model || !fabric) return { intent: "metraj", lines: ["Hangi koltuk ve hangi kumaş için? Örneğin: “Köşe Takımı için MISSO-05 kaç metre?”"] };
    return { intent: "metraj", lines: metres(model, fabric, ctx.waste), fabrics: [fabric], models: [model] };
  }

  if (fabrics.length >= 2 && /fark|karsilastir|hangisi|mi yoksa|ile/.test(t)) {
    const [a, b] = fabrics;
    return { intent: "karsilastir", lines: [`${a.code}: ${fabricFacts(a).join(" · ")}`, `${b.code}: ${fabricFacts(b).join(" · ")}`, "Yalnızca panelde girilen bilgiler yazıldı."], fabrics: [a, b] };
  }

  const prop = PROPERTIES.find((p) => p.re.test(t));
  if (prop && fabric && !/oner|tavsiye|hangi (koltuk|kumas)/.test(t)) return { intent: "ozellik", lines: [prop.answer(fabric)], fabrics: [fabric] };
  if (fabric && fabrics.length === 1 && /anlat|bilgi|nasil bir|ozellik|nedir/.test(t)) return { intent: "ozellik", lines: [`${fabric.code} · ${fabric.series} ${fabric.colorName}`, ...fabricFacts(fabric)], fabrics: [fabric] };

  const colour = COLOR_WORDS.find(([re]) => re.test(t))?.[1];
  if (colour && !/oner|tavsiye/.test(t)) {
    const list = ctx.fabrics.filter((f) => f.colorFamily === colour);
    return list.length
      ? { intent: "renk", lines: [`${COLOR_FAMILY_LABELS[colour]} tonlarında ${list.length} kumaş var.`], fabrics: list.slice(0, 8) }
      : { intent: "renk", lines: [`Bu mağazada ${COLOR_FAMILY_LABELS[colour].toLocaleLowerCase("tr-TR")} tonlarında kumaş yok.`] };
  }

  if (/oner|tavsiye|hangi koltuk|hangi kumas|ne yakisir|ne almali|karar veremedim|yardim/.test(t)) return { intent: "oneri", lines: ["Birkaç soruyla size uygun koltuğu ve kumaşı bulalım."], startAdvisor: true };

  if (prop && !fabric) return { intent: "ozellik", lines: ["Hangi kumaş için? Kodunu yazın (örneğin MISSO-05) ya da ekrandaki kumaşı sorun: “Bu kumaş …”"] };

  return { intent: "bilinmiyor", lines: ["Bunu anlayamadım. Şunları sorabilirsiniz:", ...EXAMPLES.map((e) => `• ${e}`)] };
}
