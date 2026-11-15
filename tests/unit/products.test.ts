import { describe, expect, it } from "vitest";
import { checkBulkAssign, pageOfProducts, parseProductQuery, productQueryHref, type ProductRow } from "@/lib/catalogue/products";
import { MemoryRepository } from "@/lib/data/memory-repo";
import { modelsForFirm } from "@/lib/data/repository";

const product = (over: Partial<ProductRow>): ProductRow => ({ id: over.slug ?? "x", name: "Ürün", slug: "urun", firmId: null, ownerName: null, manufacturer: null, category: null, isActive: true, shops: 0, widthCm: 220, depthCm: 95, heightCm: 85, ...over });

const ALL = [
  product({ slug: "lara", name: "Lara Üçlü", manufacturer: "İnegöl Koltuk", category: "kanepe", shops: 15 }),
  product({ slug: "mira", name: "Mira Köşe", manufacturer: "İnegöl Koltuk", category: "kose", shops: 0 }),
  product({ slug: "cinar", name: "Çınar Berjer", manufacturer: "Ege Mobilya", category: "berjer", shops: 2 }),
  product({ slug: "ozel", name: "Atölye Özel", firmId: "firm-a", ownerName: "A Mobilya", category: "kanepe" }),
];

describe("central catalogue list", () => {
  it("reads the query from the address and writes it back", () => {
    const q = parseProductQuery({ ara: " lara ", sahip: "ortak", kategori: "kanepe", atanmamis: "1", sayfa: "2" });
    expect(q).toEqual({ search: "lara", owner: "ortak", category: "kanepe", manufacturer: undefined, shop: undefined, unassigned: true, page: 2 });
    expect(productQueryHref(q)).toBe("/panel/katalog?ara=lara&sahip=ortak&kategori=kanepe&atanmamis=1&sayfa=2");
    expect(parseProductQuery({ sahip: "herkes", kategori: "masa", magaza: "../x" })).toEqual({ search: undefined, owner: undefined, category: undefined, manufacturer: undefined, shop: undefined, unassigned: false, page: 1 });
  });

  it("searches name and maker, filters by owner, category and maker", () => {
    const q = (over: object) => ({ unassigned: false, page: 1, ...over });
    expect(pageOfProducts(ALL, q({ search: "inegöl" })).rows.map((p) => p.slug)).toEqual(["lara", "mira"]);
    expect(pageOfProducts(ALL, q({ owner: "ozel" })).rows.map((p) => p.slug)).toEqual(["ozel"]);
    expect(pageOfProducts(ALL, q({ owner: "ortak", category: "kanepe" })).rows.map((p) => p.slug)).toEqual(["lara"]);
    expect(pageOfProducts(ALL, q({ manufacturer: "Ege Mobilya" })).rows.map((p) => p.slug)).toEqual(["cinar"]);
  });

  it("finds the shared products no shop has; a shop's own product is never “unassigned”", () => {
    expect(pageOfProducts(ALL, { unassigned: true, page: 1 }).rows.map((p) => p.slug)).toEqual(["mira"]);
  });

  it("shows what one shop has", () => {
    expect(pageOfProducts(ALL, { shop: "firm-a", unassigned: false, page: 1 }, new Set(["lara", "ozel"])).rows.map((p) => p.slug)).toEqual(["ozel", "lara"]);
  });

  it("sorts in Turkish order and pages", () => {
    expect(pageOfProducts(ALL, { unassigned: false, page: 1 }).rows.map((p) => p.slug)).toEqual(["ozel", "cinar", "lara", "mira"]);
    const many = Array.from({ length: 2000 }, (_, i) => product({ slug: `u-${i}`, name: `Ürün ${String(i).padStart(4, "0")}` }));
    const page = pageOfProducts(many, { unassigned: false, page: 40 });
    expect(page.total).toBe(2000);
    expect(page.rows).toHaveLength(50);
    expect(page.rows[0].slug).toBe("u-1950");
  });
});

