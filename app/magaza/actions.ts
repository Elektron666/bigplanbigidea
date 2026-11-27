"use server";

import { cleanGroup, parsePrice } from "@/lib/satici/fiyat";
import { getLeads } from "@/lib/musteri/store";
import { cleanRetention, RETENTION } from "@/lib/musteri/kayit";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { blocked, callerKey, recordFailure } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";
import { closeSupportView, getShopUser, shopChangePassword, shopSignIn, shopSignOut } from "@/lib/auth/shop";
import { getShopPanel } from "@/lib/magaza/store";
import { validateShopProduct } from "@/lib/catalogue/shop-products";

// The shop panel's server actions. Each one reads the session itself; the
// support view (ORMEN yöneticisi) is read-only, and with Supabase the
// database checks the shop again (shop_save_product, shop_set_price).

type Result = { ok: true } | { ok: false; error: string };

export async function shopLoginAction(_prev: { error?: string; email?: string } | null, form: FormData): Promise<{ error?: string; email?: string }> {
  const email = String(form.get("email") ?? "").slice(0, 200);
  // the same limit as the ORMEN panel's sign-in: 10 wrong tries in 15 minutes from one place
  const caller = callerKey(await headers());
  if (blocked("magaza-giris", caller, 10, 15 * 60_000)) return { error: "Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin.", email };
  const res = await shopSignIn(email, String(form.get("password") ?? "").slice(0, 200));
  // the form is cleared after a try: the address comes back so only the password is typed again
  if (!res.ok) {
    recordFailure("magaza-giris", caller);
    return { error: res.error, email };
  }
  redirect("/magaza");
}

export async function shopLogoutAction(): Promise<void> {
  await shopSignOut();
  redirect("/magaza/giris");
}

/** Leaves the yönetici's support view and goes back to the shop in the ORMEN panel. */
export async function closeSupportAction(): Promise<void> {
  const firmId = await closeSupportView();
  redirect(firmId ? `/panel/firmalar/${firmId}` : "/panel");
}

async function owner(): Promise<{ ok: true; user: NonNullable<Awaited<ReturnType<typeof getShopUser>>> } | { ok: false; error: string }> {
  const user = await getShopUser();
  if (!user) return { ok: false, error: "Oturum süresi doldu. Yeniden giriş yapın." };
  if (user.support) return { ok: false, error: "Destek görünümünde değişiklik yapılmaz." };
  return { ok: true, user };
}

export async function saveShopProductAction(modelId: string, raw: unknown): Promise<Result> {
  const o = await owner();
  if (!o.ok) return o;
  const v = validateShopProduct(raw);
  if (!v.ok) return v;
  if (!(await getShopPanel().saveProduct(o.user, String(modelId).slice(0, 40), v.value))) return { ok: false, error: "Bu ürün mağazanızda yok." };
  revalidatePath("/magaza/urunler");
  revalidatePath(`/f/${o.user.firmSlug}`);
  return { ok: true };
}

export async function setShopPriceAction(modelId: string, raw: string): Promise<Result> {
  const o = await owner();
  if (!o.ok) return o;
  let price: number | null = null;
  const t = String(raw ?? "").trim();
  if (t) {
    const n = Number(t.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(n) || n < 0 || n > 100_000_000) return { ok: false, error: "Fiyatı rakamla yazın." };
    price = Math.round(n * 100) / 100;
  }
  if (!(await getShopPanel().setPrice(o.user, String(modelId).slice(0, 40), price))) return { ok: false, error: "Bu ürün mağazanızda yok." };
  revalidatePath("/magaza/urunler");
  return { ok: true };
}

/** Prices per fabric group (job 7): { "B": "52.000", "C": "" } — empty takes the group's price off. */
export async function setShopGroupPricesAction(modelId: string, raw: Record<string, string>): Promise<Result> {
  const o = await owner();
  if (!o.ok) return o;
  const entries = Object.entries(raw ?? {}).slice(0, 20);
  const parsed: [string, number | null][] = [];
  for (const [g, v] of entries) {
    const group = cleanGroup(g);
    if (!group) return { ok: false, error: "Geçersiz fiyat grubu." };
    const price = parsePrice(String(v ?? ""));
    if (Number.isNaN(price)) return { ok: false, error: `${group} grubu: fiyatı rakamla yazın (ör. 48.500).` };
    parsed.push([group, price]);
  }
  for (const [group, price] of parsed) if (!(await getShopPanel().setGroupPrice(o.user, String(modelId).slice(0, 40), group, price))) return { ok: false, error: "Bu ürün mağazanızda yok." };
  revalidatePath("/magaza/urunler");
  return { ok: true };
}

export async function shopPasswordAction(_prev: { error?: string; ok?: boolean } | null, form: FormData): Promise<{ error?: string; ok?: boolean }> {
  const caller = callerKey(await headers());
  if (blocked("magaza-sifre", caller, 10, 15 * 60_000)) return { error: "Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin." };
  const next = String(form.get("next") ?? "").slice(0, 200);
  if (next !== String(form.get("again") ?? "")) return { error: "Yeni şifreler aynı değil." };
  const res = await shopChangePassword(String(form.get("current") ?? "").slice(0, 200), next);
  if (res.ok) return { ok: true };
  recordFailure("magaza-sifre", caller);
  return { error: res.error };
}

// ------------------------------------------------------------------ interested customers (job 13)

export async function deleteLeadsAction(ids: string[]): Promise<Result & { removed?: number }> {
  const o = await owner();
  if (!o.ok) return o;
  const list = (Array.isArray(ids) ? ids : []).filter((x) => typeof x === "string" && /^[0-9a-f-]{36}$/i.test(x)).slice(0, 1000);
  if (!list.length) return { ok: false, error: "Silinecek kayıt seçin." };
  const removed = await getLeads().remove(o.user, list);
  revalidatePath("/magaza/musteriler");
  return { ok: true, removed };
}

export async function setLeadRetentionAction(raw: string): Promise<Result> {
  const o = await owner();
  if (!o.ok) return o;
  const days = cleanRetention(raw);
  if (days === "hata") return { ok: false, error: `Saklama süresi ${RETENTION.min}–${RETENTION.max} gün olmalı.` };
  await getLeads().setRetention(o.user, days);
  // a shorter period applies at once
  await getLeads().purge().catch(() => undefined);
  revalidatePath("/magaza/musteriler");
  return { ok: true };
}
