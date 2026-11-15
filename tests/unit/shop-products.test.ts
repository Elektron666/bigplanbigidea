import { describe, expect, it } from "vitest";
import { applyShopProducts, validateShopProduct, type ShopProduct } from "@/lib/catalogue/shop-products";
import { MemoryRepository } from "@/lib/data/memory-repo";
import { modelsForFirm } from "@/lib/data/repository";
import type { FurnitureModel } from "@/lib/types";

const model = (id: string, name: string): FurnitureModel => ({
  id, slug: id, name, firmId: null, source: { kind: "procedural", generator: "armchair" }, fabricMaterialNames: [], dimensionsCm: { w: 220, d: 95, h: 85 },
  meterage: { metres: 8, refWidthCm: 140 }, isActive: true, sortOrder: 0,
});
const row = (modelId: string, sortOrder: number, over: Partial<ShopProduct> = {}): ShopProduct => ({ modelId, sortOrder, featured: false, hidden: false, ...over });

describe("a shared product as one shop shows it", () => {
  const shared = [model("a", "Üçlü A"), model("b", "Berjer B"), model("c", "Köşe C")];

  it("uses the shop's name, code and note, and keeps the centre's model, sizes and metres", () => {
    const [m] = applyShopProducts(shared, [row("a", 0, { displayName: "Lara Üçlü", productCode: "LR-300", description: "Ceviz ayaklı" })]);
    expect(m.name).toBe("Lara Üçlü");
    expect(m.centralName).toBe("Üçlü A");
    expect(m.productCode).toBe("LR-300");
    expect(m.shopNote).toBe("Ceviz ayaklı");
    expect(m.slug).toBe("a");
    expect(m.dimensionsCm).toEqual(shared[0].dimensionsCm);
    expect(m.meterage).toEqual(shared[0].meterage);
    expect(m.source).toEqual(shared[0].source);
  });

  it("shows them in the shop's order, without hidden ones, and marks the ones brought forward", () => {
    const out = applyShopProducts(shared, [row("a", 2), row("b", 0, { hidden: true }), row("c", 1, { featured: true })]);
    expect(out.map((m) => m.id)).toEqual(["c", "a"]);
    expect(out[0].featured).toBe(true);
    expect(out[1].featured).toBeUndefined();
  });

  it("leaves a product without overrides exactly as the centre defined it", () => {
    expect(applyShopProducts(shared, [row("b", 0)])).toEqual([shared[1]]);
  });

  it("ignores an assignment whose product is gone or unpublished", () => {
    expect(applyShopProducts(shared, [row("yok", 0), row("a", 1)]).map((m) => m.id)).toEqual(["a"]);
  });

  it("checks what the panel sends; empty text clears the override", () => {
    expect(validateShopProduct({ displayName: "  Lara   Üçlü ", productCode: "", featured: true })).toEqual({
      ok: true,
      value: { displayName: "Lara Üçlü", productCode: null, description: null, featured: true, hidden: false },
    });
    expect(validateShopProduct({ displayName: "x".repeat(81) }).ok).toBe(false);
    expect(validateShopProduct({ productCode: "x".repeat(41) }).ok).toBe(false);
    // only a real `true` switches a flag on
    expect(validateShopProduct({ hidden: "true" })).toMatchObject({ ok: true, value: { hidden: false } });
  });
});

describe("one product, fifteen shops (job 0, acceptance 1)", () => {
  it("is entered once, shows under a different name in each shop, and a metre fix at the centre reaches all fifteen", async () => {
    const repo = new MemoryRepository();
    const product = (await repo.listShowcaseModels())[0];
    const shops = [];
    for (let i = 1; i <= 15; i++) {
      const shop = await repo.saveFirm({ name: `Mağaza ${i}`, slug: `magaza-${i}`, accentColor: "#B08D57", isActive: true });
      await repo.setFirmShowcaseIds(shop.id, [product.id]);
      expect(await repo.saveFirmProduct(shop.id, product.id, { displayName: `Model ${i}`, productCode: `M-${i}`, description: null, featured: false, hidden: false })).toBe(true);
      shops.push(shop);
    }
    const shown = await Promise.all(shops.map((s) => modelsForFirm(repo, s.id)));
    expect(shown.map((list) => list.map((m) => m.name))).toEqual(shops.map((_, i) => [`Model ${i + 1}`]));
    expect(new Set(shown.map((list) => list[0].id)).size).toBe(1);

    // the centre corrects the metres once
    await repo.saveModel({ ...product, meterage: { metres: 9.5, refWidthCm: 140 } });
    const after = await Promise.all(shops.map((s) => modelsForFirm(repo, s.id)));
    for (const [i, list] of after.entries()) {
      expect(list[0].meterage).toEqual({ metres: 9.5, refWidthCm: 140 });
      // and each shop still shows its own name
      expect(list[0].name).toBe(`Model ${i + 1}`);
    }
  });

  it("keeps a shop's names when its product list is saved again, and drops them only for a product taken away", async () => {
    const repo = new MemoryRepository();
    const [a, b] = await repo.listShowcaseModels();
    const shop = await repo.saveFirm({ name: "Tek Mağaza", slug: "tek-magaza", accentColor: "#B08D57", isActive: true });
    await repo.setFirmShowcaseIds(shop.id, [a.id, b.id]);
    await repo.saveFirmProduct(shop.id, a.id, { displayName: "Bizim A", productCode: null, description: null, featured: true, hidden: false });
    await repo.setFirmShowcaseIds(shop.id, [b.id, a.id]);
    expect((await modelsForFirm(repo, shop.id)).map((m) => m.name)).toEqual([b.name, "Bizim A"]);
    await repo.setFirmShowcaseIds(shop.id, [b.id]);
    await repo.setFirmShowcaseIds(shop.id, [b.id, a.id]);
    expect((await modelsForFirm(repo, shop.id)).map((m) => m.name)).toEqual([b.name, a.name]);
  });

  it("does not let a shop rename a product it was not given", async () => {
    const repo = new MemoryRepository();
    const [a] = await repo.listShowcaseModels();
    const shop = await repo.saveFirm({ name: "Boş Mağaza", slug: "bos-magaza", accentColor: "#B08D57", isActive: true });
    expect(await repo.saveFirmProduct(shop.id, a.id, { displayName: "Olmaz", productCode: null, description: null, featured: false, hidden: false })).toBe(false);
  });

  it("shows the whole showcase to a shop that was given nothing, and nothing of it to one that hid all it was given", async () => {
    const repo = new MemoryRepository();
    const showcase = await repo.listShowcaseModels();
    const shop = await repo.saveFirm({ name: "Yeni Mağaza", slug: "yeni-magaza", accentColor: "#B08D57", isActive: true });
    expect(await modelsForFirm(repo, shop.id)).toHaveLength(showcase.length);
    await repo.setFirmShowcaseIds(shop.id, [showcase[0].id]);
    await repo.saveFirmProduct(shop.id, showcase[0].id, { displayName: null, productCode: null, description: null, featured: false, hidden: true });
    expect(await modelsForFirm(repo, shop.id)).toHaveLength(0);
  });
});
