"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EXIT_TAPS, exitGesture } from "@/lib/devices/pin";

// The lock around a paired showroom screen (Showroom package, job 1).
//  - Nothing on the screen leads out: links to other sites and to the panel
//    do nothing, new windows are not opened. The one page a customer must be
//    able to read (the KVKK text) opens inside the screen with a close button.
//  - Pinch and ctrl-wheel zoom, pull-to-refresh and the long-press menu are off.
//  - The way out is hidden: five quick taps on the logo, then the shop PIN.
//    It opens a small settings sheet (check for updates, leave full screen).
// The device's own lock (app pinning, kiosk launcher) is set up on the
// device; see KURULUM.md.

const INSIDE = ["/kvkk"];
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
const SHEET_IDLE_MS = 60_000;

type Stage = { at: "kapali" } | { at: "pin"; pin: string; busy: boolean; error?: string } | { at: "ayar"; note?: string };

export function ShowroomLock({ contentVersion, appVersion }: { contentVersion: number; appVersion: string }) {
  const [stage, setStage] = useState<Stage>({ at: "kapali" });
  const [reading, setReading] = useState<string | null>(null);
  const taps = useRef<number[]>([]);

  useEffect(() => {
    const root = document.documentElement;
    const before = { overscroll: root.style.overscrollBehavior, open: window.open };
    root.style.overscrollBehavior = "none";
    window.open = () => null;

    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const raw = a.getAttribute("href") ?? "";
      // in-page anchors, and files the screen made itself (a quote's PDF) are not "out"
      if (raw.startsWith("#") || (raw.startsWith("blob:") && a.hasAttribute("download"))) return;
      // every other link would leave the showroom
      e.preventDefault();
      e.stopPropagation();
      let url: URL;
      try {
        url = new URL(a.href, location.href);
      } catch {
        return;
      }
      if (url.origin === location.origin && INSIDE.includes(url.pathname)) setReading(url.pathname);
    };
    const onPointer = (e: PointerEvent) => {
      if (!(e.target as Element | null)?.closest?.("[data-marka]")) return;
      const next = exitGesture(taps.current, Date.now());
      taps.current = next.taps;
      if (next.open) setStage({ at: "pin", pin: "", busy: false });
    };
    const noZoom = (e: Event) => {
      if (e.type !== "wheel" || (e as WheelEvent).ctrlKey) e.preventDefault();
    };
    const noKeys = (e: KeyboardEvent) => {
      // a plugged-in keyboard must not open the browser's own doors
      if (e.key === "F5" || e.key === "F11" || e.key === "F12" || ((e.ctrlKey || e.metaKey) && ["r", "l", "t", "n", "w", "p", "s", "+", "-", "0"].includes(e.key.toLowerCase()))) e.preventDefault();
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    document.addEventListener("pointerdown", onPointer, true);
    document.addEventListener("wheel", noZoom, { passive: false });
    document.addEventListener("gesturestart", noZoom);
    document.addEventListener("dragstart", noZoom);
    document.addEventListener("keydown", noKeys, true);
    return () => {
      root.style.overscrollBehavior = before.overscroll;
      window.open = before.open;
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
      document.removeEventListener("pointerdown", onPointer, true);
      document.removeEventListener("wheel", noZoom);
      document.removeEventListener("gesturestart", noZoom);
      document.removeEventListener("dragstart", noZoom);
      document.removeEventListener("keydown", noKeys, true);
    };
  }, []);

  // an open sheet or PIN pad nobody touches closes by itself
  const open = stage.at !== "kapali" || reading !== null;
  useEffect(() => {
    if (!open) return;
    let timer = window.setTimeout(close, SHEET_IDLE_MS);
    function close() {
      setStage({ at: "kapali" });
      setReading(null);
    }
    const bump = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(close, SHEET_IDLE_MS);
    };
    window.addEventListener("pointerdown", bump, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", bump, true);
    };
  }, [open]);

  const tryPin = useCallback(async (pin: string) => {
    setStage({ at: "pin", pin, busy: true });
    try {
      const res = await fetch("/api/showroom/pin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pin }) });
      if (res.ok) return setStage({ at: "ayar" });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setStage({ at: "pin", pin: "", busy: false, error: body?.error ?? "PIN denetlenemedi." });
    } catch {
      setStage({ at: "pin", pin: "", busy: false, error: "Bağlantı yok; PIN şu an denetlenemiyor." });
    }
  }, []);

  const checkUpdates = async () => {
    setStage({ at: "ayar", note: "Denetleniyor…" });
    try {
      const res = await fetch("/api/showroom/esitle", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contentVersion, appVersion }), cache: "no-store" });
      if (res.status === 401) return window.location.reload();
      const a = (await res.json()) as { contentVersion: number; appVersion: string };
      if (a.contentVersion !== contentVersion || a.appVersion !== appVersion) {
        setStage({ at: "ayar", note: "Güncelleme bulundu, yükleniyor…" });
        return window.location.reload();
      }
      setStage({ at: "ayar", note: "Ekran güncel." });
    } catch {
      setStage({ at: "ayar", note: "Bağlantı yok; şu an denetlenemiyor." });
    }
  };

  const big = "flex h-[clamp(3.75rem,9vh,5.5rem)] items-center justify-center rounded-2xl border border-cizgi bg-white text-antrasit transition-colors active:bg-cizgi/60 disabled:opacity-40";
  const wide = "flex h-16 w-full items-center justify-center rounded-full px-6 text-[clamp(1.0625rem,1.5vw,1.25rem)]";

  return (
    <>
      {reading && (
        <div role="dialog" aria-modal="true" aria-label="Aydınlatma metni" className="fixed inset-0 z-[70] flex flex-col bg-kagit">
          <div className="flex items-center justify-between border-b border-cizgi px-6 py-3">
            <span className="font-display text-[clamp(1.25rem,2vw,1.75rem)]">Aydınlatma metni</span>
            <button type="button" onClick={() => setReading(null)} className="h-14 rounded-full bg-antrasit px-8 text-[clamp(1.0625rem,1.5vw,1.25rem)] text-kagit">
              Kapat
            </button>
          </div>
          {/* sandboxed: the text can be read and scrolled, its own links and scripts cannot lead anywhere */}
          <iframe src={reading} title="Aydınlatma metni" sandbox="" className="min-h-0 flex-1 border-0" />
        </div>
      )}

      {stage.at === "pin" && (
        <div role="dialog" aria-modal="true" aria-labelledby="kilit-pin" className="fixed inset-0 z-[80] flex items-center justify-center bg-antrasit/40 p-6 backdrop-blur-[2px]">
          <div className="w-full max-w-[26rem] rounded-3xl bg-kagit p-7 text-center shadow-2xl">
            <h2 id="kilit-pin" className="font-display text-[clamp(1.5rem,2.4vw,2rem)]">
              Mağaza PIN’i
            </h2>
            <div className="mt-4 flex justify-center gap-2.5" role="status" aria-label={`${stage.pin.length} rakam girildi`}>
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className={`h-4 w-4 rounded-full ${i < stage.pin.length ? "bg-antrasit" : "bg-cizgi"}`} />
              ))}
            </div>
            <p role="alert" className="mt-3 min-h-[1.5rem] text-[16px] text-[#9a3b31]">
              {stage.error ?? ""}
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2.5 font-display text-[clamp(1.5rem,3.4vh,2.25rem)]">
              {KEYS.map((k) => (
                <button key={k} type="button" disabled={stage.busy || stage.pin.length >= 6} onClick={() => setStage({ at: "pin", pin: stage.pin + k, busy: false })} className={big}>
                  {k}
                </button>
              ))}
              <button type="button" onClick={() => setStage({ at: "kapali" })} className={`${big} font-sans !text-[17px]`}>
                Vazgeç
              </button>
              <button type="button" disabled={stage.busy || stage.pin.length >= 6} onClick={() => setStage({ at: "pin", pin: stage.pin + "0", busy: false })} className={big}>
                0
              </button>
              <button type="button" disabled={stage.busy || stage.pin.length < 4} onClick={() => void tryPin(stage.pin)} className={`${big} !bg-antrasit font-sans !text-[17px] !text-kagit`}>
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}

      {stage.at === "ayar" && (
        <div role="dialog" aria-modal="true" aria-labelledby="kilit-ayar" className="fixed inset-0 z-[80] flex items-center justify-center bg-antrasit/40 p-6 backdrop-blur-[2px]">
          <div className="w-full max-w-[30rem] rounded-3xl bg-kagit p-7 shadow-2xl">
            <h2 id="kilit-ayar" className="font-display text-[clamp(1.5rem,2.4vw,2rem)]">
              Ekran ayarları
            </h2>
            <p role="status" className="mt-2 min-h-[1.5rem] text-[17px] text-antrasit-70">
              {stage.note ?? `Uygulama ${appVersion} · içerik ${contentVersion}`}
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <button type="button" onClick={() => void checkUpdates()} className={`${wide} bg-antrasit text-kagit`}>
                Güncellemeleri denetle
              </button>
              <button
                type="button"
                onClick={() => {
                  void document.exitFullscreen?.().catch(() => undefined);
                  setStage({ at: "ayar", note: "Tam ekrandan çıkıldı." });
                }}
                className={`${wide} border border-cizgi bg-white`}
              >
                Tam ekrandan çık
              </button>
              <button type="button" onClick={() => setStage({ at: "kapali" })} className={`${wide} border border-cizgi bg-white`}>
                Showroom’a dön
              </button>
            </div>
            <p className="mt-4 text-[14px] text-antrasit-50">Bu pencereye logoya {EXIT_TAPS} kez dokunup PIN yazarak ulaşılır.</p>
          </div>
        </div>
      )}
    </>
  );
}
