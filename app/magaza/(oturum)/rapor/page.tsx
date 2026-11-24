import Link from "next/link";
import { requireShopUser } from "@/lib/auth/shop";
import { monthRange } from "@/lib/monthly";
import { averageSeconds, isEmpty } from "@/lib/rapor/kullanim";
import { usageTiles } from "@/lib/rapor/pdf";
import { pickMonth, reportMonths, shopReport } from "@/lib/rapor/veri";
import { getNotices } from "@/lib/rapor/store";
import { siteUrl } from "@/lib/site";
import { PageHeader, buttonClass } from "@/components/panel/ui";

export const metadata = { title: "Kullanım raporu" };

const nf = new Intl.NumberFormat("tr-TR");

// The shop's monthly usage report (Showroom package, job 11): from its own
// events only (the database's row rules), every number countable again from
// the log. A month without use says so. The same page as a one-page PDF.
export default async function ShopReportPage({ searchParams }: PageProps<"/magaza/rapor">) {
  const user = await requireShopUser();
  const sp = await searchParams;
  const ym = pickMonth(sp.ay);
  const r = await shopReport(user, ym, siteUrl());
  // opened: the month's summary is seen (not when ORMEN looks in for support)
  if (!user.support) await getNotices().markSeen(user.firmId, ym).catch(() => undefined);
  const u = r.usage;
  const empty = isEmpty(u);
  return (
    <>
      <PageHeader title="Kullanım raporu" eyebrow={r.monthLabel}>
        <a href={`/magaza/rapor-pdf?ay=${ym}`} className={buttonClass.primary} download>
          PDF indir
        </a>
      </PageHeader>
      <nav aria-label="Ay" className="mb-6 flex flex-wrap gap-2">
        {reportMonths().map((m) => (
          <Link key={m} href={`?ay=${m}`} aria-current={m === ym ? "page" : undefined} className={`rounded-full border px-3 py-1.5 text-[13px] ${m === ym ? "border-antrasit bg-antrasit text-kagit" : "border-cizgi bg-white"}`}>
            {monthRange(m)!.label}
          </Link>
        ))}
      </nav>

      {empty ? (
        <p className="rounded-2xl border border-dashed border-cizgi-koyu p-10 text-center text-[16px]" data-testid="kullanim-yok">
          <strong>Bu ay kullanım yok.</strong>
          <span className="mt-2 block text-[14px] text-antrasit-70">Showroom ekranında ve mağazanızın web sayfasında bu ay hiçbir kullanım kaydı yok. Ekran açık ve eşleştirilmiş durumdaysa ORMEN&apos;e haber verin.</span>
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-5" data-testid="kullanim-kutulari">
            {usageTiles(u).map(([label, value]) => (
              <div key={label} className="rounded-xl border border-cizgi bg-kagit p-3">
                <dt className="text-[12px] text-antrasit-70">{label}</dt>
                <dd className="mt-1 text-[22px] font-medium tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[12px] text-antrasit-50">
            Oturum: “Başlamak için dokunun”dan ekranın kendini sıfırlamasına kadar. Ortalama, biten {nf.format(u.ended)} oturumdan{averageSeconds(u) === null ? " (biten oturum yok)" : ""}.
          </p>

          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <section aria-labelledby="top-kumas">
              <h2 id="top-kumas" className="eyebrow mb-3">
                En çok denenen 5 kumaş
              </h2>
              {u.topFabrics.length ? (
                <ol className="divide-y divide-cizgi rounded-xl border border-cizgi bg-white">
                  {u.topFabrics.map((f, i) => (
                    <li key={f.code} className="flex items-center justify-between gap-3 px-4 py-2 text-[14px]">
                      <span>
                        <span className="mr-2 text-antrasit-50">{i + 1}.</span>
                        <span className="font-medium">{f.code}</span> <span className="text-antrasit-70">{r.fabricNames[f.code] ?? ""}</span>
                      </span>
                      <span className="tabular-nums">{nf.format(f.n)} deneme</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-[14px] text-antrasit-70">Kayıt yok.</p>
              )}
            </section>
            <section aria-labelledby="top-model">
              <h2 id="top-model" className="eyebrow mb-3">
                En çok bakılan 5 model
              </h2>
              {u.topModels.length ? (
                <ol className="divide-y divide-cizgi rounded-xl border border-cizgi bg-white">
                  {u.topModels.map((m, i) => (
                    <li key={m.slug} className="flex items-center justify-between gap-3 px-4 py-2 text-[14px]">
                      <span>
                        <span className="mr-2 text-antrasit-50">{i + 1}.</span>
                        {r.modelNames[m.slug] ?? m.slug}
                      </span>
                      <span className="tabular-nums">{nf.format(m.n)} kez</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-[14px] text-antrasit-70">Kayıt yok.</p>
              )}
            </section>
          </div>
        </>
      )}

      {(u.photoRequests > 0 || r.quota) && (
        <section aria-labelledby="foto" className="mt-8 rounded-xl border border-cizgi bg-kagit p-4 text-[14px]">
          <h2 id="foto" className="eyebrow mb-2">
            Fotoğraftan dene
          </h2>
          <p>
            {nf.format(u.photoRequests)} istek, {nf.format(u.photoOk)} görsel, {nf.format(u.photoFailed)} başarısız.
          </p>
          {r.quota && (
            <p className="mt-1">
              Bu ayın kotası: {nf.format(r.quota.used)} kullanıldı, <strong>{nf.format(r.quota.left)} kaldı</strong>.
            </p>
          )}
        </section>
      )}
      <p className="mt-8 text-[12px] text-antrasit-50">Sayılar showroom ekranının ve web sayfanızın anonim kullanım kaydından gelir (IP, ad, fotoğraf yok). Yalnızca kendi mağazanızın kaydı okunur.</p>
    </>
  );
}
