// The quote as a one-page PDF (Showroom package, job 3).
//
// Made on the device (the showroom screen has no print dialog, and it may be
// offline) with pdf-lib, and the same code makes it on the phone's page.
// The document is the shop's: its logo and contact on top; ORMEN appears only
// next to the fabric codes. Text is set in Inter, embedded: the font comes in
// two files (Latin, and Latin Extended for ğ ş İ ı), so each character is set
// from the file that has it. The Lira sign is in neither: prices say "TL".
// Everything fits one A4 page: when the content is long the picture gets
// smaller first, then the type.

import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

import type { SetDiagram } from "@/lib/types";

export interface PdfImage {
  bytes: Uint8Array;
  type: "png" | "jpg";
}

export interface QuotePdfRow {
  piece: string;
  part: string;
  fabricCode: string;
  metres: number | null;
}

export interface QuotePdfTotal {
  code: string;
  colorName: string;
  series: string;
  total: number | null;
  explanation: string[];
  reasons: string[];
}

export interface QuotePdfData {
  number: string;
  date: Date;
  shop: { name: string; whatsapp?: string | null; logo?: PdfImage | null };
  customerName?: string | null;
  note?: string | null;
  price?: number | null;
  snapshot?: PdfImage | null;
  /** A corner set's top view (job 4): drawn to scale with its lengths. */
  diagram?: (SetDiagram & { title: string }) | null;
  rows: QuotePdfRow[];
  totals: QuotePdfTotal[];
  wasteMissing: boolean;
}

/** The four font files: [Latin, Latin Extended] for regular and bold. */
export interface PdfFonts {
  regular: [Uint8Array, Uint8Array];
  bold: [Uint8Array, Uint8Array];
}

import { COLOR_NOTE, PDF_FONT_FILES } from "./sabitler";
export { COLOR_NOTE, PDF_FONT_FILES };


const INK = rgb(0.165, 0.165, 0.157);
const SOFT = rgb(0.42, 0.41, 0.39);
const LINE = rgb(0.85, 0.83, 0.8);

const A4 = { w: 595.28, h: 841.89 };
/** The top view's height at full type scale, points. */
const DIAGRAM_H = 110;
const M = 40;

const nfM = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });
const nfPrice = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
const metres = (m: number) => `${nfM.format(m)} m`;

