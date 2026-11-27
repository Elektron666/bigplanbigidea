"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { rememberExtraSession } from "@/lib/giydirme/istemci";

// "Müşterinin salonunda" (Showroom package, job 15): the customer sends a
// photo of their room from their phone (QR), the screen sends the product as
// its 3D shows it, the provider puts it into the room. The picture carries
// "Ön izleme · ölçüler yaklaşıktır" in itself. The room photo is not kept:
// it is deleted when this window closes, and with the visit at the latest.

const big = "min-h-14 rounded-full px-6 text-[17px] disabled:opacity-40";

/** As a file the screen made itself (the showroom lock lets only those out), label and all. */
async function download(url: string) {
  const res = await fetch(url).catch(() => null);
  if (!res?.ok) return;
  const href = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = href;
  a.download = "salon-on-izleme.jpg";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 30_000);
}

export function SalonPreview({ product, modelSlug, modelName, fabricCodes, onClose }: { product: () => Promise<string | null>; modelSlug: string; modelName: string; fabricCodes: string[]; onClose: () => void }) {
  const [session, setSession] = useState<{ code: string; phoneUrl: string } | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetch("/api/giydirme/oturum?amac=salon", { method: "POST" }).catch(() => null);
      const out = res ? ((await res.json().catch(() => ({}))) as { code?: string; phoneUrl?: string; error?: string }) : { error: "Bağlantı kurulamadı." };
      if (!alive) return;
      if (!res?.ok || !out.code) return setError(out.error ?? "Şu an açılamadı.");
      // ended with the visit too, whatever happens to this window
      rememberExtraSession(out.code);
      setSession({ code: out.code, phoneUrl: out.phoneUrl! });
      setQr(await QRCode.toDataURL(out.phoneUrl!, { margin: 1, width: 360 }));
    })();
    return () => {
      alive = false;
    };
  }, []);

  // the room photo from the phone: asked for every two seconds while waiting
  useEffect(() => {
    if (!session || hasPhoto) return;
    const t = window.setInterval(async () => {
      const res = await fetch(`/api/giydirme/oturum?kod=${session.code}`).catch(() => null);
      const out = res?.ok ? ((await res.json()) as { photo: boolean }) : null;
      if (out?.photo) setHasPhoto(true);
    }, 2000);
    return () => window.clearInterval(t);
  }, [session, hasPhoto]);

  const close = () => {
    // the room photo is not kept: the session (and its files) end now
    if (session) void fetch(`/api/giydirme/oturum?kod=${session.code}`, { method: "DELETE", keepalive: true }).catch(() => undefined);
    onClose();
  };

  const make = async () => {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const urun = await product();
      if (!urun) return setError("3D görüntü alınamadı.");
      const res = await fetch(`/api/giydirme/salon?kod=${session.code}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ urun, model: modelSlug, kumaslar: fabricCodes }) }).catch(() => null);
      const out = res ? ((await res.json().catch(() => ({}))) as { file?: string; error?: string }) : { error: "Bağlantı kurulamadı." };
      if (!res?.ok || !out.file) return setError(out.error ?? "Hazırlanamadı.");
      setResult(`/api/giydirme/dosya?kod=${session.code}&ad=${out.file}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Salonunuzda görün" className="fixed inset-0 z-50 flex flex-col bg-kirik-beyaz text-antrasit" data-mesgul="">
      <header className="flex items-center justify-between gap-4 border-b border-cizgi px-6 py-4 sm:px-8">
        <div>
          <h2 className="font-display text-[28px]">Salonunuzda görün</h2>
          <p className="text-[14px] text-antrasit-70">
            {modelName} · {fabricCodes.join(", ")}. Ön izlemedir; ölçüler yaklaşıktır.
          </p>
        </div>
        <button type="button" onClick={close} className="min-h-12 rounded-full border border-cizgi bg-white px-6 text-[16px]">
          Kapat
        </button>
      </header>
      <div className="flex flex-1 flex-col items-center gap-5 overflow-y-auto px-6 py-6">
        {error && (
          <p role="alert" className="rounded-2xl bg-[#F4E2DE] px-5 py-3 text-[16px] text-[#8a3a30]">
            {error}
          </p>
        )}
        {!hasPhoto && qr && (
          <div className="flex flex-col items-center gap-3 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="Salon fotoğrafını göndermek için telefonla okutun" className="h-64 w-64" />
            {session && (
              <p className="text-[15px] text-antrasit-70" data-testid="salon-kod">
                Kod: {session.code}
              </p>
            )}
            <p className="max-w-md text-[17px]">Telefonunuzla okutun, salonunuzun fotoğrafını gönderin. Fotoğraf yalnızca bu ön izleme için kullanılır ve bu pencere kapanınca silinir.</p>
          </div>
        )}
        {hasPhoto && !result && (
          <>
            <p className="text-[17px]">Fotoğraf geldi.</p>
            <button type="button" onClick={() => void make()} disabled={busy} className={`${big} bg-antrasit text-kagit`}>
              {busy ? "Hazırlanıyor…" : "Ön izlemeyi hazırla"}
            </button>
          </>
        )}
        {result && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- a private, per-session picture */}
            <img src={result} alt={`Salonunuzda ön izleme: ${modelName}`} className="max-h-[65vh] w-auto rounded-2xl" data-testid="salon-sonuc" />
            <button type="button" onClick={() => void download(result)} className={`${big} border border-cizgi bg-white`}>
              Görseli indir
            </button>
          </>
        )}
      </div>
    </div>
  );
}
