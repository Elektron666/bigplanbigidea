"use client";

import { useState } from "react";

// First run of a showroom screen: type the 6-digit code from the panel.
// Touch only: the pad is on the screen, no keyboard needed, and every key is
// large enough to hit from an arm's length on a 32-inch display.

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

export function PairScreen() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (value: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/showroom/esles", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: value }) });
      if (res.ok) return window.location.reload();
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Eşleştirilemedi. Yeniden deneyin.");
    } catch {
      setError("Bağlantı yok. İnterneti denetleyip yeniden deneyin.");
    }
    setCode("");
    setBusy(false);
  };

  const press = (k: string) => {
    if (busy || code.length >= 6) return;
    const next = code + k;
    setCode(next);
    setError(null);
    if (next.length === 6) void send(next);
  };

  const key = "flex h-[clamp(4rem,11vh,6.5rem)] items-center justify-center rounded-2xl border border-cizgi bg-white font-display text-[clamp(1.75rem,4vh,2.75rem)] text-antrasit transition-colors active:bg-cizgi/60 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-antrasit";

  return (
    <main className="flex min-h-dvh select-none flex-col items-center justify-center bg-kirik-beyaz px-6 py-10 text-antrasit [touch-action:manipulation]">
      <div className="w-full max-w-[34rem] text-center">
        <p className="eyebrow mb-3">Showroom ekranı</p>
        <h1 className="font-display text-[clamp(2rem,4.5vh,3rem)] leading-tight">Eşleştirme kodunu yazın</h1>
        <p className="mt-3 text-[clamp(1rem,2.2vh,1.25rem)] text-antrasit-70">Kod, panelde mağaza sayfasındaki “Cihaz ekle” düğmesinden alınır.</p>

        <div className="mt-8 flex justify-center gap-3" aria-label="Girilen kod" role="status" data-testid="kod-kutulari">
          {Array.from({ length: 6 }, (_, i) => (
            <span
              key={i}
              className={`flex h-[clamp(3.5rem,9vh,5rem)] w-[clamp(2.75rem,7vh,4rem)] items-center justify-center rounded-xl border bg-white font-display text-[clamp(1.75rem,4vh,2.5rem)] ${i === code.length && !busy ? "border-antrasit" : "border-cizgi"}`}
            >
              {code[i] ?? ""}
            </span>
          ))}
        </div>

        <p role="alert" className="mt-4 min-h-[1.75rem] text-[clamp(1rem,2vh,1.125rem)] text-[#9a3b31]">
          {error ?? (busy ? <span className="text-antrasit-70">Eşleştiriliyor…</span> : "")}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {KEYS.map((k) => (
            <button key={k} type="button" disabled={busy} onClick={() => press(k)} className={key}>
              {k}
            </button>
          ))}
          <button type="button" disabled={busy || !code} onClick={() => setCode("")} className={`${key} !text-[clamp(1rem,2.2vh,1.25rem)] font-sans`}>
            Temizle
          </button>
          <button type="button" disabled={busy} onClick={() => press("0")} className={key}>
            0
          </button>
          <button type="button" disabled={busy || !code} onClick={() => setCode(code.slice(0, -1))} className={`${key} !text-[clamp(1rem,2.2vh,1.25rem)] font-sans`} aria-label="Son rakamı sil">
            Sil
          </button>
        </div>
      </div>
    </main>
  );
}
