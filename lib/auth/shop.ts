import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseEnabled } from "@/lib/supabase/config";
import { serviceClient, sessionClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { getRepository } from "@/lib/data";
import { getPanelUser, PASSWORD_MIN } from "./panel";
import { can } from "./roles";

// The shop panel's sign-in (Showroom package, job 0: "Mağaza paneli: yalnızca
// o mağazanın kendi verisi").
//
// With Supabase: the owner's own account (Supabase Auth, added by ORMEN) with
// a row in firm_members and none in profiles. The shop panel then reads with
// the owner's own session, so the database's row rules decide what they see.
// Without Supabase (demo / local): one owner from SHOP_DEMO_EMAIL /
// SHOP_DEMO_PASSWORD / SHOP_DEMO_SLUG with a signed cookie.
//
// "Mağaza gibi görüntüle": the ORMEN yönetici opens a shop's panel as that
// shop, for support. A short-lived signed cookie names the shop; it counts
// only together with a yönetici's own panel session. The view is read-only
// and never shows the shop's customers' names or notes.

const SHOP_COOKIE = "ormen_magaza";
const SUPPORT_COOKIE = "ormen_destek";
const DAY = 24 * 60 * 60;
export const SUPPORT_MINUTES = 30;

export interface ShopUser {
  email: string;
  firmId: string;
  firmName: string;
  firmSlug: string;
  mode: "supabase" | "demo";
  /** Set in the yönetici's support view: who is looking. Read-only, no customer names. */
  support: { by: string } | null;
}

function key(): string | null {
  const s = process.env.PANEL_SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV !== "production") return "ormen-yalnizca-gelistirme-anahtari-uretimde-kullanilmaz";
  return null;
}
const sign = (payload: string, k: string) => createHmac("sha256", k).update(`magaza:${payload}`).digest("base64url");
function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function demoOwner(): { email: string; password: string; slug: string } | null {
  const email = process.env.SHOP_DEMO_EMAIL;
  const password = process.env.SHOP_DEMO_PASSWORD;
  const slug = process.env.SHOP_DEMO_SLUG ?? "ornek-mobilya";
  if (email && password) return { email, password, slug };
  // convenience for local development only
  if (process.env.NODE_ENV !== "production") return { email: "magaza@ormen.local", password: "ormen-magaza", slug };
  return null;
}

export function shopLoginAvailable(): boolean {
  return supabaseEnabled() || (demoOwner() !== null && key() !== null);
}

function setSigned(name: string, data: object, maxAge: number) {
  const k = key();
  if (!k) return Promise.resolve();
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  return cookies().then((c) =>
    c.set(name, `${payload}.${sign(payload, k)}`, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge }),
  );
}

async function readSigned<T>(name: string): Promise<T | null> {
  const k = key();
  const raw = (await cookies()).get(name)?.value;
  if (!k || !raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig || !safeEqual(sig, sign(payload, k))) return null;
  try {
    const v = JSON.parse(Buffer.from(payload, "base64url").toString()) as T & { x: number };
    return Date.now() > v.x ? null : v;
  } catch {
    return null;
  }
}

async function firmFacts(firmId: string) {
  const f = await getRepository().getFirmById(firmId);
  return f ? { firmId: f.id, firmName: f.name, firmSlug: f.slug } : null;
}

export async function shopSignIn(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const clean = email.trim().toLowerCase();
  if (supabaseEnabled()) {
    const sb = await sessionClient();
    const { data, error } = await sb.auth.signInWithPassword({ email: clean, password });
    if (error || !data.user) return { ok: false, error: "E-posta ya da şifre hatalı." };
    // read with the owner's own session: the row rule shows them only their own rows
    const { data: rows } = await sb.from("firm_members").select("firm_id").eq("user_id", data.user.id);
    if (!rows?.length) {
      await sb.auth.signOut();
      return { ok: false, error: "Bu hesaba bağlı bir mağaza yok. ORMEN'e haber verin." };
    }
    return { ok: true };
  }
  const demo = demoOwner();
  if (!demo || !key()) return { ok: false, error: "Mağaza girişi henüz ayarlanmadı." };
  if (!safeEqual(clean, demo.email.toLowerCase()) || !safeEqual(password, demo.password)) return { ok: false, error: "E-posta ya da şifre hatalı." };
  const firm = await getRepository().getFirmBySlug(demo.slug);
  if (!firm) return { ok: false, error: "Örnek mağaza bulunamadı." };
  await setSigned(SHOP_COOKIE, { e: demo.email, f: firm.id, x: Date.now() + 7 * DAY * 1000 }, 7 * DAY);
  return { ok: true };
}

