"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { AttractContext } from "./attract";
import { SYNC_EVERY_MS, nextSyncStep, type SyncAnswer } from "@/lib/devices/sync";

// A paired screen's link to the centre (Showroom package, job 0). It checks
// in every two minutes and whenever the showroom loop starts; new content is
// applied only while nobody is using the screen. The content the screen
// holds is the version the page was rendered with.

export function SyncAgent({ contentVersion, appVersion, alwaysIdle = false, closed = false }: { contentVersion: number; appVersion: string; /** a notice is on the screen, nobody can be using it */ alwaysIdle?: boolean; /** the page shows the "closed" notice because of the shop's status */ closed?: boolean }) {
  const attract = useContext(AttractContext);
  const idle = alwaysIdle || attract;
  const idleRef = useRef(idle);
  // new content is known but a customer is at the screen: applied when the loop starts
  const waiting = useRef(false);
  const approved = useRef(false);
  const [offer, setOffer] = useState(false);

  useEffect(() => {
    let alive = true;
    const apply = () => window.location.reload();

    const check = async (status: "guncel" | "bekliyor" = waiting.current ? "bekliyor" : "guncel") => {
      let answer: SyncAnswer;
      try {
        const res = await fetch("/api/showroom/esitle", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ contentVersion, appVersion, syncStatus: status }),
          cache: "no-store",
        });
        // removed in the panel: back to the code screen (only if the server really said so)
        if (res.status === 401) return apply();
        if (!res.ok) return;
        answer = (await res.json()) as SyncAnswer;
      } catch {
        // offline: keep showing what we have, try again at the next tick
        return;
      }
      if (!alive) return;
      // suspended, or switched back on: the page itself changes
      if ((answer.status === "askida" || answer.status === "ayrildi") !== closed) return apply();
      const step = nextSyncStep(answer, { contentVersion, appVersion }, { idle: idleRef.current, approved: approved.current });
      if (step.do === "uygula") return apply();
      if (step.do === "bosta-uygula") waiting.current = true;
      if (step.do === "onay-bekle") setOffer(true);
    };

    void check();
    const timer = window.setInterval(() => void check(), SYNC_EVERY_MS);
    (window as unknown as { __ormenSync?: () => Promise<void> }).__ormenSync = () => check();
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [contentVersion, appVersion, closed]);

  // the screen went idle (showroom loop): apply what was held back, and ask again
  useEffect(() => {
    idleRef.current = idle;
    if (!idle) return;
    if (waiting.current) window.location.reload();
    else void (window as unknown as { __ormenSync?: () => Promise<void> }).__ormenSync?.();
  }, [idle]);

  if (!offer) return null;
  return (
    <div role="status" className="fixed left-1/2 top-4 z-40 flex -translate-x-1/2 items-center gap-4 rounded-full bg-antrasit py-2 pl-6 pr-2 text-[clamp(1rem,1.4vw,1.125rem)] text-kagit shadow-xl">
      <span>Güncelleme hazır</span>
      <button
        type="button"
        onClick={() => {
          approved.current = true;
          window.location.reload();
        }}
        className="h-12 rounded-full bg-kagit px-6 text-antrasit"
      >
        Şimdi yükle
      </button>
    </div>
  );
}
