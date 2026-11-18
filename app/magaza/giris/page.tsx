import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getShopUser, shopLoginAvailable } from "@/lib/auth/shop";
import { supabaseEnabled } from "@/lib/supabase/config";
import { BrandMark } from "@/components/configurator/BrandMark";
import { ShopLoginForm } from "./ShopLoginForm";

export const metadata: Metadata = { title: "Mağaza girişi", robots: { index: false } };
// the session decides; never prerendered
export const dynamic = "force-dynamic";

export default async function ShopLoginPage() {
  if (await getShopUser()) redirect("/magaza");
  const demoHint = !supabaseEnabled() && process.env.NODE_ENV !== "production" && !process.env.SHOP_DEMO_EMAIL ? "Yerel geliştirme: magaza@ormen.local / ormen-magaza" : null;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-kirik-beyaz px-4">
      <div className="w-full max-w-sm rounded-2xl border border-cizgi bg-kagit p-7 shadow-[0_24px_60px_-30px_rgba(42,42,40,0.35)]">
        <div className="mb-6 flex items-end justify-between">
          <BrandMark />
          <span className="eyebrow">Mağaza paneli</span>
        </div>
        {shopLoginAvailable() ? (
          <ShopLoginForm demoHint={demoHint} />
        ) : (
          <p className="text-[14px] leading-relaxed text-antrasit-70">Mağaza girişi henüz açılmadı. Hesabınızı ORMEN açar; e-posta adresinizi ORMEN&apos;e iletin.</p>
        )}
      </div>
    </main>
  );
}
