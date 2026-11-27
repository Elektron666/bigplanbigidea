// "Salon Yerleşim Projesi" (Showroom package, job 9): at most two A4 pages,
// made on the screen with pdf-lib like the quote. Page 1: the shop's logo, the
// measured top plan, two 3D views. Page 2: products and fabrics, metres, and
// the price when the screen has the shop's prices. Turkish text in the quote's
// fonts. Decor is drawn dashed and called a shape, never a product.

import { PDFDocument, rgb, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { Face, type PdfFonts, type PdfImage } from "@/lib/teklif/pdf";
import { COLOR_NOTE } from "@/lib/teklif/sabitler";
import type { Footprint } from "@/lib/room/layout";

const INK = rgb(0.165, 0.165, 0.157);
const SOFT = rgb(0.42, 0.41, 0.39);
const LINE = rgb(0.85, 0.83, 0.8);
const WOOD = rgb(0.54, 0.44, 0.35);
const GLASS = rgb(0.45, 0.62, 0.72);
const A4 = { w: 595.28, h: 841.89 };
const M = 40;

export interface LayoutPdfData {
  shop: { name: string; logo: PdfImage | null };
  date: string;
  room: { widthCm: number; depthCm: number; outline: Footprint; notch: Footprint | null };
  pieces: { name: string; size: string; rects: Footprint[]; fabric: string }[];
  fixtures: { label: string; kind: "kapi" | "pencere" | "kolon" | "radyator"; rect: Footprint }[];
  decor: { label: string; rect: Footprint }[];
  shots: (PdfImage | null)[];
  /** Per fabric: "LUMA-02 · LUMA Kum: 23,5 m" or why there is no figure. */
  metres: string[];
  /** Price lines and the total, when the screen has the shop's prices; null otherwise. */
  price: { lines: string[]; total: string } | null;
  warnings: string[];
}

async function embed(doc: PDFDocument, img: PdfImage | null) {
  if (!img) return null;
  try {
    return img.type === "png" ? await doc.embedPng(img.bytes) : await doc.embedJpg(img.bytes);
  } catch {
    return null;
  }
}

function dashedRect(page: PDFPage, x: number, y: number, w: number, h: number) {
  const seg = (x1: number, y1: number, x2: number, y2: number) => page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.6, color: SOFT, dashArray: [3, 2] });
  seg(x, y, x + w, y);
  seg(x + w, y, x + w, y + h);
  seg(x + w, y + h, x, y + h);
  seg(x, y + h, x, y);
}

