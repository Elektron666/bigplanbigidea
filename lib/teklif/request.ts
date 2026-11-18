// What a screen sends for a quote, and how the server turns it into one
// (Showroom package, job 3). Pure.
//
// The screen sends only what was chosen: which model, which fabric on which
// zone, whether the pattern is turned. The metres are worked out again on the
// server from the centre's models and fabrics and ORMEN's waste settings, so
// the order that lands with ORMEN cannot carry a figure the screen made up.
// The quote's number and its phone link are made on the screen, so a quote
// made offline already has them, and the same quote sent twice is one quote.

import type { Fabric, FurnitureModel } from "@/lib/types";
import { cleanZones, zoneFabricsOf, type ZoneCodes } from "@/lib/three/zones";
import { codeUpper } from "@/lib/i18n/tr";
import { quoteMetres, type WasteSettings } from "./metraj";

export const QUOTE_NUMBER = /^T-[0-9A-HJ-NP-Z]{6}$/;
export const QUOTE_TOKEN = /^[A-Za-z0-9_-]{22,64}$/;
const CLIENT_ID = /^[A-Za-z0-9_-]{8,64}$/;
const SLUG = /^[a-z0-9-]{1,60}$/;
const CODE = /^[A-ZÇĞİÖŞÜ0-9-]{2,24}$/;
const ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const MAX_PIECES = 12;

export function newQuoteNumber(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `T-${Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("")}`;
}

/** 128 bits, URL-safe: the only key to the quote's phone page. */
export function newQuoteToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export interface QuotePieceInput {
  modelSlug: string;
  fabricCode: string;
  zones?: ZoneCodes;
  turned?: boolean;
}

export interface QuoteRequest {
  clientId: string;
  number: string;
  token: string;
  pieces: QuotePieceInput[];
  customerName: string | null;
  note: string | null;
  price: number | null;
  /** "ORMEN'e sipariş talebi gönder" pressed. */
  order: boolean;
  /** The page the quote was made on (ignored on a paired screen: its shop comes from its secret). */
  firmSlug: string | null;
}

const text = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim().replace(/\s+/g, " ");
  return t ? t.slice(0, max) : null;
};

export function parseQuoteRequest(raw: unknown): { ok: true; value: QuoteRequest } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Geçersiz istek." };
  const r = raw as Record<string, unknown>;
  if (typeof r.clientId !== "string" || !CLIENT_ID.test(r.clientId)) return { ok: false, error: "Geçersiz istek." };
  if (typeof r.number !== "string" || !QUOTE_NUMBER.test(r.number)) return { ok: false, error: "Geçersiz teklif numarası." };
  if (typeof r.token !== "string" || !QUOTE_TOKEN.test(r.token)) return { ok: false, error: "Geçersiz istek." };
  if (!Array.isArray(r.pieces) || r.pieces.length < 1 || r.pieces.length > MAX_PIECES) return { ok: false, error: `Teklifte 1–${MAX_PIECES} parça olabilir.` };
  const pieces: QuotePieceInput[] = [];
  for (const p of r.pieces as Record<string, unknown>[]) {
    if (!p || typeof p.modelSlug !== "string" || !SLUG.test(p.modelSlug) || typeof p.fabricCode !== "string") return { ok: false, error: "Geçersiz parça." };
    const fabricCode = codeUpper(p.fabricCode);
    if (!CODE.test(fabricCode)) return { ok: false, error: "Geçersiz kumaş kodu." };
    let zones: ZoneCodes | undefined;
    if (p.zones && typeof p.zones === "object") {
      const z: ZoneCodes = {};
      for (const [k, v] of Object.entries(p.zones as Record<string, unknown>)) {
        if (!["govde", "kol", "oturak", "sirt", "biye"].includes(k) || typeof v !== "string" || !CODE.test(codeUpper(v))) return { ok: false, error: "Geçersiz bölge kumaşı." };
        z[k as keyof ZoneCodes] = codeUpper(v);
      }
      zones = cleanZones(fabricCode, z);
    }
    pieces.push({ modelSlug: p.modelSlug, fabricCode, ...(zones ? { zones } : {}), ...(p.turned === true ? { turned: true } : {}) });
  }
  let price: number | null = null;
  if (r.price !== undefined && r.price !== null && r.price !== "") {
    const n = typeof r.price === "number" ? r.price : Number(String(r.price).replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(n) || n < 0 || n > 100_000_000) return { ok: false, error: "Fiyatı rakamla yazın." };
    price = Math.round(n * 100) / 100;
  }
  return {
    ok: true,
    value: {
      clientId: r.clientId,
      number: r.number,
      token: r.token,
      pieces,
      customerName: text(r.customerName, 80),
      note: text(r.note, 300),
      price,
      order: r.order === true,
      firmSlug: typeof r.firmSlug === "string" && SLUG.test(r.firmSlug) ? r.firmSlug : null,
    },
  };
}

/** Stored with the quote: enough to show it again and to print it, without the catalogue. */
export interface QuoteContent {
  pieces: (QuotePieceInput & { modelName: string })[];
  rows: { piece: string; part: string; fabricCode: string; metres: number | null; withWaste: number | null; wastePercent: number | null; reason?: string }[];
  totals: { code: string; colorName: string; series: string; metres: number | null; withWaste: number | null; total: number | null; explanation: string[]; reasons: string[] }[];
  waste: WasteSettings;
}

/**
 * The quote from the chosen pieces, with the centre's own models and fabrics.
 * A model or fabric this page does not offer refuses the quote.
 */
export function buildQuote(
  pieces: QuotePieceInput[],
  catalogue: { models: FurnitureModel[]; fabrics: Fabric[] },
  waste: WasteSettings,
): { ok: true; content: QuoteContent; totals: { code: string; metres: number }[]; wasteMissing: boolean; complete: boolean } | { ok: false; error: string } {
  const bySlug = new Map(catalogue.models.map((m) => [m.slug, m]));
  const byCode = new Map(catalogue.fabrics.map((f) => [f.code, f]));
  const inputs = [];
  for (const p of pieces) {
    const model = bySlug.get(p.modelSlug);
    const fabric = byCode.get(p.fabricCode);
    if (!model) return { ok: false, error: "Bu model bu sayfada yok." };
    if (!fabric) return { ok: false, error: `${p.fabricCode} bu sayfada yok.` };
    if (Object.values(p.zones ?? {}).some((c) => c && !byCode.has(c))) return { ok: false, error: "Bölge kumaşlarından biri bu sayfada yok." };
    inputs.push({ model, fabric, zoneFabrics: zoneFabricsOf(p, byCode), turned: p.turned });
  }
  const m = quoteMetres(inputs, waste);
  const content: QuoteContent = {
    pieces: pieces.map((p) => ({ ...p, modelName: bySlug.get(p.modelSlug)!.name })),
    rows: m.rows.map((r) => ({ piece: r.piece, part: r.part, fabricCode: r.fabric.code, metres: r.metres, withWaste: r.withWaste, wastePercent: r.wastePercent, ...(r.reason ? { reason: r.reason } : {}) })),
    totals: m.totals.map((t) => ({ code: t.fabric.code, colorName: t.fabric.colorName, series: t.fabric.series, metres: t.metres, withWaste: t.withWaste, total: t.total, explanation: t.explanation, reasons: t.reasons })),
    waste,
  };
  return {
    ok: true,
    content,
    totals: m.totals.flatMap((t) => (t.total === null ? [] : [{ code: t.fabric.code, metres: t.total }])),
    wasteMissing: m.wasteMissing,
    complete: m.complete,
  };
}
