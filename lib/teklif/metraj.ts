// Fabric metres for a quote (Showroom package, job 3, "Metraj ve teklif").
//
// Where the order lands with ORMEN, so the sum must hold to the last 10 cm
// and every step must be visible. One pure function does it; the screen, the
// PDF and the order request all use it.
//
//   1. Each piece is split into its parts (Kasa, Kollar, Oturak, Sırt, and
//      extra parts like Kırlent), each with the firm's own metres for one
//      piece at the fabric width they were measured for (ORMEN: 140 cm).
//   2. Each part takes the fabric chosen for its zone (or the piece's fabric).
//   3. A part's metres get the waste of its case, from the panel:
//        "duz"      plain fabric, cut along the roll
//        "donuk"    the pattern turned sideways (railroaded)
//        "raporlu"  a patterned fabric, whose repeat must be matched
//      A waste figure left empty in the panel adds nothing, and the quote says
//      "fire dahil değildir". No default figure is ever invented.
//   4. Per fabric: the parts are added up and rounded UP to the step (0,5 m).
//   No number is given when it cannot be right: a fabric of another width
//   than the metres were measured for, a fabric whose pattern is not known,
//   a piece split over zones without zone metres. Then the reason is shown
//   and the fabric gets no total (a partial total reads like the answer).

import type { Fabric, FurnitureModel } from "@/lib/types";
import { ZONE_LABELS, type Zone } from "@/lib/three/zones";

export const WASTE_CLASSES = ["duz", "donuk", "raporlu"] as const;
export type WasteClass = (typeof WASTE_CLASSES)[number];
export const WASTE_LABELS: Record<WasteClass, string> = { duz: "düz kumaş", donuk: "desen yönü çevrilmiş", raporlu: "raporlu kumaş" };

export interface WasteSettings {
  /** Percent added for each case; null = not entered by ORMEN yet (nothing is added). */
  duz: number | null;
  donuk: number | null;
  raporlu: number | null;
  /** Totals are rounded up to this step, in metres. */
  roundStep: number;
}

export const DEFAULT_ROUND_STEP = 0.5;
export const EMPTY_WASTE: WasteSettings = { duz: null, donuk: null, raporlu: null, roundStep: DEFAULT_ROUND_STEP };
export const WASTE_LIMITS = { percent: [0, 100] as const, roundStep: [0.05, 2] as const };

/** The zones a firm can give metres for (piping is cut from the leftovers: an extra part if the firm wants it counted). */
const METRE_ZONES = ["govde", "kol", "oturak", "sirt"] as const;

export interface PieceInput {
  model: Pick<FurnitureModel, "name" | "meterage">;
  /** The piece's own fabric. */
  fabric: Fabric;
  /** Fabrics of zones that differ from the piece's (lib/three/zones.ts zoneFabricsOf). */
  zoneFabrics?: Partial<Record<Zone, Fabric>>;
  /** The pattern is cut turned sideways (railroaded). */
  turned?: boolean;
}

export interface QuoteRow {
  piece: string;
  part: string;
  fabric: Fabric;
  /** The firm's metres for the part, before waste; null with `reason` when there is no number. */
  metres: number | null;
  wasteClass: WasteClass | null;
  /** Percent applied (null: not entered, nothing added). */
  wastePercent: number | null;
  /** Metres with waste, unrounded. */
  withWaste: number | null;
  reason?: string;
}

export interface FabricTotal {
  fabric: Fabric;
  rows: QuoteRow[];
  /** Sum before waste; null when a row has no number. */
  metres: number | null;
  withWaste: number | null;
  /** What goes on the quote and the order: rounded up to the step. */
  total: number | null;
  /** At least one row's waste was not entered: the quote says "fire dahil değildir". */
  wasteMissing: boolean;
  /** How the total was reached, one short line per step, for the screen and the PDF. */
  explanation: string[];
  reasons: string[];
}

const nf = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });
export const formatM = (m: number) => `${nf.format(m)} m`;

/** Avoids 0.1 + 0.2 = 0.30000000000000004 in sums shown to the customer. */
const tidy = (x: number) => Math.round(x * 1000) / 1000;

export function roundUp(m: number, step: number): number {
  // to the millimetre first: float noise (9,0000001 m) must not become another half metre
  return tidy(Math.ceil(tidy(m) / step - 1e-9) * step);
}

export function wasteClassOf(fabric: Pick<Fabric, "pattern">, turned: boolean): WasteClass | null {
  if (!fabric.pattern) return null;
  if (fabric.pattern === "desenli") return "raporlu";
  return turned ? "donuk" : "duz";
}

export function validateWaste(raw: { duz?: unknown; donuk?: unknown; raporlu?: unknown; roundStep?: unknown }): { ok: true; value: WasteSettings } | { ok: false; error: string } {
  const pct = (v: unknown): number | null | "hata" => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    return Number.isFinite(n) && n >= WASTE_LIMITS.percent[0] && n <= WASTE_LIMITS.percent[1] ? tidy(n) : "hata";
  };
  const duz = pct(raw.duz);
  const donuk = pct(raw.donuk);
  const raporlu = pct(raw.raporlu);
  if (duz === "hata" || donuk === "hata" || raporlu === "hata") return { ok: false, error: "Fire yüzde olarak 0 ile 100 arasında olmalı (ör. 10)." };
  const stepRaw = raw.roundStep === undefined || raw.roundStep === "" ? DEFAULT_ROUND_STEP : Number(String(raw.roundStep).replace(",", "."));
  const [lo, hi] = WASTE_LIMITS.roundStep;
  if (!Number.isFinite(stepRaw) || stepRaw < lo || stepRaw > hi) return { ok: false, error: `Yuvarlama adımı ${nf.format(lo)}–${hi} m arasında olmalı.` };
  return { ok: true, value: { duz, donuk, raporlu, roundStep: tidy(stepRaw) } };
}