describe("bulk assignment", () => {
  const products = new Map([
    ["lara", { name: "Lara Üçlü", firmId: null }],
    ["mira", { name: "Mira Köşe", firmId: null }],
    ["ozel", { name: "Atölye Özel", firmId: "firm-a" }],
  ]);
  const shops = new Set(["firm-a", "firm-b"]);

  it("accepts shared products for known shops, without repeats", () => {
    expect(checkBulkAssign(["lara", "mira", "lara"], ["firm-b", "firm-a", "firm-b"], products, shops)).toEqual({ ok: true, productIds: ["lara", "mira"], shopIds: ["firm-b", "firm-a"] });
  });

  it("refuses the whole action when a shop's own product is in the selection", () => {
    const r = checkBulkAssign(["lara", "ozel"], ["firm-b"], products, shops);
    expect(r).toMatchObject({ ok: false, private: ["ozel"] });
    expect(!r.ok && r.error).toContain("Mağazaya özel ürün başka mağazaya atanamaz: Atölye Özel");
  });

  it("refuses an empty selection, an unknown product or shop, and too much at once", () => {
    expect(checkBulkAssign([], ["firm-a"], products, shops).ok).toBe(false);
    expect(checkBulkAssign(["lara"], [], products, shops).ok).toBe(false);
    expect(checkBulkAssign(["yok"], ["firm-a"], products, shops).ok).toBe(false);
    expect(checkBulkAssign(["lara"], ["firm-z"], products, shops).ok).toBe(false);
    expect(checkBulkAssign(Array.from({ length: 501 }, (_, i) => `p${i}`), ["firm-a"], products, shops).ok).toBe(false);
  });
});

describe("bulk assignment in the store", () => {
  it("adds products to many shops in one step, keeps what a shop already had, and takes them away again", async () => {
    const repo = new MemoryRepository();
    const [a, b, c] = await repo.listShowcaseModels();
    const shops = [];
    for (let i = 1; i <= 15; i++) shops.push(await repo.saveFirm({ name: `Mağaza ${i}`, slug: `toplu-${i}`, accentColor: "#B08D57", isActive: true }));
    const ids = shops.map((s) => s.id);
    // one shop already has product a under its own name
    await repo.setFirmShowcaseIds(ids[0], [a.id]);
    await repo.saveFirmProduct(ids[0], a.id, { displayName: "Bizim A", productCode: null, description: null, featured: false, hidden: false });

    expect(await repo.assignModels(ids, [a.id, b.id])).toBe(29); // 15 × 2, one was already there
    for (const id of ids) expect((await repo.getFirmProducts(id)).map((p) => p.modelId).sort()).toEqual([a.id, b.id].sort());
    expect((await modelsForFirm(repo, ids[0])).map((m) => m.name)).toContain("Bizim A");
    // doing it again changes nothing
    expect(await repo.assignModels(ids, [a.id, b.id])).toBe(0);

    const rows = (await repo.listProducts({ unassigned: false, page: 1 })).rows;
    expect(rows.find((p) => p.id === a.id)?.shops).toBe(15);
    expect(rows.find((p) => p.id === c.id)?.shops).toBe(0);
    expect((await repo.listProducts({ unassigned: true, page: 1 })).rows.some((p) => p.id === a.id)).toBe(false);
    expect((await repo.listProducts({ shop: ids[3], unassigned: false, page: 1 })).rows.map((p) => p.id).sort()).toEqual([a.id, b.id].sort());

    expect(await repo.unassignModels(ids.slice(0, 5), [b.id])).toBe(5);
    expect((await repo.getFirmProducts(ids[0])).map((p) => p.modelId)).toEqual([a.id]);
    expect((await repo.getFirmProducts(ids[9])).map((p) => p.modelId).sort()).toEqual([a.id, b.id].sort());
  });
});
