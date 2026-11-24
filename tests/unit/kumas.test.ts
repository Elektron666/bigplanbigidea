import { describe, expect, it } from "vitest";
import { availableNeeds, meetsNeed, parseYesNo, propertyLabels } from "@/lib/kumas/ozellik";
import { parseLeadDays, parseStatus, parseStockCsv, stockLine, swatchLabel, validateStock } from "@/lib/kumas/stok";
import { alternativesFor, colourDistance } from "@/lib/kumas/muadil";
import { filterFabrics } from "@/components/configurator/FabricPicker";
import { badYesNo, fieldsFromCsv } from "@/lib/panel/fabric-form";
import { undoStep } from "@/lib/central/undo";
import type { AuditEntry } from "@/lib/central/types";
import type { Fabric } from "@/lib/types";

// Job 8: fabric properties, the customer's filters, stock and alternatives.

const fabric = (code: string, over: Partial<Fabric> = {}): Fabric =>
  ({
    id: `id-${code}`, code, series: code.split("-")[0], colorName: "Gri", colorFamily: "gri", type: "dokuma", isActive: true, isPlaceholder: false, sortOrder: 0,
    texture: { maps: { albedo: { "1k": "", "2k": "" } }, repeatCm: { w: 50, h: 50 }, thumbUrl: "", avgColor: "#808080" },
    ...over,
  }) as Fabric;

describe("properties and filters", () => {
  const stain = fabric("A-01", { stainResistant: true });
  const clean = fabric("A-02", { easyClean: true, petResistant: false });
  const pet = fabric("A-03", { petResistant: true });
  const none = fabric("A-04", { type: "kadife", martindale: 100_000 });
  const all = [stain, clean, pet, none];

  it("shows only what was marked yes", () => {
    expect(propertyLabels(stain)).toEqual(["Leke tutmaz"]);
    expect(propertyLabels(clean)).toEqual(["Kolay temizlenir"]);
    expect(propertyLabels(none)).toEqual([]);
  });

  it("never puts a fabric without the mark in a property filter", () => {
    // a fabric with nothing entered (whatever its type or wear figure) is in no filter
    for (const n of ["cocuk", "evcil", "temizlik"] as const) expect(meetsNeed(none, n)).toBe(false);
    expect(filterFabrics(all, "", null, null, ["cocuk"]).map((f) => f.code)).toEqual(["A-01", "A-02"]);
    expect(filterFabrics(all, "", null, null, ["evcil"]).map((f) => f.code)).toEqual(["A-03"]);
    expect(filterFabrics(all, "", null, null, ["temizlik"]).map((f) => f.code)).toEqual(["A-02"]);
    expect(filterFabrics(all, "", null, null, ["cocuk", "evcil"])).toEqual([]);
    // a "no" is not a yes
    expect(meetsNeed(clean, "evcil")).toBe(false);
  });

  it("offers a filter only when some fabric meets it", () => {
    expect(availableNeeds([none])).toEqual([]);
    expect(availableNeeds([pet, none])).toEqual(["evcil"]);
  });

  it("reads yes and no in the fabric CSV, and reports anything else", () => {
    expect(parseYesNo("Evet")).toEqual({ ok: true, value: true });
    expect(parseYesNo("HAYIR")).toEqual({ ok: true, value: false });
    expect(parseYesNo("")).toEqual({ ok: true, value: undefined });
    expect(parseYesNo("belki").ok).toBe(false);
    const row = { kod: "X-1", seri: "X", renk: "Gri", tip: "dokuma", tekrar_en_cm: "10", leke_tutmaz: "evet", evcil_hayvan: "hayır", kolay_temizlik: "" };
    expect(fieldsFromCsv(row).fields).toMatchObject({ stainResistant: true, petResistant: false, easyClean: undefined });
    expect(badYesNo(row)).toBeNull();
    expect(badYesNo({ ...row, kolay_temizlik: "çok" })).toBe("kolay_temizlik: “evet”, “hayır” ya da boş olmalı.");
  });
});

