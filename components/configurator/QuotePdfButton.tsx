"use client";

import { useState } from "react";
import { buildQuotePdf, imageForPdf, loadPdfFonts, type QuotePdfData } from "@/lib/teklif/pdf";

/** The phone page's "PDF indir": the same one-page PDF, made on the phone (no picture of the screen is stored). */
export function QuotePdfButton({ data, logoUrl }: { data: Omit<QuotePdfData, "date" | "shop"> & { date: string; shop: { name: string; whatsapp?: string | null } }; logoUrl?: string | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const download = async () => {
    setBusy(true);
    setError(false);
    try {
      const pdf = await buildQuotePdf({ ...data, date: new Date(data.date), shop: { ...data.shop, logo: await imageForPdf(logoUrl) } }, await loadPdfFonts());
      const url = URL.createObjectURL(new Blob([pdf as BlobPart], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `teklif-${data.number}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      setError(true);
    }
    setBusy(false);
  };
  return (
    <div className="flex flex-col items-start gap-2">
      <button type="button" onClick={() => void download()} disabled={busy} className="h-12 rounded-full bg-antrasit px-6 text-[15px] text-kagit disabled:opacity-50">
        {busy ? "Hazırlanıyor…" : "PDF indir"}
      </button>
      {error && <p role="alert" className="text-[14px] text-[#9a3b31]">PDF hazırlanamadı; sayfayı yenileyip yeniden deneyin.</p>}
    </div>
  );
}
