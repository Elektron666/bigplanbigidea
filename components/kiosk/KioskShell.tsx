"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Firm } from "@/lib/types";
import { idleState, KIOSK_WARNING, loadHolds } from "@/lib/kiosk";
import { BrandMark } from "@/components/configurator/BrandMark";
import { accentStyle } from "@/lib/firm";
import { AttractContext } from "./attract";
import { endOpenSession } from "@/lib/giydirme/istemci";
import { track } from "@/lib/track";

// Showroom kiosk around the configurator:
// - a welcome screen until someone touches it (first touch also goes full screen)
// - after the idle time a 10 s "Hâlâ burada mısınız?" warning, then a full
//   reset for the next visitor: page reloaded to its starting link, the
//   session (favourites, visit id) wiped, so nothing of the previous person stays.

const ACTIVITY = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;

export function KioskShell({ idleSeconds, firm, children, showroom = false }: { idleSeconds: number; firm: Firm | null; children: ReactNode; /** a paired shop screen: the shop's own words, no ORMEN */ showroom?: boolean }) {
  const [welcome, setWelcome] = useState(true);
  const [remaining, setRemaining] = useState<number | null>(null);
  const last = useRef(0);
  const startHref = useRef<string | null>(null);
  // while the welcome screen is up there is nothing to reset
  const onWelcome = useRef(true);

  // when the showroom loop and the visitor's session began (for their length in the usage log)
  const loopStart = useRef(0);
  const sessionStart = useRef(0);
  const firmSlug = firm?.slug ?? null;

  const resetting = useRef(false);
  const reset = useCallback(async () => {
    // the idle tick runs every half second; one reset is enough
    if (resetting.current) return;
    resetting.current = true;
    // the session's end is safely recorded before the page is wiped for the next visitor
    if (!onWelcome.current) await track("oturum_bitti", { firmSlug, n: Math.round((Date.now() - sessionStart.current) / 1000) }).catch(() => undefined);
    // the visitor's photo try-on ends with the visit: its photo is deleted from the server (job 5)
    await endOpenSession();
    try {
      sessionStorage.clear();
    } catch {
      /* storage blocked */
    }
    window.location.replace(startHref.current ?? window.location.href);
  }, [firmSlug]);

  useEffect(() => {
    loopStart.current = Date.now();
    void track("vitrin_basladi", { firmSlug });
  }, [firmSlug]);

  useEffect(() => {
    startHref.current = window.location.href;
    last.current = Date.now();
    const bump = () => {
      last.current = Date.now();
    };
    for (const e of ACTIVITY) window.addEventListener(e, bump, { capture: true, passive: true });
    const noMenu = (e: Event) => e.preventDefault();
    window.addEventListener("contextmenu", noMenu);
    let loadSince: number | null = null;
    const tick = window.setInterval(() => {
      const now = Date.now();
      // a fabric still loading on the sofa (data-yukleniyor): the visitor is waiting, for a while
      loadSince = document.querySelector("[data-yukleniyor]") ? (loadSince ?? now) : null;
      // the welcome screen, or something the visitor is doing without touching the screen:
      // a swatch card held to the camera, a photo coming from their phone (data-mesgul)
      if (onWelcome.current || document.querySelector("[data-mesgul]") || loadHolds(loadSince, now)) {
        last.current = now;
        return;
      }
      const s = idleState(Date.now() - last.current, idleSeconds);
      if (s.reset) void reset();
      else setRemaining(s.warn ? s.remaining : null);
    }, 500);
    return () => {
      for (const e of ACTIVITY) window.removeEventListener(e, bump, { capture: true });
      window.removeEventListener("contextmenu", noMenu);
      window.clearInterval(tick);
    };
  }, [idleSeconds, reset]);

  const start = () => {
    setWelcome(false);
    onWelcome.current = false;
    last.current = Date.now();
    sessionStart.current = Date.now();
    void track("vitrin_bitti", { firmSlug, n: Math.round((Date.now() - loopStart.current) / 1000) });
    void track("oturum_basladi", { firmSlug });
    document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  return (
    <div className="select-none [touch-action:manipulation]" style={accentStyle(firm) as React.CSSProperties | undefined} data-kiosk>
      <AttractContext.Provider value={welcome}>{children}</AttractContext.Provider>

      {welcome && (
        <button
          type="button"
          onClick={start}
          className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-end gap-6 bg-gradient-to-t from-kagit from-15% via-kagit/70 via-40% to-transparent to-70% pb-[12vh] text-center focus-visible:outline-none"
          aria-label="Başlamak için dokunun"
        >
          <span className="rounded-2xl bg-kagit/90 px-5 py-3">
            <BrandMark firm={firm} />
          </span>
          {showroom ? (
            <span className="font-display text-[clamp(2rem,4vw,3.5rem)] leading-tight text-antrasit">Dokunun, kumaşı siz seçin</span>
          ) : (
            <>
              <span className="font-display text-[clamp(2rem,4vw,3.5rem)] leading-tight text-antrasit">Kumaşı koltuğun üstünde görün</span>
              <span className="text-[clamp(1rem,1.6vw,1.375rem)] text-antrasit-70">Dokunun, ORMEN kumaşlarını tek tek deneyin.</span>
            </>
          )}
          <span className="mt-2 rounded-full motion-safe:animate-[nefes_1.8s_ease-in-out_infinite] bg-accent px-8 py-4 text-[clamp(1rem,1.6vw,1.25rem)] text-accent-ink">Başlamak için dokunun</span>
        </button>
      )}

      {!welcome && remaining !== null && (
        <div role="alertdialog" aria-labelledby="kiosk-uyari" className="fixed inset-0 z-50 flex items-center justify-center bg-antrasit/30 p-6 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl bg-kagit p-8 text-center shadow-2xl">
            <p id="kiosk-uyari" className="font-display text-[28px]">
              Hâlâ burada mısınız?
            </p>
            <p className="mt-2 text-[16px] text-antrasit-70">
              {remaining} saniye sonra ekran bir sonraki ziyaretçi için baştan başlayacak; seçimleriniz silinecek.
            </p>
            <div className="mx-auto mt-5 h-1.5 w-full overflow-hidden rounded-full bg-cizgi">
              <div className="h-full bg-accent transition-[width] duration-500" style={{ width: `${(remaining / KIOSK_WARNING) * 100}%` }} />
            </div>
            <div className="mt-6 flex justify-center gap-3">
              <button type="button" onClick={() => setRemaining(null)} className="h-12 rounded-full bg-antrasit px-6 text-[16px] text-kagit">
                Devam et
              </button>
              <button type="button" onClick={() => void reset()} className="h-12 rounded-full border border-cizgi px-6 text-[16px]">
                Baştan başla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
