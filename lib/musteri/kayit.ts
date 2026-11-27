// The customer's own contact (Showroom package, job 13), pure checks. A name
// and a phone are taken only with the consent box ticked by the customer
// (it comes unticked); the text it links to is ORMEN's, to be given.

import { normalisePhone } from "@/lib/samples";

export const RETENTION = { min: 7, max: 730 } as const;

export interface LeadInput {
  name: string;
  phone: string;
}

export function validateLead(raw: unknown): { ok: true; value: LeadInput } | { ok: false; error: string } {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  // the box must be ticked by the customer: nothing is stored without it
  if (r.consent !== true) return { ok: false, error: "Bilgilerinizi bırakmak için onay kutusunu işaretleyin." };
  const name = typeof r.name === "string" ? r.name.trim().replace(/\s+/g, " ") : "";
  if (name.length < 2 || name.length > 80) return { ok: false, error: "Adınızı yazın." };
  const phone = normalisePhone(typeof r.phone === "string" ? r.phone : "");
  if (!phone) return { ok: false, error: "Telefon numarasını 05xx xxx xx xx biçiminde yazın." };
  // stored as digits with the country code: "905321234567"
  return { ok: true, value: { name, phone: phone.replace(/\D/g, "") } };
}

export function cleanRetention(raw: unknown): number | null | "hata" {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= RETENTION.min && n <= RETENTION.max ? n : "hata";
}

/** "905321234567" → "0532 123 45 67". */
export function showPhone(digits: string): string {
  const d = digits.replace(/^90/, "");
  return d.length === 10 ? `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}` : digits;
}
