// Fabric stock (Showroom package, job 8): var, az or yok, and the lead time
// in days, entered by hand in the panel or many at once from a CSV. Stock is
// not public: the server hands it only to the screens of shops that show it.
// Nothing is assumed: a fabric with no stock entry shows no stock at all, and
// an out-of-stock fabric without a lead time says so instead of a number.

export type StockStatus = "var" | "az" | "yok";
export const STOCK_STATUSES: StockStatus[] = ["var", "az", "yok"];
export const STOCK_LABELS: Record<StockStatus, string> = { var: "Stokta var", az: "Stokta az", yok: "Stokta yok" };
export const MAX_LEAD_DAYS = 365;
/** At most this many rows in one CSV upload. */
export const MAX_STOCK_ROWS = 2000;

export interface StockEntry {
  status: StockStatus;
  /** Lead time in days ("termin"), when entered. */
  leadDays?: number;
  updatedAt: string;
}

/** Stock by fabric code: what a screen gets. */
export type StockMap = Record<string, StockEntry>;

export function parseStatus(s: string | undefined): StockStatus | null {
  const t = (s ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (["var", "stokta", "stokta var", "mevcut"].includes(t)) return "var";
  if (["az", "stokta az", "sinirli"].includes(t)) return "az";
  if (["yok", "stokta yok", "bitti", "tukendi"].includes(t)) return "yok";
  return null;
}

/** "15", "15 gün", "" → 15 / undefined; anything else → NaN (an error). */
export function parseLeadDays(s: string | undefined): number | undefined {
  const t = (s ?? "").trim().replace(/\s*(gün|gun|g)\.?$/i, "");
  if (!t) return undefined;
  return /^\d+$/.test(t) ? Number(t) : NaN;
}

export function validateStock(status: StockStatus | null, leadDays: number | undefined): string | null {
  if (!status) return "Stok durumu var, az ya da yok olmalı.";
  if (leadDays !== undefined && !(Number.isInteger(leadDays) && leadDays >= 1 && leadDays <= MAX_LEAD_DAYS)) return `Termin 1 ile ${MAX_LEAD_DAYS} gün arasında tam sayı olmalı.`;
  return null;
}

export interface StockRow {
  code: string;
  status: StockStatus;
  leadDays?: number;
}
export interface StockCsvResult {
  rows: StockRow[];
  /** Line numbers as in the file (the header is line 1). */
  errors: { line: number; code: string; message: string }[];
}

/** Splits a CSV line on commas or semicolons (Excel in Turkish saves with ";"), quotes allowed. */
function cells(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}

const fold = (s: string) =>
  s
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\s-]+/g, "_");

/**
 * Reads a stock CSV: columns kod, stok, termin_gun (in any order; the header
 * names them). Every row is checked on its own: a bad row is reported with
 * its line number and the rest still go through. `codeOf` maps what was
 * written to a known fabric code, or null.
 */
export function parseStockCsv(text: string, codeOf: (written: string) => string | null): StockCsvResult {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const header = lines[0] ?? "";
  const sep = (header.match(/;/g)?.length ?? 0) > (header.match(/,/g)?.length ?? 0) ? ";" : ",";
  const names = cells(header, sep).map(fold);
  const col = (...alts: string[]) => names.findIndex((n) => alts.includes(n));
  const iCode = col("kod", "kumas_kodu", "kumas", "code");
  const iStatus = col("stok", "durum", "stok_durumu");
  const iLead = col("termin_gun", "termin", "termin_gunu", "termin_(gun)");
  const result: StockCsvResult = { rows: [], errors: [] };
  if (iCode < 0 || iStatus < 0) {
    result.errors.push({ line: 1, code: "", message: "Başlık satırında “kod” ve “stok” sütunları olmalı (termin_gun isteğe bağlı)." });
    return result;
  }
  const seen = new Map<string, number>();
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const line = i + 1;
    if (result.rows.length + result.errors.length >= MAX_STOCK_ROWS) {
      result.errors.push({ line, code: "", message: `Bir seferde en çok ${MAX_STOCK_ROWS} satır; kalanını ayrı dosyayla yükleyin.` });
      break;
    }
    const c = cells(lines[i], sep);
    const written = c[iCode] ?? "";
    const code = codeOf(written);
    if (!code) {
      result.errors.push({ line, code: written, message: written ? "Bu kodda kumaş yok." : "Kod boş." });
      continue;
    }
    const status = parseStatus(c[iStatus]);
    const leadDays = iLead >= 0 ? parseLeadDays(c[iLead]) : undefined;
    const bad = validateStock(status, leadDays);
    if (bad) {
      result.errors.push({ line, code, message: bad });
      continue;
    }
    const before = seen.get(code);
    if (before !== undefined) {
      result.errors.push({ line, code, message: `Bu kod ${before}. satırda da var; ilki alındı.` });
      continue;
    }
    seen.set(code, line);
    result.rows.push({ code, status: status!, leadDays });
  }
  return result;
}

/** What a screen writes next to a fabric: "Stokta yok · Termin 15 gün", or null when nothing was entered. */
export function stockLine(e: StockEntry | undefined): string | null {
  if (!e) return null;
  if (e.status !== "yok") return STOCK_LABELS[e.status];
  return e.leadDays ? `${STOCK_LABELS.yok} · Termin ${e.leadDays} gün` : `${STOCK_LABELS.yok} · Termini mağazaya sorun`;
}

/** The short label under a swatch: only for a fabric out of stock. */
export function swatchLabel(e: StockEntry | undefined): string | null {
  if (e?.status !== "yok") return null;
  return e.leadDays ? `Termin ${e.leadDays} gün` : "Stokta yok";
}

export const STOCK_CSV_EXAMPLE = "kod;stok;termin_gun\nSIENA-04;var;\nMISSO-05;az;\nLUMA-02;yok;15\n";
