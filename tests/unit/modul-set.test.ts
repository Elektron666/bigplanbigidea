import { describe, expect, it } from "vitest";
import { builtModel, modelFromCode, withBuiltSet } from "@/lib/modul/model";
import { ORNEK_GLB_SET } from "@/lib/modul/ornek-glb-set";
import { ORNEK_SET } from "@/lib/modul/ornek-set";
import { setWarnings, validateModuleSet } from "@/lib/modul/set-input";

const L = { ids: ["kol-sol", "tekli", "kose", "tekli", "tekli", "kol-sag"], mirrored: false };
const own = (u: string) => u.startsWith("/seed/") || u.startsWith("/api/dosya/");

describe("a set from its module files", () => {
  it("draws a set whose modules all have files from the files, at the modules' sizes", () => {
    const r = builtModel(ORNEK_GLB_SET, L);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const src = r.model.source;
    expect(src.kind).toBe("moduller");
    if (src.kind !== "moduller") return;
    expect(src.parts.map((p) => p.url)).toEqual(["kol-sol", "tekli", "kose", "tekli", "tekli", "kol-sag"].map((k) => `/seed/moduller/${k}.glb`));
    expect(src.parts[2]).toMatchObject({ corner: true, target: { sol: { x: 0, z: 100 }, sag: { x: 100, z: 0 } } });
    // back 100 + 2 × 70 + 22 = 262; left 100 + 70 + 22 = 192; height 80
    expect(r.model.dimensionsCm).toEqual({ w: 262, d: 192, h: 80 });
    expect(r.model.kurulum).toBe("deneme-glb:kol-sol.tekli.kose.tekli.tekli.kol-sag");
    // metres: the modules' sums, part by part
    // kol 2 × 0,8 · kasa 1,6 + 3 × 1,1 · oturak 1,1 + 3 × 0,8 · sırt 1,2 + 3 × 0,7
    expect(r.model.meterage?.zones).toEqual({ kol: 1.6, govde: 4.9, oturak: 3.5, sirt: 3.3 });
  });

  it("mirrors without moving a module: the same parts, drawn mirrored", () => {
    const a = builtModel(ORNEK_GLB_SET, L);
    const b = builtModel(ORNEK_GLB_SET, { ...L, mirrored: true });
    if (!a.ok || !b.ok || a.model.source.kind !== "moduller" || b.model.source.kind !== "moduller") throw new Error("kurulmadı");
    expect(b.model.source.parts).toEqual(a.model.source.parts);
    expect(b.model.source.mirrored).toBe(true);
    expect(b.model.dimensionsCm).toEqual(a.model.dimensionsCm);
  });

  it("falls back to the code-built sofa while a module still has no file, and refuses what cannot be built", () => {
    const missing = { ...ORNEK_GLB_SET, modules: ORNEK_GLB_SET.modules.map((m) => (m.id === "tekli" ? { ...m, glbUrl: undefined } : m)) };
    const r = builtModel(missing, L);
    expect(r.ok && r.model.source.kind).toBe("parametric");
    expect(builtModel(ORNEK_GLB_SET, { ids: ["kol-sol", "kol-sol"], mirrored: false }).ok).toBe(false);
    expect(builtModel(ORNEK_GLB_SET, { ids: ["kol-sol", "tekli", "kose"], mirrored: false })).toEqual({ ok: false, error: "Köşe modülünün iki yanında da modül olmalı." });
  });

  it("finds a set in a link only among the sets the page offers", () => {
    const code = "deneme-glb:kol-sol.tekli.tekli.kol-sag";
    expect(modelFromCode(code)).toBeNull();
    expect(modelFromCode(code, [ORNEK_GLB_SET, ORNEK_SET])?.source.kind).toBe("moduller");
    expect(withBuiltSet([], code, [ORNEK_SET])).toEqual([]);
  });
});

