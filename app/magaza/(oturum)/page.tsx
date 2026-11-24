import Link from "next/link";
import { requireShopUser } from "@/lib/auth/shop";
import { getShopPanel, QUOTE_PAGE } from "@/lib/magaza/store";
import { ORDER_STATUS_LABELS } from "@/lib/teklif/sabitler";
import { Badge, PageHeader, buttonClass } from "@/components/panel/ui";
import { getNotices } from "@/lib/rapor/store";
import { monthRange } from "@/lib/monthly";

export const metadata = { title: "Teklifler" };

const when = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
const money = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
const metres = (m: number) => `${m.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} m`;

// The shop's quotes, newest first: what the salespeople gave on the showroom
// screen and the shop's page. The customer's name and note are the shop's
// own; ORMEN's support view does not get them.
export default async function ShopQuotesPage({ searchParams }: PageProps<"/magaza">) {
  const user = await requireShopUser();
  const sp = await searchParams;
  const page = Math.max(1, Math.min(10_000, Number(sp.sayfa) || 1));
  const { total, rows } = await getShopPanel().quotes(user, page);
  const pages = Math.max(1, Math.ceil(total / QUOTE_PAGE));
  // the monthly usage summary ORMEN's daily job handed over, until it is opened (job 11)
  const unseen = (await getNotices().forShop(user.firmId).catch(() => [])).find((n) => !n.seenAt);
  return (
    <>
      {unseen && (
        <div role="status" className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl bg-[#E8EFE6] px-5 py-3 text-[15px] text-[#35523a]">
          <span className="min-w-0 flex-1">{monthRange(unseen.month)?.label} kullanım raporunuz hazır.</span>
          <Link href={`/magaza/rapor?ay=${unseen.month}`} className={buttonClass.secondary}>
            Raporu aç
          </Link>
          <a href={`/magaza/rapor-pdf?ay=${unseen.month}`} download className={buttonClass.quiet}>
            PDF indir
          </a>
        </div>
      )}
      <PageHeader title="Teklifler" eyebrow={`${total} teklif`} />
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-cizgi-koyu p-10 text-center text-[15px] text-antrasit-50">
          Henüz teklif yok. Showroom ekranında “Metraj ve teklif” ile verilen teklifler burada görünür.
        </p>
      ) : (
        <ul className="divide-y divide-cizgi rounded-2xl border border-cizgi bg-kagit" aria-label="Teklifler">
          {rows.map((q) => (
            <li key={q.id} className="flex flex-wrap items-start gap-x-6 gap-y-2 px-5 py-4" data-testid="magaza-teklif">
              <div className="min-w-0 flex-1 basis-72">
                <p className="font-medium">
                  {q.number} · {when.format(new Date(q.createdAt))}
                </p>
                <p className="text-[14px] text-antrasit-70">{q.pieces.join(", ") || "—"}</p>
                <p className="text-[13px] text-antrasit-50">{q.totals.length ? q.totals.map((t) => `${t.code} ${metres(t.metres)}`).join(" · ") : "metraj hesaplanamadı"}</p>
                {user.support ? (
                  <p className="text-[13px] text-antrasit-50">Müşteri bilgisi destek görünümünde gizli.</p>
                ) : (
                  (q.customerName || q.note) && <p className="text-[13px] text-antrasit-70">{[q.customerName, q.note].filter(Boolean).join(" · ")}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {q.price !== null && <span className="text-[15px] font-medium">{money.format(q.price)}</span>}
                {q.orderStatus && <Badge tone={q.orderStatus === "yeni" ? "warn" : "neutral"}>ORMEN siparişi: {ORDER_STATUS_LABELS[q.orderStatus]}</Badge>}
                <Link href={`/t/${q.token}`} target="_blank" className={buttonClass.quiet}>
                  Teklifi aç
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <nav aria-label="Sayfalar" className="mt-5 flex items-center justify-between text-[14px]">
          {page > 1 ? (
            <Link href={`/magaza?sayfa=${page - 1}`} className={buttonClass.secondary}>
              Önceki
            </Link>
          ) : (
            <span />
          )}
          <span className="text-antrasit-50">
            Sayfa {page} / {pages}
          </span>
          {page < pages ? (
            <Link href={`/magaza?sayfa=${page + 1}`} className={buttonClass.secondary}>
              Sonraki
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
