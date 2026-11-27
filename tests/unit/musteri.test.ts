import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { cleanRetention, showPhone, validateLead } from "@/lib/musteri/kayit";

// Job 13: the customer's contact. Nothing without the consent box; the shop's
// owner reads and deletes its own; no ORMEN account reaches a name or a phone
// by any query; a deleted record is gone from the table.

describe("the contact form", () => {
  it("stores nothing unless the customer ticked the box", () => {
    expect(validateLead({ name: "Zeynep Kaya", phone: "0532 123 45 67" })).toEqual({ ok: false, error: "Bilgilerinizi bırakmak için onay kutusunu işaretleyin." });
    expect(validateLead({ name: "Zeynep Kaya", phone: "0532 123 45 67", consent: "true" }).ok).toBe(false);
    expect(validateLead({ name: "Zeynep Kaya", phone: "0532 123 45 67", consent: true })).toEqual({ ok: true, value: { name: "Zeynep Kaya", phone: "905321234567" } });
    expect(validateLead({ name: "Z", phone: "0532 123 45 67", consent: true }).ok).toBe(false);
    expect(validateLead({ name: "Zeynep", phone: "123", consent: true }).ok).toBe(false);
    expect(showPhone("905321234567")).toBe("0532 123 45 67");
  });
  it("takes a keeping period of 7–730 days, or none", () => {
    expect(cleanRetention("30")).toBe(30);
    expect(cleanRetention("")).toBeNull();
    expect(cleanRetention("3")).toBe("hata");
  });
});

const ADMIN = "cdcdcdcd-0000-0000-0000-000000000001";
const STAFF = "cdcdcdcd-0000-0000-0000-000000000002";
const OWNER = "cdcdcdcd-0000-0000-0000-00000000000a";
const OTHER = "cdcdcdcd-0000-0000-0000-00000000000b";
const MIGRATION = "20261127000400_video_musteri.sql";
let db: PGlite;
let firmA: string;

async function as<T>(uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set test.uid = '${uid ?? ""}'; set role ${uid ? "authenticated" : "anon"};`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role;");
  }
}
const q = async (uid: string | null, sql: string) => (await as(uid, () => db.query(sql))).rows as Record<string, unknown>[];

describe("interested customers in the database", () => {
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
      insert into auth.users values ('${ADMIN}'), ('${STAFF}'), ('${OWNER}'), ('${OTHER}');
      insert into profiles (id, role) values ('${ADMIN}', 'admin'), ('${STAFF}', 'staff');
    `);
    firmA = (await db.query<{ id: string }>("insert into firms (name, slug) values ('A Mobilya', 'a-mob') returning id")).rows[0].id;
    const firmB = (await db.query<{ id: string }>("insert into firms (name, slug) values ('B Mobilya', 'b-mob') returning id")).rows[0].id;
    await db.exec(`insert into firm_members values ('${OWNER}', '${firmA}'), ('${OTHER}', '${firmB}');`);
    // what the server writes after consent
    await db.query(`insert into customer_leads (firm_id, name, phone, product) values ('${firmA}', 'Zeynep Kaya', '905321234567', 'Lara Üçlü · LUMA-02')`);
  }, 120_000);

  it("shows the shop's owner their own customers only", async () => {
    expect(await q(OWNER, "select name, phone from customer_leads")).toEqual([{ name: "Zeynep Kaya", phone: "905321234567" }]);
    expect(await q(OTHER, "select * from customer_leads")).toEqual([]);
  });

  it("gives no ORMEN account a name or a phone, by any query", async () => {
    for (const uid of [ADMIN, STAFF]) {
      expect(await q(uid, "select * from customer_leads")).toEqual([]);
      expect(await q(uid, "select count(*)::int as n from customer_leads")).toEqual([{ n: 0 }]);
      await expect(as(uid, () => db.query(`insert into customer_leads (firm_id, name, phone) values ('${firmA}', 'X Y', '905321234567')`))).rejects.toThrow();
    }
    expect(await q(null, "select * from customer_leads")).toEqual([]);
  });

  it("deletes for real: a record the owner deleted is gone from the table", async () => {
    await as(OWNER, () => db.query("delete from customer_leads where name = 'Zeynep Kaya'"));
    expect((await db.query("select * from customer_leads")).rows).toEqual([]);
  });

  it("lets only the owner set the keeping period", async () => {
    expect((await q(OWNER, `select public.shop_set_lead_retention('${firmA}', 30) as ok`))[0].ok).toBe(true);
    await expect(as(OTHER, () => db.query(`select public.shop_set_lead_retention('${firmA}', 30)`))).rejects.toThrow();
    await expect(as(OWNER, () => db.query(`select public.shop_set_lead_retention('${firmA}', 3)`))).rejects.toThrow();
  });
});
