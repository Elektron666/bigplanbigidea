import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { buildQuotePdf, COLOR_NOTE, PDF_FONT_FILES, type PdfFonts, type QuotePdfData } from "@/lib/teklif/pdf";

// Job 3's PDF, read back with poppler's pdftotext / pdfinfo: the Turkish
// letters are real text (not missing glyphs), it is one page however long the
// quote is, and it works without a logo. Skipped (with the reason) where
// poppler is not installed.

const has = (bin: string) => {
  try {
    execFileSync("which", [bin]);
    return true;
  } catch {
    return false;
  }
};
const POPPLER = has("pdftotext") && has("pdfinfo");

const fonts: PdfFonts = {
  regular: PDF_FONT_FILES.regular.map((f) => new Uint8Array(readFileSync(path.join(process.cwd(), "public", f)))) as [Uint8Array, Uint8Array],
  bold: PDF_FONT_FILES.bold.map((f) => new Uint8Array(readFileSync(path.join(process.cwd(), "public", f)))) as [Uint8Array, Uint8Array],
};

function read(pdf: Uint8Array): { text: string; pages: number } {
  const dir = mkdtempSync(path.join(tmpdir(), "teklif-"));
  const file = path.join(dir, "teklif.pdf");
  writeFileSync(file, pdf);
  const text = execFileSync("pdftotext", ["-layout", file, "-"]).toString("utf8");
  const pages = Number(/Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [file]).toString())?.[1]);
  return { text, pages };
}

const base: QuotePdfData = {
  number: "T-7K3P9Q",
  date: new Date("2026-11-18T10:00:00Z"),
  shop: { name: "Çınar Işık Mobilya", whatsapp: "0532 123 45 67" },
  customerName: "Ayşe Öztürk Güleç",
  note: "Müşteri İğdır'dan, şönil seçeneklerini de görmek istiyor.",
  price: 42500,
  rows: [
    { piece: "Lara Üçlü", part: "Kasa", fabricCode: "SIENA-04", metres: 6 },
    { piece: "Lara Üçlü", part: "Kollar", fabricCode: "ŞÖNIL-02", metres: 2.5 },
    { piece: "Lara Üçlü", part: "Sırt", fabricCode: "SIENA-04", metres: 1.5 },
  ],
  totals: [
    { code: "SIENA-04", colorName: "Kırık beyaz", series: "SIENA", total: 8.5, explanation: ["Kasa 6 m + Sırt 1,5 m = 7,5 m", "Fire (düz kumaş): %10", "Fireyle 8,25 m, 0,5 m adımla yukarı yuvarlandı: 8,5 m"], reasons: [] },
    { code: "ŞÖNIL-02", colorName: "Ilık gri", series: "ŞÖNIL", total: null, explanation: [], reasons: ["Lara Üçlü · Kollar: Kumaşın eni 280 cm; metraj 140 cm en için girilmiş, usta hesaplar."] },
  ],
  wasteMissing: true,
};

describe.skipIf(!POPPLER)("quote PDF", () => {
  it("sets Turkish letters as real text, on one page, with ORMEN only next to the fabric codes", async () => {
    const { text, pages } = read(await buildQuotePdf(base, fonts));
    expect(pages).toBe(1);
    for (const want of ["Çınar Işık Mobilya", "Ayşe Öztürk Güleç", "İğdır", "şönil", "Kırık beyaz", "Ilık gri", "Fire dahil değildir.", "42.500 TL", "T-7K3P9Q", "18 Kasım 2026", COLOR_NOTE, "usta hesaplar"]) {
      expect(text, want).toContain(want);
    }
    // the document is the shop's: ORMEN appears only as "(ORMEN)" beside a code
    const all = text.match(/ORMEN/g)?.length ?? 0;
    const beside = text.match(/[A-ZÇĞİÖŞÜ0-9-]+ \(ORMEN\)/g)?.length ?? 0;
    expect(all).toBe(beside);
    expect(all).toBeGreaterThan(0);
  });

  it("stays on one page with a long quote, a picture and a logo", async () => {
    const png = async (w: number, h: number) => new Uint8Array(await sharp({ create: { width: w, height: h, channels: 3, background: { r: 200, g: 180, b: 160 } } }).png().toBuffer());
    const many = Array.from({ length: 28 }, (_, i) => ({ piece: `Modül ${i + 1}`, part: i % 2 ? "Oturak" : "Sırt", fabricCode: i % 3 ? "SIENA-04" : "MISSO-05", metres: 1.25 }));
    const { text, pages } = read(
      await buildQuotePdf(
        { ...base, rows: many, shop: { ...base.shop, logo: { bytes: await png(600, 200), type: "png" } }, snapshot: { bytes: await png(1600, 900), type: "png" }, note: "Uzun bir not. ".repeat(40) },
        fonts,
      ),
    );
    expect(pages).toBe(1);
    expect(text).toContain("Modül 28");
    expect(text).toContain(COLOR_NOTE);
  });

  it("works without a logo, a price, a customer or a note", async () => {
    const { text, pages } = read(await buildQuotePdf({ ...base, customerName: null, note: null, price: null, wasteMissing: false, shop: { name: "Logosuz Mağaza" } }, fonts));
    expect(pages).toBe(1);
    expect(text).toContain("Logosuz Mağaza");
    expect(text).not.toContain("Müşteri:");
    expect(text).not.toContain("Fire dahil değildir");
    expect(text).not.toContain("TL");
  });

  it("does not stop on a broken logo", async () => {
    const { pages } = read(await buildQuotePdf({ ...base, shop: { name: "Bozuk Logo", logo: { bytes: new Uint8Array([1, 2, 3]), type: "png" } } }, fonts));
    expect(pages).toBe(1);
  });
});
