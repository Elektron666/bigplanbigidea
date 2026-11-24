import Link from "next/link";
import { requirePanelUser } from "@/lib/auth/panel";
import { can } from "@/lib/auth/roles";
import { getRepository } from "@/lib/data";
import { getFabricExtras, stockByCode } from "@/lib/kumas/store";
import { StockEditor } from "@/components/panel/StockEditor";
import { PageHeader, buttonClass } from "@/components/panel/ui";

export const metadata = { title: "Kumaş stoğu" };

// Fabric stock (Showroom package, job 8). Shown on a shop's screen only when
// the shop's "Stok ve termin" is on; never on the public site.

export default async function StockPage() {
  // checked here, not only in the layout: a layout check does not stop the page from rendering
  const user = await requirePanelUser();
  const fabrics = await getRepository().listFabrics({ includeInactive: true });
  const stock = stockByCode(await getFabricExtras().listStock(), fabrics);
  const out = Object.values(stock).filter((s) => s.status === "yok").length;
  return (
    <>
      <PageHeader title="Kumaş stoğu" eyebrow={`${Object.keys(stock).length} kumaşta stok girili · ${out} stokta yok`}>
        <Link href="/panel/kumaslar" className={buttonClass.secondary}>
          Kumaşlar
        </Link>
      </PageHeader>
      <p className="mb-5 max-w-3xl text-[14px] text-antrasit-70">
        Stok yalnızca “Stok ve termin” özelliği açık mağazaların showroom ekranında görünür. Stokta olmayan kumaşta termin etiketi ve muadil kumaşlar çıkar. Girilmeyen kumaşta ekranda stok bilgisi hiç görünmez.
      </p>
      {can(user.role, "icerik") ? (
        <StockEditor fabrics={fabrics.map((f) => ({ code: f.code, series: f.series, colorName: f.colorName, thumbUrl: f.texture.thumbUrl, isActive: f.isActive }))} stock={stock} />
      ) : (
        <p className="text-[14px] text-antrasit-70">Stoğu değiştirme yetkiniz yok.</p>
      )}
    </>
  );
}
