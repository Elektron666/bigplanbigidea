import "server-only";
import { randomBytes } from "node:crypto";
import { supabaseEnabled } from "@/lib/supabase/config";
import { serviceClient } from "@/lib/supabase/server";
import type { ItemStatus, TestItem, Verdict } from "./test-tezgahi";

// The photo try-on's own records (job 5): sessions with their one-time code,
// every provider call (quota and cost), the photos a shop kept. Memory or
// Supabase, as the other stores; every call here is made by the server.

/** A session lives at most this long, whatever happens on the screen (then its files are swept). */
export const SESSION_HOURS = 2;
const ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const SESSION_CODE = /^[0-9A-HJ-NP-Z]{8}$/;
export const newSessionCode = () => Array.from(randomBytes(8), (b) => ALPHABET[b % ALPHABET.length]).join("");

export interface PhotoSession {
  code: string;
  firmId: string;
  deviceId: string | null;
  createdAt: string;
  expiresAt: string;
  photoPath: string | null;
  photoFrom: "ekran" | "telefon" | "kayitli" | null;
  phoneUsed: boolean;
  keep: boolean;
  endedAt: string | null;
}

export type CallStatus = "basarili" | "basarisiz" | "zaman-asimi" | "kota";

export interface CallRow {
  kind: "giydirme" | "test" | "salon";
  firmId: string | null;
  deviceId: string | null;
  provider: string;
  fabricCode: string | null;
  ms: number;
  costUsd: number | null;
  status: CallStatus;
  error?: string | null;
}

export interface UsageRow {
  firmId: string | null;
  ok: number;
  failed: number;
  refused: number;
  costUsd: number;
  avgMs: number | null;
}

export interface GiydirmeStore {
  createSession(firmId: string, deviceId: string | null): Promise<PhotoSession>;
  /** An open session (not ended, not past its time), or null. */
  getSession(code: string): Promise<PhotoSession | null>;
  setPhoto(code: string, path: string, from: "ekran" | "telefon" | "kayitli"): Promise<void>;
  /** The phone's one upload: true when this call took it (the code takes no second one). */
  takePhoneTurn(code: string): Promise<boolean>;
  setKeep(code: string, keep: boolean): Promise<void>;
  /** Marks the session ended; returns it as it was (null when already ended or unknown). */
  endSession(code: string): Promise<PhotoSession | null>;
  /** Sessions past their time and not ended yet (to be swept). */
  expiredSessions(now: Date): Promise<PhotoSession[]>;

  logCall(c: CallRow): Promise<void>;
  /** Successful try-on pictures of the shop since the moment given (the quota counts these only). */
  countOk(firmId: string, sinceIso: string): Promise<number>;
  /** Per shop: pictures made, failed, refused by the quota, cost, average time, since the moment given. */
  usage(sinceIso: string, kind?: CallRow["kind"]): Promise<UsageRow[]>;

  addFirmPhoto(firmId: string, path: string): Promise<{ id: string }>;
  listFirmPhotos(firmId: string): Promise<{ id: string; path: string; createdAt: string }[]>;

  // the panel's test bench
  createRun(name: string, provider: string, fabricCodes: string[]): Promise<{ id: string }>;
  addItems(runId: string, items: { photoPath: string; fabricCode: string }[]): Promise<void>;
  listRuns(): Promise<TestRun[]>;
  getRun(id: string): Promise<TestRun | null>;
  updateItem(id: string, patch: { status: ItemStatus; resultPath?: string | null; ms?: number | null; costUsd?: number | null; error?: string | null }): Promise<void>;
  setVerdict(id: string, verdict: Verdict | null, note: string | null): Promise<boolean>;
}

export interface TestRun {
  id: string;
  name: string;
  createdAt: string;
  provider: string;
  fabricCodes: string[];
  items: TestItem[];
}

function summarise(rows: (CallRow & { at: string })[]): UsageRow[] {
  const by = new Map<string | null, UsageRow & { msSum: number; msN: number }>();
  for (const r of rows) {
    const u = by.get(r.firmId) ?? { firmId: r.firmId, ok: 0, failed: 0, refused: 0, costUsd: 0, avgMs: null, msSum: 0, msN: 0 };
    if (r.status === "basarili") u.ok++;
    else if (r.status === "kota") u.refused++;
    else u.failed++;
    u.costUsd += r.costUsd ?? 0;
    if (r.status === "basarili") {
      u.msSum += r.ms;
      u.msN++;
    }
    by.set(r.firmId, u);
  }
  return [...by.values()].map(({ msSum, msN, ...u }) => ({ ...u, costUsd: Math.round(u.costUsd * 10_000) / 10_000, avgMs: msN ? Math.round(msSum / msN) : null }));
}

