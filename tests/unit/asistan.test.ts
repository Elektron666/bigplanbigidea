import { describe, expect, it } from "vitest";
import { advise, styleChoices, type Answers } from "@/lib/asistan/danisman";
import { answer, fabricFacts, findFabrics, findModels, type Context } from "@/lib/asistan/soru";
import type { Fabric, FurnitureModel } from "@/lib/types";

const fabric = (code: string, over: Partial<Fabric> = {}): Fabric =>
  ({
    id: code, code, series: code.split("-")[0], colorName: "Gri", colorFamily: "gri", type: "dokuma", isActive: true, isPlaceholder: false, sortOrder: 0,
    texture: { maps: { albedo: { "1k": "", "2k": "" } }, repeatCm: { w: 50, h: 50 }, thumbUrl: "", avgColor: "#999" },
    ...over,
  }) as Fabric;
const model = (name: string, w: number, over: Partial<FurnitureModel> = {}): FurnitureModel =>
  ({ id: name, slug: name.toLowerCase().replace(/\s+/g, "-"), name, firmId: null, source: { kind: "procedural", generator: "modular-sofa" }, fabricMaterialNames: [], dimensionsCm: { w, d: 95, h: 85 }, isActive: true, sortOrder: 0, ...over }) as FurnitureModel;

const MISSO = fabric("MISSO-05", { type: "jakar", colorName: "Gri Pastel", colorFamily: "gri", pattern: "desenli", patternRepeatCm: { w: 32, h: 18 }, widthCm: 140, martindale: 40_000, composition: "%100 polyester" });
const LUMA = fabric("LUMA-02", { type: "bukle", colorName: "Kum", colorFamily: "bej-kum", pattern: "duz", widthCm: 140 });
const SIENA = fabric("SIENA-04", { colorName: "Hardal", colorFamily: "sari-hardal", martindale: 25_000 });
const fabrics = [MISSO, LUMA, SIENA];

const LARA = model("Lara Üçlü", 220, { styleTags: ["modern"], useTags: ["gunluk-yogun"], meterage: { metres: 14, refWidthCm: 140, zones: { govde: 9, oturak: 2.5, sirt: 2 }, extra: [{ name: "Kırlent", metres: 0.5 }] } });
const ROMA = model("Roma Berjer", 85, { styleTags: ["klasik"], useTags: ["kucuk-alan"] });
const KOSE = model("Köşe Takımı", 290, { styleTags: ["modern"] });
const models = [LARA, ROMA, KOSE];

const ctx = (over: Partial<Context> = {}): Context => ({ models, fabrics, currentModel: LARA, currentFabric: MISSO, waste: { duz: 10, donuk: null, raporlu: 25, roundStep: 0.5 }, fabricsFor: () => fabrics, ...over });

describe("finding fabrics and models in a sentence", () => {
  it("reads codes however they are typed", () => {
    expect(findFabrics("misso 5 ile Luma-02 arasındaki fark", fabrics).map((f) => f.code)).toEqual(["MISSO-05", "LUMA-02"]);
    expect(findFabrics("MISSO05 nasıl", fabrics).map((f) => f.code)).toEqual(["MISSO-05"]);
    expect(findFabrics("misso 9", fabrics)).toEqual([]);
  });
  it("finds the longest model name", () => {
    expect(findModels("köşe takımı için kaç metre", models).map((m) => m.name)).toEqual(["Köşe Takımı"]);
    expect(findModels("LARA ÜÇLÜ", models).map((m) => m.name)).toEqual(["Lara Üçlü"]);
  });
});

