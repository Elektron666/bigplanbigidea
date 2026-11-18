import { requireShopUser } from "@/lib/auth/shop";
import { getShopPanel } from "@/lib/magaza/store";
import { ShopProductEditor } from "@/components/magaza/ShopProductEditor";
import { PageHeader } from "@/components/panel/ui";

export const metadata = { title: "Ürünler" };

// The products ORMEN gave the shop, as the shop shows them: its own name,
// code, note, price, featured or hidden. The model, sizes and metres come from
// ORMEN and cannot be changed here.
export default async function ShopProductsPage() {
  const user = await requireShopUser();
  const rows = await getShopPanel().products(user);
  return (
    <>
      <PageHeader title="Ürünler" eyebrow={`${rows.length} ürün`} />
      <p className="mb-5 text-[14px] text-antrasit-70">
        Ürünün modeli, ölçüleri ve metrajı ORMEN&apos;den gelir. Burada yalnızca mağazanızda nasıl görüneceğini ve satış fiyatınızı değiştirirsiniz. Değişiklik ekranlara bir sonraki eşitlemede gider.
      </p>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-cizgi-koyu p-10 text-center text-[15px] text-antrasit-50">Mağazanıza henüz ürün verilmedi. ORMEN&apos;e haber verin.</p>
      ) : (
        <ul className="flex flex-col gap-4" aria-label="Ürünler">
          {rows.map((r) => (
            <ShopProductEditor key={r.modelId} row={r} readOnly={!!user.support} />
          ))}
        </ul>
      )}
    </>
  );
}
