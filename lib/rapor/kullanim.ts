// The monthly usage report (Showroom package, job 11), per shop: built from
// the event log only, so every number in it can be counted again from the
// log. The same sums are done in the database (usage_report() in
// 20261124000100_kullanim_raporu.sql) where Supabase is set up; this is the
// same thing for memory, and the test that the two agree.

import type { StoredEvent } from "@/lib/events";

export const TOP = 5;

export interface Usage {
  firmSlug: string;
  /** Showroom screen visits: "Başlamak için dokunun" to the end of the visit. */
  sessions: number;
  /** Seconds of the visits that ended (a visit cut off by a power cut has no end). */
  seconds: number;
  ended: number;
  /** Visits to the shop's web page (different visitors' tabs). */
  webVisits: number;
  fabricTries: number;
  topFabrics: { code: string; n: number }[];
  modelViews: number;
  topModels: { slug: string; n: number }[];
  quotes: number;
  orders: number;
  kartela: number;
  photoRequests: number;
  photoOk: number;
  photoFailed: number;
  questions: number;
  advisor: number;
}

export function emptyUsage(firmSlug: string): Usage {
  return { firmSlug, sessions: 0, seconds: 0, ended: 0, webVisits: 0, fabricTries: 0, topFabrics: [], modelViews: 0, topModels: [], quotes: 0, orders: 0, kartela: 0, photoRequests: 0, photoOk: 0, photoFailed: 0, questions: 0, advisor: 0 };
}

/** Nothing at all was recorded for the shop in the month. */
export function isEmpty(u: Usage): boolean {
  return !(u.sessions || u.webVisits || u.fabricTries || u.modelViews || u.quotes || u.orders || u.kartela || u.photoRequests || u.questions || u.advisor);
}

/** Average visit length in seconds, over the visits that ended; null when none did. */
export function averageSeconds(u: Usage): number | null {
  return u.ended ? Math.round(u.seconds / u.ended) : null;
}

const top = (m: Map<string, number>) =>
  [...m]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .slice(0, TOP);

/** Usage of every shop that has events in [from, to], by shop. */
export function buildUsage(events: StoredEvent[], from: Date, to: Date): Usage[] {
  const f = from.toISOString();
  const t = to.toISOString();
  const by = new Map<string, { u: Usage; web: Set<string>; fabrics: Map<string, number>; models: Map<string, number> }>();
  for (const e of events) {
    if (!e.firmSlug || e.createdAt < f || e.createdAt > t) continue;
    let x = by.get(e.firmSlug);
    if (!x) by.set(e.firmSlug, (x = { u: emptyUsage(e.firmSlug), web: new Set(), fabrics: new Map(), models: new Map() }));
    const u = x.u;
    switch (e.type) {
      case "oturum_basladi":
        u.sessions++;
        break;
      case "oturum_bitti":
        if (typeof e.n === "number") {
          u.seconds += e.n;
          u.ended++;
        }
        break;
      case "sayfa_acildi":
        x.web.add(e.sessionId);
        break;
      case "kumas_denendi":
        u.fabricTries++;
        if (e.fabricCode) x.fabrics.set(e.fabricCode, (x.fabrics.get(e.fabricCode) ?? 0) + 1);
        break;
      case "model_goruntulendi":
        u.modelViews++;
        if (e.modelSlug) x.models.set(e.modelSlug, (x.models.get(e.modelSlug) ?? 0) + 1);
        break;
      case "teklif_olusturuldu":
        u.quotes++;
        break;
      case "siparis_talebi":
        u.orders++;
        break;
      case "kartela_okutuldu":
        u.kartela++;
        break;
      case "foto_istendi":
        u.photoRequests++;
        break;
      case "foto_basarili":
        u.photoOk++;
        break;
      case "foto_basarisiz":
        u.photoFailed++;
        break;
      case "asistan_soru":
        u.questions++;
        break;
      case "danisman_tamamlandi":
        u.advisor++;
        break;
    }
  }
  return [...by.values()]
    .map(({ u, web, fabrics, models }) => ({ ...u, seconds: Math.round(u.seconds * 100) / 100, webVisits: web.size, topFabrics: top(fabrics).map(([code, n]) => ({ code, n })), topModels: top(models).map(([slug, n]) => ({ slug, n })) }))
    .sort((a, b) => (a.firmSlug < b.firmSlug ? -1 : 1));
}

/** One shop's usage, "kullanım yok" (all zero) when it has none. */
export function usageOf(all: Usage[], firmSlug: string): Usage {
  return all.find((u) => u.firmSlug === firmSlug) ?? emptyUsage(firmSlug);
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v)) ? Number(v) : 0);
const list = <K extends string>(v: unknown, key: K) =>
  Array.isArray(v) ? v.filter((x) => x && typeof x[key] === "string").map((x) => ({ [key]: x[key] as string, n: num(x.n) }) as Record<K, string> & { n: number }) : [];

/** The database's answer (jsonb) as Usage rows; unknown fields are dropped. */
export function usageFromJson(raw: unknown): Usage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r) => r && typeof r.firmSlug === "string")
    .map((r) => ({
      firmSlug: r.firmSlug,
      sessions: num(r.sessions),
      seconds: num(r.seconds),
      ended: num(r.ended),
      webVisits: num(r.webVisits),
      fabricTries: num(r.fabricTries),
      topFabrics: list(r.topFabrics, "code"),
      modelViews: num(r.modelViews),
      topModels: list(r.topModels, "slug"),
      quotes: num(r.quotes),
      orders: num(r.orders),
      kartela: num(r.kartela),
      photoRequests: num(r.photoRequests),
      photoOk: num(r.photoOk),
      photoFailed: num(r.photoFailed),
      questions: num(r.questions),
      advisor: num(r.advisor),
    }));
}

/** "1 sa 5 dk", "4 dk 10 sn", "35 sn". */
export function duration(seconds: number | null): string {
  if (seconds === null) return "—";
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h) return `${h} sa ${m} dk`;
  if (m) return r ? `${m} dk ${r} sn` : `${m} dk`;
  return `${r} sn`;
}

export const IDLE_SCREEN_DAYS = 30;

/**
 * Screens no visitor has used for 30 days: the last visit is older, or there
 * was none and the screen was paired more than 30 days ago (a screen paired
 * last week and not used yet is not a warning).
 */
export function idleScreens<D extends { id?: string; firmId: string; createdAt: string }>(devices: D[], lastSession: Record<string, string>, now = Date.now()): (D & { lastSessionAt: string | null })[] {
  const limit = new Date(now - IDLE_SCREEN_DAYS * 86_400_000).toISOString();
  return devices
    .filter((d) => d.id && (lastSession[d.id] ? lastSession[d.id] < limit : d.createdAt < limit))
    .map((d) => ({ ...d, lastSessionAt: (d.id && lastSession[d.id]) || null }));
}

/** Counts each fabric once per quote, by shop; most quoted first. */
export function tallyQuotedFabrics(rows: { firmId: string | null; codes: string[] }[]): { firmId: string | null; code: string; quotes: number }[] {
  const by = new Map<string, { firmId: string | null; code: string; quotes: number }>();
  for (const r of rows)
    for (const code of new Set(r.codes)) {
      const k = `${r.firmId ?? ""}|${code}`;
      const x = by.get(k) ?? { firmId: r.firmId, code, quotes: 0 };
      x.quotes++;
      by.set(k, x);
    }
  return [...by.values()].sort((a, b) => b.quotes - a.quotes || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
}
