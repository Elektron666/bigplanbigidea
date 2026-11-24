// Fabric properties and the customer's filters (Showroom package, job 8).
// ORMEN marks three properties by hand: stain resistant, pet resistant, easy
// to clean; wear (Martindale) and composition were already on the fabric.
// A property not entered is undefined: it is never shown, never matched by a
// filter, and never worked out from the fabric's type. The filters speak the
// customer's language and say which marks they read, so a result can always
// be explained.

import type { Fabric } from "@/lib/types";

export type PropertyKey = "stainResistant" | "petResistant" | "easyClean";
export const PROPERTY_KEYS: PropertyKey[] = ["stainResistant", "petResistant", "easyClean"];
export const PROPERTY_LABELS: Record<PropertyKey, string> = {
  stainResistant: "Leke tutmaz",
  petResistant: "Evcil hayvana dayanıklı",
  easyClean: "Kolay temizlenir",
};

/** The properties marked "yes", in order; the ones marked "no" or not entered are left out. */
export function propertyLabels(f: Fabric): string[] {
  return PROPERTY_KEYS.filter((k) => f[k] === true).map((k) => PROPERTY_LABELS[k]);
}

export type Need = "cocuk" | "evcil" | "temizlik";
export const NEEDS: Need[] = ["cocuk", "evcil", "temizlik"];
export const NEED_LABELS: Record<Need, string> = { cocuk: "Çocuklu ev", evcil: "Evcil hayvan", temizlik: "Kolay temizlik" };
/** Which marks each filter reads, in words (shown under the filters, and in KARARLAR). */
export const NEED_RULES: Record<Need, string> = {
  cocuk: "leke tutmaz ya da kolay temizlenir olarak girilmiş kumaşlar",
  evcil: "evcil hayvana dayanıklı olarak girilmiş kumaşlar",
  temizlik: "kolay temizlenir olarak girilmiş kumaşlar",
};

export function meetsNeed(f: Fabric, need: Need): boolean {
  if (need === "cocuk") return f.stainResistant === true || f.easyClean === true;
  if (need === "evcil") return f.petResistant === true;
  return f.easyClean === true;
}

/** A fabric meets every chosen need. */
export function meetsNeeds(f: Fabric, needs: Iterable<Need>): boolean {
  for (const n of needs) if (!meetsNeed(f, n)) return false;
  return true;
}

/** The filters worth showing: those at least one of these fabrics meets. */
export function availableNeeds(fabrics: Fabric[]): Need[] {
  return NEEDS.filter((n) => fabrics.some((f) => meetsNeed(f, n)));
}

/** "evet" / "hayır" / "" (and their spellings) → true / false / undefined; anything else is an error. */
export function parseYesNo(s: string | undefined): { ok: true; value: boolean | undefined } | { ok: false } {
  const t = (s ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (!t || t === "-") return { ok: true, value: undefined };
  if (["evet", "e", "var", "1", "x", "yes"].includes(t)) return { ok: true, value: true };
  if (["hayir", "h", "yok", "0", "no"].includes(t)) return { ok: true, value: false };
  return { ok: false };
}
