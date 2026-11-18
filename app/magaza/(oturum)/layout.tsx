import type { Metadata } from "next";
import { requireShopUser, SUPPORT_MINUTES } from "@/lib/auth/shop";
import { closeSupportAction, shopLogoutAction } from "../actions";
import { ShopNav } from "@/components/magaza/ShopNav";

export const metadata: Metadata = { title: { default: "Mağaza paneli", template: "%s · Mağaza paneli" }, robots: { index: false } };
export const dynamic = "force-dynamic";

// The shop's own panel (job 0): its quotes, its products as it shows them,
// its screens. Nothing of another shop is ever read here.
export default async function ShopLayout({ children }: LayoutProps<"/magaza">) {
  const user = await requireShopUser();
  return (
    <div className="min-h-dvh bg-kirik-beyaz text-antrasit">
      {/* the support strip and the header stay on screen together, whatever their height */}
      <div className="sticky top-0 z-20">
      {user.support && (
        <div role="note" aria-label="Destek görünümü" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-[#7a2f27] px-4 py-2.5 text-center text-[14px] text-white">
          <span>
            <strong>Destek görünümü:</strong> {user.firmName} mağazasının panelini ORMEN yöneticisi olarak görüyorsunuz ({user.support.by}). Değişiklik yapılamaz; müşteri adları gizli. {SUPPORT_MINUTES} dakikada kapanır; açılışı günlükte.
          </span>
          <form action={closeSupportAction}>
            <button type="submit" className="rounded-full bg-white px-4 py-1.5 text-[13px] font-medium text-[#7a2f27] hover:bg-[#fbeeec]">
              Destek görünümünden çık
            </button>
          </form>
        </div>
      )}
      <header className="border-b border-cizgi bg-kagit/95 backdrop-blur-[2px]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 md:px-6">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[18px] text-antrasit">{user.firmName}</span>
            <span className="eyebrow">Mağaza paneli</span>
          </div>
          <ShopNav />
          <div className="ml-auto flex items-center gap-2 text-[12px] text-antrasit-50">
            {!user.support && <span className="hidden sm:inline">{user.email}</span>}
            {!user.support && (
              <form action={shopLogoutAction}>
                <button type="submit" className="rounded-full px-2.5 py-1.5 hover:bg-cizgi/60 hover:text-antrasit">
                  Çıkış
                </button>
              </form>
            )}
          </div>
        </div>
      </header>
      </div>
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">{children}</main>
    </div>
  );
}
