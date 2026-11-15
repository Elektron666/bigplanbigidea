import { describe, expect, it } from "vitest";
import { pageOfShops, parseShopQuery, shopAlerts, shopQueryHref, type ShopRow } from "@/lib/central/shops";

const shop = (over: Partial<ShopRow>): ShopRow => ({
  id: over.name ?? "x", name: "Mağaza", slug: "magaza", status: "aktif", city: null, region: null, isActive: true, contentVersion: 1, updateMode: "otomatik",
  package: null, tags: [], contact: null, installedOn: null, devices: 0, lastSeen: null, syncErrors: 0, products: 0, nextDue: null, ...over,
});

const SHOPS = [
  shop({ name: "Çınar Mobilya", slug: "cinar", city: "Ankara", status: "pilot", installedOn: "2026-11-02", tags: ["siteler"] }),
  shop({ name: "Işık Koltuk", slug: "isik", city: "Ankara", contact: "İsmail Bey", installedOn: "2026-11-10", nextDue: "2026-12-01" }),
  shop({ name: "Ada Home", slug: "ada", city: "İzmir", status: "askida", nextDue: "2026-11-01" }),
  shop({ name: "Zirve", slug: "zirve", city: "Bursa" }),
];

describe("shop list", () => {
  it("reads the query from the address and ignores what it does not know", () => {
    expect(parseShopQuery({ ara: " ışık ", durum: "pilot", sira: "vade", sayfa: "3" })).toEqual({ search: "ışık", status: "pilot", city: undefined, tag: undefined, sort: "vade", page: 3 });
    expect(parseShopQuery({ durum: "silindi", sira: "rastgele", sayfa: "-2" })).toEqual({ search: undefined, status: undefined, city: undefined, tag: undefined, sort: "ad", page: 1 });
  });

  it("writes the query back as an address, leaving defaults out", () => {
    const q = parseShopQuery({ ara: "ada", durum: "askida" });
    expect(shopQueryHref(q)).toBe("/panel/magazalar?ara=ada&durum=askida");
    expect(shopQueryHref(q, { page: 2 })).toBe("/panel/magazalar?ara=ada&durum=askida&sayfa=2");
    expect(shopQueryHref(parseShopQuery({}))).toBe("/panel/magazalar");
  });

  it("searches name, link name and contact without caring about Turkish capitals", () => {
    expect(pageOfShops(SHOPS, { search: "IŞIK", sort: "ad", page: 1 }).rows.map((s) => s.slug)).toEqual(["isik"]);
    expect(pageOfShops(SHOPS, { search: "ismail", sort: "ad", page: 1 }).rows.map((s) => s.slug)).toEqual(["isik"]);
    expect(pageOfShops(SHOPS, { search: "zirve", sort: "ad", page: 1 }).rows.map((s) => s.slug)).toEqual(["zirve"]);
  });

  it("filters by status, city and tag together", () => {
    expect(pageOfShops(SHOPS, { city: "Ankara", sort: "ad", page: 1 }).total).toBe(2);
    expect(pageOfShops(SHOPS, { city: "Ankara", status: "pilot", tag: "siteler", sort: "ad", page: 1 }).rows.map((s) => s.slug)).toEqual(["cinar"]);
    expect(pageOfShops(SHOPS, { city: "Ankara", status: "askida", sort: "ad", page: 1 }).total).toBe(0);
  });

  it("sorts by name in Turkish order, and by date with undated shops last", () => {
    expect(pageOfShops(SHOPS, { sort: "ad", page: 1 }).rows.map((s) => s.slug)).toEqual(["ada", "cinar", "isik", "zirve"]);
    expect(pageOfShops(SHOPS, { sort: "kurulum", page: 1 }).rows.map((s) => s.slug)).toEqual(["isik", "cinar", "ada", "zirve"]);
    expect(pageOfShops(SHOPS, { sort: "vade", page: 1 }).rows.map((s) => s.slug)).toEqual(["ada", "isik", "cinar", "zirve"]);
  });

  it("pages the result and keeps the full count", () => {
    const many = Array.from({ length: 120 }, (_, i) => shop({ name: `Mağaza ${String(i).padStart(3, "0")}`, slug: `m-${i}` }));
    const p3 = pageOfShops(many, { sort: "ad", page: 3 });
    expect(p3.total).toBe(120);
    expect(p3.rows).toHaveLength(20);
    expect(p3.rows[0].slug).toBe("m-100");
  });

  it("says what needs attention on a shop", () => {
    const now = Date.parse("2026-11-15T10:00:00Z");
    expect(shopAlerts(SHOPS[2], "2026-11-15", now)).toEqual(["Askıda", "Bakım vadesi geçti"]);
    expect(shopAlerts(shop({ devices: 2, lastSeen: "2026-10-01T10:00:00Z", syncErrors: 1 }), "2026-11-15", now)).toEqual(["1 ekranda eşitleme hatası", "30 gündür açılmayan ekran"]);
    expect(shopAlerts(shop({ devices: 1, lastSeen: "2026-11-14T10:00:00Z", nextDue: "2026-12-01" }), "2026-11-15", now)).toEqual([]);
  });
});