export async function shopSignOut(): Promise<void> {
  const c = await cookies();
  if (supabaseEnabled() && c.get(SHOP_COOKIE) === undefined) {
    // a Supabase owner session; the yönetici's panel session is not ours to end
    const user = await getPanelUser();
    if (!user) await (await sessionClient()).auth.signOut();
  }
  c.delete(SHOP_COOKIE);
}

/** The owner's own session (not the support view). */
async function ownerSession(): Promise<ShopUser | null> {
  if (supabaseEnabled()) {
    const sb = await sessionClient();
    const { data } = await sb.auth.getUser();
    if (!data.user) return null;
    const [{ data: rows }, { data: profile }] = await Promise.all([
      sb.from("firm_members").select("firm_id").eq("user_id", data.user.id).order("created_at").limit(1),
      serviceClient().from("profiles").select("id").eq("id", data.user.id).maybeSingle(),
    ]);
    // an ORMEN account is not a shop owner, even if it was given a membership
    if (profile || !rows?.length) return null;
    const facts = await firmFacts((rows[0] as { firm_id: string }).firm_id);
    return facts && { email: data.user.email ?? "", mode: "supabase", support: null, ...facts };
  }
  const v = await readSigned<{ e: string; f: string }>(SHOP_COOKIE);
  const demo = demoOwner();
  if (!v || !demo || v.e.toLowerCase() !== demo.email.toLowerCase()) return null;
  const facts = await firmFacts(v.f);
  return facts && { email: v.e, mode: "demo", support: null, ...facts };
}

/** The yönetici's support view, when one is open and the yönetici is still signed in. */
async function supportSession(): Promise<ShopUser | null> {
  const v = await readSigned<{ f: string; b: string }>(SUPPORT_COOKIE);
  if (!v) return null;
  const admin = await getPanelUser();
  if (!admin || !can(admin.role, "magaza-gibi") || admin.email.toLowerCase() !== v.b.toLowerCase()) return null;
  const facts = await firmFacts(v.f);
  return facts && { email: admin.email, mode: admin.mode, support: { by: admin.email }, ...facts };
}

export async function getShopUser(): Promise<ShopUser | null> {
  return (await supportSession()) ?? (await ownerSession());
}

export async function requireShopUser(): Promise<ShopUser> {
  const u = await getShopUser();
  if (!u) redirect("/magaza/giris");
  return u;
}

/** Opens the support view (the caller has checked the role and written the log). */
export async function openSupportView(firmId: string, by: string): Promise<void> {
  await setSigned(SUPPORT_COOKIE, { f: firmId, b: by, x: Date.now() + SUPPORT_MINUTES * 60_000 }, SUPPORT_MINUTES * 60);
}

export async function closeSupportView(): Promise<string | null> {
  const v = await readSigned<{ f: string }>(SUPPORT_COOKIE);
  (await cookies()).delete(SUPPORT_COOKIE);
  return v?.f ?? null;
}

/** The owner changes the first password ORMEN gave them (checked against the current one first). */
export async function shopChangePassword(current: string, next: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await ownerSession();
  if (!user) return { ok: false, error: "Oturum süresi doldu. Yeniden giriş yapın." };
  if (user.mode !== "supabase") return { ok: false, error: "Örnek veri modunda şifre ortam değişkeninden gelir; burada değişmez." };
  if (next.length < PASSWORD_MIN) return { ok: false, error: `Yeni şifre en az ${PASSWORD_MIN} karakter olmalı.` };
  if (next === current) return { ok: false, error: "Yeni şifre eskisiyle aynı." };
  // checked on a separate, throwaway client: the owner's session is untouched
  const probe = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: wrong } = await probe.auth.signInWithPassword({ email: user.email, password: current });
  if (wrong) return { ok: false, error: "Şu anki şifre hatalı." };
  await probe.auth.signOut({ scope: "local" });
  const { error } = await (await sessionClient()).auth.updateUser({ password: next });
  return error ? { ok: false, error: /weak|short|pwned|leak/i.test(error.message) ? "Bu şifre zayıf ya da sızdırılmış bir şifre listesinde; başka bir şifre seçin." : "Şifre değiştirilemedi." } : { ok: true };
}
