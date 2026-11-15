import { requirePanelUser } from "@/lib/auth/panel";
import { notFound } from "next/navigation";
import { getRepository, loadCatalogue } from "@/lib/data";
import { FirmEditor } from "@/components/panel/FirmEditor";
import { ShopDevices } from "@/components/panel/ShopDevices";
import { deviceState, type Device } from "@/lib/devices/pairing";
import { getCentral } from "@/lib/central/store";
import { can } from "@/lib/auth/roles";
import { ShopProducts } from "@/components/panel/ShopProducts";
import { FirmShare } from "@/components/panel/FirmShare";
import { Badge, PageHeader } from "@/components/panel/ui";
import { siteUrl, siteUrlIsFinal } from "@/lib/site";
import { seriesOf } from "@/lib/fabric/allowed";

/** Where each screen stands right now (worked out on the server, so the list and the clock agree). */
function withState(devices: Device[], shopVersion: number) {
  const now = Date.now();
  return devices.map((d) => ({ ...d, state: deviceState(d, shopVersion, now) }));
}

export default async function EditFirmPage({ params, searchParams }: PageProps<"/panel/firmalar/[id]">) {
  // checked here, not only in the layout: a layout check does not stop the page from rendering
  const user = await requirePanelUser();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const repo = getRepository();
  const firm = await repo.getFirmById(decodeURIComponent(id));
  if (!firm) notFound();
  const [all, products, cat, fabrics] = await Promise.all([
    repo.listAllModels(),
    repo.getFirmProducts(firm.id),
    firm.isActive ? loadCatalogue(firm.slug) : null,
    repo.listFabrics(),
  ]);
  const central = getCentral();
  const [devices, shop] = await Promise.all([central.listDevices(firm.id), central.getShopState(firm.id)]);
  const showcaseIds = products.map((p) => p.modelId);
  const showcase = all.filter((m) => m.firmId === null && m.isActive);
  const own = all.filter((m) => m.firmId === firm.id);
  return (
    <>
      <PageHeader title={firm.name} eyebrow="Firma">
        {!firm.isActive && <Badge tone="off">yayında değil</Badge>}
      </PageHeader>
      {sp.kaydedildi && (
        <p role="status" className="mb-4 rounded-xl bg-[#E8EFE6] px-4 py-3 text-[14px] text-[#35523a]">
          {firm.name} kaydedildi.
        </p>
      )}
      {cat ? (
        <FirmShare firmId={firm.id} slug={firm.slug} base={siteUrl()} models={cat.models} finalDomain={siteUrlIsFinal()} />
      ) : (
        <p className="mb-8 rounded-xl bg-cizgi/40 px-4 py-3 text-[14px] text-antrasit-70">Firma sayfası yayında değil; bağlantı ve QR, yayına alınınca burada görünür.</p>
      )}
      <ShopDevices
        firmId={firm.id}
        devices={withState(devices, shop?.contentVersion ?? 1)}
        showroomUrl={`${siteUrl().replace(/^https?:\/\//, "")}/showroom`}
        canRemove={can(user.role, "sil")}
      />
      <ShopProducts
        firmId={firm.id}
        rows={products.flatMap((p) => {
          const m = showcase.find((x) => x.id === p.modelId);
          return m ? [{ ...p, centralName: m.name, size: `${m.dimensionsCm.w} × ${m.dimensionsCm.d} × ${m.dimensionsCm.h} cm` }] : [];
        })}
      />
      <FirmEditor key={firm.id} allSeries={seriesOf(fabrics)} firm={firm} showcaseIds={showcaseIds} showcase={showcase} ownModels={own} />
    </>
  );
}
