"use client";

import { useState } from "react";

// Sends one photo to the screen's session. The photo is made smaller on the
// phone first (at most 2048 px), so it arrives in a few seconds on a shop's Wi-Fi.

async function smaller(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const k = Math.min(1, 2048 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * k);
    canvas.height = Math.round(bmp.height * k);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.88));
    return blob ?? file;
  } catch {
    return file;
  }
}

export function PhoneUpload({ code }: { code: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<{ busy: boolean; done: boolean; error: string | null }>({ busy: false, done: false, error: null });

  const send = async () => {
    if (!file || !consent) return;
    setState({ busy: true, done: false, error: null });
    try {
      const body = await smaller(file);
      const res = await fetch(`/api/giydirme/foto?kod=${encodeURIComponent(code)}&onay=1`, { method: "POST", headers: { "content-type": "image/jpeg" }, body });
      const out = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) return setState({ busy: false, done: false, error: out.error ?? "Gönderilemedi; yeniden deneyin." });
      setState({ busy: false, done: true, error: null });
    } catch {
      setState({ busy: false, done: false, error: "Bağlantı kurulamadı; yeniden deneyin." });
    }
  };

  if (state.done)
    return (
      <p role="status" className="rounded-2xl bg-[#E8EFE6] px-5 py-4 text-[17px] text-[#2f4a34]">
        Fotoğraf ekrana gönderildi. Ekrandan kumaşları seçebilirsiniz.
      </p>
    );

  return (
    <div className="flex flex-col gap-5">
      <label className="flex min-h-14 cursor-pointer items-center justify-center rounded-2xl border border-cizgi bg-white px-5 text-[17px]">
        <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        {file ? `Seçildi: ${file.name}` : "Fotoğraf çek ya da seç"}
      </label>
      <label className="flex items-start gap-3 text-[15px] leading-snug">
        <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-antrasit" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          Fotoğrafın yalnızca bu deneme için kullanılacağını, kumaş görseli hazırlamak için bir yapay zekâ hizmetine (yurt dışında olabilir) gönderileceğini ve mağazadaki oturum bitince
          silineceğini biliyorum. Fotoğrafta kişi bulunmamasına dikkat ediyorum.
        </span>
      </label>
      {state.error && (
        <p role="alert" className="text-[15px] text-[#9a3b31]">
          {state.error}
        </p>
      )}
      <button type="button" onClick={() => void send()} disabled={!file || !consent || state.busy} className="min-h-14 rounded-full bg-antrasit px-6 text-[17px] text-kagit disabled:opacity-40">
        {state.busy ? "Gönderiliyor…" : "Ekrana gönder"}
      </button>
    </div>
  );
}
