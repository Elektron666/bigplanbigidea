import { requireShopUser } from "@/lib/auth/shop";
import { getCentral } from "@/lib/central/store";
import { deviceState, DEVICE_QUALITY_LABELS, type Device } from "@/lib/devices/pairing";
import { Badge, PageHeader } from "@/components/panel/ui";

export const metadata = { title: "Ekranlar" };

const when = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });

/** Where each screen stands right now (worked out on the server, as in the ORMEN panel). */
function withState(devices: Device[], shopVersion: number) {
  const now = Date.now();
  return devices.map((d) => ({ ...d, state: deviceState(d, shopVersion, now) }));
}

// The shop's showroom screens and where each stands. Adding or removing a
// screen is ORMEN's (pairing code, panel); the shop sees them here.
export default async function ShopScreensPage() {
  const user = await requireShopUser();
  const central = getCentral();
  const [list, shop] = await Promise.all([central.listDevices(user.firmId), central.getShopState(user.firmId)]);
  const devices = withState(list, shop?.contentVersion ?? 1);
  return (
    <>
      <PageHeader title="Ekranlar" eyebrow={`${devices.length} ekran`} />
      {devices.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-cizgi-koyu p-10 text-center text-[15px] text-antrasit-50">Henüz eşleştirilmiş ekran yok. Ekranı ORMEN kurar.</p>
      ) : (
        <ul className="divide-y divide-cizgi rounded-2xl border border-cizgi bg-kagit" aria-label="Ekranlar">
          {devices.map((d) => {
            const s = d.state;
            return (
              <li key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {d.name}
                    {d.branch ? ` · ${d.branch}` : ""}
                  </p>
                  <p className="text-[13px] text-antrasit-50">
                    {d.lastSeenAt ? `son görülme ${when.format(new Date(d.lastSeenAt))}` : "henüz açılmadı"} · görüntü: {DEVICE_QUALITY_LABELS[d.quality]}
                  </p>
                </div>
                <Badge tone={s.tone}>{s.label}</Badge>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-5 text-[13px] text-antrasit-50">Ekranda sorun olursa logoya hızlıca 5 kez dokunun, mağaza PIN&apos;ini yazın ve “Güncellemeleri denetle” deyin; olmazsa ORMEN&apos;i arayın.</p>
    </>
  );
}
