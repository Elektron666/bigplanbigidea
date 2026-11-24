import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { buildUsage, idleScreens, isEmpty, usageFromJson, usageOf } from "@/lib/rapor/kullanim";
import type { EventType, StoredEvent } from "@/lib/events";

// Job 11: the monthly usage report. The database's sums (usage_report())
// and the app's (lib/rapor/kullanim.ts) are run on the same event log and
// must agree number for number; a shop owner gets their own shop only.

const STAFF = "ffffffff-0000-0000-0000-000000000002";
const OWNER = "ffffffff-0000-0000-0000-00000000000a";
const MIGRATION = "20261124000100_kullanim_raporu.sql";
let db: PGlite;

async function as<T>(uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set test.uid = '${uid ?? ""}'; set role ${uid ? "authenticated" : "anon"};`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role;");
  }
}

const FROM = "2026-10-31T21:00:00.000Z"; // 1 November, Istanbul
const TO = "2026-11-30T20:59:59.999Z";

// a month of two shops, made up but varied: ties, events without a code, a visit with no end, one event outside the month
function seedEvents(): StoredEvent[] {
  const out: StoredEvent[] = [];
  let k = 0;
  const add = (firmSlug: string | null, type: EventType, over: Partial<StoredEvent> = {}, at = "2026-11-10T10:00:00.000Z") =>
    out.push({ type, firmSlug, createdAt: at, ...over, sessionId: `s-${firmSlug}-${over.sessionId ?? k++ % 7}-xxxxxx` } as StoredEvent);
  for (let i = 0; i < 9; i++) add("a-mob", "oturum_basladi");
  for (const n of [60, 125.5, 30, 300]) add("a-mob", "oturum_bitti", { n });
  add("a-mob", "oturum_bitti"); // no length: not counted in the time
  for (let i = 0; i < 12; i++) add("a-mob", "sayfa_acildi", { sessionId: `web${i % 5}` });
  const codes = ["LUMA-02", "LUMA-02", "LUMA-02", "MISSO-05", "MISSO-05", "SIENA-04", "SIENA-04", "PIETRA-03", "VERSO-03", "LUMA-03", "LUMA-04"];
  for (const c of codes) add("a-mob", "kumas_denendi", { fabricCode: c });
  add("a-mob", "kumas_denendi"); // no code: counted as a try, not ranked
  for (const m of ["kose-takimi", "kose-takimi", "lara-uclu", "roma", "berjer", "puf", "sehpa"]) add("a-mob", "model_goruntulendi", { modelSlug: m });
  for (const t of ["teklif_olusturuldu", "teklif_olusturuldu", "siparis_talebi", "kartela_okutuldu", "foto_istendi", "foto_basarili", "foto_basarili", "foto_basarisiz", "asistan_soru", "danisman_tamamlandi"] as EventType[]) add("a-mob", t);
  add("a-mob", "teklif_olusturuldu", {}, "2026-12-01T09:00:00.000Z"); // next month
  add("a-mob", "teklif_olusturuldu", {}, "2026-10-31T20:59:59.000Z"); // last month, by a second
  for (let i = 0; i < 3; i++) add("b-mob", "oturum_basladi");
  add("b-mob", "kumas_denendi", { fabricCode: "LUMA-05" });
  add(null, "kumas_denendi", { fabricCode: "LUMA-02" }); // ORMEN's own site: no shop
  return out;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
    create schema storage; create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id serial primary key, bucket_id text, name text);
    create role anon; create role authenticated;
  `);
  const dir = path.join(process.cwd(), "supabase/migrations");
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) await db.exec(readFileSync(path.join(dir, f), "utf8"));
  await db.exec(readFileSync(path.join(process.cwd(), "supabase/geri-al", MIGRATION), "utf8"));
  await db.exec(readFileSync(path.join(dir, MIGRATION), "utf8"));
  await db.exec(`
    grant usage on schema public to anon, authenticated;
    grant select, insert, update, delete on all tables in schema public to anon, authenticated;
    insert into auth.users values ('${STAFF}'), ('${OWNER}');
    insert into profiles (id, role) values ('${STAFF}', 'staff');
  `);
  const a = (await db.query<{ id: string }>("insert into firms (name, slug, is_active) values ('A Mobilya', 'a-mob', false) returning id")).rows[0].id;
  await db.query("insert into firms (name, slug) values ('B Mobilya', 'b-mob')");
  await db.exec(`insert into firm_members values ('${OWNER}', '${a}');`);
  for (const e of seedEvents())
    await db.query("insert into events (type, session_id, firm_slug, model_slug, fabric_code, n, created_at) values ($1, $2, $3, $4, $5, $6, $7)", [e.type, e.sessionId, e.firmSlug, e.modelSlug ?? null, e.fabricCode ?? null, e.n ?? null, e.createdAt]);
}, 120_000);

const report = async (uid: string, firm: string | null = null) =>
  usageFromJson((await as(uid, () => db.query<{ r: unknown }>("select public.usage_report($1, $2, $3) as r", [FROM, TO, firm]))).rows[0].r);

