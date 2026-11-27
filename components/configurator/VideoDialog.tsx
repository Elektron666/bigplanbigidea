"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Dialog } from "@/components/ui/Dialog";
import { lastQuoteToken } from "@/lib/teklif/son";

// "Telefona video" (Showroom package, job 13): the screen turns the piece once
// round in 9 seconds and records it with the shop's logo, made on the screen
// itself (free); the video goes to the server under a long random link, with
// the visit's quote if there was one; the customer takes it by QR or WhatsApp.

const SECONDS = 9;
const W = 1280;
const H = 720;
const FPS = 30;

function pickType(): { mime: string; type: "video/mp4" | "video/webm" } | null {
  if (typeof MediaRecorder === "undefined") return null;
  // MP4 plays on every phone; WebM where MP4 cannot be recorded
  for (const mime of ["video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"])
    if (MediaRecorder.isTypeSupported(mime)) return { mime, type: mime.startsWith("video/mp4") ? "video/mp4" : "video/webm" };
  return null;
}

async function loadImage(src: string | undefined): Promise<HTMLImageElement | null> {
  if (!src) return null;
  try {
    const img = new Image();
    img.src = src;
    await img.decode();
    return img;
  } catch {
    return null;
  }
}

export function VideoDialog({ draw, firmName, logoUrl, product, onClose }: { draw: (degrees: number) => HTMLCanvasElement | null; firmName: string; logoUrl?: string; product: string; onClose: () => void }) {
  const [state, setState] = useState<{ at: "kayit"; p: number } | { at: "gonderiliyor" } | { at: "hazir"; url: string; qr: string; mb: number } | { at: "hata"; text: string }>({ at: "kayit", p: 0 });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const type = pickType();
      if (!type) return setState({ at: "hata", text: "Bu ekran video kaydedemiyor." });
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;
      const logo = await loadImage(logoUrl);
      const stream = canvas.captureStream(FPS);
      const rec = new MediaRecorder(stream, { mimeType: type.mime, videoBitsPerSecond: 2_500_000 });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const done = new Promise<void>((r) => (rec.onstop = () => r()));
      rec.start(500);
      const t0 = performance.now();
      let last = t0;
      await new Promise<void>((resolve) => {
        const step = (now: number) => {
          const dt = now - last;
          last = now;
          const src = draw((360 * dt) / (SECONDS * 1000));
          ctx.fillStyle = "#f2eee7";
          ctx.fillRect(0, 0, W, H);
          if (src) {
            // the scene, covering the frame
            const s = Math.max(W / src.width, H / src.height);
            ctx.drawImage(src, (W - src.width * s) / 2, (H - src.height * s) / 2, src.width * s, src.height * s);
          }
          // the shop's logo (or name), top left, on a light plate
          ctx.fillStyle = "rgba(245,241,234,0.9)";
          ctx.fillRect(24, 24, 300, 72);
          if (logo) {
            const k = Math.min(260 / logo.width, 52 / logo.height);
            ctx.drawImage(logo, 44, 34 + (52 - logo.height * k) / 2, logo.width * k, logo.height * k);
          } else {
            ctx.fillStyle = "#2a2a28";
            ctx.font = "600 30px sans-serif";
            ctx.fillText(firmName.slice(0, 18), 44, 72);
          }
          ctx.fillStyle = "rgba(42,42,40,0.75)";
          ctx.fillRect(0, H - 56, W, 56);
          ctx.fillStyle = "#ffffff";
          ctx.font = "500 24px sans-serif";
          ctx.fillText(product.slice(0, 70), 28, H - 20);
          const p = Math.min(1, (now - t0) / (SECONDS * 1000));
          setState({ at: "kayit", p });
          if (p < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });
      rec.stop();
      await done;
      const blob = new Blob(chunks, { type: type.type });
      setState({ at: "gonderiliyor" });
      const q = new URLSearchParams({ urun: product });
      const quote = lastQuoteToken();
      if (quote) q.set("teklif", quote);
      const res = await fetch(`/api/video?${q}`, { method: "POST", headers: { "content-type": type.type }, body: blob }).catch(() => null);
      const out = res ? ((await res.json().catch(() => ({}))) as { url?: string; error?: string }) : { error: "Bağlantı kurulamadı." };
      if (!res?.ok || !out.url) return setState({ at: "hata", text: out.error ?? "Video gönderilemedi." });
      setState({ at: "hazir", url: out.url, qr: await QRCode.toDataURL(out.url, { margin: 1, width: 320 }), mb: Math.round((blob.size / 1024 / 1024) * 10) / 10 });
    })();
  }, [draw, firmName, logoUrl, product]);

  return (
    <Dialog open onClose={onClose} title="Telefona video">
      <div className="flex flex-col items-center gap-4 p-2 text-center" data-mesgul="">
        {state.at === "kayit" && (
          <>
            <p className="text-[17px]">Koltuk bir tur dönüyor, video hazırlanıyor…</p>
            <div className="h-2 w-64 overflow-hidden rounded-full bg-cizgi" role="progressbar" aria-valuenow={Math.round(state.p * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Video kaydı">
              <div className="h-full bg-antrasit" style={{ width: `${state.p * 100}%` }} />
            </div>
          </>
        )}
        {state.at === "gonderiliyor" && <p className="text-[17px]">Gönderiliyor…</p>}
        {state.at === "hata" && (
          <p role="alert" className="text-[16px] text-[#9a3b31]">
            {state.text}
          </p>
        )}
        {state.at === "hazir" && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={state.qr} alt="Videoyu telefona almak için okutun" className="h-64 w-64" data-testid="video-qr" />
            <p className="text-[16px]">Telefonunuzla okutun{lastQuoteToken() ? "; teklifiniz de bağlantıda" : ""}.</p>
            <p className="text-[12px] text-antrasit-50" data-testid="video-bilgi">
              {state.mb} MB · <span data-testid="video-adres">{state.url}</span>
            </p>
            {/* WhatsApp from the screen: a QR the customer scans opens the message on their phone */}
            <WhatsappQr text={`${firmName}: seçtiğiniz koltuğun videosu ${state.url}`} />
          </>
        )}
      </div>
    </Dialog>
  );
}

function WhatsappQr({ text }: { text: string }) {
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    void QRCode.toDataURL(`https://wa.me/?text=${encodeURIComponent(text)}`, { margin: 1, width: 200 }).then(setQr);
  }, [text]);
  return qr ? (
    <figure className="flex flex-col items-center gap-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} alt="WhatsApp ile göndermek için okutun" className="h-36 w-36" />
      <figcaption className="text-[13px] text-antrasit-70">WhatsApp ile kendinize gönderin</figcaption>
    </figure>
  ) : null;
}
