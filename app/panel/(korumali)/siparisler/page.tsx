import { requirePanelUser } from "@/lib/auth/panel";
import { can } from "@/lib/auth/roles";
import { getQuotes } from "@/lib/teklif/store";
import { formatM } from "@/lib/teklif/metraj";
import { WasteForm } from "@/components/panel/WasteForm";
import { OrderStatus } from "@/components/panel/OrderStatus";
import { Badge, PageHeader } from "@/components/panel/ui";

export const metadata = { title: "Siparişler" };

const when = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });

// Fabric order requests from the showroom screens (job 3), and the waste
// figures their metres are worked out with. What ORMEN sees here: the shop,
// the fabric codes and metres. Never the shop's customer.
export default async function OrdersPage() {
  // checked here, not only in the layout: a layout check does not stop the page from rendering
  const user = await requirePanelUser();
  const quotes = getQuotes();
  const [waste, orders] = await Promise.all([quotes.getWaste(), quotes.listOrders()]);
  const fresh = orders.filter((o) => o.status === "yeni").length;
  return (
    <>
      <PageHeader title="Siparişler" eyebrow={fresh ? `${fresh} yeni sipariş talebi` : `${orders.length} sipariş talebi`} />
      <WasteForm waste={waste} canEdit={can(user.role, "fiyat")} />
      {orders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-cizgi-koyu p-10 text-center text-[15px] text-antrasit-50">Henüz sipariş talebi yok. Talepler mağazalardaki showroom ekranından “ORMEN&apos;e sipariş talebi gönder” ile gelir.</p>
      ) : (
        <ul className="divide-y divide-cizgi rounded-2xl border border-cizgi bg-kagit">
          {orders.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3" data-testid="siparis">
              <div className="min-w-0 flex-1 basis-72">
                <p className="font-medium">
                  {o.firmName ?? "Mağaza bilinmiyor"} <span className="font-normal text-antrasit-50">· teklif {o.quoteNumber}</span>
                </p>
                <p className="text-[14px] tracking-wide">{o.items.map((i) => `${i.code}${i.brand && i.brand !== "ORMEN" ? ` (${i.brand})` : ""} ${formatM(i.metres)}`).join(" · ")}</p>
                {new Set(o.items.map((i) => i.brand ?? "ORMEN")).size > 1 && (
                  <p className="text-[12px] text-antrasit-50">
                    Marka kırılımı:{" "}
                    {[...new Set(o.items.map((i) => i.brand ?? "ORMEN"))].map((b) => `${b} ${formatM(o.items.filter((i) => (i.brand ?? "ORMEN") === b).reduce((s, i) => s + i.metres, 0))}`).join(" · ")}
                  </p>
                )}
                <p className="text-[12px] text-antrasit-50">{when.format(new Date(o.createdAt))}</p>
              </div>
              {o.status === "yeni" && <Badge tone="warn">yeni</Badge>}
              <OrderStatus id={o.id} status={o.status} label={`Teklif ${o.quoteNumber}`} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