describe("stock", () => {
  const codes = new Set(Array.from({ length: 120 }, (_, i) => `K-${String(i + 1).padStart(3, "0")}`));
  const codeOf = (w: string) => (codes.has(w.trim().toUpperCase()) ? w.trim().toUpperCase() : null);

  it("reads statuses and lead times as people write them", () => {
    expect(parseStatus("Stokta yok")).toBe("yok");
    expect(parseStatus("AZ")).toBe("az");
    expect(parseStatus("tükendi")).toBe("yok");
    expect(parseStatus("belki")).toBeNull();
    expect(parseLeadDays("15 gün")).toBe(15);
    expect(parseLeadDays("")).toBeUndefined();
    expect(parseLeadDays("iki hafta")).toBeNaN();
    expect(validateStock("yok", 0)).toMatch(/1 ile 365/);
    expect(validateStock(null, undefined)).toMatch(/var, az ya da yok/);
  });

  it("updates 100 fabrics from one CSV and reports the bad rows by line", () => {
    const lines = ["kod;stok;termin_gun"];
    for (let i = 1; i <= 100; i++) lines.push(`K-${String(i).padStart(3, "0")};${i % 3 === 0 ? "yok" : i % 3 === 1 ? "var" : "az"};${i % 3 === 0 ? "20" : ""}`);
    lines.push("YOK-1;var;", "K-101;belki;", "K-102;yok;400", "K-001;az;", "");
    const r = parseStockCsv(lines.join("\r\n"), codeOf);
    expect(r.rows).toHaveLength(100);
    expect(r.rows[2]).toEqual({ code: "K-003", status: "yok", leadDays: 20 });
    expect(r.errors).toEqual([
      { line: 102, code: "YOK-1", message: "Bu kodda kumaş yok." },
      { line: 103, code: "K-101", message: "Stok durumu var, az ya da yok olmalı." },
      { line: 104, code: "K-102", message: "Termin 1 ile 365 gün arasında tam sayı olmalı." },
      { line: 105, code: "K-001", message: "Bu kod 2. satırda da var; ilki alındı." },
    ]);
  });

  it("takes commas, quotes and columns in another order; a missing header is one clear error", () => {
    const r = parseStockCsv('termin,"kod",stok\n10,K-005,"yok"\n', codeOf);
    expect(r.rows).toEqual([{ code: "K-005", status: "yok", leadDays: 10 }]);
    expect(parseStockCsv("a;b\nK-001;var", codeOf).errors[0].line).toBe(1);
  });

  it("says out of stock with the lead time, never a made-up one", () => {
    expect(stockLine(undefined)).toBeNull();
    expect(stockLine({ status: "var", updatedAt: "" })).toBe("Stokta var");
    expect(stockLine({ status: "yok", leadDays: 15, updatedAt: "" })).toBe("Stokta yok · Termin 15 gün");
    expect(stockLine({ status: "yok", updatedAt: "" })).toBe("Stokta yok · Termini mağazaya sorun");
    expect(swatchLabel({ status: "az", updatedAt: "" })).toBeNull();
    expect(swatchLabel({ status: "yok", leadDays: 7, updatedAt: "" })).toBe("Termin 7 gün");
  });
});

describe("alternatives", () => {
  const out = fabric("L-01", { type: "bukle", colorFamily: "bej-kum", texture: { ...fabric("x").texture, avgColor: "#C8B89A" } });
  const near = fabric("L-02", { type: "bukle", colorFamily: "bej-kum", texture: { ...fabric("x").texture, avgColor: "#C4B496" } });
  const far = fabric("L-03", { type: "bukle", colorFamily: "bej-kum", texture: { ...fabric("x").texture, avgColor: "#9A8060" } });
  const otherType = fabric("K-01", { type: "kadife", colorFamily: "bej-kum", texture: { ...fabric("x").texture, avgColor: "#C8B89A" } });
  const otherFamily = fabric("L-04", { type: "bukle", colorFamily: "gri", texture: { ...fabric("x").texture, avgColor: "#C0C0C0" } });
  const outToo = fabric("L-05", { type: "bukle", colorFamily: "bej-kum", texture: { ...fabric("x").texture, avgColor: "#C8B89B" } });
  const all = [out, near, far, otherType, otherFamily, outToo];
  const stock = { "L-01": { status: "yok" as const, updatedAt: "" }, "L-05": { status: "yok" as const, updatedAt: "" } };

  it("offers ORMEN's list first, as Muadil, without fabrics that are out of stock too", () => {
    expect(alternativesFor(out, all, ["K-01", "L-05", "NONE-1", "L-03"], stock)).toEqual([
      { fabric: otherType, kind: "muadil" },
      { fabric: far, kind: "muadil" },
    ]);
  });

  it("with an empty list, offers the same type and colour family, nearest first, as Benzer", () => {
    expect(alternativesFor(out, all, [], stock)).toEqual([
      { fabric: near, kind: "benzer" },
      { fabric: far, kind: "benzer" },
    ]);
    expect(colourDistance("#000000", "#000000")).toBe(0);
    expect(colourDistance("#zzz", "#000000")).toBe(Infinity);
  });
});

describe("undo of stock and lists", () => {
  const entry = (action: string, before: unknown, entityId: string | null = null): AuditEntry =>
    ({ id: "1", at: "", undoneAt: null, actor: "a", actorRole: "admin", entity: "kumas", entityId, action, summary: "", before, after: null }) as AuditEntry;

  it("puts the previous stock back, entries that did not exist included", () => {
    expect(undoStep(entry("stok-degisti", { rows: [{ fabricId: "f1", status: "az", leadDays: 3 }, { fabricId: "f2", status: null }] }))).toEqual({
      kind: "stok",
      rows: [
        { fabricId: "f1", status: "az", leadDays: 3 },
        { fabricId: "f2", status: null, leadDays: undefined },
      ],
    });
    expect(undoStep(entry("stok-degisti", { rows: [{ fabricId: "f1", status: "uydurma" }] }))).toBeNull();
    expect(undoStep(entry("liste-degisti", { list: "muadil", ids: ["a", "b"] }, "f1"))).toEqual({ kind: "liste", fabricId: "f1", list: "muadil", ids: ["a", "b"] });
  });
});