/** The parts of one piece with the firm's metres, or why there are none. */
function partsOf(model: PieceInput["model"]): { parts: { label: string; zone: Zone | null; metres: number }[] } | { reason: string } {
  const m = model.meterage;
  if (!m) return { reason: "Bu model için metraj girilmemiş." };
  const zoned = METRE_ZONES.filter((z) => m.zones?.[z] !== undefined).map((z) => ({ label: ZONE_LABELS[z], zone: z as Zone, metres: m.zones![z]! }));
  const extra = (m.extra ?? []).map((e) => ({ label: e.name, zone: null, metres: e.metres }));
  if (zoned.length) return { parts: [...zoned, ...extra] };
  // only the whole figure: one part, the piece in one fabric
  return { parts: [{ label: "Bir adet", zone: null, metres: m.metres }, ...extra] };
}

export function quoteRows(pieces: PieceInput[], waste: WasteSettings): QuoteRow[] {
  return pieces.flatMap((p): QuoteRow[] => {
    const split = partsOf(p.model);
    const zonesUsed = Object.values(p.zoneFabrics ?? {}).filter((f) => f && f.code !== p.fabric.code);
    if ("reason" in split) return [{ piece: p.model.name, part: "Tamamı", fabric: p.fabric, metres: null, wasteClass: null, wastePercent: null, withWaste: null, reason: split.reason }];
    const wholeOnly = split.parts.some((x) => x.label === "Bir adet");
    if (wholeOnly && zonesUsed.length) {
      return [{ piece: p.model.name, part: "Tamamı", fabric: p.fabric, metres: null, wasteClass: null, wastePercent: null, withWaste: null, reason: "Bölgelere farklı kumaş seçildi; bu model için bölge metrajı girilmemiş." }];
    }
    const refWidth = p.model.meterage!.refWidthCm;
    return split.parts.map((part) => {
      const fabric = (part.zone && p.zoneFabrics?.[part.zone]) || p.fabric;
      const base = { piece: p.model.name, part: part.label, fabric };
      if (!fabric.widthCm) return { ...base, metres: null, wasteClass: null, wastePercent: null, withWaste: null, reason: "Kumaşın eni girilmemiş." };
      if (fabric.widthCm !== refWidth) {
        return { ...base, metres: null, wasteClass: null, wastePercent: null, withWaste: null, reason: `Kumaşın eni ${fabric.widthCm} cm; metraj ${refWidth} cm en için girilmiş, usta hesaplar.` };
      }
      const cls = wasteClassOf(fabric, !!p.turned);
      if (!cls) return { ...base, metres: null, wasteClass: null, wastePercent: null, withWaste: null, reason: "Kumaşın desen bilgisi (düz / desenli) girilmemiş." };
      const pct = waste[cls];
      return { ...base, metres: part.metres, wasteClass: cls, wastePercent: pct, withWaste: tidy(part.metres * (1 + (pct ?? 0) / 100)) };
    });
  });
}

/** Totals per fabric, in the order the fabrics first appear, with the steps written out. */
export function fabricTotals(rows: QuoteRow[], waste: WasteSettings): FabricTotal[] {
  const groups = new Map<string, QuoteRow[]>();
  for (const r of rows) groups.set(r.fabric.code, [...(groups.get(r.fabric.code) ?? []), r]);
  return [...groups.values()].map((list) => {
    const fabric = list[0].fabric;
    const reasons = [...new Set(list.flatMap((r) => (r.reason ? [`${r.piece} · ${r.part}: ${r.reason}`] : [])))];
    const wasteMissing = list.some((r) => r.metres !== null && r.wastePercent === null);
    if (reasons.length) return { fabric, rows: list, metres: null, withWaste: null, total: null, wasteMissing, explanation: [], reasons };
    const metres = tidy(list.reduce((s, r) => s + r.metres!, 0));
    const withWaste = tidy(list.reduce((s, r) => s + r.withWaste!, 0));
    const total = roundUp(withWaste, waste.roundStep);
    const explanation = [
      `${list.map((r) => `${r.part} ${formatM(r.metres!)}`).join(" + ")} = ${formatM(metres)}`,
      ...[...new Set(list.map((r) => r.wasteClass!))].map((cls) => {
        const pct = waste[cls];
        return pct === null ? `Fire (${WASTE_LABELS[cls]}): girilmemiş, eklenmedi` : `Fire (${WASTE_LABELS[cls]}): %${nf.format(pct)}`;
      }),
      `Fireyle ${formatM(withWaste)}, ${formatM(waste.roundStep)} adımla yukarı yuvarlandı: ${formatM(total)}`,
    ];
    return { fabric, rows: list, metres, withWaste, total, wasteMissing, explanation, reasons };
  });
}

/** Everything a quote needs from the metres: the rows, the totals, and whether any waste was left out. */
export function quoteMetres(pieces: PieceInput[], waste: WasteSettings) {
  const rows = quoteRows(pieces, waste);
  const totals = fabricTotals(rows, waste);
  return { rows, totals, wasteMissing: totals.some((t) => t.wasteMissing), complete: totals.every((t) => t.total !== null) };
}
