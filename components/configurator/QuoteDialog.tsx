"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import type { Fabric, Firm, FurnitureModel } from "@/lib/types";
import type { Placement } from "@/lib/room/layout";
import { zoneFabricsOf } from "@/lib/three/zones";
import { formatM, quoteMetres, WASTE_LABELS, type WasteSettings } from "@/lib/teklif/metraj";
import { newQuoteNumber, newQuoteToken } from "@/lib/teklif/request";
import { buildQuotePdf, imageForPdf, loadPdfFonts } from "@/lib/teklif/pdf";
import { enqueue, flush } from "@/lib/offline/outbox";
import { newClientId } from "@/lib/offline/queue";
import { useOnline } from "@/lib/offline/use-online";
import { track } from "@/lib/track";
import { Dialog } from "@/components/ui/Dialog";

// "Metraj ve teklif" (Showroom package, job 3): the parts, fabrics and metres
// of what is on the screen, how the totals were reached, and the quote:
// a QR for the customer's phone, WhatsApp, a PDF, and on a shop's showroom
// screen, "ORMEN'e sipariş talebi gönder".

type Created = { number: string; token: string; clientId: string; body: Record<string, unknown>; queued: boolean };

/** The scene's PNG on white, as a JPEG small enough for a PDF. */
async function snapshotJpeg(dataUrl: string | null): Promise<{ bytes: Uint8Array; type: "jpg" } | null> {
  if (!dataUrl) return null;
  try {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const scale = Math.min(1, 1400 / img.width);
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.86));
    return blob ? { bytes: new Uint8Array(await blob.arrayBuffer()), type: "jpg" } : null;
  } catch {
    return null;
  }
}

function useQr(text: string | null): string | null {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    if (!text) return;
    let alive = true;
    QRCode.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#2a2a28", light: "#ffffff" } }).then((s) => alive && setSvg(s));
    return () => {
      alive = false;
    };
  }, [text]);
  return text ? svg : null;
}

