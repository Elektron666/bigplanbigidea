import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";

// Job 7 in the database: group prices are the shop's own; only its owner
// (through the checked function) and ORMEN's yönetici touch them; the public
// key reads none. The migration comes off and goes on again.

const ADMIN = "abababab-0000-0000-0000-000000000001";
const STAFF = "abababab-0000-0000-0000-000000000002";
const OWNER = "abababab-0000-0000-0000-00000000000a";
const MIGRATION = "20261127000000_satici_modu.sql";
let db: PGlite;
let firmA: string;
let firmB: string;
let model: string;

async function as<T>(uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set test.uid = '${uid ?? ""}'; set role ${uid ? "authenticated" : "anon"};`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role;");
  }
}
const q = async (uid: string | null, sql: string) => (await as(uid, () => db.query(sql))).rows as Record<string, unknown>[];

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
    insert into auth.users values ('${ADMIN}'), ('${STAFF}'), ('${OWNER}');
    insert into profiles (id, role) values ('${ADMIN}', 'admin'), ('${STAFF}', 'staff');
  `);
  firmA = (await db.query<{ id: string }>("insert into firms (name, slug) values ('A Mobilya', 'a-mob') returning id")).rows[0].id;
  firmB = (await db.query<{ id: string }>("insert into firms (name, slug) values ('B Mobilya', 'b-mob') returning id")).rows[0].id;
  model = (await db.query<{ id: string }>("insert into models (slug, name, procedural_key, width_cm, depth_cm, height_cm) values ('lara', 'Lara', 'modular-sofa', 220, 95, 85) returning id")).rows[0].id;
  await db.exec(`insert into firm_members values ('${OWNER}', '${firmA}'); insert into firm_models (firm_id, model_id) values ('${firmA}', '${model}'), ('${firmB}', '${model}');`);
}, 120_000);

describe("group prices in the database", () => {
  it("lets ORMEN put a fabric in a price group, only a short code", async () => {
    await db.query("insert into fabrics (code, series, color_name, color_family, type, price_group) values ('LUMA-02', 'LUMA', 'Kum', 'bej-kum', 'bukle', 'B')");
    await expect(db.query("insert into fabrics (code, series, color_name, color_family, type, price_group) values ('LUMA-03', 'LUMA', 'Taş', 'bej-kum', 'bukle', 'çok uzun')")).rejects.toThrow();
  });

  it("lets the owner set their own shop's group price through the function, logged without the price; not another shop's", async () => {
    expect((await q(OWNER, `select public.shop_set_group_price('${firmA}', '${model}', 'B', 52000) as ok`))[0].ok).toBe(true);
    expect(await q(OWNER, "select price_group, price from firm_group_prices")).toEqual([{ price_group: "B", price: "52000" }]);
    await expect(as(OWNER, () => db.query(`select public.shop_set_group_price('${firmB}', '${model}', 'B', 1)`))).rejects.toThrow();
    await expect(as(OWNER, () => db.query(`insert into firm_group_prices (firm_id, model_id, price_group, price) values ('${firmA}', '${model}', 'C', 1)`))).rejects.toThrow();
    const log = await q(ADMIN, "select summary from audit_log where action = 'fiyat-degisti'");
    expect(log[0].summary).toBe("A Mobilya: bir ürünün B grubu satış fiyatı değişti (mağaza)");
    expect(String(log[0].summary)).not.toContain("52");
  });

  it("shows the prices to nobody else: not the public key, not ORMEN elemanı", async () => {
    expect(await q(null, "select * from firm_group_prices")).toEqual([]);
    expect(await q(STAFF, "select * from firm_group_prices")).toEqual([]);
    expect(await q(ADMIN, "select price from firm_group_prices")).toHaveLength(1);
  });
});