describe("free questions", () => {
  it("works out metres with the quote's own sum", () => {
    const a = answer("Bu koltuğa kaç metre kumaş gider?", ctx());
    expect(a.intent).toBe("metraj");
    // 9 + 2,5 + 2 + 0,5 = 14 m, patterned: + 25 % = 17,5 m, step 0,5 → 17,5 m
    expect(a.lines[0]).toBe("Lara Üçlü için MISSO-05: 17,5 m.");
    // another model and fabric named in the question
    expect(answer("Roma Berjer için luma 2 kaç metre", ctx()).lines[0]).toMatch(/^Roma Berjer için LUMA-02 metrajı hesaplanamadı: .* Kesin metrajı usta hesaplar\.$/);
    // without ORMEN's waste figures, said so
    expect(answer("kaç metre", ctx({ waste: null })).lines).toContain("Fire dahil değildir.");
  });

  it("answers a fabric question only from entered figures", () => {
    expect(answer("Bu kumaş dayanıklı mı?", ctx()).lines[0]).toBe("MISSO-05: aşınma dayanımı 40.000 Martindale (panelde girilen değer). Evcil hayvan ve çocuk için kesin karar numuneyle verilir.");
    // a cat: the pet mark is not entered, so it says so, and adds the wear figure that was entered
    expect(answer("Bu kumaş dayanıklı mı, kedimiz var", ctx()).lines[0]).toBe(
      "MISSO-05 için “evcil hayvana dayanıklı” bilgisi panelde girilmemiş. Kesin bilgi için mağaza görevlisine sorun ya da numune isteyin. Aşınma dayanımı 40.000 Martindale.",
    );
    expect(answer("LUMA-02 dayanıklı mı?", ctx()).lines[0]).toBe("LUMA-02 için aşınma dayanımı panelde girilmemiş. Kesin bilgi için mağaza görevlisine sorun ya da numune isteyin.");
    // cleaning not marked: never made up
    expect(answer("misso 5 makinede yıkanır mı", ctx()).lines[0]).toMatch(/^MISSO-05 için “kolay temizlenir” bilgisi panelde girilmemiş/);
    // marked by ORMEN: yes is said as yes, no as no
    const marked = ctx({ fabrics: [{ ...LUMA, stainResistant: true, easyClean: false }] });
    expect(answer("luma 2 leke tutar mı", marked).lines[0]).toBe("LUMA-02 panelde “leke tutmaz” olarak işaretli.");
    expect(answer("luma 2 kolay temizlenir mi", marked).lines[0]).toBe("LUMA-02 panelde “kolay temizlenir” olarak işaretlenmemiş (hayır girilmiş).");
    expect(fabricFacts({ ...LUMA, stainResistant: true, petResistant: false })).toContain("Özellikler: Leke tutmaz");
    expect(answer("bu kumaşın eni ne", ctx()).lines[0]).toBe("MISSO-05 kumaşın eni 140 cm.");
    expect(answer("MISSO-05 desen tekrarı", ctx()).lines[0]).toBe("MISSO-05 desenli; desen tekrarı 32 × 18 cm.");
  });

  it("compares two fabrics line by line, with entered facts only", () => {
    const a = answer("MISSO-05 ile LUMA-02 arasındaki fark ne?", ctx());
    expect(a.intent).toBe("karsilastir");
    expect(a.lines[0]).toContain("Aşınma dayanımı: 40.000 Martindale");
    expect(a.lines[1]).not.toContain("Martindale");
    expect(fabricFacts(LUMA)).toEqual(["Tip: Bukle", "Renk: Kum (Bej ve kum)", "En: 140 cm", "Düz (desensiz)"]);
  });

  it("lists fabrics of a colour, starts the advisor, and says what it can answer", () => {
    expect(answer("hardal renk kumaşlar var mı", ctx())).toMatchObject({ intent: "renk", fabrics: [SIENA] });
    expect(answer("mor kumaş göster", ctx()).lines[0]).toBe("Bu mağazada mor tonlarında kumaş yok.");
    expect(answer("bana koltuk öner", ctx())).toMatchObject({ intent: "oneri", startAdvisor: true });
    expect(answer("hava nasıl", ctx()).intent).toBe("bilinmiyor");
  });
});

describe("the sofa advisor", () => {
  const base: Answers = { wall: "3", kids: false, use: "orta", style: "farketmez", tone: "farketmez" };

  it("offers only what fits the wall, three at most, each with a fabric and a reason from entered facts", () => {
    const r = advise(models, () => fabrics, { ...base, style: "modern", kids: true, tone: "acik" });
    if (!r.ok) throw new Error(r.message);
    // Köşe Takımı (290 cm) fits a 2–3 m wall; Lara is modern and marked for daily use
    expect(r.suggestions.map((s) => s.model.name)).toEqual(["Lara Üçlü", "Köşe Takımı", "Roma Berjer"]);
    expect(r.suggestions[0].reason).toBe("220 cm ile duvara sığıyor, modern çizgide, günlük yoğun kullanım için işaretli; MISSO-05 gri bir jakar, aşınma dayanımı 40.000 Martindale.");
    // Roma has no "modern" tag: the reason does not call it modern
    expect(r.suggestions[2].reason).not.toContain("modern");
  });

  it("never says an unentered property", () => {
    const plain = [fabric("PLAIN-01", { colorFamily: "mavi" })];
    const r = advise([ROMA], () => plain, { ...base, kids: true });
    if (!r.ok) throw new Error(r.message);
    expect(r.suggestions[0].reason).toBe("85 cm ile duvara sığıyor; PLAIN-01 bu modelin kumaşlarından.");
  });

  it("says plainly when nothing fits, never an empty screen", () => {
    expect(advise([KOSE], () => fabrics, { ...base, wall: "2" })).toEqual({ ok: false, message: "Bu duvara sığan model yok. En dar model Köşe Takımı: 290 cm." });
    expect(advise([], () => fabrics, base)).toMatchObject({ ok: false });
    // every answer combination: something or a message
    for (const wall of ["2", "3", "4", "genis"] as const)
      for (const use of ["az", "orta", "yogun"] as const)
        for (const tone of ["acik", "koyu", "sicak", "soguk", "renkli", "farketmez"] as const)
          for (const kids of [true, false]) {
            const r = advise(models, () => fabrics, { wall, use, tone, kids, style: "klasik" });
            expect(r.ok ? r.suggestions.length > 0 : r.message.length > 0).toBe(true);
          }
  });

  it("asks only about styles the shop's models carry", () => {
    expect(styleChoices(models)).toEqual(["modern", "klasik"]);
  });
});

describe("the advisor's fabrics", () => {
  it("gives each suggestion its own fabric when the models share them", () => {
    const r = advise(models, () => fabrics, { wall: "3", kids: false, use: "orta", style: "farketmez", tone: "farketmez" });
    if (!r.ok) throw new Error(r.message);
    const codes = r.suggestions.map((s) => s.fabric.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
