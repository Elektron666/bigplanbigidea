import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { EVENT_TYPES, parseEvent } from "@/lib/events";
import { MemoryRepository } from "@/lib/data/memory-repo";

// The event log of the Showroom package (task section 9).

describe("event records", () => {
  const base = { type: "kose_kuruldu", sessionId: "abcdefgh12" };

  it("knows every event type the task lists", () => {
    for (const t of ["oturum_basladi", "oturum_bitti", "model_goruntulendi", "kumas_denendi", "kartela_okutuldu", "foto_istendi", "foto_basarili", "foto_basarisiz", "kose_kuruldu", "teklif_olusturuldu", "siparis_talebi", "vitrin_basladi", "vitrin_bitti"]) {
      expect(EVENT_TYPES, t).toContain(t);
    }
  });

  it("keeps the zone, two numbers and the device-made id, and nothing it does not know", () => {
    const e = parseEvent({ ...base, zone: "kol", n: 5, n2: 315.4, clientId: "k_0123456789", name: "Ayşe Yılmaz", phone: "+905321234567", deviceId: "sahte" });
    expect(e).toMatchObject({ type: "kose_kuruldu", zone: "kol", n: 5, n2: 315.4, clientId: "k_0123456789" });
    // the customer's name never enters the log; the screen is set by the server, not by the request
    expect(JSON.stringify(e)).not.toContain("Ayşe");
    expect(JSON.stringify(e)).not.toContain("5321234567");
    expect(e?.deviceId).toBeUndefined();
  });

  it("drops odd values instead of storing them", () => {
    const e = parseEvent({ ...base, zone: "tavan", n: -3, n2: 1e9, clientId: "x" });
    expect(e).toMatchObject({ zone: null, n: null, n2: null, clientId: null });
    expect(parseEvent({ ...base, n: "12" })?.n).toBeNull();
  });

  it("stores a record sent twice once (memory store)", async () => {
    const repo = new MemoryRepository();
    const e = parseEvent({ ...base, clientId: "tekrar_000001" })!;
    await repo.recordEvent(e);
    await repo.recordEvent(e);
    await repo.recordEvent(parseEvent({ ...base, clientId: "tekrar_000002" })!);
    await repo.recordEvent(parseEvent(base)!); // an old-style record without an id is always stored
    const all = await repo.listEvents(new Date(0));
    expect(all.filter((x) => x.type === "kose_kuruldu")).toHaveLength(3);
  });
});

describe("event records in the database", () => {
  let db: PGlite;
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create schema auth; create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
      create schema storage; create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects (id serial primary key, bucket_id text, name text);
      create role anon; create role authenticated;
    `);
    const dir = path.join(process.cwd(), "supabase/migrations");
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) await db.exec(readFileSync(path.join(dir, f), "utf8"));
  }, 60_000);

  it("accepts the new types and refuses a made-up one", async () => {
    await db.query("insert into events (type, session_id, n, n2) values ('kose_kuruldu', 'abcdefgh12', 5, 315)");
    await expect(db.query("insert into events (type, session_id) values ('uydurma', 'abcdefgh12')")).rejects.toThrow();
    await expect(db.query("insert into events (type, session_id, zone) values ('kumas_denendi', 'abcdefgh12', 'tavan')")).rejects.toThrow();
  });

  it("stores the same device-made id once; the second insert is ignored, not an error", async () => {
    const sql = "insert into events (type, session_id, client_id) values ('kumas_denendi', 'abcdefgh12', 'cift_00000001') on conflict (client_id) where client_id is not null do nothing";
    await db.query(sql);
    await db.query(sql);
    expect((await db.query("select 1 from events where client_id = 'cift_00000001'")).rows).toHaveLength(1);
  });

  it("can be undone and applied again", async () => {
    const undo = readFileSync(path.join(process.cwd(), "supabase/geri-al/20261118000000_olay_kaydi.sql"), "utf8");
    await db.exec(undo);
    expect((await db.query("select 1 from information_schema.columns where table_name = 'events' and column_name = 'client_id'")).rows).toHaveLength(0);
    // the old events survive the undo
    expect((await db.query("select 1 from events where type = 'kumas_denendi'")).rows.length).toBeGreaterThan(0);
    await db.exec(readFileSync(path.join(process.cwd(), "supabase/migrations/20261118000000_olay_kaydi.sql"), "utf8"));
    expect((await db.query("select 1 from information_schema.columns where table_name = 'events' and column_name = 'client_id'")).rows).toHaveLength(1);
  });

  it("the monthly report function still runs over the new types", async () => {
    await db.query("insert into events (type, session_id, n) values ('kose_kuruldu', 'abcdefgh13', 4)");
    const r = await db.query<{ atelier_report: { counts: Record<string, number> } }>("select atelier_report(now() - interval '1 day', now() + interval '1 day', null)");
    expect(r.rows[0].atelier_report.counts.kose_kuruldu).toBe(1);
  });
});