describe("the monthly usage report", () => {
  it("adds up in the database exactly as in the app, number for number", async () => {
    const fromDb = await report(STAFF);
    const fromApp = buildUsage(seedEvents(), new Date(FROM), new Date(TO));
    expect(fromDb).toEqual(fromApp);
    const a = usageOf(fromApp, "a-mob");
    // counted by hand from seedEvents()
    expect(a).toMatchObject({ sessions: 9, seconds: 515.5, ended: 4, webVisits: 5, fabricTries: 12, modelViews: 7, quotes: 2, orders: 1, kartela: 1, photoRequests: 1, photoOk: 2, photoFailed: 1, questions: 1, advisor: 1 });
    expect(a.topFabrics).toEqual([
      { code: "LUMA-02", n: 3 },
      { code: "MISSO-05", n: 2 },
      { code: "SIENA-04", n: 2 },
      { code: "LUMA-03", n: 1 },
      { code: "LUMA-04", n: 1 },
    ]);
    expect(a.topModels.map((m) => m.slug)).toEqual(["kose-takimi", "berjer", "lara-uclu", "puf", "roma"]);
  });

  it("gives a shop owner their own shop only, even a hidden one; the public nothing", async () => {
    expect((await report(OWNER)).map((u) => u.firmSlug)).toEqual(["a-mob"]);
    expect(await report(OWNER, "b-mob")).toEqual([]);
    const anon = await as(null, () => db.query<{ r: unknown }>("select public.usage_report($1, $2, null) as r", [FROM, TO]));
    expect(anon.rows[0].r).toEqual([]);
    expect((await as(OWNER, () => db.query("select distinct firm_slug from events"))).rows).toEqual([{ firm_slug: "a-mob" }]);
  });

  it("finds each screen's last visit; a shop owner only their own", async () => {
    const dev = (await db.query<{ id: string }>("insert into devices (firm_id, name, token_hash) select id, 'Ekran 1', repeat('a', 64) from firms where slug = 'a-mob' returning id")).rows[0].id;
    await db.query("insert into events (type, session_id, firm_slug, device_id, created_at) values ('oturum_basladi', 'dev-session-1', 'a-mob', $1, '2026-09-01T10:00:00Z'), ('oturum_basladi', 'dev-session-2', 'a-mob', $1, '2026-09-20T10:00:00Z')", [dev]);
    expect((await as(STAFF, () => db.query("select device_id, last_at from public.screen_last_sessions()"))).rows).toEqual([{ device_id: dev, last_at: new Date("2026-09-20T10:00:00Z") }]);
    expect((await as(OWNER, () => db.query("select device_id from public.screen_last_sessions()"))).rows).toHaveLength(1);
    expect((await as(null, () => db.query("select device_id from public.screen_last_sessions()"))).rows).toHaveLength(0);
  });

  it("says a month without use is empty, not missing", async () => {
    const none = usageFromJson((await as(STAFF, () => db.query<{ r: unknown }>("select public.usage_report('2026-01-01', '2026-01-31', 'a-mob') as r"))).rows[0].r);
    expect(none).toEqual([]);
    const u = usageOf(none, "a-mob");
    expect(isEmpty(u)).toBe(true);
    expect(u.sessions).toBe(0);
  });
});

describe("screens nobody uses", () => {
  it("warns about a screen unused for 30 days, not about one paired last week", () => {
    const now = Date.parse("2026-11-24T12:00:00Z");
    const devices = [
      { id: "old-used", firmId: "a", createdAt: "2026-01-01T00:00:00Z" },
      { id: "old-idle", firmId: "a", createdAt: "2026-01-01T00:00:00Z" },
      { id: "never-old", firmId: "a", createdAt: "2026-09-01T00:00:00Z" },
      { id: "never-new", firmId: "a", createdAt: "2026-11-20T00:00:00Z" },
    ];
    const last = { "old-used": "2026-11-23T10:00:00Z", "old-idle": "2026-10-01T10:00:00Z" };
    expect(idleScreens(devices, last, now).map((d) => [d.id, d.lastSessionAt])).toEqual([
      ["old-idle", "2026-10-01T10:00:00Z"],
      ["never-old", null],
    ]);
  });
});

describe("which months a report offers", () => {
  it("the last twelve, none before 2026; the last full month by default", async () => {
    const { pickMonth, reportMonths } = await import("@/lib/rapor/aylar");
    const now = new Date("2026-11-24T12:00:00Z");
    expect(reportMonths(now)).toEqual(["2026-11", "2026-10", "2026-09", "2026-08", "2026-07", "2026-06", "2026-05", "2026-04", "2026-03", "2026-02", "2026-01"]);
    expect(pickMonth(undefined, now)).toBe("2026-10");
    expect(pickMonth("2026-11", now)).toBe("2026-11");
    expect(pickMonth("2025-12", now)).toBe("2026-10");
    expect(pickMonth(undefined, new Date("2026-01-10T12:00:00Z"))).toBe("2026-01");
  });
});

describe("fabrics quoted most, by shop", () => {
  it("counts a fabric once per quote, by shop, most quoted first", async () => {
    const { tallyQuotedFabrics } = await import("@/lib/rapor/kullanim");
    expect(
      tallyQuotedFabrics([
        { firmId: "a", codes: ["LUMA-02", "LUMA-02", "MISSO-05"] },
        { firmId: "a", codes: ["LUMA-02"] },
        { firmId: "b", codes: ["LUMA-02"] },
      ]),
    ).toEqual([
      { firmId: "a", code: "LUMA-02", quotes: 2 },
      { firmId: "b", code: "LUMA-02", quotes: 1 },
      { firmId: "a", code: "MISSO-05", quotes: 1 },
    ]);
  });
});