// ------------------------------------------------------------------ memory

class MemoryGiydirme implements GiydirmeStore {
  private sessions = new Map<string, PhotoSession>();
  private calls: (CallRow & { at: string })[] = [];
  private photos: { id: string; firmId: string; path: string; createdAt: string }[] = [];

  async createSession(firmId: string, deviceId: string | null) {
    const now = Date.now();
    const s: PhotoSession = { code: newSessionCode(), firmId, deviceId, createdAt: new Date(now).toISOString(), expiresAt: new Date(now + SESSION_HOURS * 3_600_000).toISOString(), photoPath: null, photoFrom: null, phoneUsed: false, keep: false, endedAt: null };
    this.sessions.set(s.code, s);
    return { ...s };
  }
  async getSession(code: string) {
    const s = this.sessions.get(code);
    return s && !s.endedAt && Date.parse(s.expiresAt) > Date.now() ? { ...s } : null;
  }
  async setPhoto(code: string, path: string, from: "ekran" | "telefon" | "kayitli") {
    const s = this.sessions.get(code);
    if (s) Object.assign(s, { photoPath: path, photoFrom: from });
  }
  async takePhoneTurn(code: string) {
    const s = this.sessions.get(code);
    if (!s || s.phoneUsed) return false;
    s.phoneUsed = true;
    return true;
  }
  async setKeep(code: string, keep: boolean) {
    const s = this.sessions.get(code);
    if (s) s.keep = keep;
  }
  async endSession(code: string) {
    const s = this.sessions.get(code);
    if (!s || s.endedAt) return null;
    const before = { ...s };
    s.endedAt = new Date().toISOString();
    return before;
  }
  async expiredSessions(now: Date) {
    return [...this.sessions.values()].filter((s) => !s.endedAt && Date.parse(s.expiresAt) <= now.getTime()).map((s) => ({ ...s }));
  }
  async logCall(c: CallRow) {
    this.calls.push({ ...c, at: new Date().toISOString() });
  }
  async countOk(firmId: string, sinceIso: string) {
    return this.calls.filter((c) => c.kind === "giydirme" && c.firmId === firmId && c.status === "basarili" && c.at >= sinceIso).length;
  }
  async usage(sinceIso: string, kind?: CallRow["kind"]) {
    return summarise(this.calls.filter((c) => c.at >= sinceIso && (!kind || c.kind === kind)));
  }
  async addFirmPhoto(firmId: string, path: string) {
    const row = { id: crypto.randomUUID(), firmId, path, createdAt: new Date().toISOString() };
    this.photos.unshift(row);
    return { id: row.id };
  }
  async listFirmPhotos(firmId: string) {
    return this.photos.filter((p) => p.firmId === firmId).map(({ id, path, createdAt }) => ({ id, path, createdAt }));
  }

  private runs: TestRun[] = [];
  async createRun(name: string, provider: string, fabricCodes: string[]) {
    const run: TestRun = { id: crypto.randomUUID(), name, createdAt: new Date().toISOString(), provider, fabricCodes: [...fabricCodes], items: [] };
    this.runs.unshift(run);
    return { id: run.id };
  }
  async addItems(runId: string, items: { photoPath: string; fabricCode: string }[]) {
    const run = this.runs.find((r) => r.id === runId);
    if (!run) return;
    for (const i of items) run.items.push({ id: crypto.randomUUID(), photoPath: i.photoPath, fabricCode: i.fabricCode, resultPath: null, status: "bekliyor", ms: null, costUsd: null, error: null, verdict: null, note: null });
  }
  async listRuns() {
    return structuredClone(this.runs);
  }
  async getRun(id: string) {
    const r = this.runs.find((x) => x.id === id);
    return r ? structuredClone(r) : null;
  }
  private item(id: string) {
    for (const r of this.runs) for (const i of r.items) if (i.id === id) return i;
    return null;
  }
  async updateItem(id: string, patch: { status: ItemStatus; resultPath?: string | null; ms?: number | null; costUsd?: number | null; error?: string | null }) {
    const i = this.item(id);
    if (i) Object.assign(i, patch);
  }
  async setVerdict(id: string, verdict: Verdict | null, note: string | null) {
    const i = this.item(id);
    if (!i) return false;
    Object.assign(i, { verdict, note });
    return true;
  }
}

