import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";

// The shop panel in the database: an owner changes how a product shows in
// their own shop, and its price, through two functions that check the shop is
// theirs and write the log themselves. Another shop's products are out of reach.

const ADMIN = "cccccccc-0000-0000-0000-000000000001";
const STAFF = "cccccccc-0000-0000-0000-000000000002";
const OWNER_A = "cccccccc-0000-0000-0000-00000000000a";
const OWNER_B = "cccccccc-0000-0000-0000-00000000000b";
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
    create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('email', 'sahip-' || current_setting('test.uid', true) || '@ornek.com') $$;
    create schema storage; create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id serial primary key, bucket_id text, name text);
    create role anon; create role authenticated;
  `);
  const dir = path.join(process.cwd(), "supabase/migrations");
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) await db.exec(readFileSync(path.join(dir, f), "utf8"));
  // undo and apply again
  await db.exec(readFileSync(path.join(process.cwd(), "supabase/geri-al/20261119000000_magaza_paneli.sql"), "utf8"));
  await db.exec(readFileSync(path.join(dir, "20261119000000_magaza_paneli.sql"), "utf8"));
  await db.exec(`
    grant usage on schema public to anon, authenticated;
    grant select, insert, update, delete on all tables in schema public to anon, authenticated;
    insert into auth.users values ('${ADMIN}'), ('${STAFF}'), ('${OWNER_A}'), ('${OWNER_B}');
    insert into profiles (id, role) values ('${ADMIN}', 'admin'), ('${STAFF}', 'staff');
  `);
  firmA = (await db.query<{ id: string }>("insert into firms (name, slug) values ('A Mobilya', 'a-mob') returning id")).rows[0].id;
  firmB = (await db.query<{ id: string }>("insert into firms (name, slug) values ('B Mobilya', 'b-mob') returning id")).rows[0].id;
  model = (
    await db.query<{ id: string }>(
      `insert into models (slug, name, procedural_key, width_cm, depth_cm, height_cm) values ('rota', 'Rota', 'modular-sofa', 220, 95, 85) returning id`,
    )
  ).rows[0].id;
  await db.exec(`
    insert into firm_members values ('${OWNER_A}', '${firmA}'), ('${OWNER_B}', '${firmB}');
    insert into firm_models (firm_id, model_id, sort_order) values ('${firmA}', '${model}', 0), ('${firmB}', '${model}', 0);
  `);
}, 120_000);

const call = (uid: string | null, firm: string, name: string) =>
  as(uid, () => db.query(`select public.shop_save_product('${firm}', '${model}', '${name}', 'K-1', null, true, false) as ok`));

describe("the shop panel in the database", () => {
  it("lets an owner rename a product in their own shop, and logs it as the owner", async () => {
    expect((await call(OWNER_A, firmA, "Rota Lüks")).rows).toEqual([{ ok: true }]);
    const row = (await db.query(`select display_name, product_code, featured from firm_models where firm_id = '${firmA}'`)).rows[0];
    expect(row).toEqual({ display_name: "Rota Lüks", product_code: "K-1", featured: true });
    const log = (await db.query(`select actor, actor_role, action, summary, before ->> 'displayName' as was from audit_log where firm_id = '${firmA}'`)).rows;
    expect(log).toEqual([{ actor: `sahip-${OWNER_A}@ornek.com`, actor_role: "sahip", action: "gosterim-degisti", summary: "A Mobilya: Rota Lüks mağazada değişti (mağaza)", was: null }]);
    // shop B's row is as it was
    expect((await db.query(`select display_name from firm_models where firm_id = '${firmB}'`)).rows[0]).toEqual({ display_name: null });
  });

  it("refuses another shop's product, ORMEN's accounts and anyone signed out", async () => {
    for (const uid of [OWNER_B, STAFF, ADMIN, null]) await expect(call(uid, firmA, "Başkası"), String(uid)).rejects.toThrow();
    expect((await db.query(`select display_name from firm_models where firm_id = '${firmA}'`)).rows[0]).toEqual({ display_name: "Rota Lüks" });
  });

  it("keeps the owner off firm_models itself", async () => {
    await as(OWNER_A, () => db.query(`update firm_models set sort_order = 9, display_name = 'x' where firm_id = '${firmA}'`));
    expect((await db.query(`select sort_order, display_name from firm_models where firm_id = '${firmA}'`)).rows[0]).toEqual({ sort_order: 0, display_name: "Rota Lüks" });
  });

  it("sets and takes away a price; the log says only that it changed", async () => {
    await as(OWNER_A, () => db.query(`select public.shop_set_price('${firmA}', '${model}', 34500)`));
    expect(await q(OWNER_A, "select price from firm_prices")).toEqual([{ price: "34500" }]);
    // shop B and ORMEN elemanı do not see it; the yönetici does
    expect(await q(OWNER_B, "select price from firm_prices")).toEqual([]);
    expect(await q(STAFF, "select price from firm_prices")).toEqual([]);
    expect(await q(ADMIN, "select price from firm_prices")).toHaveLength(1);
    const log = (await db.query(`select summary, before, after from audit_log where action = 'fiyat-degisti'`)).rows;
    expect(log).toEqual([{ summary: "A Mobilya: bir ürünün satış fiyatı değişti (mağaza)", before: null, after: null }]);
    await as(OWNER_A, () => db.query(`select public.shop_set_price('${firmA}', '${model}', null)`));
    expect(await q(ADMIN, "select price from firm_prices")).toEqual([]);
    await expect(as(OWNER_B, () => db.query(`select public.shop_set_price('${firmA}', '${model}', 1)`))).rejects.toThrow();
  });

  it("says false for a product the shop does not have", async () => {
    const other = (await db.query<{ id: string }>(`insert into models (slug, name, procedural_key, width_cm, depth_cm, height_cm) values ('yok', 'Yok', 'armchair', 80, 80, 80) returning id`)).rows[0].id;
    expect((await as(OWNER_A, () => db.query(`select public.shop_set_price('${firmA}', '${other}', 5) as ok`))).rows).toEqual([{ ok: false }]);
  });
});