/** Two embedded files that together cover Turkish; each character is set from the one that has it. */
class Face {
  private sets: Set<number>[];
  constructor(private fonts: [PDFFont, PDFFont]) {
    this.sets = fonts.map((f) => new Set(f.getCharacterSet()));
  }
  private fontFor(cp: number): PDFFont | null {
    if (this.sets[0].has(cp)) return this.fonts[0];
    if (this.sets[1].has(cp)) return this.fonts[1];
    return null;
  }
  /** The text as runs of one font each; a character neither file has is left out. */
  runs(text: string): { font: PDFFont; text: string }[] {
    const out: { font: PDFFont; text: string }[] = [];
    for (const ch of text.replace(/₺/g, "TL")) {
      const font = this.fontFor(ch.codePointAt(0)!);
      if (!font) continue;
      const last = out.at(-1);
      if (last && last.font === font) last.text += ch;
      else out.push({ font, text: ch });
    }
    return out;
  }
  width(text: string, size: number): number {
    return this.runs(text).reduce((w, r) => w + r.font.widthOfTextAtSize(r.text, size), 0);
  }
  draw(page: PDFPage, text: string, x: number, y: number, size: number, color = INK): number {
    let cx = x;
    for (const r of this.runs(text)) {
      page.drawText(r.text, { x: cx, y, size, font: r.font, color });
      cx += r.font.widthOfTextAtSize(r.text, size);
    }
    return cx - x;
  }
  /** Shortens the text with "…" until it fits. */
  fit(text: string, size: number, max: number): string {
    if (this.width(text, size) <= max) return text;
    let t = text;
    while (t.length > 1 && this.width(`${t}…`, size) > max) t = t.slice(0, -1);
    return `${t.trimEnd()}…`;
  }
  /** Breaks the text into lines that fit. */
  wrap(text: string, size: number, max: number): string[] {
    const lines: string[] = [];
    let line = "";
    for (const word of text.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (this.width(next, size) <= max || !line) line = next;
      else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    return lines.map((l) => this.fit(l, size, max));
  }
}

async function embedImage(doc: PDFDocument, img: PdfImage | null | undefined): Promise<PDFImage | null> {
  if (!img) return null;
  try {
    return img.type === "png" ? await doc.embedPng(img.bytes) : await doc.embedJpg(img.bytes);
  } catch {
    // a broken logo or picture must not stop the quote
    return null;
  }
}

/** The type scale and picture height chosen so the page holds everything. */
type Layout = { scale: number; shotH: number };

export async function buildQuotePdf(d: QuotePdfData, fonts: PdfFonts): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`Teklif ${d.number}`);
  doc.setAuthor(d.shop.name);
  doc.setCreator(d.shop.name);
  doc.setProducer(d.shop.name);
  doc.setLanguage("tr-TR");
  const embed = async (pair: [Uint8Array, Uint8Array]) => new Face([await doc.embedFont(pair[0], { subset: true }), await doc.embedFont(pair[1], { subset: true })]);
  const reg = await embed(fonts.regular);
  const bold = await embed(fonts.bold);
  const logo = await embedImage(doc, d.shop.logo);
  const shot = await embedImage(doc, d.snapshot);

  // the space everything but the picture needs, at a type scale
  const contentHeight = (s: number) => {
    const line = (pt: number) => pt * s * 1.45;
    let h = 70; // header
    if (d.customerName) h += line(11);
    h += 16 + line(9.5) + d.rows.length * line(9.5) + 12; // table
    h += line(10.5);
    for (const t of d.totals) h += line(10.5) + (t.total === null ? t.reasons.length : t.explanation.length) * line(8) + 6 * s;
    if (d.wasteMissing) h += line(10);
    if (d.price) h += line(11);
    if (d.note) h += line(9) * Math.min(4, Math.ceil(d.note.length / 90)) + 4;
    if (d.diagram) h += DIAGRAM_H * s + line(9.5) + 26;
    return h + 40; // footer
  };
  const usable = A4.h - 2 * M;
  let layout: Layout = { scale: 1, shotH: 0 };
  for (const s of [1, 0.92, 0.84, 0.76, 0.68, 0.6]) {
    const room = usable - contentHeight(s) - 14;
    const want = shot ? Math.min(230, (shot.height / shot.width) * (A4.w - 2 * M)) : 0;
    if (!shot || room >= 110) {
      layout = { scale: s, shotH: shot ? Math.max(0, Math.min(want, room)) : 0 };
      break;
    }
    layout = { scale: s, shotH: Math.max(0, room) };
  }
  const s = layout.scale;
  const size = (pt: number) => pt * s;
  const lh = (pt: number) => pt * s * 1.45;

  const page = doc.addPage([A4.w, A4.h]);
  const right = A4.w - M;
  const width = A4.w - 2 * M;
  let y = A4.h - M;

  // header: the shop, then the quote's number and date on the right
  const headTop = y;
  if (logo) {
    const scaleLogo = Math.min(160 / logo.width, 44 / logo.height, 1);
    page.drawImage(logo, { x: M, y: headTop - logo.height * scaleLogo, width: logo.width * scaleLogo, height: logo.height * scaleLogo });
  } else {
    bold.draw(page, bold.fit(d.shop.name, 18, width - 200), M, headTop - 18, 18);
  }
  if (d.shop.whatsapp) reg.draw(page, `WhatsApp: ${d.shop.whatsapp}`, M, headTop - 60, 9, SOFT);
  const title = "Teklif";
  bold.draw(page, title, right - bold.width(title, 18), headTop - 18, 18);
  const num = `No ${d.number}`;
  reg.draw(page, num, right - reg.width(num, 10), headTop - 34, 10, SOFT);
  const date = d.date.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" });
  reg.draw(page, date, right - reg.width(date, 10), headTop - 48, 10, SOFT);
  y = headTop - 70;
  page.drawLine({ start: { x: M, y }, end: { x: right, y }, thickness: 0.6, color: LINE });
  y -= lh(11);

  if (d.customerName) {
    reg.draw(page, reg.fit(`Müşteri: ${d.customerName}`, size(11), width), M, y, size(11));
    y -= lh(11);
  }

  // the combination, as it looked on the screen
  if (shot && layout.shotH > 40) {
    const h = layout.shotH;
    const w = Math.min(width, (shot.width / shot.height) * h);
    page.drawImage(shot, { x: M + (width - w) / 2, y: y - h, width: w, height: h });
    y -= h + 14;
  }

  // the corner set from above, to scale, with its lengths (as on the builder's screen)
  if (d.diagram) {
    const g = d.diagram;
    y -= 6;
    bold.draw(page, bold.fit(`${g.title} · üstten şema`, size(9.5), width), M, y, size(9.5), SOFT);
    y -= lh(9.5) + 12;
    const boxH = DIAGRAM_H * s;
    const k = Math.min((width - 60) / g.widthCm, boxH / Math.max(g.depthCm, 1));
    const x0 = M + (width - g.widthCm * k) / 2;
    const top = y;
    for (const r of g.rects) {
      page.drawRectangle({ x: x0 + r.x * k, y: top - (r.z + r.d) * k, width: r.w * k, height: r.d * k, color: r.corner ? rgb(0.9, 0.86, 0.8) : rgb(0.94, 0.91, 0.87), borderColor: SOFT, borderWidth: 0.6 });
      const label = reg.fit(r.label, size(7), Math.max(10, Math.min(r.w, r.d) * k - 4));
      if (Math.min(r.w, r.d) * k > 22) reg.draw(page, label, x0 + (r.x + r.w / 2) * k - reg.width(label, size(7)) / 2, top - (r.z + r.d / 2) * k - size(7) / 3, size(7), SOFT);
    }
    const cm = (n: number) => `${Math.round(n)} cm`;
    const back = cm(g.backCm);
    reg.draw(page, back, x0 + (g.widthCm * k) / 2 - reg.width(back, size(8.5)) / 2, top + 3, size(8.5));
    if (g.leftCm > 0) reg.draw(page, `Sol ${cm(g.leftCm)}`, x0 - reg.width(`Sol ${cm(g.leftCm)}`, size(8.5)) - 6, top - (g.leftCm * k) / 2, size(8.5));
    if (g.rightCm > 0) reg.draw(page, `Sağ ${cm(g.rightCm)}`, x0 + g.widthCm * k + 6, top - (g.rightCm * k) / 2, size(8.5));
    y = top - g.depthCm * k - 14;
  }

  // parts, fabrics, metres
  const col = { part: M, fabric: M + width * 0.55, metres: right };
  bold.draw(page, "Parça", col.part, y, size(9.5), SOFT);
  bold.draw(page, "Kumaş", col.fabric, y, size(9.5), SOFT);
  const mHead = "Metraj";
  bold.draw(page, mHead, col.metres - bold.width(mHead, size(9.5)), y, size(9.5), SOFT);
  y -= 5 * s;
  page.drawLine({ start: { x: M, y }, end: { x: right, y }, thickness: 0.5, color: LINE });
  y -= lh(9.5);
  for (const r of d.rows) {
    reg.draw(page, reg.fit(`${r.piece} · ${r.part}`, size(9.5), col.fabric - col.part - 10), col.part, y, size(9.5));
    reg.draw(page, `${r.fabricCode} (ORMEN)`, col.fabric, y, size(9.5));
    const m = r.metres === null ? "usta hesaplar" : metres(r.metres);
    reg.draw(page, m, col.metres - reg.width(m, size(9.5)), y, size(9.5), r.metres === null ? SOFT : INK);
    y -= lh(9.5);
  }
  y -= 4;
  page.drawLine({ start: { x: M, y: y + lh(9.5) - 6 }, end: { x: right, y: y + lh(9.5) - 6 }, thickness: 0.5, color: LINE });
  y -= 8;

  // per fabric: the total to order and how it was reached
  bold.draw(page, "Kumaş başına sipariş metrajı", M, y, size(9.5), SOFT);
  y -= lh(10.5);
  for (const t of d.totals) {
    const head = `${t.code} (ORMEN) · ${t.series} ${t.colorName}`;
    const tot = t.total === null ? "—" : metres(t.total);
    bold.draw(page, bold.fit(head, size(10.5), width - 90), M, y, size(10.5));
    bold.draw(page, tot, right - bold.width(tot, size(10.5)), y, size(10.5));
    y -= lh(10.5);
    for (const line of t.total === null ? t.reasons : t.explanation) {
      reg.draw(page, reg.fit(line, size(8), width - 10), M + 10, y, size(8), SOFT);
      y -= lh(8);
    }
    y -= 6 * s;
  }
  if (d.wasteMissing) {
    bold.draw(page, "Fire dahil değildir.", M, y, size(10));
    y -= lh(10);
  }
  if (d.price) {
    y -= 4;
    const p = `Fiyat: ${nfPrice.format(d.price)} TL`;
    bold.draw(page, p, right - bold.width(p, size(11)), y, size(11));
    y -= lh(11);
  }
  if (d.note) {
    y -= 4;
    for (const line of reg.wrap(`Not: ${d.note}`, size(9), width).slice(0, 4)) {
      reg.draw(page, line, M, y, size(9));
      y -= lh(9);
    }
  }

  // fixed note at the bottom, whatever the length above
  page.drawLine({ start: { x: M, y: M + 18 }, end: { x: right, y: M + 18 }, thickness: 0.5, color: LINE });
  reg.draw(page, COLOR_NOTE, M, M + 4, 8.5, SOFT);
  return doc.save();
}

/** In the browser: the font files from our own site (kept on the device by the showroom's offline helper). */
export async function loadPdfFonts(): Promise<PdfFonts> {
  const get = async (u: string) => new Uint8Array(await (await fetch(u)).arrayBuffer());
  const [r1, r2, b1, b2] = await Promise.all([...PDF_FONT_FILES.regular, ...PDF_FONT_FILES.bold].map(get));
  return { regular: [r1, r2], bold: [b1, b2] };
}

/** A data: or same-site image as PDF-ready bytes; SVG and anything else is left out (no logo rather than a broken one). */
export async function imageForPdf(src: string | null | undefined): Promise<PdfImage | null> {
  if (!src) return null;
  try {
    const res = await fetch(src);
    const type = (res.headers.get("content-type") ?? "").split(";")[0];
    const kind = type === "image/png" ? "png" : type === "image/jpeg" ? "jpg" : null;
    if (!res.ok || !kind) return null;
    return { bytes: new Uint8Array(await res.arrayBuffer()), type: kind };
  } catch {
    return null;
  }
}