describe("a module set from the panel", () => {
  const good = {
    name: " Lina köşe ",
    slug: "lina",
    refWidthCm: "140",
    firmIds: ["f1", "f1", "<x>"],
    modules: [
      { key: "kol-sol", type: "kol-sol", name: "Sol kol", widthCm: "25", depthCm: "98", heightCm: "84", glbUrl: "/api/dosya/moduller/lina-kol.glb", metres: { zones: { kol: "0,9" } } },
      { type: "tekli", name: "Oturum 90", widthCm: 90, depthCm: 98, heightCm: 84, metres: { zones: { govde: 1.2, oturak: "" }, extra: [{ name: "Kırlent", metres: "0,4" }] }, joints: { sol: { x: "-45", z: "-49" }, sag: { x: "45", z: "-49" } } },
    ],
  };

  it("tidies sizes, metres and joints; a module without a key gets one from its type", () => {
    const r = validateModuleSet(good, own);
    expect(r).toEqual({
      ok: true,
      value: {
        name: "Lina köşe",
        slug: "lina",
        refWidthCm: 140,
        isActive: true,
        firmIds: ["f1"],
        modules: [
          { id: "kol-sol", type: "kol-sol", name: "Sol kol", widthCm: 25, depthCm: 98, heightCm: 84, glbUrl: "/api/dosya/moduller/lina-kol.glb", metres: { zones: { kol: 0.9 } } },
          { id: "tekli-2", type: "tekli", name: "Oturum 90", widthCm: 90, depthCm: 98, heightCm: 84, metres: { zones: { govde: 1.2 }, extra: [{ name: "Kırlent", metres: 0.4 }] }, joints: { sol: { x: -45, z: -49 }, sag: { x: 45, z: -49 } } },
        ],
      },
    });
  });

  it("refuses what would break a set, with the reason", () => {
    const bad = (patch: object, mod: object = {}) => validateModuleSet({ ...good, ...patch, modules: [{ ...good.modules[0], ...mod }] }, own);
    expect(bad({ slug: "Lina Köşe" })).toMatchObject({ ok: false });
    expect(bad({ slug: "ornek-set" })).toMatchObject({ ok: false });
    expect(validateModuleSet({ ...good, modules: [] }, own)).toEqual({ ok: false, error: "Sete en az bir modül ekleyin." });
    expect(bad({}, { widthCm: "0" })).toEqual({ ok: false, error: "1. modül: genişlik 0'dan büyük ve en çok 400 cm olmalı." });
    expect(bad({}, { type: "kose", widthCm: 95, depthCm: 100 })).toEqual({ ok: false, error: "1. modül: köşe modülü kare olmalı (genişlik = derinlik)." });
    expect(bad({}, { glbUrl: "https://baska-site.com/x.glb" })).toEqual({ ok: false, error: "1. modül: GLB dosyası yüklenmedi." });
    expect(bad({}, { joints: { sol: { x: 0, z: 0 }, sag: { x: "", z: 0 } } })).toMatchObject({ ok: false });
    expect(bad({}, { metres: { zones: { kol: "bir" } } })).toMatchObject({ ok: false });
    expect(validateModuleSet({ ...good, modules: [good.modules[0], good.modules[0]] }, own)).toEqual({ ok: false, error: "2. modül: “kol-sol” kısa adı iki kez kullanılmış." });
  });

  it("says what a set still lacks, without refusing it", () => {
    const r = validateModuleSet(good, own);
    if (!r.ok) throw new Error(r.error);
    expect(setWarnings(r.value.modules)).toEqual([
      "Sağ uç (sağ kol ya da sağ şezlong) yok.",
      "1 modülün GLB dosyası yok: takım, hepsi yüklenene kadar koddan çizilen koltukla gösterilir.",
    ]);
    expect(setWarnings(ORNEK_GLB_SET.modules)).toEqual([]);
  });
});

describe("the plan of a set from files", () => {
  it("gives the room plan the set's real floor shape, centred, so the inside of the L stays free", async () => {
    const { modelDims } = await import("@/lib/room/layout");
    const r = builtModel(ORNEK_GLB_SET, L);
    if (!r.ok) throw new Error(r.error);
    const d = modelDims(r.model);
    expect(d.w).toBe(262);
    expect(d.d).toBe(192);
    // the corner at the back left; the return and the back run each a strip 100 cm deep
    expect(d.parts).toContainEqual({ x0: -131, x1: -31, z0: -96, z1: 4 });
    const area = (d.parts ?? []).reduce((s, p) => s + (p.x1 - p.x0) * (p.z1 - p.z0), 0);
    // 262 × 100 (back run with corner) + 100 × 92 (left return): less than the whole 262 × 192 box
    expect(area).toBe(262 * 100 + 100 * 92);
  });
});
