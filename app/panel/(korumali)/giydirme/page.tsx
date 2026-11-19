import Link from "next/link";
import { requirePanelUser } from "@/lib/auth/panel";
import { can } from "@/lib/auth/roles";
import { getCentral } from "@/lib/central/store";
import { getRepository } from "@/lib/data";
import { monthStartIso } from "@/lib/giydirme/kota";
import { getProvider } from "@/lib/giydirme/saglayici";
import { getGiydirme } from "@/lib/giydirme/store";
import { featureOn } from "@/lib/central/features";
import { Badge, PageHeader, buttonClass } from "@/components/panel/ui";

export const metadata = { title: "Fotoğraftan dene" };

const usd = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 });

// Photo try-on usage this month, per shop (job 5: "ORMEN panelinde firma
// bazında aylık kullanım ve maliyet özeti"), and which provider is set.
export default async function TryOnPage() {
  const user = await requirePanelUser();
  const since = monthStartIso(new Date());
  const store = getGiydirme();
  const [provider, usage, testUsage, firms, shops] = await Promise.all([getProvider(), store.usage(since, "giydirme"), store.usage(since, "test"), getRepository().listFirms(), getCentral().shopNames()]);
  const central = getCentral();
  const quotas = new Map(await Promise.all(firms.map(async (f) => [f.id, (await central.getShopRecord(f.id))?.aiQuota ?? null] as const)));
  const on = firms.filter((f) => featureOn(f.features, "giydirme"));
  const rows = [...new Set([...on.map((f) => f.id), ...usage.flatMap((u) => (u.firmId ? [u.firmId] : []))])].map((id) => {
    const u = usage.find((x) => x.firmId === id);
    return { id, name: shops.find((s) => s.id === id)?.name ?? "—", on: on.some((f) => f.id === id), quota: quotas.get(id) ?? null, ok: u?.ok ?? 0, failed: u?.failed ?? 0, refused: u?.refused ?? 0, cost: u?.costUsd ?? 0, avg: u?.avgMs ?? null };
  });
  const total = usage.reduce((s, u) => s + u.costUsd, 0) + testUsage.reduce((s, u) => s + u.costUsd, 0);
  return (
    <>
      <PageHeader title="Fotoğraftan dene" eyebrow="Yapay zekâ">
        {can(user.role, "maliyet") && (
          <Link href="/panel/giydirme/test" className={buttonClass.primary}>
            Giydirme testi
          </Link>
        )}
      </PageHeader>
      <section className="mb-6 rounded-2xl border border-cizgi bg-kagit p-5" aria-label="Sağlayıcı">
        <p className="text-[15px]">
          Sağlayıcı: <strong>{provider ? provider.name : "bağlı değil"}</strong>
        </p>
        <p className="mt-1 text-[14px] text-antrasit-70">
          {provider
            ? provider.id === "sahte"
              ? "Deneme sağlayıcısı hiçbir hizmeti çağırmaz ve para harcamaz; sonuçları gerçek değildir. Gerçek sağlayıcı ORMEN'in onayıyla bağlanır."
              : "Her görsel için sağlayıcıya ödeme yapılır; maliyetler aşağıda."
            : "Bir sağlayıcı seçilip bağlanana kadar mağaza ekranlarında “Fotoğraftan dene” düğmesi görünmez."}
        </p>
        <p className="mt-2 text-[14px]">
          Bu ay toplam gider (mağazalar ve test): <strong data-testid="ai-gider">{usd.format(total)}</strong>
        </p>
      </section>
      <h2 className="mb-3 font-display text-[20px]">Bu ay mağazalar</h2>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-cizgi-koyu p-8 text-center text-[15px] text-antrasit-50">Hiçbir mağazada açık değil.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-cizgi bg-kagit">
          <table className="w-full text-left text-[14px]">
            <thead className="border-b border-cizgi text-[13px] text-antrasit-70">
              <tr>
                <th className="px-4 py-3 font-normal">Mağaza</th>
                <th className="px-4 py-3 font-normal">Kota</th>
                <th className="px-4 py-3 font-normal">Üretilen</th>
                <th className="px-4 py-3 font-normal">Başarısız</th>
                <th className="px-4 py-3 font-normal">Kota reddi</th>
                <th className="px-4 py-3 font-normal">Ortalama süre</th>
                <th className="px-4 py-3 font-normal">Maliyet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cizgi">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <Link href={`/panel/firmalar/${r.id}`} className="hover:underline">
                      {r.name}
                    </Link>{" "}
                    {!r.on && <Badge tone="off">kapalı</Badge>}
                  </td>
                  <td className="px-4 py-3">{r.quota === null ? "belirlenmedi" : r.quota}</td>
                  <td className="px-4 py-3">
                    {r.ok}
                    {r.quota !== null && r.ok >= r.quota && (
                      <>
                        {" "}
                        <Badge tone="warn">doldu</Badge>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3">{r.failed}</td>
                  <td className="px-4 py-3">{r.refused}</td>
                  <td className="px-4 py-3">{r.avg === null ? "—" : `${(r.avg / 1000).toFixed(1).replace(".", ",")} sn`}</td>
                  <td className="px-4 py-3">{usd.format(r.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-[13px] text-antrasit-50">Kota mağazanın sayfasında, “Mağaza kaydı” bölümünde. Başarısız ve kotaya takılan denemeler kotadan düşmez.</p>
    </>
  );
}
