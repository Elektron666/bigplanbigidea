import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";

// Module sets in the database (job 4, second part): who reads and writes
// them, that a shop's screens hear about a set given to it or changed, and
// that the migration comes off and goes on again.

const ADMIN = "dddddddd-0000-0000-0000-000000000001";
const STAFF = "dddddddd-0000-0000-0000-000000000002";
const OWNER = "dddddddd-0000-0000-0000-00000000000a";
let db: PGlite;
let firmA: string;
let firmB: string;

async function as<T>(uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set test.uid = '${uid ?? ""}'; set role ${uid ? "authenticated" : "anon"};`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role;");
  }
}
const q = async (uid: string | null, sql: string) => (await as(uid, () => db.query(sql))).rows as Record<string, unknown>[];
const version = async (id: string) => Number((await db.query<{ v: number }>(`select content_version as v from firms where id = '${id}'`)).rows[0].v);

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
  await db.exec(readFileSync(path.join(process.cwd(), "supabase/geri-al/20261119000100_modul_setleri.sql"), "utf8"));
  await db.exec(readFileSync(path.join(dir, "20261119000100_modul_setleri.sql"), "utf8"));
  await db.exec(`
    grant usage on schema public to anon, authenticated;
    grant select, insert, update, delete on all tables in schema public to anon, authenticated;
    insert into auth.users values ('${ADMIN}'), ('${STAFF}'), ('${OWNER}');
    insert into profiles (id, role) values ('${ADMIN}', 'admin'), ('${STAFF}', 'staff');
  `);
  firmA = (await db.query<{ id: string }>("insert into firms (name, slug) values ('A Mobilya', 'a-mob') returning id")).rows[0].id;
  firmB = (await db.query<{ id: string }>("insert into firms (name, slug) values ('B Mobilya', 'b-mob') returning id")).rows[0].id;
  await db.exec(`insert into firm_members values ('${OWNER}', '${firmA}');`);
}, 120_000);

describe("module sets in the database", () => {
  let setId: string;

  it("lets ORMEN's staff enter a set, its modules and its shops; nobody else", async () => {
    setId = (await as(STAFF, () => db.query<{ id: string }>("insert into module_sets (slug, name) values ('lina', 'Lina') returning id"))).rows[0].id;
    await as(STAFF, () =>
      db.exec(`
        insert into module_set_modules (set_id, key, type, name, width_cm, depth_cm, height_cm, glb_path, metres)
        values ('${setId}', 'kol-sol', 'kol-sol', 'Sol kol', 25, 98, 84, 'moduller/lina-kol.glb', '{"zones":{"kol":0.9}}'),
               ('${setId}', 'tekli', 'tekli', 'Oturum', 90, 98, 84, null, null);
      `),
    );
    for (const uid of [OWNER, null]) {
      await expect(as(uid, () => db.query("insert into module_sets (slug, name) values ('baska', 'Başka')")), String(uid)).rejects.toThrow();
    }
    // a set's own rule: a corner must be square is the app's; the database keeps sizes positive and types known
    await expect(as(STAFF, () => db.query(`insert into module_set_modules (set_id, key, type, name, width_cm, depth_cm, height_cm) values ('${setId}', 'x', 'sandalye', 'X', 1, 1, 1)`))).rejects.toThrow();
    await expect(as(STAFF, () => db.query(`insert into module_set_modules (set_id, key, type, name, width_cm, depth_cm, height_cm) values ('${setId}', 'y', 'tekli', 'Y', 0, 1, 1)`))).rejects.toThrow();
  });

  it("raises the version of the shops given the set, when given and when changed; not the others", async () => {
    const [a0, b0] = [await version(firmA), await version(firmB)];
    await as(STAFF, () => db.query(`insert into module_set_firms values ('${setId}', '${firmA}')`));
    expect(await version(firmA)).toBe(a0 + 1);
    await as(STAFF, () => db.query(`update module_set_modules set width_cm = 92 where set_id = '${setId}'`));
    expect(await version(firmA)).toBe(a0 + 2);
    await as(STAFF, () => db.query(`update module_sets set name = 'Lina köşe' where id = '${setId}'`));
    expect(await version(firmA)).toBe(a0 + 3);
    expect(await version(firmB)).toBe(b0);
  });

  it("shows an active set to anyone (the pages read it signed out); a set taken off only to ORMEN", async () => {
    expect(await q(null, "select count(*)::int as n from module_set_modules")).toEqual([{ n: 2 }]);
    await as(STAFF, () => db.query(`update module_sets set is_active = false where id = '${setId}'`));
    expect(await q(null, "select count(*)::int as n from module_sets")).toEqual([{ n: 0 }]);
    expect(await q(null, "select count(*)::int as n from module_set_modules")).toEqual([{ n: 0 }]);
    expect(await q(STAFF, "select count(*)::int as n from module_set_modules")).toEqual([{ n: 2 }]);
  });

  it("lets only the yönetici delete a set; staff take it off instead", async () => {
    await as(STAFF, () => db.query(`delete from module_sets where id = '${setId}'`));
    expect(await q(ADMIN, `select count(*)::int as n from module_sets where id = '${setId}'`)).toEqual([{ n: 1 }]);
    await as(ADMIN, () => db.query(`delete from module_sets where id = '${setId}'`));
    expect(await q(ADMIN, "select count(*)::int as n from module_set_modules")).toEqual([{ n: 0 }]);
  });
});
