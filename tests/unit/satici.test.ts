import { describe, expect, it } from "vitest";
import { cleanGroup, parsePrice, priceFor, priceQuote, type PriceTable } from "@/lib/satici/fiyat";

// Job 7: the shop's prices by model and fabric group, and a quote's price.

const table: PriceTable = {
  lara: { base: 30_000, groups: { B: 34_500, C: 38_000 } },
  berjer: { groups: { B: 12_000 } },
  kose: { base: 48_500 },
};
const group: Record<string, string> = { "A-1": "A", "B-1": "B", "C-1": "C" };
const groupOf = (c: string) => group[c];

describe("prices", () => {
  it("reads prices as people write them", () => {
    expect(parsePrice("48.500")).toBe(48_500);
    expect(parsePrice("48500,5")).toBe(48_500.5);
    expect(parsePrice("48 500 TL")).toBe(48_500);
    expect(parsePrice("")).toBeNull();
    expect(parsePrice("kırk")).toBeNaN();
    expect(parsePrice("4.85")).toBeNaN();
    expect(cleanGroup(" b ")).toBe("B");
    expect(cleanGroup("ABCD")).toBeNull();
  });

  it("takes the group's price, else the model's price for all groups, else none", () => {
    expect(priceFor(table, "lara", "B")).toBe(34_500);
    expect(priceFor(table, "lara", "A")).toBe(30_000);
    expect(priceFor(table, "lara", null)).toBe(30_000);
    expect(priceFor(table, "berjer", "A")).toBeNull();
    expect(priceFor(table, "yok", "B")).toBeNull();
  });

  it("adds a quote up as by hand; a piece in two fabrics is priced at the dearer group", () => {
    const r = priceQuote(
      [
        { modelSlug: "lara", modelName: "Lara", fabricCode: "A-1", zones: { kol: "C-1" } },
        { modelSlug: "kose", modelName: "Köşe", fabricCode: "B-1" },
        { modelSlug: "berjer", modelName: "Berjer", fabricCode: "B-1" },
      ],
      table,
      groupOf,
    );
    expect(r.lines).toEqual([
      { modelName: "Lara", group: "C", price: 38_000 },
      { modelName: "Köşe", group: null, price: 48_500 },
      { modelName: "Berjer", group: "B", price: 12_000 },
    ]);
    // 38.000 + 48.500 + 12.000
    expect(r.total).toBe(98_500);
  });

  it("gives no total when a piece has no price, and names it; never the cheaper fabric's price", () => {
    const r = priceQuote(
      [
        { modelSlug: "lara", modelName: "Lara", fabricCode: "B-1" },
        { modelSlug: "berjer", modelName: "Berjer", fabricCode: "B-1", zones: { kol: "A-1" } },
      ],
      table,
      groupOf,
    );
    expect(r.total).toBeNull();
    expect(r.missing).toEqual(["Berjer"]);
    expect(r.lines[1]).toEqual({ modelName: "Berjer", group: null, price: null });
  });
});
