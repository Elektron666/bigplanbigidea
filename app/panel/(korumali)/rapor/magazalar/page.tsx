import Link from "next/link";
import { requirePanelUser } from "@/lib/auth/panel";
import { getRepository } from "@/lib/data";
import { getCentral } from "@/lib/central/store";
import { getQuotes } from "@/lib/teklif/store";
import { monthRange } from "@/lib/monthly";
import { averageSeconds, duration, idleScreens, IDLE_SCREEN_DAYS, isEmpty, usageOf } from "@/lib/rapor/kullanim";
import { ensureMonthlyNotices } from "@/lib/rapor/bildirim";
import { getNotices } from "@/lib/rapor/store";
import { pickMonth, reportMonths } from "@/lib/rapor/veri";
import { whatsappUrl } from "@/lib/samples";
import { siteUrl } from "@/lib/site";
import { PageHeader, buttonClass } from "@/components/panel/ui";

export const metadata = { title: "Mağazaların kullanımı" };

const nf = new Intl.NumberFormat("tr-TR");
const day = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", timeZone: "Europe/Istanbul" });

// Every shop's monthly usage side by side (Showroom package, job 11), the
// screens nobody has used for 30 days, and the fabrics each shop quoted most.
// From the event log (the same sums as each shop's own report) and the quotes.
export default async function ShopsUsagePage({ searchParams }: PageProps<"/panel/rapor/magazalar">) {
  await requirePanelUser();
  const sp = await searchParams;
  const months = reportMonths();
  const ym = pickMonth(sp.ay);
  const range = monthRange(ym)!;
  // the daily job makes the month's notices; opening this page does too (it is safe twice)
  await ensureMonthlyNotices().catch(() => undefined);
  const repo = getRepository();
  const [usage, firms, beats, last, quoted, notices] = await Promise.all([
    repo.usageReport(range.from, range.to),
    repo.listFirms(),
    getCentral().deviceBeats(),
    repo.screenLastSessions(),
    getQuotes().quotedFabrics(range.from, range.to),
    getNotices().forMonth(ym),
  ]);
  const shown = firms.filter((f) => f.isActive || usage.some((u) => u.firmSlug === f.slug)).sort((a, b) => a.name.localeCompare(b.name, "tr"));
  const name = new Map(firms.map((f) => [f.id, f.name]));
  const idle = idleScreens(beats, last);
  const seen = new Map(notices.map((n) => [n.firmId, n.seenAt]));

  return (
    <>
      <PageHeader title="Mağazaların kullanımı" eyebrow={range.label}>
        <Link href="/panel/rapor" className={buttonClass.secondary}>
          Genel rapor
        </Link>
      </PageHeader>
      <nav aria-label="Ay" className="mb-6 flex flex-wrap gap-2">
        {months.map((m) => (
          <Link key={m} href={`?ay=${m}`} aria-current={m === ym ? "page" : undefined} className={`rounded-full border px-3 py-1.5 text-[13px] ${m === ym ? "border-antrasit bg-antrasit text-kagit" : "border-cizgi bg-white"}`}>
            {monthRange(m)!.label}
          </Link>
        ))}
      </nav>

      <section aria-labelledby="yan-yana" className="mb-10">
        <h2 id="yan-yana" className="eyebrow mb-3">
          Yan yana
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-cizgi bg-white">
          <table className="w-full text-[13px]">
            <thead className="border-b border-cizgi text-left text-[12px] text-antrasit-70">
              <tr>
                <th className="px-3 py-2 font-normal">Mağaza</th>
                <th className="px-3 py-2 text-right font-normal">Oturum</th>
                <th className="px-3 py-2 text-right font-normal">Ort. süre</th>
                <th className="px-3 py-2 text-right font-normal">Web ziyareti</th>
                <th className="px-3 py-2 text-right font-normal">Kumaş denemesi</th>
                <th className="px-3 py-2 text-right font-normal">Teklif</th>
                <th className="px-3 py-2 text-right font-normal">Sipariş talebi</th>
                <th className="px-3 py-2 text-right font-normal">Kartela</th>
                <th className="px-3 py-2 text-right font-normal">Foto görsel</th>
                <th className="px-3 py-2 font-normal">Aylık özet</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((f) => {
                const u = usageOf(usage, f.slug);
                const told = seen.has(f.id);
                const text = `${f.name}: ORMEN Atelier ${range.label} kullanım raporunuz hazır. Mağaza panelinizde: ${siteUrl()}/magaza/rapor?ay=${ym}`;
                return (
                  <tr key={f.id} className="border-b border-cizgi/60 last:border-0" data-testid="magaza-kullanim">
                    <th scope="row" className="px-3 py-2 text-left font-medium">
                      {f.name}
                    </th>
                    {isEmpty(u) ? (
                      <td colSpan={8} className="px-3 py-2 text-antrasit-50">
                        Kullanım yok
                      </td>
                    ) : (
                      <>
                        <td className="px-3 py-2 text-right tabular-nums">{nf.format(u.sessions)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{duration(averageSeconds(u))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{nf.format(u.webVisits)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{nf.format(u.fabricTries)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{nf.format(u.quotes)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{nf.format(u.orders)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{nf.format(u.kartela)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{nf.format(u.photoOk)}</td>
                      </>
                    )}
                    <td className="px-3 py-2">
                      {!told ? (
                        <span className="text-antrasit-50">—</span>
                      ) : (
                        <span className="flex flex-wrap items-center gap-2">
                          <span className={seen.get(f.id) ? "text-[#35523a]" : "text-antrasit-70"}>{seen.get(f.id) ? "Açıldı" : "Açılmadı"}</span>
                          {f.whatsapp && (
                            <a href={whatsappUrl(f.whatsapp, text)} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                              WhatsApp&apos;la hatırlat
                            </a>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[12px] text-antrasit-50">Her ayın ilk gününden sonra günlük iş, her mağazanın paneline önceki ayın raporunu bırakır. E-posta gönderilmez; mağaza panelinde “raporunuz hazır” görünür, burada WhatsApp ile hatırlatılabilir.</p>
      </section>

      <section aria-labelledby="bos-ekran" className="mb-10">
        <h2 id="bos-ekran" className="eyebrow mb-3">
          {IDLE_SCREEN_DAYS} gündür kullanılmayan ekranlar
        </h2>
        {idle.length ? (
          <ul className="divide-y divide-cizgi rounded-2xl border border-cizgi bg-[#F4E9DD] text-[14px] text-ceviz" aria-label="Kullanılmayan ekranlar">
            {idle.map((d) => (
              <li key={d.id} className="px-4 py-2">
                <strong>{name.get(d.firmId) ?? "?"}</strong> · {d.name ?? "Ekran"}: {d.lastSessionAt ? `son müşteri ${day.format(new Date(d.lastSessionAt))}` : "eşleştirildiğinden beri hiç müşteri oturumu yok"}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-antrasit-70">Yok: bütün ekranlar son {IDLE_SCREEN_DAYS} günde kullanılmış.</p>
        )}
      </section>

      <section aria-labelledby="teklif-kumas">
        <h2 id="teklif-kumas" className="eyebrow mb-3">
          Mağaza bazında en çok teklif edilen kumaşlar
        </h2>
        {quoted.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...new Set(quoted.map((q) => q.firmId))].map((firmId) => (
              <div key={firmId ?? "ormen"} className="rounded-xl border border-cizgi bg-white p-3">
                <h3 className="mb-2 font-medium">{firmId ? (name.get(firmId) ?? "?") : "ORMEN sitesi"}</h3>
                <ol className="text-[13px]">
                  {quoted
                    .filter((q) => q.firmId === firmId)
                    .slice(0, 5)
                    .map((q, i) => (
                      <li key={q.code} className="flex justify-between gap-3">
                        <span>
                          {i + 1}. {q.code}
                        </span>
                        <span className="tabular-nums text-antrasit-70">{nf.format(q.quotes)} teklif</span>
                      </li>
                    ))}
                </ol>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[14px] text-antrasit-70">Bu ay teklif yok.</p>
        )}
      </section>
    </>
  );
}
