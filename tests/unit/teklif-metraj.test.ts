import { describe, expect, it } from "vitest";
import { EMPTY_WASTE, quoteMetres, roundUp, validateWaste, wasteClassOf, type WasteSettings } from "@/lib/teklif/metraj";
import type { Fabric, FurnitureModel } from "@/lib/types";

// Job 3: the quote's metres. Every expected figure below is worked out by
// hand in the comment next to it, so a reader can check the sum without code.

const fabric = (code: string, over: Partial<Fabric> = {}): Fabric =>
  ({
    id: code,
    code,
    series: code.split("-")[0],
    colorName: "Renk",
    colorFamily: "bej-kum",
    type: "dokuma",
    widthCm: 140,
    pattern: "duz",
    cutDirection: "cift",
    isActive: true,
    isPlaceholder: false,
    sortOrder: 0,
    texture: { maps: { albedo: { "1k": "", "2k": "" } }, repeatCm: { w: 10, h: 10 }, thumbUrl: "", avgColor: "#cccccc" },
    ...over,
  }) as Fabric;

// The firm's metres for one three-seater at 140 cm: Kasa 6, Kollar 2,5, Oturak 2, Sırt 1,5 (= 12 m), plus 2 Kırlent at 0,6 m.
const UCLU: Pick<FurnitureModel, "name" | "meterage"> = {
  name: "Lara Üçlü",
  meterage: { metres: 12, refWidthCm: 140, zones: { govde: 6, kol: 2.5, oturak: 2, sirt: 1.5 }, extra: [{ name: "Kırlent", metres: 0.6 }] },
};
const WASTE: WasteSettings = { duz: 10, donuk: 15, raporlu: 25, roundStep: 0.5 };

