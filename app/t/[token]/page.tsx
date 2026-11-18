import type { Metadata } from "next";
import { getRepository } from "@/lib/data";
import { QUOTE_TOKEN } from "@/lib/teklif/request";
import { getQuotes } from "@/lib/teklif/store";
import { formatM } from "@/lib/teklif/metraj";
import { COLOR_NOTE } from "@/lib/teklif/sabitler";
import { accentStyle } from "@/lib/firm";
import { BrandMark } from "@/components/configurator/BrandMark";
import { QuotePdfButton } from "@/components/configurator/QuotePdfButton";

// A quote on the customer's phone (Showroom package, job 3): opened from the
// QR on the showroom screen or a WhatsApp message. The long random link is
// the only key; the page is the shop's, with ORMEN only beside fabric codes.

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Teklif", robots: { index: false, follow: false } };

const date = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" });
const price = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });

export default async function QuotePage({ params }: PageProps<"/t/[token]">) {
  const { token } = await params;
  const quote = QUOTE_TOKEN.test(token) ? await getQuotes().quoteByToken(token) : null;
  if (!quote) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-3 bg-kirik-beyaz px-6 text-antrasit">
        <h1 className="font-display text-[28px]">Teklif henüz burada değil</h1>
        <p className="text-[16px] text-antrasit-70">Teklif mağazadaki ekranda internet yokken hazırlandıysa, ekran bağlantı kurunca gelir. Birkaç dakika sonra bu sayfayı yenileyin.</p>
      </main>
    );
  }
  const firm = quote.firmId ? await getRepository().getFirmById(quote.firmId) : null;
  const c = quote.content;
  const pdfData = {
    number: quote.number,
    date: quote.createdAt,
    shop: { name: firm?.name ?? "ORMEN Atelier", whatsapp: firm?.whatsapp ?? null },
    customerName: quote.customerName,
    note: quote.note,
    price: quote.price,
    rows: c.rows.map((r) => ({ piece: r.piece, part: r.part, fabricCode: r.fabricCode, metres: r.metres })),
    totals: c.totals.map((t) => ({ code: t.code, colorName: t.colorName, series: t.series, total: t.total, explanation: t.explanation, reasons: t.reasons })),
    wasteMissing: quote.wasteMissing,
  };
  return (
    <main className="min-h-dvh bg-kirik-beyaz text-antrasit" style={accentStyle(firm) as React.CSSProperties | undefined}>
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-8">
        <header className="flex items-start justify-between gap-4 border-b border-cizgi pb-4">
          {firm ? <BrandMark firm={firm} /> : <BrandMark />}
          <div className="text-right">
            <h1 className="font-display text-[26px] leading-tight">Teklif</h1>
            <p className="text-[14px] text-antrasit-70">No {quote.number}</p>
            <p className="text-[14px] text-antrasit-70">{date.format(new Date(quote.createdAt))}</p>
          </div>
        </header>
        {quote.customerName && <p className="text-[16px]">Müşteri: {quote.customerName}</p>}
        <table className="w-full text-left text-[15px]">
          <thead>
            <tr className="border-b border-cizgi text-[13px] text-antrasit-70">
              <th className="py-2 font-normal">Parça</th>
              <th className="py-2 font-normal">Kumaş</th>
              <th className="py-2 text-right font-normal">Metraj</th>
            </tr>
          </thead>
          <tbody>
            {c.rows.map((r, i) => (
              <tr key={i} className="border-b border-cizgi/60">
                <td className="py-2">
                  {r.piece} · {r.part}
                </td>
                <td className="py-2">{r.fabricCode} (ORMEN)</td>
                <td className="py-2 text-right">{r.metres === null ? "usta hesaplar" : formatM(r.metres)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <section aria-label="Kumaş başına toplam" className="flex flex-col gap-3">
          {c.totals.map((t) => (
            <div key={t.code} className="rounded-xl border border-cizgi bg-white px-4 py-3">
              <div className="flex items-baseline justify-between gap-4">
                <p className="font-medium">
                  {t.code} (ORMEN) <span className="font-normal text-antrasit-70">· {t.colorName}</span>
                </p>
                <p className="font-display text-[22px]">{t.total === null ? "—" : formatM(t.total)}</p>
              </div>
              <ul className="mt-1 text-[13px] text-antrasit-70">
                {(t.total === null ? t.reasons : t.explanation).map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          ))}
          {quote.wasteMissing && <p className="font-medium">Fire dahil değildir.</p>}
          {quote.price !== null && <p className="text-right text-[18px] font-medium">Fiyat: {price.format(quote.price)} TL</p>}
          {quote.note && <p className="text-[15px]">Not: {quote.note}</p>}
        </section>
        <QuotePdfButton data={pdfData} logoUrl={firm?.logoUrl} />
        <p className="border-t border-cizgi pt-3 text-[13px] text-antrasit-50">{COLOR_NOTE}</p>
      </div>
    </main>
  );
}
