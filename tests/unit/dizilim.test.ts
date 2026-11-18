import { describe, expect, it } from "vitest";
import { decodeArrangement, encodeArrangement, measures, problems, setMetres, toParametric, wallFit, type Arrangement } from "@/lib/modul/dizilim";
import { ORNEK_SET } from "@/lib/modul/ornek-set";
import { paramDimensions } from "@/lib/parametric/spec";

// Job 4, the corner set builder, on the sample set:
// kol 25 cm · tekli 65 cm · köşe 95 × 95 cm · şezlong 90 × 160 cm, depth 95 cm.

const L: Arrangement = { ids: ["kol-sol", "tekli", "kose", "tekli", "tekli", "tekli", "kol-sag"], mirrored: false };
const style = { kol: "kalin", sirt: "orta", ayak: "gizli" } as const;

describe("corner set builder", () => {
  it("measures the L the task asks for: 3,15 m × 2,40 m walls", () => {
    const m = measures(ORNEK_SET, L);
    // back: köşe 95 + 3 tekli × 65 + sağ kol 25 = 315 cm
    expect(m.backCm).toBe(315);
    // left return: köşe 95 + tekli 65 + sol kol 25 = 185 cm
    expect(m.leftCm).toBe(185);
    expect(m.rightCm).toBe(0);
    expect(m).toMatchObject({ widthCm: 315, depthCm: 185, seatDepthCm: 95, heightCm: 82 });
    // on a 315 cm back wall and a 240 cm side wall it fits, to the centimetre
    expect(wallFit(m, { backCm: 315, sideCm: 240 })).toEqual({ fits: true, overBackCm: 0, overSideCm: 0 });
    // one more seat on the back: 380 cm, 65 cm over
    expect(wallFit(measures(ORNEK_SET, { ...L, ids: ["kol-sol", "tekli", "kose", "tekli", "tekli", "tekli", "tekli", "kol-sag"] }), { backCm: 315, sideCm: 240 })).toEqual({ fits: false, overBackCm: 65, overSideCm: 0 });
    expect(problems(ORNEK_SET, L)).toEqual([]);
  });

  it("is drawn by a corner sofa of exactly its sizes", () => {
    const r = toParametric(ORNEK_SET, L, style);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.params).toMatchObject({ tip: "kose", genislikCm: 315, derinlikCm: 95, solUc: "kose", sagUc: "kol", solBoyCm: 185 });
    // the drawing's box is the set's box
    expect(paramDimensions(r.params)).toMatchObject({ w: 315, d: 185 });
  });

  it("mirrors left for right without touching the order or a size", () => {
    const mirrored = { ...L, mirrored: true };
    const m = measures(ORNEK_SET, mirrored);
    expect(m).toMatchObject({ backCm: 315, leftCm: 0, rightCm: 185, widthCm: 315, depthCm: 185 });
    const r = toParametric(ORNEK_SET, mirrored, style);
    expect(r.ok && r.params).toMatchObject({ solUc: "kol", sagUc: "kose", sagBoyCm: 185, genislikCm: 315 });
    expect(r.ok && r.params.solBoyCm).toBeUndefined();
    // twice is the original
    expect(measures(ORNEK_SET, { ...mirrored, mirrored: false })).toEqual(measures(ORNEK_SET, L));
    expect(problems(ORNEK_SET, mirrored)).toEqual([]);
  });

  it("makes a U with two corners", () => {
    const U = { ids: ["kol-sol", "tekli", "kose", "tekli", "tekli", "kose", "tekli", "tekli", "kol-sag"], mirrored: false };
    const m = measures(ORNEK_SET, U);
    // back: 95 + 2 × 65 + 95 = 320 · left: 95 + 65 + 25 = 185 · right: 95 + 2 × 65 + 25 = 250
    expect(m).toMatchObject({ backCm: 320, leftCm: 185, rightCm: 250, depthCm: 250 });
    const r = toParametric(ORNEK_SET, U, style);
    expect(r.ok && r.params).toMatchObject({ solUc: "kose", sagUc: "kose", solBoyCm: 185, sagBoyCm: 250, genislikCm: 320 });
  });

  it("takes a chaise on a straight run", () => {
    const S = { ids: ["kol-sol", "tekli", "tekli", "tekli", "sezlong-sag"], mirrored: false };
    // 25 + 3 × 65 + 90 = 310 cm; the chaise reaches 160 cm forward
    expect(measures(ORNEK_SET, S)).toMatchObject({ backCm: 310, rightCm: 160, depthCm: 160 });
    expect(toParametric(ORNEK_SET, S, style)).toMatchObject({ ok: true, params: { tip: "kose", solUc: "kol", sagUc: "sezlong", sagBoyCm: 160 } });
  });

  it("refuses what cannot be built, and warns about an open end", () => {
    const err = (ids: string[]) => problems(ORNEK_SET, { ids, mirrored: false }).filter((p) => p.level === "hata").map((p) => p.text);
    expect(err(["tekli", "kol-sol", "tekli"])[0]).toContain("yalnızca dizinin sol ucuna");
    expect(err(["kol-sol", "kol-sag", "tekli"])[0]).toContain("yalnızca dizinin sağ ucuna"); // two arms side by side
    // a corner at an end is a step on the way (the next module follows it): a warning, and the set is not drawn yet
    expect(err(["kose", "tekli", "kol-sag"])).toEqual([]);
    expect(problems(ORNEK_SET, { ids: ["kol-sol", "tekli", "kose"], mirrored: false })).toContainEqual({ level: "uyari", text: "Köşenin sağına modül ekleyin." });
    expect(toParametric(ORNEK_SET, { ids: ["kol-sol", "tekli", "kose"], mirrored: false }, style)).toEqual({ ok: false, error: "Köşe modülünün iki yanında da modül olmalı." });
    expect(err(["kol-sol", "tekli", "kose", "kose", "tekli", "kol-sag"])[0]).toContain("yan yana gelemez");
    expect(err(["sezlong-sol", "tekli", "kose", "tekli", "kol-sag"])[0]).toContain("Şezlong köşeli");
    expect(err(["kol-sol", "tekli", "kose", "tekli", "kose", "tekli", "kose", "tekli", "kol-sag"])).toContain("En çok iki köşe olur (U takım).");
    const open = problems(ORNEK_SET, { ids: ["tekli", "tekli", "kose", "tekli", "kol-sag"], mirrored: false });
    expect(open).toEqual([{ level: "uyari", text: "Sol uç açıkta: bir sol kol ya da sol şezlong ekleyin." }]);
    // a set with errors is not drawn
    expect(toParametric(ORNEK_SET, { ids: ["tekli", "kol-sol"], mirrored: false }, style).ok).toBe(false);
  });

  it("adds up the set's metres from its modules, part by part", () => {
    const m = setMetres(ORNEK_SET, L)!;
    // kol: 0,9 + 0,9 = 1,8 · govde: 4 × 1 (tekli) + 1,5 (köşe) = 5,5 · oturak: 4 × 0,7 + 1 = 3,8 · sırt: 4 × 0,6 + 1,1 = 3,5
    expect(m.zones).toEqual({ kol: 1.8, govde: 5.5, oturak: 3.8, sirt: 3.5 });
    // 1,8 + 5,5 + 3,8 + 3,5 = 14,6 m at 140 cm
    expect(m).toMatchObject({ metres: 14.6, refWidthCm: 140 });
  });

  it("keeps the set in a link and reads it back", () => {
    const code = encodeArrangement("ornek-set", { ...L, mirrored: true });
    expect(code).toBe("ornek-set:kol-sol.tekli.kose.tekli.tekli.tekli.kol-sag~a");
    expect(decodeArrangement(code)).toEqual({ setSlug: "ornek-set", arrangement: { ...L, mirrored: true } });
    for (const bad of ["", "ornek-set:", "Ornek:a", "x:a..b", `ornek-set:${Array(17).fill("tekli").join(".")}`]) expect(decodeArrangement(bad), bad).toBeNull();
  });
});

