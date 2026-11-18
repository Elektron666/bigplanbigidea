import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";

// Job 3 in the database: who reads quotes, that the customer's name never
// reaches ORMEN, and that one quote makes one order request.

const ADMIN = "bbbbbbbb-0000-0000-0000-000000000001";
const STAFF = "bbbbbbbb-0000-0000-0000-000000000002";
const OWNER_A = "bbbbbbbb-0000-0000-0000-00000000000a";
const OWNER_B = "bbbbbbbb-0000-0000-0000-00000000000b";
let db: PGlite;
let firmA: string;
let quoteA: string;

async function as<T>(uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set test.uid = '${uid ?? ""}'; set role ${uid ? "authenticated" : "anon"};`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role;");
  }
}
const rows = async (uid: string | null, sql: string) => (await as(uid, () => db.query(sql))).rows;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    create schema storage; create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id serial primary key, bucket_id text, name text);
    create role anon; create role authenticated;
  `);
  const dir = path.join(process.cwd(), "supabase/migrations");
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) await db.exec(readFileSync(path.join(dir, f), "utf8"));
  // undo and apply again
  await db.exec(readFileSync(path.join(process.cwd(), "supabase/geri-al/20261118000100_teklif.sql"), "utf8"));
  await db.exec(readFileSync(path.join(dir, "20261118000100_teklif.sql"), "utf8"));
  await db.exec(`
    grant usage on schema public to anon, authenticated;
    grant select, insert, update, delete on all tables in schema public to anon, authenticated;
    insert into auth.users values ('${ADMIN}'), ('${STAFF}'), ('${OWNER_A}'), ('${OWNER_B}');
    insert into profiles (id, role) values ('${ADMIN}', 'admin'), ('${STAFF}', 'staff');
  `);
  firmA = (await db.query<{ id: string }>("insert into firms (name, slug) values ('A Mobilya', 'a-mob') returning id")).rows[0].id;
  const firmB = (await db.query<{ id: string }>("insert into firms (name, slug) values ('B Mobilya', 'b-mob') returning id")).rows[0].id;
  await db.exec(`insert into firm_members values ('${OWNER_A}', '${firmA}'), ('${OWNER_B}', '${firmB}');`);
  quoteA = (
    await db.query<{ id: string }>(
      `insert into quotes (firm_id, number, view_token, client_id, content, totals) values ('${firmA}', 'T-ABC123', '${"a".repeat(22)}', 'teklif_0001', '{}', '[{"code":"SIENA-04","metres":9}]') returning id`,
    )
  ).rows[0].id;
  await db.exec(`insert into quote_private values ('${quoteA}', '${firmA}', 'Ayşe Yılmaz', 'Pazartesi arayacak');`);
}, 120_000);

describe("quotes in the database", () => {
  it("keeps the customer's name away from ORMEN, by any query", async () => {
    for (const uid of [ADMIN, STAFF]) {
      expect(await rows(uid, "select * from quote_private"), uid).toHaveLength(0);
      // the quote itself (fabrics, metres) is visible to the centre
      expect(await rows(uid, "select number from quotes"), uid).toHaveLength(1);
    }
    expect(JSON.stringify(await rows(ADMIN, "select * from quotes"))).not.toContain("Ayşe");
  });

  it("lets a shop read its own quote and its customer, and nothing of another shop", async () => {
    expect(await rows(OWNER_A, "select customer_name from quote_private")).toEqual([{ customer_name: "Ayşe Yılmaz" }]);
    expect(await rows(OWNER_B, "select * from quotes")).toHaveLength(0);
    expect(await rows(OWNER_B, `select * from quote_private where quote_id = '${quoteA}'`)).toHaveLength(0);
    expect(await rows(null, "select * from quotes")).toHaveLength(0);
  });

  it("makes one order request per quote, however many times it is sent", async () => {
    await db.query(`insert into order_requests (quote_id, firm_id, items) values ('${quoteA}', '${firmA}', '[{"code":"SIENA-04","metres":9}]')`);
    await expect(db.query(`insert into order_requests (quote_id, firm_id, items) values ('${quoteA}', '${firmA}', '[{"code":"SIENA-04","metres":9}]')`)).rejects.toThrow();
    expect((await db.query("select 1 from order_requests")).rows).toHaveLength(1);
    // the same quote from the outbox twice is one quote
    await expect(db.query(`insert into quotes (number, view_token, client_id, content) values ('T-ABC124', '${"b".repeat(22)}', 'teklif_0001', '{}')`)).rejects.toThrow();
  });

  it("starts the waste settings empty, with the 0,5 m step, and only the yönetici changes them", async () => {
    expect((await db.query("select waste_duz, waste_donuk, waste_raporlu, round_step::text from meterage_settings")).rows).toEqual([{ waste_duz: null, waste_donuk: null, waste_raporlu: null, round_step: "0.5" }]);
    const staff = await as(STAFF, () => db.query("update meterage_settings set waste_duz = 10"));
    expect(staff.affectedRows).toBe(0);
    const admin = await as(ADMIN, () => db.query("update meterage_settings set waste_duz = 10"));
    expect(admin.affectedRows).toBe(1);
    await expect(db.query("insert into meterage_settings (id) values (2)")).rejects.toThrow();
  });
});