export async function buildLayoutPdf(d: LayoutPdfData, fonts: PdfFonts): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`${d.shop.name} · Salon Yerleşim Projesi`);
  doc.setAuthor(d.shop.name);
  doc.setLanguage("tr-TR");
  const face = async (pair: [Uint8Array, Uint8Array]) => new Face([await doc.embedFont(pair[0], { subset: true }), await doc.embedFont(pair[1], { subset: true })]);
  const reg = await face(fonts.regular);
  const bold = await face(fonts.bold);
  const logo = await embed(doc, d.shop.logo);
  const shots = await Promise.all(d.shots.slice(0, 2).map((s) => embed(doc, s)));

  // ---- page 1: header, the measured plan, two views
  const p1 = doc.addPage([A4.w, A4.h]);
  let y = A4.h - M;
  if (logo) {
    const s = Math.min(150 / logo.width, 40 / logo.height);
    p1.drawImage(logo, { x: M, y: y - logo.height * s, width: logo.width * s, height: logo.height * s });
  } else bold.draw(p1, reg.fit(d.shop.name, 18, 300), M, y - 18, 18);
  const title = "Salon Yerleşim Projesi";
  bold.draw(p1, title, A4.w - M - bold.width(title, 16), y - 16, 16);
  reg.draw(p1, d.date, A4.w - M - reg.width(d.date, 9), y - 30, 9, SOFT);
  y -= 52;
  p1.drawLine({ start: { x: M, y }, end: { x: A4.w - M, y }, thickness: 0.6, color: LINE });

  // the plan: room to fit a box, back wall at the top
  const box = { x: M + 24, y: y - 360, w: A4.w - 2 * M - 48, h: 320 };
  const o = d.room.outline;
  const rw = o.maxX - o.minX;
  const rd = o.maxZ - o.minZ;
  const k = Math.min(box.w / rw, box.h / rd);
  const ox = box.x + (box.w - rw * k) / 2;
  const oy = box.y + (box.h - rd * k) / 2;
  const X = (x: number) => ox + (x - o.minX) * k;
  const Y = (z: number) => oy + (o.maxZ - z) * k; // z grows towards the front: down the page
  const rect = (r: Footprint) => ({ x: X(r.minX), y: Y(r.maxZ), width: (r.maxX - r.minX) * k, height: (r.maxZ - r.minZ) * k });
  p1.drawRectangle({ ...rect(o), borderColor: INK, borderWidth: 2 });
  if (d.room.notch) p1.drawRectangle({ ...rect(d.room.notch), color: rgb(1, 1, 1), borderColor: INK, borderWidth: 2 });
  // room measures
  const wl = `${d.room.widthCm} cm`;
  reg.draw(p1, wl, X((o.minX + o.maxX) / 2) - reg.width(wl, 9) / 2, Y(o.minZ) + 6, 9);
  const dl = `${d.room.depthCm} cm`;
  reg.draw(p1, dl, X(o.minX) - reg.width(dl, 9) - 6, Y((o.minZ + o.maxZ) / 2) - 3, 9);
  for (const dec of d.decor) {
    const r = rect(dec.rect);
    dashedRect(p1, r.x, r.y, r.width, r.height);
    reg.draw(p1, reg.fit(dec.label, 7, Math.max(30, r.width)), r.x + 2, r.y + r.height - 9, 7, SOFT);
  }
  for (const f of d.fixtures) {
    const r = rect(f.rect);
    const color = f.kind === "kapi" ? WOOD : f.kind === "pencere" ? GLASS : SOFT;
    p1.drawRectangle({ x: r.x, y: r.y, width: Math.max(r.width, 3), height: Math.max(r.height, 3), color });
    reg.draw(p1, f.label, r.x + 2, r.y - 9 < box.y ? r.y + r.height + 3 : r.y - 9, 7, color);
  }
  for (const pc of d.pieces) {
    for (const part of pc.rects) p1.drawRectangle({ ...rect(part), color: rgb(0.93, 0.91, 0.88), borderColor: INK, borderWidth: 1 });
    const r = rect(pc.rects.reduce((a, b) => ({ minX: Math.min(a.minX, b.minX), maxX: Math.max(a.maxX, b.maxX), minZ: Math.min(a.minZ, b.minZ), maxZ: Math.max(a.maxZ, b.maxZ) })));
    const w = Math.max(40, r.width - 4);
    reg.draw(p1, reg.fit(pc.name, 7.5, w), r.x + 2, r.y + r.height / 2 + 1, 7.5);
    reg.draw(p1, reg.fit(pc.size, 7, w), r.x + 2, r.y + r.height / 2 - 8, 7, SOFT);
  }
  // scale bar: 1 m
  p1.drawLine({ start: { x: box.x, y: box.y - 14 }, end: { x: box.x + k, y: box.y - 14 }, thickness: 1, color: INK });
  reg.draw(p1, "1 m", box.x + k + 4, box.y - 17, 8, SOFT);

  // two 3D views
  const shotY = box.y - 30;
  const shotW = (A4.w - 2 * M - 12) / 2;
  shots.forEach((img, i) => {
    if (!img) return;
    const s = Math.min(shotW / img.width, 230 / img.height);
    p1.drawImage(img, { x: M + i * (shotW + 12), y: shotY - img.height * s, width: img.width * s, height: img.height * s });
  });
  reg.draw(p1, "3D görünümler ekrandaki sahneden alınmıştır. Dekor parçaları genel şekillerdir, satılan ürün değildir.", M, M, 7.5, SOFT);

  // ---- page 2: products, fabrics, metres, price
  const p2 = doc.addPage([A4.w, A4.h]);
  y = A4.h - M;
  bold.draw(p2, "Ürünler ve kumaşlar", M, (y -= 14), 13);
  y -= 6;
  for (const pc of d.pieces) {
    y -= 15;
    reg.draw(p2, reg.fit(`${pc.name} · ${pc.size}`, 10, 300), M, y, 10);
    reg.draw(p2, reg.fit(pc.fabric, 10, A4.w - 2 * M - 310), M + 310, y, 10, SOFT);
  }
  y -= 24;
  bold.draw(p2, "Metraj", M, y, 13);
  for (const line of d.metres) for (const l of reg.wrap(line, 10, A4.w - 2 * M)) reg.draw(p2, l, M, (y -= 15), 10);
  if (d.price) {
    y -= 24;
    bold.draw(p2, "Teklif", M, y, 13);
    for (const l of d.price.lines) reg.draw(p2, reg.fit(l, 10, A4.w - 2 * M), M, (y -= 15), 10);
    bold.draw(p2, d.price.total, M, (y -= 18), 11);
  }
  if (d.warnings.length) {
    y -= 24;
    bold.draw(p2, "Geçiş uyarıları", M, y, 13);
    for (const w of d.warnings) for (const l of reg.wrap(w, 9.5, A4.w - 2 * M)) reg.draw(p2, l, M, (y -= 14), 9.5, SOFT);
  }
  reg.draw(p2, COLOR_NOTE, M, M + 12, 8.5, SOFT);
  reg.draw(p2, "Ölçüler girilen oda ve ürün ölçülerinden çizilmiştir; kesin ölçü yerinde alınır.", M, M, 8.5, SOFT);
  return doc.save();
}