describe("top-view diagram", () => {
  it("puts every module where it stands, within the measured box, without overlap", async () => {
    const { layoutRects } = await import("@/lib/modul/dizilim");
    for (const a of [L, { ...L, mirrored: true }, { ids: ["kol-sol", "tekli", "kose", "tekli", "tekli", "kose", "tekli", "tekli", "kol-sag"], mirrored: false }]) {
      const rects = layoutRects(ORNEK_SET, a);
      const m = measures(ORNEK_SET, a);
      expect(rects).toHaveLength(a.ids.length);
      for (const r of rects) {
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.x + r.w).toBeLessThanOrEqual(m.widthCm);
        expect(r.z + r.d).toBeLessThanOrEqual(m.depthCm);
      }
      for (const p of rects) for (const q of rects) if (p !== q) expect(p.x < q.x + q.w && q.x < p.x + p.w && p.z < q.z + q.d && q.z < p.z + p.d, `${p.index}/${q.index}`).toBe(false);
    }
    // unmirrored L: the left return at x 0; mirrored: at the right wall
    expect(layoutRects(ORNEK_SET, L).find((r) => r.type === "kol-sol")).toMatchObject({ x: 0, z: 160, w: 95, d: 25 });
    expect(layoutRects(ORNEK_SET, { ...L, mirrored: true }).find((r) => r.type === "kol-sol")).toMatchObject({ x: 220, z: 160 });
  });
});

describe("the built set as a model", () => {
  it("is dressed like every code-built model, and carries its code and metres", async () => {
    const { builtModel, modelFromCode, KURULUM_SLUG } = await import("@/lib/modul/model");
    const { FABRIC_MATERIAL } = await import("@/lib/three/constants");
    const r = builtModel(ORNEK_SET, L);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // without the fabric material the sofa would stay bare grey on the screen
    expect(r.model.fabricMaterialNames).toEqual([FABRIC_MATERIAL]);
    expect(r.model).toMatchObject({ slug: KURULUM_SLUG, kurulum: "ornek-set:kol-sol.tekli.kose.tekli.tekli.tekli.kol-sag", dimensionsCm: { w: 315, d: 185 }, meterage: { metres: 14.6, refWidthCm: 140 } });
    expect(modelFromCode(r.model.kurulum)?.id).toBe(r.model.id);
    expect(modelFromCode("bilinmeyen-set:tekli")).toBeNull();
  });
});
