// The monthly usage report as a one-page PDF (Showroom package, job 11), for
// the shop's owner: made on the server from the same numbers as the report
// page, set in the quote PDF's fonts (Turkish characters included). A month
// without use says so in words; it is never an empty page.

import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { Face, type PdfFonts } from "@/lib/teklif/pdf";
import { averageSeconds, duration, isEmpty, type Usage } from "./kullanim";

const SOFT = rgb(0.42, 0.41, 0.39);
const LINE = rgb(0.85, 0.83, 0.8);
const A4 = { w: 595.28, h: 841.89 };
const M = 48;
const nf = new Intl.NumberFormat("tr-TR");

export interface UsagePdfData {
  shopName: string;
  monthLabel: string;
  usage: Usage;
  /** Fabric code → "LUMA · Kum"; model slug → its name in the shop. */
  fabricNames: Record<string, string>;
  modelNames: Record<string, string>;
  /** This month's photo try-on quota, when the shop has the feature and a quota: used and left. */
  quota: { used: number; left: number } | null;
  /** Where the owner opens the report in the panel. */
  link: string;
}

/** The tiles of the report, in order (the page and the PDF show the same). */
export function usageTiles(u: Usage): [string, string][] {
  return [
    ["Showroom oturumu", nf.format(u.sessions)],
    ["Ortalama oturum", duration(averageSeconds(u))],
    ["Toplam süre", duration(u.ended ? u.seconds : null)],
    ["Web sayfası ziyareti", nf.format(u.webVisits)],
    ["Kumaş denemesi", nf.format(u.fabricTries)],
    ["Teklif", nf.format(u.quotes)],
    ["Sipariş talebi", nf.format(u.orders)],
    ["Kartela okutma", nf.format(u.kartela)],
    ["Fotoğraftan dene", `${nf.format(u.photoOk)} görsel`],
    ["Asistan sorusu", nf.format(u.questions)],
  ];
}

export async function buildUsagePdf(d: UsagePdfData, fonts: PdfFonts): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`${d.shopName} · ${d.monthLabel} kullanım raporu`);
  doc.setAuthor("ORMEN Atelier");
  doc.setLanguage("tr-TR");
  const embed = async (pair: [Uint8Array, Uint8Array]) => new Face([await doc.embedFont(pair[0], { subset: true }), await doc.embedFont(pair[1], { subset: true })]);
  const reg = await embed(fonts.regular);
  const bold = await embed(fonts.bold);
  const page = doc.addPage([A4.w, A4.h]);
  const width = A4.w - 2 * M;
  let y = A4.h - M;

  bold.draw(page, reg.fit(d.shopName, 20, width), M, (y -= 20), 20);
  reg.draw(page, `${d.monthLabel} · showroom kullanım raporu`, M, (y -= 20), 12, SOFT);
  page.drawLine({ start: { x: M, y: (y -= 14) }, end: { x: A4.w - M, y }, thickness: 0.8, color: LINE });

  if (isEmpty(d.usage)) {
    y -= 40;
    bold.draw(page, "Bu ay kullanım yok.", M, y, 16);
    for (const line of reg.wrap("Bu ay showroom ekranında ve mağazanızın web sayfasında hiçbir kullanım kaydı yok. Ekran açık ve eşleştirilmiş durumdaysa ORMEN'e haber verin; birlikte bakalım.", 11, width)) reg.draw(page, line, M, (y -= 18), 11, SOFT);
  } else {
    // two columns of tiles
    const tiles = usageTiles(d.usage);
    const colW = (width - 16) / 2;
    y -= 16;
    tiles.forEach(([label, value], i) => {
      const x = M + (i % 2) * (colW + 16);
      const top = y - Math.floor(i / 2) * 46;
      page.drawRectangle({ x, y: top - 40, width: colW, height: 40, borderColor: LINE, borderWidth: 0.8 });
      reg.draw(page, label, x + 10, top - 15, 9, SOFT);
      bold.draw(page, value, x + 10, top - 32, 14);
    });
    y -= Math.ceil(tiles.length / 2) * 46 + 18;

    const list = (title: string, rows: { name: string; n: number }[], unit: string) => {
      bold.draw(page, title, M, (y -= 16), 11);
      if (!rows.length) {
        reg.draw(page, "Kayıt yok.", M, (y -= 16), 10, SOFT);
        return;
      }
      rows.forEach((r, i) => {
        y -= 16;
        reg.draw(page, `${i + 1}.`, M, y, 10, SOFT);
        reg.draw(page, reg.fit(r.name, 10, width - 110), M + 18, y, 10);
        const n = `${nf.format(r.n)} ${unit}`;
        reg.draw(page, n, A4.w - M - reg.width(n, 10), y, 10);
      });
    };
    list("En çok denenen 5 kumaş", d.usage.topFabrics.map((f) => ({ name: d.fabricNames[f.code] ? `${f.code} · ${d.fabricNames[f.code]}` : f.code, n: f.n })), "deneme");
    y -= 10;
    list("En çok bakılan 5 model", d.usage.topModels.map((m) => ({ name: d.modelNames[m.slug] ?? m.slug, n: m.n })), "kez");
    y -= 10;
    if (d.usage.photoRequests || d.quota) {
      bold.draw(page, "Fotoğraftan dene", M, (y -= 16), 11);
      reg.draw(page, `${nf.format(d.usage.photoRequests)} istek, ${nf.format(d.usage.photoOk)} görsel, ${nf.format(d.usage.photoFailed)} başarısız.`, M, (y -= 16), 10);
      if (d.quota) reg.draw(page, `Bu ayın kotası: ${nf.format(d.quota.used)} kullanıldı, ${nf.format(d.quota.left)} kaldı.`, M, (y -= 16), 10);
    }
  }

  // foot: what the numbers are, and where the report lives
  const foot = ["Sayılar showroom ekranının ve web sayfanızın anonim kullanım kaydından gelir; kişisel bilgi içermez.", `Raporun panelde: ${d.link}`];
  let fy = M + 16;
  for (const line of foot.reverse()) {
    reg.draw(page, reg.fit(line, 8.5, width), M, fy, 8.5, SOFT);
    fy += 13;
  }
  page.drawLine({ start: { x: M, y: fy }, end: { x: A4.w - M, y: fy }, thickness: 0.5, color: LINE });
  return doc.save();
}
