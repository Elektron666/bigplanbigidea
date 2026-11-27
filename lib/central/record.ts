// A shop's own record at the centre, its maintenance fee and the templates new
// shops start from (Showroom package, job 0). Pure: shapes and checks.

import { cleanFeatures, type Feature } from "./features";

export interface ShopRecord {
  city: string | null;
  region: string | null;
  package: string | null;
  /** Free labels for the list's filter: lower case, a few words. */
  tags: string[];
  /** The person to call at the shop. */
  contact: string | null;
  /** YYYY-MM-DD */
  installedOn: string | null;
  updateMode: "otomatik" | "onayli";
  /** Seconds before the showroom loop starts; null = the default (60). */
  vitrinSn: number | null;
  /** Monthly photo try-ons; null = not set by ORMEN (then none are made). */
  aiQuota: number | null;
  /** The room plan's clearance ("geçiş payı", job 9), cm; null = the default (60). */
  gecisCm: number | null;
}

export const EMPTY_RECORD: ShopRecord = { city: null, region: null, package: null, tags: [], contact: null, installedOn: null, updateMode: "otomatik", vitrinSn: null, aiQuota: null, gecisCm: null };

const text = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim().replace(/\s+/g, " ");
  return t ? t.slice(0, max) : null;
};
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (v: string) => DATE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v);

/** "Siteler, pilot  ,Ankara" → ["siteler", "pilot", "ankara"]: lower case, no repeats, at most 8. */
export function cleanTags(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : [];
  const out: string[] = [];
  for (const x of list) {
    const t = typeof x === "string" ? x.trim().toLocaleLowerCase("tr").replace(/\s+/g, " ").slice(0, 30) : "";
    if (t && !out.includes(t)) out.push(t);
  }
  return out.slice(0, 8);
}

const intOrNull = (v: unknown, lo: number, hi: number): number | null | "hata" => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isInteger(n) && n >= lo && n <= hi ? n : "hata";
};

export function validateShopRecord(raw: unknown): { ok: true; value: ShopRecord } | { ok: false; error: string } {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const installedOn = text(r.installedOn, 10);
  if (installedOn && !validDate(installedOn)) return { ok: false, error: "Kurulum tarihi geçerli bir tarih olmalı." };
  const vitrinSn = intOrNull(r.vitrinSn, 30, 600);
  if (vitrinSn === "hata") return { ok: false, error: "Vitrin süresi 30–600 saniye arasında bir sayı olmalı." };
  const aiQuota = intOrNull(r.aiQuota, 0, 100_000);
  if (aiQuota === "hata") return { ok: false, error: "Kota 0 ya da daha büyük bir tam sayı olmalı." };
  const gecisCm = intOrNull(r.gecisCm, 30, 200);
  if (gecisCm === "hata") return { ok: false, error: "Geçiş payı 30–200 cm arasında bir tam sayı olmalı." };
  return {
    ok: true,
    value: {
      city: text(r.city, 60),
      region: text(r.region, 60),
      package: text(r.package, 40),
      tags: cleanTags(r.tags),
      contact: text(r.contact, 120),
      installedOn,
      updateMode: r.updateMode === "onayli" ? "onayli" : "otomatik",
      vitrinSn,
      aiQuota,
      gecisCm,
    },
  };
}

// ------------------------------------------------------------------ maintenance fee

export interface Subscription {
  id: string;
  amount: number | null;
  period: "aylik" | "yillik";
  /** YYYY-MM-DD */
  dueOn: string;
  paidOn: string | null;
  note: string | null;
}

export function validateSubscription(raw: unknown): { ok: true; value: Omit<Subscription, "id" | "paidOn"> } | { ok: false; error: string } {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const dueOn = text(r.dueOn, 10);
  if (!dueOn || !validDate(dueOn)) return { ok: false, error: "Son ödeme tarihini girin." };
  let amount: number | null = null;
  if (r.amount !== undefined && r.amount !== null && r.amount !== "") {
    const n = typeof r.amount === "number" ? r.amount : Number(String(r.amount).replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(n) || n < 0 || n > 100_000_000) return { ok: false, error: "Tutarı rakamla yazın." };
    amount = Math.round(n * 100) / 100;
  }
  return { ok: true, value: { amount, period: r.period === "yillik" ? "yillik" : "aylik", dueOn, note: text(r.note, 200) } };
}

/** Earliest unpaid due date, for the shop list ("bakım vadesi"). */
export function nextDue(subs: Pick<Subscription, "dueOn" | "paidOn">[]): string | null {
  return subs.filter((s) => !s.paidOn).map((s) => s.dueOn).sort()[0] ?? null;
}

// ------------------------------------------------------------------ templates

export interface ShopTemplate {
  id: string;
  name: string;
  features: Partial<Record<Feature, boolean>>;
  fabricSeries: string[];
  vitrinSn: number | null;
  aiQuota: number | null;
  updateMode: "otomatik" | "onayli";
  package: string | null;
}

export function validateTemplate(raw: unknown): { ok: true; value: Omit<ShopTemplate, "id"> } | { ok: false; error: string } {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const name = text(r.name, 60);
  if (!name || name.length < 2) return { ok: false, error: "Şablona bir ad verin." };
  const rec = validateShopRecord({ vitrinSn: r.vitrinSn, aiQuota: r.aiQuota, updateMode: r.updateMode, package: r.package });
  if (!rec.ok) return rec;
  const series = (Array.isArray(r.fabricSeries) ? r.fabricSeries : []).flatMap((x) => (typeof x === "string" && /^[A-ZÇĞİÖŞÜ0-9-]{2,30}$/.test(x) ? [x] : []));
  return {
    ok: true,
    value: { name, features: cleanFeatures(r.features), fabricSeries: [...new Set(series)], vitrinSn: rec.value.vitrinSn, aiQuota: rec.value.aiQuota, updateMode: rec.value.updateMode, package: rec.value.package },
  };
}
