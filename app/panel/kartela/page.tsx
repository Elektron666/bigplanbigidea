import QRCode from "qrcode";
import { getRepository } from "@/lib/data";
import { requirePanelUser } from "@/lib/auth/panel";
import { siteUrl, siteUrlIsFinal } from "@/lib/site";
import { codeUpper } from "@/lib/i18n/tr";
import { kartelaPath } from "@/lib/kartela/qr";
import { PrintButton } from "../kart/[id]/PrintButton";

// Swatch card labels (Showroom package, job 2, "sihirli kartela"): one label
// per fabric picked in the panel's fabric list. Held up to a showroom screen,
// the QR dresses the sofa in that fabric; scanned with a phone, it opens the
// page (the shop's, when one was chosen) with the fabric on.
// A4 sheet of 3 × 8 labels (63.5 × 33.9 mm, the common L7159 sticker sheet),
// the same sheet as the hanger labels.

export const metadata = { title: "Kartela etiketleri" };

const MAX_LABELS = 240;

export default async function SwatchLabelsPage({ searchParams }: PageProps<"/panel/kartela">) {
  await requirePanelUser();
  const sp = await searchParams;
  const asked = (Array.isArray(sp.kod) ? sp.kod : sp.kod ? [sp.kod] : []).map((c) => codeUpper(String(c))).slice(0, MAX_LABELS);
  const repo = getRepository();
  const firmId = typeof sp.magaza === "string" && sp.magaza ? sp.magaza.slice(0, 40) : null;
  const [all, firm] = await Promise.all([repo.listFabrics({ includeInactive: true }), firmId ? repo.getFirmById(firmId) : null]);
  const byCode = new Map(all.map((f) => [f.code, f]));
  const fabrics = [...new Set(asked)].flatMap((c) => (byCode.has(c) ? [byCode.get(c)!] : []));
  const labels = await Promise.all(
    fabrics.map(async (f) => {
      const url = `${siteUrl()}${kartelaPath(f.code, firm?.slug)}`;
      // H: the label is handled, bent and held at an angle; the code survives a scratch
      const qr = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "H", color: { dark: "#000000", light: "#00000000" } });
      return { fabric: f, url, qr };
    }),
  );

  return (
    <main className="min-h-dvh bg-cizgi/40 py-8 print:min-h-0 print:bg-white print:py-0">
      <style>{`@page { size: A4; margin: 13mm 7mm; } @media print { html, body { background: #fff !important; } }`}</style>
      <div className="mx-auto mb-6 flex max-w-[196mm] flex-col items-center gap-3 print:hidden">
        {labels.length > 0 && <PrintButton />}
        <p className="text-center text-[13px] text-antrasit-70">
          {labels.length ? `${labels.length} kartela etiketi` : "Etiket yok: Kumaşlar sayfasında etiketi basılacak kumaşları işaretleyin."} · A4 başına 24 (3 × 8, 63,5 × 33,9 mm; L7159 tipi etiket kâğıdı). Yazdırırken
          ölçek %100. {firm ? `Telefonla okutulunca ${firm.name} sayfası açılır.` : "Telefonla okutulunca ORMEN sayfası açılır; showroom ekranı her zaman kendi mağazasında giydirir."}
        </p>
        {asked.length > fabrics.length && <p className="text-center text-[13px] text-[#9a3b31]">{asked.length - fabrics.length} kod bulunamadı ve atlandı.</p>}
        {!siteUrlIsFinal() && <p className="rounded-xl bg-[#F4E9DD] px-3 py-2 text-center text-[13px] text-ceviz">QR geçici adresi gösteriyor; alan adı bağlanmadan bastırmayın.</p>}
      </div>
      <div className="mx-auto grid w-[196mm] grid-cols-3 gap-x-[2.5mm] bg-white print:bg-transparent">
        {labels.map(({ fabric: f, url, qr }) => (
          <article key={f.code} className="flex h-[33.9mm] items-center gap-[3mm] px-[3mm] text-black [break-inside:avoid]" data-testid="kartela-etiketi">
            {/* 26 mm: read from 20–40 cm by a screen's camera */}
            <div className="h-[26mm] w-[26mm] shrink-0 [&>svg]:h-full [&>svg]:w-full" data-href={url} dangerouslySetInnerHTML={{ __html: qr }} role="img" aria-label={`${f.code} QR`} />
            <div className="min-w-0">
              <p className="truncate font-sans text-[13pt] font-medium leading-tight tracking-wide" translate="no">
                {f.code}
              </p>
              <p className="truncate text-[8pt]">
                {f.series} · {f.colorName}
              </p>
              <p className="mt-[1.5mm] text-[6.5pt] leading-tight">Ekrana tutun, koltukta görün</p>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
