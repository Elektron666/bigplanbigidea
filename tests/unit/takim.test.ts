import { describe, expect, it } from "vitest";
import { autoArrange, isAccent, placeSet, screenSet, validateSet, type ScreenSet } from "@/lib/takim/takim";
import { quoteMetres, type WasteSettings } from "@/lib/teklif/metraj";
import { overlapping, modelDims, roomRect } from "@/lib/room/layout";
import { DEFAULT_PRESET } from "@/lib/room/spec";
import type { Fabric, FurnitureModel } from "@/lib/types";

// Job 6: sofa sets. Validation, a first arrangement, the set in the room, and
// the set's metres as the sum of its pieces'.

const model = (id: string, w: number, d: number, category?: FurnitureModel["category"], metres?: number): FurnitureModel =>
  ({
    id, slug: id, name: id, firmId: null, category, isActive: true, sortOrder: 0, fabricMaterialNames: [],
    source: { kind: "procedural", generator: "modular-sofa" }, dimensionsCm: { w, d, h: 85 },
    ...(metres ? { meterage: { metres, refWidthCm: 140, zones: { govde: metres } } } : {}),
  }) as FurnitureModel;
const UCLU = model("uclu", 220, 95, "kanepe", 12);
const IKILI = model("ikili", 160, 95, "kanepe", 9);
const BERJER = model("berjer", 85, 85, "berjer", 4.5);
const PUF = model("puf", 60, 60, "puf", 1.5);
const all = [UCLU, IKILI, BERJER, PUF];
const bySlug = new Map(all.map((m) => [m.slug, m]));

describe("sofa sets", () => {
  it("checks a set: 2–6 of the shop's own models, places in range, turns of 90°", () => {
    const ids = new Set(all.map((m) => m.id));
    expect(validateSet({ name: "Lara takımı", slug: "lara", pieces: [{ modelId: "uclu", x: 0, z: 0, rot: 0 }, { modelId: "berjer", x: 150, z: 60, rot: 270 }] }, ids).ok).toBe(true);
    expect(validateSet({ name: "Lara", slug: "lara", pieces: [{ modelId: "uclu", x: 0, z: 0, rot: 0 }] }, ids)).toEqual({ ok: false, error: "Takımda 2 ile 6 parça olmalı." });
    expect(validateSet({ name: "Lara", slug: "lara", pieces: [{ modelId: "uclu", x: 0, z: 0, rot: 0 }, { modelId: "baska", x: 0, z: 0, rot: 0 }] }, ids)).toEqual({ ok: false, error: "Takımdaki bir model bu mağazada yok." });
    expect(validateSet({ name: "Lara", slug: "lara", pieces: [{ modelId: "uclu", x: 0, z: 0, rot: 0 }, { modelId: "puf", x: 0, z: 0, rot: 45 }] }, ids).ok).toBe(false);
    expect(validateSet({ name: "Lara", slug: "Lara Takımı", pieces: [] }, ids).ok).toBe(false);
  });

  it("suggests a first arrangement: the widest at the back, the others at its ends and in front", () => {
    const a = autoArrange([PUF, BERJER, IKILI, UCLU]);
    expect(a[0]).toEqual({ modelId: "uclu", x: 0, z: 0, rot: 0 });
    expect(a[1]).toMatchObject({ modelId: "ikili", rot: 90 });
    expect(a[1].x).toBeLessThan(-110);
    expect(a.filter((p) => p.rot === 180).map((p) => p.modelId).sort()).toEqual(["berjer", "puf"]);
    expect(isAccent(BERJER) && isAccent(PUF) && !isAccent(UCLU)).toBe(true);
  });

  it("puts the four-piece set in the room inside the walls, no piece on another", () => {
    const set: ScreenSet = { slug: "lara", name: "Lara", pieces: autoArrange(all).map((p) => ({ modelSlug: p.modelId, x: p.x, z: p.z, rot: p.rot })) };
    let n = 0;
    const placed = placeSet(set, bySlug, DEFAULT_PRESET.spec, "LUMA-02", () => `p${n++}`);
    expect(placed.map((p) => p.modelSlug)).toEqual(["uclu", "ikili", "berjer", "puf"]);
    expect(placed.every((p) => p.fabricCode === "LUMA-02")).toBe(true);
    expect(overlapping(placed.map((p) => ({ p, dims: modelDims(bySlug.get(p.modelSlug)!) }))).size).toBe(0);
    const r = roomRect(DEFAULT_PRESET.spec);
    for (const p of placed) expect(p.x > r.minX && p.x < r.maxX && p.z > r.minZ && p.z < r.maxZ).toBe(true);
  });

  it("gives a screen only the pieces it has, and no set of one piece", () => {
    const s = { id: "1", firmId: "f", slug: "lara", name: "Lara", isActive: true, pieces: [{ modelId: "uclu", x: 0, z: 0, rot: 0 as const }, { modelId: "yok", x: 0, z: 0, rot: 0 as const }] };
    expect(screenSet(s, all)).toBeNull();
    expect(screenSet({ ...s, pieces: [...s.pieces, { modelId: "puf", x: 0, z: 120, rot: 0 }] }, all)?.pieces.map((p) => p.modelSlug)).toEqual(["uclu", "puf"]);
  });

  it("works out the set's metres as the sum of its pieces', by fabric (kombin: berjer and puf in a second fabric)", () => {
    const f = (code: string): Fabric => ({ id: code, code, series: "X", colorName: "R", colorFamily: "gri", type: "dokuma", widthCm: 140, pattern: "duz", cutDirection: "cift", isActive: true, isPlaceholder: false, sortOrder: 0, texture: { maps: { albedo: { "1k": "", "2k": "" } }, repeatCm: { w: 10, h: 10 }, thumbUrl: "", avgColor: "#888888" } }) as Fabric;
    const [a, b] = [f("A-1"), f("B-1")];
    const waste: WasteSettings = { duz: 10, donuk: 15, raporlu: 25, roundStep: 0.5 };
    const set = quoteMetres([{ model: UCLU, fabric: a }, { model: IKILI, fabric: a }, { model: BERJER, fabric: b }, { model: PUF, fabric: b }], waste);
    const one = (m: FurnitureModel, x: Fabric) => quoteMetres([{ model: m, fabric: x }], waste).totals[0].metres!;
    // A: 12 + 9 = 21 m; B: 4,5 + 1,5 = 6 m (before waste, each piece as on its own)
    expect(set.totals.map((t) => [t.fabric.code, t.metres])).toEqual([
      ["A-1", one(UCLU, a) + one(IKILI, a)],
      ["B-1", one(BERJER, b) + one(PUF, b)],
    ]);
    expect(set.totals.map((t) => t.metres)).toEqual([21, 6]);
    // waste once on the fabric's sum, rounded up once: 21 × 1,1 = 23,1 → 23,5 m; 6 × 1,1 = 6,6 → 7 m
    expect(set.totals.map((t) => t.total)).toEqual([23.5, 7]);
  });
});
