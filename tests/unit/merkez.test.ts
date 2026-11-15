import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";

// The central panel's database rules (Showroom package, job 0), on an
// in-process Postgres: who may read and write what, that a shop never sees
// another shop's rows, and that content versions move when they should.

const STUBS = `
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id serial primary key, bucket_id text, name text);
  alter table storage.objects enable row level security;
  create role anon; create role authenticated;
`;
const GRANTS = `
  grant usage on schema public to anon, authenticated;
  grant select, insert, update, delete on all tables in schema public to anon, authenticated;
`;

const ADMIN = "aaaaaaaa-0000-0000-0000-000000000001";
const STAFF = "aaaaaaaa-0000-0000-0000-000000000002";
const OWNER_A = "aaaaaaaa-0000-0000-0000-00000000000a";
const OWNER_B = "aaaaaaaa-0000-0000-0000-00000000000b";

let db: PGlite;
let firmA: string;
let firmB: string;
let shared: string;
let ownA: string;

const dir = path.join(process.cwd(), "supabase/migrations");
const files = () => readdirSync(dir).filter((x) => x.endsWith(".sql")).sort();
const MERKEZ = "20261115000000_merkez.sql";

async function as<T>(uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set test.uid = '${uid ?? ""}'; set role ${uid ? "authenticated" : "anon"};`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role;");
  }
}
const rows = async <T,>(uid: string | null, sql: string) => (await as(uid, () => db.query<T>(sql))).rows;
const version = async (id: string) => Number((await db.query<{ content_version: string }>("select content_version from firms where id = $1", [id])).rows[0].content_version);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(STUBS);
  for (const f of files()) await db.exec(readFileSync(path.join(dir, f), "utf8"));
  // the undo file really undoes it, and the migration applies again afterwards
  await db.exec(readFileSync(path.join(process.cwd(), "supabase/geri-al", MERKEZ), "utf8"));
  const left = await db.query("select 1 from information_schema.columns where table_schema = 'public' and table_name = 'firms' and column_name = 'content_version'");
  expect(left.rows).toHaveLength(0);
  await db.exec(readFileSync(path.join(dir, MERKEZ), "utf8"));
  await db.exec(GRANTS);

  await db.exec(`
    insert into auth.users values ('${ADMIN}'), ('${STAFF}'), ('${OWNER_A}'), ('${OWNER_B}');
    insert into profiles (id, role) values ('${ADMIN}', 'admin'), ('${STAFF}', 'staff');
    insert into fabrics (code, series, color_name, color_family, type) values ('SIENA-01', 'SIENA', 'Krem', 'beyaz-krem', 'dokuma');
  `);
  const firm = async (name: string, slug: string) => (await db.query<{ id: string }>("insert into firms (name, slug) values ($1, $2) returning id", [name, slug])).rows[0].id;
  firmA = await firm("A Mobilya", "a-mobilya");
  firmB = await firm("B Mobilya", "b-mobilya");
  await db.exec(`insert into firm_members (user_id, firm_id) values ('${OWNER_A}', '${firmA}'), ('${OWNER_B}', '${firmB}');`);
  const model = async (slug: string, firmId: string | null) =>
    (await db.query<{ id: string }>("insert into models (slug, name, firm_id, procedural_key, width_cm, depth_cm, height_cm) values ($1, $1, $2, 'armchair', 90, 90, 90) returning id", [slug, firmId])).rows[0].id;
  shared = await model("ortak-uclu", null);
  ownA = await model("a-ozel", firmA);
  await db.exec(`
    insert into firm_models (firm_id, model_id) values ('${firmA}', '${shared}'), ('${firmB}', '${shared}');
    insert into firm_prices (firm_id, model_id, price) values ('${firmA}', '${shared}', 42000), ('${firmB}', '${shared}', 39000);
    insert into subscriptions (firm_id, amount, due_on) values ('${firmA}', 2500, '2026-12-01');
    insert into devices (firm_id, name, token_hash) values ('${firmA}', 'Giriş ekranı', '${"a".repeat(64)}'), ('${firmB}', 'Vitrin', '${"b".repeat(64)}');
    insert into firm_admin (firm_id, contact, pin_hash) values ('${firmA}', 'Ali Bey', 'x'), ('${firmB}', 'Veli Bey', 'y');
    insert into audit_log (actor, actor_role, firm_id, entity, action, summary) values ('test', 'sistem', '${firmA}', 'magaza', 'acildi', 'A açıldı');
  `);
}, 120_000);

describe("merkez: who sees what", () => {
  it("shows a visitor none of the new tables", async () => {
    for (const t of ["firm_members", "firm_admin", "firm_templates", "subscriptions", "firm_prices", "firm_fabric_off", "devices", "device_pairings", "audit_log"]) {
      expect(await rows(null, `select * from ${t}`), t).toHaveLength(0);
    }
  });

  it("keeps the PIN, the contact and the price out of the public firm and assignment rows", async () => {
    const firm = (await rows<Record<string, unknown>>(null, "select * from firms limit 1"))[0];
    expect(Object.keys(firm)).not.toContain("pin_hash");
    expect(Object.keys(firm)).not.toContain("contact");
    const fm = (await rows<Record<string, unknown>>(null, "select * from firm_models limit 1"))[0];
    expect(Object.keys(fm)).not.toContain("price");
  });

  it("lets a shop owner see only their own shop's devices and prices", async () => {
    const devices = await rows<{ name: string }>(OWNER_A, "select name from devices");
    expect(devices.map((d) => d.name)).toEqual(["Giriş ekranı"]);
    const prices = await rows<{ price: string }>(OWNER_A, "select price from firm_prices");
    expect(prices.map((p) => Number(p.price))).toEqual([42000]);
    // asking for the other shop by id returns nothing, not an error that reveals it exists
    expect(await rows(OWNER_A, `select * from devices where firm_id = '${firmB}'`)).toHaveLength(0);
    expect(await rows(OWNER_A, `select * from firm_prices where firm_id = '${firmB}'`)).toHaveLength(0);
  });

  it("does not let a shop owner write another shop's price, or read the centre's tables", async () => {
    await expect(as(OWNER_A, () => db.query(`insert into firm_prices (firm_id, model_id, price) values ('${firmB}', '${ownA}', 1)`))).rejects.toThrow();
    const res = await as(OWNER_A, () => db.query(`update firm_prices set price = 1 where firm_id = '${firmB}'`));
    expect(res.affectedRows).toBe(0);
    for (const t of ["subscriptions", "firm_admin", "audit_log", "firm_templates", "device_pairings"]) expect(await rows(OWNER_A, `select * from ${t}`), t).toHaveLength(0);
    // an owner may set their own price
    await as(OWNER_A, () => db.query(`update firm_prices set price = 43000 where firm_id = '${firmA}'`));
    expect(Number((await rows<{ price: string }>(OWNER_A, "select price from firm_prices"))[0].price)).toBe(43000);
  });

  it("keeps price and subscription away from ORMEN elemanı, even asked directly", async () => {
    expect(await rows(STAFF, "select * from firm_prices")).toHaveLength(0);
    expect(await rows(STAFF, "select * from subscriptions")).toHaveLength(0);
    await expect(as(STAFF, () => db.query(`insert into subscriptions (firm_id, amount, due_on) values ('${firmA}', 1, '2027-01-01')`))).rejects.toThrow();
    await expect(as(STAFF, () => db.query(`insert into firm_prices (firm_id, model_id, price) values ('${firmB}', '${ownA}', 1)`))).rejects.toThrow();
    // the yönetici sees both
    expect(await rows(ADMIN, "select * from firm_prices")).toHaveLength(2);
    expect(await rows(ADMIN, "select * from subscriptions")).toHaveLength(1);
  });

  it("lets ORMEN elemanı set up and edit content but delete nothing", async () => {
    await as(STAFF, () => db.query(`update firms set city = 'Ankara' where id = '${firmA}'`));
    await as(STAFF, () => db.query(`update firm_admin set contact = 'Ali Bey (Siteler)' where firm_id = '${firmA}'`));
    for (const sql of [`delete from firms where id = '${firmB}'`, `delete from models where id = '${ownA}'`, "delete from fabrics where code = 'SIENA-01'", `delete from devices where firm_id = '${firmB}'`]) {
      const res = await as(STAFF, () => db.query(sql));
      expect(res.affectedRows, sql).toBe(0);
    }
    expect((await db.query("select 1 from firms")).rows).toHaveLength(2);
  });

  it("lets nobody but the server write the change log", async () => {
    for (const uid of [ADMIN, STAFF, OWNER_A]) {
      await expect(as(uid, () => db.query("insert into audit_log (actor, actor_role, entity, action, summary) values ('x', 'admin', 'magaza', 'sahte', 'x')"))).rejects.toThrow();
    }
    expect(await rows(STAFF, "select * from audit_log")).toHaveLength(1);
  });
});

describe("merkez: catalogue rules", () => {
  it("refuses to give a shop's own product to another shop", async () => {
    await expect(db.query(`insert into firm_models (firm_id, model_id) values ('${firmB}', '${ownA}')`)).rejects.toThrow(/baska magazaya atanamaz/);
    await expect(as(ADMIN, () => db.query(`insert into firm_models (firm_id, model_id) values ('${firmB}', '${ownA}')`))).rejects.toThrow();
    expect((await db.query(`select 1 from firm_models where model_id = '${ownA}'`)).rows).toHaveLength(0);
  });

  it("shows the same product under a different name in each shop", async () => {
    await db.exec(`
      update firm_models set display_name = 'Lara Üçlü' where firm_id = '${firmA}' and model_id = '${shared}';
      update firm_models set display_name = 'Mira Kanepe' where firm_id = '${firmB}' and model_id = '${shared}';
    `);
    const r = await db.query<{ display_name: string }>(`select display_name from firm_models where model_id = '${shared}' order by display_name`);
    expect(r.rows.map((x) => x.display_name)).toEqual(["Lara Üçlü", "Mira Kanepe"]);
  });
});

describe("merkez: content version", () => {
  it("goes up for one shop when its own display name changes, and not for the other", async () => {
    const [a, b] = [await version(firmA), await version(firmB)];
    await db.exec(`update firm_models set display_name = 'Lara 3' where firm_id = '${firmA}' and model_id = '${shared}';`);
    expect(await version(firmA)).toBe(a + 1);
    expect(await version(firmB)).toBe(b);
  });

  it("goes up for every shop that has the product when the centre corrects its metres", async () => {
    const [a, b] = [await version(firmA), await version(firmB)];
    await db.exec(`update models set meterage_m = 9, meterage_ref_width_cm = 140 where id = '${shared}';`);
    expect(await version(firmA)).toBe(a + 1);
    expect(await version(firmB)).toBe(b + 1);
  });

  it("goes up only for its owner when a shop's own product changes", async () => {
    const [a, b] = [await version(firmA), await version(firmB)];
    await db.exec(`update models set name = 'A özel v2' where id = '${ownA}';`);
    expect(await version(firmA)).toBe(a + 1);
    expect(await version(firmB)).toBe(b);
  });

  it("goes up for a setting or feature change, once, and not for an untouched save", async () => {
    const a = await version(firmA);
    await db.exec(`update firms set features = '{"showroom": true}' where id = '${firmA}';`);
    expect(await version(firmA)).toBe(a + 1);
    await db.exec(`update firms set features = '{"showroom": true}' where id = '${firmA}';`);
    expect(await version(firmA)).toBe(a + 1);
  });

  it("goes up for every shop when a fabric changes, once per statement", async () => {
    const a = await version(firmA);
    await db.exec("update fabrics set color_name = 'Krem 2';");
    expect(await version(firmA)).toBe(a + 1);
  });
});

describe("merkez: scale", () => {
  it("lists 100 shops with 2 000 products and 300 devices in well under 2 s", async () => {
    await db.exec(`
      insert into firms (name, slug, city, status)
        select 'Mağaza ' || i, 'magaza-' || i, (array['Ankara','İstanbul','İzmir','Bursa'])[1 + i % 4], (array['pilot','aktif','aktif','askida'])[1 + i % 4]
        from generate_series(1, 98) i;
      insert into firm_admin (firm_id, tags, installed_on) select id, array['siteler'], date '2026-11-01' + (random() * 30)::int from firms where slug like 'magaza-%';
      insert into models (slug, name, procedural_key, width_cm, depth_cm, height_cm, manufacturer, category)
        select 'urun-' || i, 'Ürün ' || i, 'armchair', 200, 90, 85, 'Üretici ' || (i % 40), 'kanepe' from generate_series(1, 2000) i;
      insert into firm_models (firm_id, model_id)
        select f.id, m.id from firms f join models m on m.slug like 'urun-%' and (abs(hashtext(f.slug || m.slug)) % 100) < 15 where f.slug like 'magaza-%';
      insert into devices (firm_id, name, token_hash, last_seen_at)
        select f.id, 'Ekran ' || n, md5(f.slug || n) || md5(n || f.slug), now() - (random() * interval '40 days')
        from firms f, generate_series(1, 3) n where f.slug like 'magaza-%';
    `);
    const t = performance.now();
    const r = await db.query<{ atelier_shops: { total: number; rows: { name: string; devices: number; products: number }[] } }>("select atelier_shops(null, null, null, null, 'son-gorulme', 50, 0)");
    const ms = performance.now() - t;
    expect(r.rows[0].atelier_shops.total).toBe(100);
    expect(r.rows[0].atelier_shops.rows).toHaveLength(50);
    expect(r.rows[0].atelier_shops.rows[0].devices).toBe(3);
    expect(ms).toBeLessThan(2000);
    const filtered = await db.query<{ atelier_shops: { total: number } }>("select atelier_shops('Mağaza 1', 'aktif', 'İstanbul', 'siteler', 'ad', 50, 0)");
    expect(filtered.rows[0].atelier_shops.total).toBeGreaterThan(0);
    // only the server may call it
    await expect(as(OWNER_A, () => db.query("select atelier_shops()"))).rejects.toThrow();
  }, 120_000);
});
