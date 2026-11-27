import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";

// Job 8 in the database: stock is not readable with the public key, links
// are; only ORMEN's staff writes them; a change reaches every shop's screen;
// the migration comes off and goes on again.

const STAFF = "eeeeeeee-0000-0000-0000-000000000002";
const OWNER = "eeeeeeee-0000-0000-0000-00000000000a";
const MIGRATION = "20261124000000_kumas_ozellik_stok.sql";
let db: PGlite;
let firm: string;
let a: string;
let b: string;

async function as<T>(uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set test.uid = '${uid ?? ""}'; set role ${uid ? "authenticated" : "anon"};`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role;");
  }
}
const q = async (uid: string | null, sql: string) => (await as(uid, () => db.query(sql))).rows as Record<string, unknown>[];
const version = async () => Number((await db.query<{ v: number }>(`select content_version as v from firms where id = '${firm}'`)).rows[0].v);

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
  // undo and apply again
  await db.exec(readFileSync(path.join(process.cwd(), "supabase/geri-al", MIGRATION), "utf8"));
  await db.exec(readFileSync(path.join(dir, MIGRATION), "utf8"));
  await db.exec(`
    grant usage on schema public to anon, authenticated;
    grant select, insert, update, delete on all tables in schema public to anon, authenticated;
    insert into auth.users values ('${STAFF}'), ('${OWNER}');
    insert into profiles (id, role) values ('${STAFF}', 'staff');
  `);
  firm = (await db.query<{ id: string }>("insert into firms (name, slug) values ('A Mobilya', 'a-mob') returning id")).rows[0].id;
  await db.exec(`insert into firm_members values ('${OWNER}', '${firm}');`);
  a = (await db.query<{ id: string }>("insert into fabrics (code, series, color_name, color_family, type) values ('LUMA-02', 'LUMA', 'Kum', 'bej-kum', 'bukle') returning id")).rows[0].id;
  b = (await db.query<{ id: string }>("insert into fabrics (code, series, color_name, color_family, type, stain_resistant) values ('LUMA-03', 'LUMA', 'Taş', 'bej-kum', 'bukle', true) returning id")).rows[0].id;
}, 120_000);

describe("fabric properties, stock and links in the database", () => {
  it("keeps a property unentered (null) unless set; nothing is filled in", async () => {
    const r = await q(null, "select code, stain_resistant, pet_resistant, easy_clean from fabrics order by code");
    expect(r).toEqual([
      { code: "LUMA-02", stain_resistant: null, pet_resistant: null, easy_clean: null },
      { code: "LUMA-03", stain_resistant: true, pet_resistant: null, easy_clean: null },
    ]);
  });

  it("lets only ORMEN's staff write stock, and nobody read it with the public or a shop's key", async () => {
    const before = await version();
    await as(STAFF, () => db.exec(`insert into fabric_stock (fabric_id, status, lead_days) values ('${a}', 'yok', 15)`));
    expect(await version()).toBe(before + 1);
    expect(await q(STAFF, "select status, lead_days from fabric_stock")).toEqual([{ status: "yok", lead_days: 15 }]);
    expect(await q(null, "select * from fabric_stock")).toEqual([]);
    expect(await q(OWNER, "select * from fabric_stock")).toEqual([]);
    await expect(as(OWNER, () => db.exec(`insert into fabric_stock (fabric_id, status) values ('${b}', 'var')`))).rejects.toThrow();
    await expect(as(STAFF, () => db.exec(`insert into fabric_stock (fabric_id, status) values ('${b}', 'bilmem')`))).rejects.toThrow();
    await expect(as(STAFF, () => db.exec(`insert into fabric_stock (fabric_id, status, lead_days) values ('${b}', 'yok', 0)`))).rejects.toThrow();
  });

  it("lets anyone read the muadil list, only staff write it, never a fabric to itself", async () => {
    await as(STAFF, () => db.exec(`insert into fabric_links (fabric_id, other_id, kind) values ('${a}', '${b}', 'muadil')`));
    expect(await q(null, "select kind from fabric_links")).toEqual([{ kind: "muadil" }]);
    await expect(as(OWNER, () => db.exec(`insert into fabric_links (fabric_id, other_id, kind) values ('${b}', '${a}', 'uyumlu')`))).rejects.toThrow();
    await expect(as(STAFF, () => db.exec(`insert into fabric_links (fabric_id, other_id, kind) values ('${a}', '${a}', 'muadil')`))).rejects.toThrow();
  });
});

describe("room photo sessions in the database (job 15)", () => {
  it("never lets a room photo session be kept for the shop", async () => {
    await db.exec(readFileSync(path.join(process.cwd(), "supabase/geri-al/20261127000300_salon.sql"), "utf8"));
    await db.exec(readFileSync(path.join(process.cwd(), "supabase/migrations/20261127000300_salon.sql"), "utf8"));
    await db.query(`insert into photo_sessions (code, firm_id, expires_at, purpose) values ('SALAN123', '${firm}', now() + interval '1 hour', 'salon')`);
    await expect(db.query("update photo_sessions set keep = true where code = 'SALAN123'")).rejects.toThrow();
    await db.query(`insert into photo_sessions (code, firm_id, expires_at) values ('KXLTUK12', '${firm}', now() + interval '1 hour')`);
    expect((await db.query<{ purpose: string }>("select purpose from photo_sessions where code = 'KXLTUK12'")).rows[0].purpose).toBe("koltuk");
  });
});
