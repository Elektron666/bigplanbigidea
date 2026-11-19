import { requirePanelUser } from "@/lib/auth/panel";
import Link from "next/link";
import { headers } from "next/headers";
import { gatherSetupFacts } from "@/lib/setup-facts";
import { evaluateSetup, overall } from "@/lib/setup-check";
import { getQuotes } from "@/lib/teklif/store";
import { getRepository } from "@/lib/data";
import { PageHeader, buttonClass } from "@/components/panel/ui";
import { overdueCount } from "@/lib/pilot-metrics";
import { getCentral } from "@/lib/central/store";
import { buildOverview } from "@/lib/central/overview";
import { can } from "@/lib/auth/roles";
import { getGiydirme } from "@/lib/giydirme/store";
import { getProvider } from "@/lib/giydirme/saglayici";

const money = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
// providers bill in US dollars; the figure is shown as billed, not converted
const usd = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function PanelHome() {
  // checked here, not only in the layout: a layout check does not stop the page from rendering
  const user = await requirePanelUser();
  const repo = getRepository();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const todayKey = now.toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
  // the month in Istanbul (UTC+3 all year)
  const monthStart = new Date(`${todayKey.slice(0, 7)}-01T00:00:00+03:00`);
  const central = getCentral();
  const withFees = can(user.role, "abonelik");
  const [month, counts, beats, fees, shops, aiUsage, provider] = await Promise.all([
    repo.eventReport(monthStart, now).catch(() => null),
    getQuotes().countSince(monthStart).catch(() => null),
    central.deviceBeats(),
    // never read for ORMEN elemanı
    withFees ? central.unpaidFees() : null,
    central.shopNames(),
    // photo try-on this month (job 5): every kind, with the test bench
    getGiydirme().usage(monthStart.toISOString()).catch(() => []),
    getProvider(),
  ]);
  const aiCost = aiUsage.reduce((s, u) => s + u.costUsd, 0);
  const quotaFull = aiUsage.filter((u) => u.firmId && u.refused > 0).map((u) => u.firmId!);
  const overview = buildOverview({ devices: beats, fees, shops, quotaFull }, todayKey, now.getTime());
  const [fabrics, models, firms, samples, week, feedback, orders] = await Promise.all([
    repo.listFabrics({ includeInactive: true }),
    repo.listAllModels(),
    repo.listFirms(),
    repo.listSampleRequests(),
    // visits: a random per-tab id, never a person (lib/events.ts)
    repo.eventReport(weekAgo, now).catch(() => null),
    repo.listFeedback().catch(() => []),
    // fabric order requests from the showroom screens (job 3); the panel says so like the sample requests
    getQuotes().listOrders(50).catch(() => []),
  ]);
  const newOrders = orders.filter((o) => o.status === "yeni");
  const newFeedback = feedback.filter((f) => new Date(f.createdAt) >= weekAgo).length;
  const waiting = feedback.filter((f) => f.contact && new Date(f.createdAt) >= weekAgo).length;
  const today = week?.days.find((d) => d.day === todayKey)?.sessions ?? 0;
  const cards = [
    { href: "/panel/kumaslar", title: "Kumaşlar", value: fabrics.filter((f) => f.isActive).length, note: `${fabrics.filter((f) => f.isPlaceholder).length} yer tutucu` },
    { href: "/panel/modeller", title: "Modeller", value: models.filter((m) => m.isActive).length, note: "vitrin ve firma modelleri" },
    { href: "/panel/firmalar", title: "Firmalar", value: firms.filter((f) => f.isActive).length, note: "kendi sayfası olan firma" },
    { href: "/panel/rapor", title: "Ziyaret (bugün)", value: today, note: week ? `son 7 gün: ${week.sessions}` : "rapor okunamadı" },
    { href: "/panel/geri-bildirim", title: "Fikirler", value: newFeedback, note: `son 7 gün${waiting ? ` · ${waiting} dönüş bekliyor` : ""}` },
    { href: "/panel/talepler", title: "Numune talepleri", value: samples.length, note: samples[0] ? `son: ${new Date(samples[0].createdAt).toLocaleDateString("tr-TR")}` : "henüz yok" },
    { href: "/panel/siparisler", title: "Sipariş talepleri", value: newOrders.length, note: newOrders.length ? "yeni, bekliyor" : orders[0] ? `son: ${new Date(orders[0].createdAt).toLocaleDateString("tr-TR")}` : "henüz yok" },
  ];
  const overdue = overdueCount(samples);
  const setup = overall(evaluateSetup(await gatherSetupFacts((await headers()).get("host"))));
  return (
    <>
      {(setup === "error" || setup === "warn") && (
        <Link href="/panel/durum" className="mb-6 block rounded-xl border border-[#e7c3bd] bg-[#fbeeec] px-4 py-3 text-[14px] hover:border-[#b4483c]">
          Kurulumda {setup === "error" ? "yapılması gereken" : "eksik"} adımlar var. <span className="underline">Kurulum durumunu gör</span>
        </Link>
      )}
      {user.mode === "supabase" && !user.twoFactor && (
        <Link href="/panel/guvenlik" className="mb-6 block rounded-xl border border-[#e7c3bd] bg-[#fbeeec] px-4 py-3 text-[14px] hover:border-[#b4483c]">
          Hesabınızda iki adımlı doğrulama kapalı. <span className="underline">Güvenlik sayfasından açın</span> (2 dakika, telefon gerekir).
        </Link>
      )}
      {newOrders.length > 0 && (
        <Link href="/panel/siparisler" role="alert" className="mb-6 block rounded-xl border border-[#e7c3bd] bg-[#fbeeec] px-4 py-3 text-[14px] text-[#7a2f27] hover:border-[#b4483c]">
          <strong>
            {newOrders.length} yeni kumaş sipariş talebi: {[...new Set(newOrders.map((o) => o.firmName ?? "mağaza"))].slice(0, 3).join(", ")}.
          </strong>{" "}
          <span className="underline">Siparişlere git</span>
        </Link>
      )}
      {overdue > 0 && (
        <Link href="/panel/talepler" role="alert" className="mb-6 block rounded-xl border border-[#e7c3bd] bg-[#fbeeec] px-4 py-3 text-[14px] text-[#7a2f27] hover:border-[#b4483c]">
          <strong>{overdue} numune talebi 24 saattir bekliyor.</strong> <span className="underline">Taleplere git</span>
        </Link>
      )}
      <PageHeader title="Genel bakış">
        <Link href="/panel/kumaslar/yeni" className={buttonClass.primary}>
          Yeni kumaş
        </Link>
      </PageHeader>
      <section aria-labelledby="showroom-ozet">
        <h2 id="showroom-ozet" className="mb-4 font-display text-[22px]">
          Mağazalar ve ekranlar
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="genel-bakis">
          {[
            { title: "Ekranlar", value: `${overview.devices.online} açık`, note: `${overview.devices.offline} kapalı · ${overview.devices.neverOpened} henüz açılmadı · toplam ${overview.devices.total}`, href: "/panel/magazalar?sira=son-gorulme" },
            { title: "Bu ay oturum", value: month ? String(month.sessions) : "—", note: month ? "showroom ekranı ve mağaza sayfaları" : "rapor okunamadı", href: "/panel/rapor" },
            { title: "Bu ay teklif", value: counts ? String(counts.quotes) : "—", note: "yalnızca sayı; müşteri bilgisi mağazada kalır", href: null },
            { title: "Bu ay sipariş talebi", value: counts ? String(counts.orders) : "—", note: "ORMEN'e gelen kumaş talepleri", href: "/panel/siparisler" },
            {
              title: "Yapay zekâ gideri (bu ay)",
              value: usd.format(aiCost),
              note: !provider ? "Sağlayıcı bağlı değil; hiçbir ücretli çağrı yapılmıyor." : provider.id === "sahte" ? "Deneme sağlayıcısı: hiçbir hizmet çağrılmıyor." : `${provider.name} · ${aiUsage.reduce((s, u) => s + u.ok, 0)} görsel`,
              href: "/panel/giydirme",
            },
            ...(overview.fees
              ? [
                  {
                    title: "Bu ay vadesi gelen bakım",
                    value: money.format(overview.fees.amount),
                    note: `${overview.fees.dueThisMonth} vade${overview.fees.overdue ? ` · ${overview.fees.overdue} gecikti` : ""}${overview.fees.withoutAmount ? ` · ${overview.fees.withoutAmount} vadenin tutarı girilmedi` : ""}`,
                    href: "/panel/magazalar?sira=vade",
                  },
                ]
              : []),
          ].map((c) => {
            const body = (
              <>
                <p className="eyebrow">{c.title}</p>
                <p className="mt-2 font-display text-[34px] leading-none">{c.value}</p>
                <p className="mt-2 text-[13px] text-antrasit-50">{c.note}</p>
              </>
            );
            return c.href ? (
              <Link key={c.title} href={c.href} className="rounded-2xl border border-cizgi bg-kagit p-5 transition-colors hover:border-cizgi-koyu">
                {body}
              </Link>
            ) : (
              <div key={c.title} className="rounded-2xl border border-cizgi bg-kagit p-5">
                {body}
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section aria-labelledby="dikkat" className="rounded-2xl border border-cizgi bg-kagit p-5">
            <h3 id="dikkat" className="font-display text-[18px]">
              Dikkat isteyenler
            </h3>
            {overview.attention.length ? (
              <ul className="mt-3 divide-y divide-cizgi">
                {overview.attention.slice(0, 12).map((a) => (
                  <li key={a.firmId} className="py-2.5">
                    <Link href={`/panel/firmalar/${a.firmId}`} className="font-medium underline-offset-2 hover:underline">
                      {a.name}
                    </Link>
                    <p className="text-[13px] text-[#7a2f27]">{a.reasons.join(" · ")}</p>
                  </li>
                ))}
                {overview.attention.length > 12 && <li className="py-2.5 text-[13px] text-antrasit-50">ve {overview.attention.length - 12} mağaza daha</li>}
              </ul>
            ) : (
              <p className="mt-2 text-[14px] text-antrasit-70">Şu an dikkat isteyen bir şey yok.</p>
            )}
          </section>
          <section aria-labelledby="cok-denenen" className="rounded-2xl border border-cizgi bg-kagit p-5">
            <h3 id="cok-denenen" className="font-display text-[18px]">
              Bu ay en çok denenen kumaşlar
            </h3>
            {month?.topFabrics.length ? (
              <ol className="mt-3 divide-y divide-cizgi">
                {month.topFabrics.slice(0, 8).map((f) => (
                  <li key={f.code} className="flex items-baseline justify-between gap-3 py-2">
                    <span className="font-medium">{f.code}</span>
                    <span className="text-[13px] text-antrasit-50">
                      {f.tries} deneme · {f.sessions} oturum
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-[14px] text-antrasit-70">Bu ay henüz kumaş denenmedi.</p>
            )}
          </section>
        </div>
      </section>
      <section aria-labelledby="katalog-ozet" className="mt-10">
        <h2 id="katalog-ozet" className="mb-4 font-display text-[22px]">
          Katalog ve talepler
        </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="rounded-2xl border border-cizgi bg-kagit p-5 transition-colors hover:border-cizgi-koyu">
            <p className="eyebrow">{c.title}</p>
            <p className="mt-2 font-display text-[40px] leading-none">{c.value}</p>
            <p className="mt-2 text-[13px] text-antrasit-50">{c.note}</p>
          </Link>
        ))}
      </div>
      </section>
    </>
  );
}