describe("quote metres", () => {
  it("adds up a three-fabric combination exactly as worked out by hand", () => {
    const A = fabric("SIENA-04"); // plain
    const B = fabric("JAKAR-02", { pattern: "desenli", patternRepeatCm: { w: 32, h: 32 } }); // patterned: "raporlu"
    const C = fabric("MISSO-05"); // plain
    // the piece in A; arms in B; seat cushions in C; back stays A; the cushions (Kırlent) take the piece's fabric, A
    const { totals, complete, wasteMissing } = quoteMetres([{ model: UCLU, fabric: A, zoneFabrics: { kol: B, oturak: C } }], WASTE);
    expect(complete).toBe(true);
    expect(wasteMissing).toBe(false);
    const byCode = Object.fromEntries(totals.map((t) => [t.fabric.code, t]));

    // A: Kasa 6 + Sırt 1,5 + Kırlent 0,6 = 8,1 m; × 1,10 (düz %10) = 8,91 m; up to 0,5 m → 9 m
    expect(byCode["SIENA-04"]).toMatchObject({ metres: 8.1, withWaste: 8.91, total: 9 });
    // B: Kollar 2,5 m; × 1,25 (raporlu %25) = 3,125 m; up to 0,5 m → 3,5 m
    expect(byCode["JAKAR-02"]).toMatchObject({ metres: 2.5, withWaste: 3.125, total: 3.5 });
    // C: Oturak 2 m; × 1,10 = 2,2 m; up to 0,5 m → 2,5 m
    expect(byCode["MISSO-05"]).toMatchObject({ metres: 2, withWaste: 2.2, total: 2.5 });
    // the order of fabrics is the order they first appear on the piece
    expect(totals.map((t) => t.fabric.code)).toEqual(["SIENA-04", "JAKAR-02", "MISSO-05"]);
    // and the steps are written out for the customer
    expect(byCode["SIENA-04"].explanation).toEqual([
      "Kasa 6 m + Sırt 1,5 m + Kırlent 0,6 m = 8,1 m",
      "Fire (düz kumaş): %10",
      "Fireyle 8,91 m, 0,5 m adımla yukarı yuvarlandı: 9 m",
    ]);
  });

  it("adds no waste when the panel left it empty, and says so", () => {
    const A = fabric("SIENA-04");
    const r = quoteMetres([{ model: UCLU, fabric: A }], EMPTY_WASTE);
    // 6 + 2,5 + 2 + 1,5 + 0,6 = 12,6 m; no waste; up to 0,5 m → 13 m
    expect(r.totals[0]).toMatchObject({ metres: 12.6, withWaste: 12.6, total: 13, wasteMissing: true });
    expect(r.wasteMissing).toBe(true);
    expect(r.totals[0].explanation).toContain("Fire (düz kumaş): girilmemiş, eklenmedi");
    // entering it changes the sum: 12,6 × 1,10 = 13,86 → 14 m
    expect(quoteMetres([{ model: UCLU, fabric: A }], WASTE).totals[0]).toMatchObject({ withWaste: 13.86, total: 14, wasteMissing: false });
  });

  it("uses the turned waste for a pattern cut sideways", () => {
    const A = fabric("SIENA-04");
    // 12,6 × 1,15 (dönük %15) = 14,49 → 14,5 m
    expect(quoteMetres([{ model: UCLU, fabric: A, turned: true }], WASTE).totals[0]).toMatchObject({ withWaste: 14.49, total: 14.5 });
  });

  it("adds two pieces in the same fabric before rounding, not after", () => {
    const A = fabric("SIENA-04");
    const BERJER = { name: "Berjer", meterage: { metres: 3.2, refWidthCm: 140 } };
    // Üçlü 12,6 + Berjer 3,2 = 15,8 m; × 1,10 = 17,38 → 17,5 m (rounding each piece first would give 14 + 4 = 18 m)
    expect(quoteMetres([{ model: UCLU, fabric: A }, { model: BERJER, fabric: A }], WASTE).totals[0]).toMatchObject({ metres: 15.8, withWaste: 17.38, total: 17.5 });
  });

  it("gives no number, only the reason, when it cannot be right", () => {
    const wide = fabric("GENIS-01", { widthCm: 280 });
    const r1 = quoteMetres([{ model: UCLU, fabric: wide }], WASTE);
    expect(r1.complete).toBe(false);
    expect(r1.totals[0].total).toBeNull();
    expect(r1.totals[0].reasons[0]).toContain("Kumaşın eni 280 cm; metraj 140 cm en için girilmiş, usta hesaplar.");

    const unknownPattern = fabric("YENI-01", { pattern: undefined });
    expect(quoteMetres([{ model: UCLU, fabric: unknownPattern }], WASTE).totals[0].reasons[0]).toContain("desen bilgisi");

    const noMetres = { name: "Puf", meterage: undefined };
    expect(quoteMetres([{ model: noMetres, fabric: fabric("SIENA-04") }], WASTE).totals[0].reasons[0]).toContain("metraj girilmemiş");

    // split over zones, but only a whole-piece figure: no partial sum
    const wholeOnly = { name: "Berjer", meterage: { metres: 3.2, refWidthCm: 140 } };
    const split = quoteMetres([{ model: wholeOnly, fabric: fabric("SIENA-04"), zoneFabrics: { kol: fabric("MISSO-05") } }], WASTE);
    expect(split.totals[0].total).toBeNull();
    expect(split.totals[0].reasons[0]).toContain("bölge metrajı girilmemiş");
  });

  it("does not show a partial total when one piece of a fabric has no number", () => {
    const A = fabric("SIENA-04");
    const r = quoteMetres([{ model: UCLU, fabric: A }, { model: { name: "Puf", meterage: undefined }, fabric: A }], WASTE);
    expect(r.totals).toHaveLength(1);
    expect(r.totals[0].total).toBeNull();
    expect(r.totals[0].metres).toBeNull();
  });

  it("rounds up to the step, and only up", () => {
    expect(roundUp(8.91, 0.5)).toBe(9);
    expect(roundUp(9, 0.5)).toBe(9); // already on the step
    expect(roundUp(9.0000001, 0.5)).toBe(9); // float noise is not a new half metre
    expect(roundUp(3.125, 0.25)).toBe(3.25);
    expect(roundUp(0.3 + 0.6, 0.1)).toBe(0.9);
  });

  it("knows each fabric's waste case", () => {
    expect(wasteClassOf({ pattern: "duz" }, false)).toBe("duz");
    expect(wasteClassOf({ pattern: "duz" }, true)).toBe("donuk");
    expect(wasteClassOf({ pattern: "desenli" }, true)).toBe("raporlu");
    expect(wasteClassOf({ pattern: undefined }, false)).toBeNull();
  });

  it("checks the panel's waste settings; empty stays empty, never a made-up default", () => {
    expect(validateWaste({ duz: "", donuk: undefined, raporlu: null })).toEqual({ ok: true, value: { duz: null, donuk: null, raporlu: null, roundStep: 0.5 } });
    expect(validateWaste({ duz: "10", donuk: "12,5", raporlu: 25, roundStep: "0,25" })).toEqual({ ok: true, value: { duz: 10, donuk: 12.5, raporlu: 25, roundStep: 0.25 } });
    expect(validateWaste({ duz: -1 }).ok).toBe(false);
    expect(validateWaste({ raporlu: 120 }).ok).toBe(false);
    expect(validateWaste({ duz: "on" }).ok).toBe(false);
    expect(validateWaste({ roundStep: 0 }).ok).toBe(false);
  });
});