// ------------------------------------------------------------------ Supabase

type SessionRow = { code: string; firm_id: string; device_id: string | null; created_at: string; expires_at: string; photo_path: string | null; photo_from: PhotoSession["photoFrom"]; phone_used: boolean; keep: boolean; ended_at: string | null };
const fromRow = (r: SessionRow): PhotoSession => ({ code: r.code, firmId: r.firm_id, deviceId: r.device_id, createdAt: r.created_at, expiresAt: r.expires_at, photoPath: r.photo_path, photoFrom: r.photo_from, phoneUsed: r.phone_used, keep: r.keep, endedAt: r.ended_at });

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

class SupabaseGiydirme implements GiydirmeStore {
  private get db() {
    return serviceClient();
  }
  async createSession(firmId: string, deviceId: string | null) {
    const expires = new Date(Date.now() + SESSION_HOURS * 3_600_000).toISOString();
    for (let i = 0; i < 4; i++) {
      const res = await this.db.from("photo_sessions").insert({ code: newSessionCode(), firm_id: firmId, device_id: deviceId, expires_at: expires }).select("*").single();
      if (!res.error) return fromRow(res.data as SessionRow);
      if (res.error.code !== "23505") throw new Error(res.error.message);
    }
    throw new Error("Oturum açılamadı; yeniden deneyin.");
  }
  async getSession(code: string) {
    const r = check(await this.db.from("photo_sessions").select("*").eq("code", code).is("ended_at", null).gt("expires_at", new Date().toISOString()).maybeSingle()) as SessionRow | null;
    return r ? fromRow(r) : null;
  }
  async setPhoto(code: string, path: string, from: "ekran" | "telefon" | "kayitli") {
    check(await this.db.from("photo_sessions").update({ photo_path: path, photo_from: from }).eq("code", code));
  }
  async takePhoneTurn(code: string) {
    // one statement: two phones cannot both take the turn
    const rows = check(await this.db.from("photo_sessions").update({ phone_used: true }).eq("code", code).eq("phone_used", false).is("ended_at", null).select("code")) as unknown[];
    return rows.length > 0;
  }
  async setKeep(code: string, keep: boolean) {
    check(await this.db.from("photo_sessions").update({ keep }).eq("code", code));
  }
  async endSession(code: string) {
    const before = check(await this.db.from("photo_sessions").select("*").eq("code", code).is("ended_at", null).maybeSingle()) as SessionRow | null;
    if (!before) return null;
    const rows = check(await this.db.from("photo_sessions").update({ ended_at: new Date().toISOString() }).eq("code", code).is("ended_at", null).select("code")) as unknown[];
    return rows.length ? fromRow(before) : null;
  }
  async expiredSessions(now: Date) {
    return (check(await this.db.from("photo_sessions").select("*").is("ended_at", null).lte("expires_at", now.toISOString()).limit(200)) as SessionRow[]).map(fromRow);
  }
  async logCall(c: CallRow) {
    check(
      await this.db.from("ai_calls").insert({
        kind: c.kind, firm_id: c.firmId, device_id: c.deviceId, provider: c.provider, fabric_code: c.fabricCode, ms: Math.round(c.ms), cost_usd: c.costUsd, status: c.status, error: c.error?.slice(0, 300) ?? null,
      }),
    );
  }
  async countOk(firmId: string, sinceIso: string) {
    const res = await this.db.from("ai_calls").select("id", { count: "exact", head: true }).eq("kind", "giydirme").eq("firm_id", firmId).eq("status", "basarili").gte("at", sinceIso);
    if (res.error) throw new Error(res.error.message);
    return res.count ?? 0;
  }
  async usage(sinceIso: string, kind?: CallRow["kind"]) {
    let q = this.db.from("ai_calls").select("kind, firm_id, device_id, provider, fabric_code, ms, cost_usd, status, at").gte("at", sinceIso).limit(20_000);
    if (kind) q = q.eq("kind", kind);
    const rows = check(await q) as { kind: CallRow["kind"]; firm_id: string | null; device_id: string | null; provider: string; fabric_code: string | null; ms: number | null; cost_usd: number | string | null; status: CallStatus; at: string }[];
    return summarise(rows.map((r) => ({ kind: r.kind, firmId: r.firm_id, deviceId: r.device_id, provider: r.provider, fabricCode: r.fabric_code, ms: r.ms ?? 0, costUsd: r.cost_usd === null ? null : Number(r.cost_usd), status: r.status, at: r.at })));
  }
  async addFirmPhoto(firmId: string, path: string) {
    return check(await this.db.from("firm_photos").insert({ firm_id: firmId, path }).select("id").single()) as { id: string };
  }
  async createRun(name: string, provider: string, fabricCodes: string[]) {
    return check(await this.db.from("ai_test_runs").insert({ name, provider, fabric_codes: fabricCodes }).select("id").single()) as { id: string };
  }
  async addItems(runId: string, items: { photoPath: string; fabricCode: string }[]) {
    if (items.length) check(await this.db.from("ai_test_items").insert(items.map((i) => ({ run_id: runId, photo_path: i.photoPath, fabric_code: i.fabricCode }))));
  }
  private async runsWhere(id?: string): Promise<TestRun[]> {
    let q = this.db.from("ai_test_runs").select("*, ai_test_items(*)").order("created_at", { ascending: false }).limit(50);
    if (id) q = q.eq("id", id);
    type ItemRow = { id: string; photo_path: string; fabric_code: string; result_path: string | null; status: ItemStatus; ms: number | null; cost_usd: number | string | null; error: string | null; verdict: Verdict | null; note: string | null };
    const rows = check(await q) as { id: string; name: string; created_at: string; provider: string; fabric_codes: string[]; ai_test_items: ItemRow[] }[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      createdAt: r.created_at,
      provider: r.provider,
      fabricCodes: r.fabric_codes,
      items: r.ai_test_items
        .map((i) => ({ id: i.id, photoPath: i.photo_path, fabricCode: i.fabric_code, resultPath: i.result_path, status: i.status, ms: i.ms, costUsd: i.cost_usd === null ? null : Number(i.cost_usd), error: i.error, verdict: i.verdict, note: i.note }))
        .sort((a, b) => a.photoPath.localeCompare(b.photoPath) || a.fabricCode.localeCompare(b.fabricCode)),
    }));
  }
  async listRuns() {
    return this.runsWhere();
  }
  async getRun(id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    return (await this.runsWhere(id))[0] ?? null;
  }
  async updateItem(id: string, patch: { status: ItemStatus; resultPath?: string | null; ms?: number | null; costUsd?: number | null; error?: string | null }) {
    check(
      await this.db
        .from("ai_test_items")
        .update({ status: patch.status, ...(patch.resultPath !== undefined ? { result_path: patch.resultPath } : {}), ...(patch.ms !== undefined ? { ms: patch.ms } : {}), ...(patch.costUsd !== undefined ? { cost_usd: patch.costUsd } : {}), ...(patch.error !== undefined ? { error: patch.error?.slice(0, 300) ?? null } : {}) })
        .eq("id", id),
    );
  }
  async setVerdict(id: string, verdict: Verdict | null, note: string | null) {
    const rows = check(await this.db.from("ai_test_items").update({ verdict, note }).eq("id", id).select("id")) as unknown[];
    return rows.length > 0;
  }
  async listFirmPhotos(firmId: string) {
    const rows = check(await this.db.from("firm_photos").select("id, path, created_at").eq("firm_id", firmId).order("created_at", { ascending: false }).limit(50)) as { id: string; path: string; created_at: string }[];
    return rows.map((r) => ({ id: r.id, path: r.path, createdAt: r.created_at }));
  }
}

const holder = globalThis as unknown as { __ormenGiydirme?: GiydirmeStore };

export function getGiydirme(): GiydirmeStore {
  holder.__ormenGiydirme ??= supabaseEnabled() ? new SupabaseGiydirme() : new MemoryGiydirme();
  return holder.__ormenGiydirme;
}

export { MemoryGiydirme };
