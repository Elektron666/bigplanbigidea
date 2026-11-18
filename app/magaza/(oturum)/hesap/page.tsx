import { requireShopUser } from "@/lib/auth/shop";
import { PageHeader } from "@/components/panel/ui";
import { ShopPasswordForm } from "./ShopPasswordForm";

export const metadata = { title: "Hesap" };

export default async function ShopAccountPage() {
  const user = await requireShopUser();
  return (
    <>
      <PageHeader title="Hesap" eyebrow={user.support ? "Destek görünümü" : user.email} />
      {user.support ? (
        <p className="text-[14px] text-antrasit-70">Destek görünümünde mağazanın şifresi değiştirilmez.</p>
      ) : (
        <section aria-labelledby="sifre" className="max-w-md rounded-2xl border border-cizgi bg-kagit p-5">
          <h2 id="sifre" className="font-display text-[20px]">
            Şifre
          </h2>
          <p className="mt-1 mb-4 text-[14px] text-antrasit-70">ORMEN&apos;in verdiği ilk şifreyi burada kendi şifrenizle değiştirin.</p>
          <ShopPasswordForm />
        </section>
      )}
    </>
  );
}