export function QuoteDialog({
  open,
  onClose,
  items,
  models,
  fabrics,
  waste,
  firm,
  kiosk,
  showroom,
  snapshot,
}: {
  open: boolean;
  onClose: () => void;
  items: Placement[];
  models: Map<string, FurnitureModel>;
  fabrics: Map<string, Fabric>;
  waste: WasteSettings;
  firm: Firm | null;
  kiosk: boolean;
  /** A paired shop screen: the order request to ORMEN is offered. */
  showroom: boolean;
  snapshot: () => string | null;
}) {
  const online = useOnline();
  const pieces = useMemo(
    () =>
      items.flatMap((p) => {
        const model = models.get(p.modelSlug);
        const fabric = fabrics.get(p.fabricCode);
        return model && fabric ? [{ p, input: { model, fabric, zoneFabrics: zoneFabricsOf(p, fabrics), turned: p.yon === "donuk" } }] : [];
      }),
    [items, models, fabrics],
  );
  const result = useMemo(() => quoteMetres(pieces.map((x) => x.input), waste), [pieces, waste]);
  const [customer, setCustomer] = useState("");
  const [note, setNote] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [order, setOrder] = useState<"yok" | "gidiyor" | "gitti" | "kuyrukta">("yok");
  const [shot] = useState(() => (open ? snapshot() : null));

  const phoneUrl = created ? `${window.location.origin}/t/${created.token}` : null;
  const phoneQr = useQr(phoneUrl);
  const whatsappText = created && phoneUrl ? `${firm?.name ?? "Teklif"} · ${created.number}\n${phoneUrl}` : null;
  const whatsappQr = useQr(kiosk && whatsappText ? `https://wa.me/?text=${encodeURIComponent(whatsappText)}` : null);

  const send = async (body: Record<string, unknown>, outboxId: string): Promise<"gitti" | "kuyrukta" | { error: string }> => {
    if (showroom) {
      // on the shop's screen everything goes through the outbox: it survives no internet
      await enqueue("/api/teklif", JSON.stringify(body), outboxId);
      await flush();
      return navigator.onLine ? "gitti" : "kuyrukta";
    }
    try {
      const res = await fetch("/api/teklif", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) return "gitti";
      const b = (await res.json().catch(() => null)) as { error?: string } | null;
      return { error: b?.error ?? "Teklif kaydedilemedi." };
    } catch {
      return { error: "Bağlantı yok; teklif kaydedilemedi. İnternet gelince yeniden deneyin." };
    }
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    const clientId = newClientId();
    const body = {
      clientId,
      number: newQuoteNumber(),
      token: newQuoteToken(),
      pieces: pieces.map(({ p, input }) => ({ modelSlug: p.modelSlug, fabricCode: p.fabricCode, ...(input.model.kurulum ? { kurulum: input.model.kurulum } : {}), ...(p.zones ? { zones: p.zones } : {}), ...(p.yon === "donuk" ? { turned: true } : {}) })),
      customerName: customer,
      note,
      price: price.trim() || null,
      firmSlug: firm?.slug ?? null,
    };
    const r = await send(body, clientId);
    setBusy(false);
    if (typeof r === "object") return setError(r.error);
    setCreated({ number: body.number, token: body.token, clientId, body, queued: r === "kuyrukta" });
    void track("teklif_olusturuldu", { firmSlug: firm?.slug, n: pieces.length });
  };

  const sendOrder = async () => {
    if (!created || order !== "yok") return;
    setOrder("gidiyor");
    // the same quote, now with the order: the server finds the quote and opens one order request
    const r = await send({ ...created.body, order: true }, `${created.clientId}s`);
    if (typeof r === "object") {
      setOrder("yok");
      return setError(r.error);
    }
    setOrder(r);
    void track("siparis_talebi", { firmSlug: firm?.slug, n: result.totals.filter((t) => t.total !== null).length });
  };

  const downloadPdf = async () => {
    if (!created) return;
    setBusy(true);
    try {
      const pdf = await buildQuotePdf(
        {
          number: created.number,
          date: new Date(),
          shop: { name: firm?.name ?? "ORMEN Atelier", whatsapp: firm?.whatsapp ?? null, logo: await imageForPdf(firm?.logoUrl) },
          customerName: customer.trim() || null,
          note: note.trim() || null,
          price: price.trim() ? Number(price.replace(/\./g, "").replace(",", ".")) || null : null,
          snapshot: await snapshotJpeg(shot),
          rows: result.rows.map((r) => ({ piece: r.piece, part: r.part, fabricCode: r.fabric.code, metres: r.metres })),
          totals: result.totals.map((t) => ({ code: t.fabric.code, colorName: t.fabric.colorName, series: t.fabric.series, total: t.total, explanation: t.explanation, reasons: t.reasons })),
          wasteMissing: result.wasteMissing,
        },
        await loadPdfFonts(),
      );
      const url = URL.createObjectURL(new Blob([pdf as BlobPart], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `teklif-${created.number}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      setError("PDF hazırlanamadı.");
    }
    setBusy(false);
  };

  const field = "h-14 w-full rounded-xl border border-cizgi bg-white px-4 text-[17px] text-antrasit placeholder:text-antrasit-50 focus:border-antrasit-50 focus:outline-none";
  const big = "flex h-14 items-center justify-center rounded-full px-7 text-[17px] transition-colors disabled:opacity-50";

  return (
    <Dialog open={open} onClose={onClose} title="Metraj ve teklif" wide>
      <div className="flex max-h-[78dvh] flex-col gap-5 overflow-y-auto text-antrasit" data-testid="teklif">
        <table className="w-full text-left text-[15px]">
          <thead>
            <tr className="border-b border-cizgi text-[13px] text-antrasit-70">
              <th className="py-2 font-normal">Parça</th>
              <th className="py-2 font-normal">Kumaş</th>
              <th className="py-2 text-right font-normal">Metraj</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((r, i) => (
              <tr key={i} className="border-b border-cizgi/60">
                <td className="py-2">
                  {r.piece} · {r.part}
                </td>
                <td className="py-2 tracking-wide">{r.fabric.code}</td>
                <td className="py-2 text-right">{r.metres === null ? <span className="text-antrasit-50">usta hesaplar</span> : formatM(r.metres)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section aria-label="Kumaş başına toplam" className="flex flex-col gap-3">
          {result.totals.map((t) => (
            <div key={t.fabric.code} className="rounded-xl border border-cizgi bg-white px-4 py-3" data-testid="teklif-toplam">
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-[17px] font-medium tracking-wide">
                  {t.fabric.code} <span className="font-normal text-antrasit-70">· {t.fabric.colorName}</span>
                </p>
                <p className="font-display text-[24px]">{t.total === null ? "—" : formatM(t.total)}</p>
              </div>
              <ul className="mt-1 text-[14px] text-antrasit-70">
                {(t.total === null ? t.reasons : t.explanation).map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          ))}
          {result.wasteMissing && <p className="text-[15px] font-medium">Fire dahil değildir.</p>}
          <p className="text-[13px] text-antrasit-50">
            Fire: {(["duz", "donuk", "raporlu"] as const).map((c) => `${WASTE_LABELS[c]} ${waste[c] === null ? "girilmemiş" : `%${waste[c]}`}`).join(" · ")}. Toplamlar {formatM(waste.roundStep)} adımla yukarı yuvarlanır. Ekran renkleri bağlayıcı değildir; renk onayı numuneyle verilir.
          </p>
        </section>

        {!created ? (
          <>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_12rem]">
              <label className="flex flex-col gap-1.5 text-[14px] text-antrasit-70">
                Müşteri adı (isteğe bağlı)
                <input value={customer} onChange={(e) => setCustomer(e.target.value)} maxLength={80} autoComplete="off" className={field} />
              </label>
              <label className="flex flex-col gap-1.5 text-[14px] text-antrasit-70">
                Satıcı notu (isteğe bağlı)
                <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} autoComplete="off" className={field} />
              </label>
              <label className="flex flex-col gap-1.5 text-[14px] text-antrasit-70">
                Fiyat, TL (isteğe bağlı)
                <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.,]/g, ""))} inputMode="decimal" autoComplete="off" className={field} />
              </label>
            </div>
            {error && (
              <p role="alert" className="text-[15px] text-[#9a3b31]">
                {error}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" onClick={onClose} className={`${big} border border-cizgi bg-white`}>
                Vazgeç
              </button>
              <button type="button" onClick={() => void create()} disabled={busy || pieces.length === 0} className={`${big} bg-antrasit text-kagit`}>
                {busy ? "Hazırlanıyor…" : "Teklifi oluştur"}
              </button>
            </div>
          </>
        ) : (
          <section aria-label="Teklif hazır" className="flex flex-col gap-4">
            <p role="status" className="text-[17px]">
              Teklif <strong className="font-medium tracking-wide">{created.number}</strong> hazır.
              {created.queued && " İnternet bağlantısı gelince kaydedilecek; telefondaki bağlantı o zaman açılır."}
            </p>
            <div className="flex flex-wrap justify-center gap-8">
              <figure className="flex flex-col items-center gap-2">
                {phoneQr && <div className="h-52 w-52 rounded-xl border border-cizgi bg-white p-2 [&>svg]:h-full [&>svg]:w-full" role="img" aria-label="Teklifi telefona almak için QR kod" data-href={phoneUrl ?? undefined} dangerouslySetInnerHTML={{ __html: phoneQr }} />}
                <figcaption className="text-[15px]">Telefona al</figcaption>
              </figure>
              {kiosk && whatsappQr && (
                <figure className="flex flex-col items-center gap-2">
                  <div className="h-52 w-52 rounded-xl border border-cizgi bg-white p-2 [&>svg]:h-full [&>svg]:w-full" role="img" aria-label="Teklifi WhatsApp'ta göndermek için QR kod" dangerouslySetInnerHTML={{ __html: whatsappQr }} />
                  <figcaption className="text-[15px]">WhatsApp&apos;a gönder</figcaption>
                </figure>
              )}
            </div>
            {error && (
              <p role="alert" className="text-[15px] text-[#9a3b31]">
                {error}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-3">
              {!kiosk && whatsappText && (
                <a href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`} target="_blank" rel="noopener noreferrer" className={`${big} border border-cizgi bg-white`}>
                  WhatsApp&apos;a gönder
                </a>
              )}
              <button type="button" onClick={() => void downloadPdf()} disabled={busy} className={`${big} border border-cizgi bg-white`}>
                {busy ? "Hazırlanıyor…" : "PDF indir"}
              </button>
              {showroom && (
                <button
                  type="button"
                  onClick={() => void sendOrder()}
                  disabled={order !== "yok" || !result.totals.some((t) => t.total !== null)}
                  className={`${big} bg-antrasit text-kagit`}
                >
                  {order === "yok" ? "ORMEN'e sipariş talebi gönder" : order === "gidiyor" ? "Gönderiliyor…" : order === "gitti" ? "Sipariş talebi gönderildi" : "Bağlantı gelince gönderilecek"}
                </button>
              )}
            </div>
            {showroom && !online && order === "yok" && <p className="text-right text-[14px] text-antrasit-70">İnternet yok: talep cihazda bekler, bağlantı gelince bir kez gönderilir.</p>}
          </section>
        )}
      </div>
    </Dialog>
  );
}
