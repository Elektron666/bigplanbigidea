import { describe, expect, it } from "vitest";
import { describeOp, parseBulkOp, parseBulkTarget, recordAfter, seriesAfter } from "@/lib/central/bulk";
import { EMPTY_RECORD } from "@/lib/central/record";
import { undoStep } from "@/lib/central/undo";

describe("bulk work on shops", () => {
  it("takes only steps it knows", () => {
    expect(parseBulkOp({ kind: "ozellik", feature: "kose", on: false })).toEqual({ kind: "ozellik", feature: "kose", on: false });
    expect(parseBulkOp({ kind: "ozellik", feature: "uydurma", on: true })).toBeNull();
    expect(parseBulkOp({ kind: "kota", quota: "40" })).toEqual({ kind: "kota", quota: 40 });
    expect(parseBulkOp({ kind: "kota", quota: "" })).toEqual({ kind: "kota", quota: null });
    expect(parseBulkOp({ kind: "kota", quota: "-3" })).toBeNull();
    expect(parseBulkOp({ kind: "etiket", tag: "  PİLOT ", on: true })).toEqual({ kind: "etiket", tag: "pilot", on: true });
    expect(parseBulkOp({ kind: "etiket", tag: " ", on: true })).toBeNull();
    expect(parseBulkOp({ kind: "seri", series: "kötü seri", on: true })).toBeNull();
    expect(parseBulkOp({ kind: "sil" })).toBeNull();
  });

  it("takes ticked shops or the list's filter", () => {
    expect(parseBulkTarget({ ids: ["a", "a", "b", "<x>"] })).toEqual({ ids: ["a", "b"] });
    expect(parseBulkTarget({ ids: [] })).toBeNull();
    expect(parseBulkTarget({ query: { status: "pilot", tag: " siteler ", city: 4 } })).toEqual({ query: { search: undefined, status: "pilot", city: undefined, tag: "siteler" } });
    expect(parseBulkTarget({ query: { status: "silindi" } })).toEqual({ query: { search: undefined, status: undefined, city: undefined, tag: undefined } });
  });

  it("switches a series on or off; an empty list means all series", () => {
    const known = ["MISSO", "SIENA", "VERA"];
    expect(seriesAfter([], { series: "SIENA", on: true }, known)).toEqual([]);
    expect(seriesAfter(["MISSO"], { series: "SIENA", on: true }, known)).toEqual(["MISSO", "SIENA"]);
    expect(seriesAfter([], { series: "SIENA", on: false }, known)).toEqual(["MISSO", "VERA"]);
    expect(seriesAfter(["MISSO", "SIENA"], { series: "SIENA", on: false }, known)).toEqual(["MISSO"]);
  });

  it("changes a record's quota or tags, or says nothing changed", () => {
    expect(recordAfter(EMPTY_RECORD, { kind: "kota", quota: 40 })).toMatchObject({ aiQuota: 40 });
    expect(recordAfter({ ...EMPTY_RECORD, aiQuota: 40 }, { kind: "kota", quota: 40 })).toBeNull();
    expect(recordAfter({ ...EMPTY_RECORD, tags: ["siteler"] }, { kind: "etiket", tag: "pilot", on: true })).toMatchObject({ tags: ["siteler", "pilot"] });
    expect(recordAfter({ ...EMPTY_RECORD, tags: ["pilot"] }, { kind: "etiket", tag: "pilot", on: true })).toBeNull();
    expect(recordAfter({ ...EMPTY_RECORD, tags: ["pilot"] }, { kind: "etiket", tag: "pilot", on: false })).toMatchObject({ tags: [] });
    expect(recordAfter({ ...EMPTY_RECORD, tags: Array.from({ length: 8 }, (_, i) => `e${i}`) }, { kind: "etiket", tag: "pilot", on: true })).toBeNull();
    expect(recordAfter(EMPTY_RECORD, { kind: "guncelle" })).toBeNull();
  });

  it("words each step for the log, and a series change is undone", () => {
    expect(describeOp({ kind: "ozellik", feature: "kose", on: true })).toBe("Köşe kurucu açıldı");
    expect(describeOp({ kind: "kota", quota: null })).toBe("deneme kotası kaldırıldı");
    expect(
      undoStep({ id: "1", at: "", undoneAt: null, actor: "a", actorRole: "admin", entity: "magaza", action: "seri-degisti", summary: "", firmId: "f", entityId: "f", before: { fabricSeries: [] } }),
    ).toEqual({ kind: "seri", firmId: "f", fabricSeries: [] });
  });
});
