"use client";

import { useEffect, useState } from "react";
import { flush, pending } from "@/lib/offline/outbox";
import { useOnline } from "@/lib/offline/use-online";
import { preferredTextureSize } from "@/lib/three/texture-size";

// The showroom screen's offline side (Showroom package, job 1):
//  - registers the offline helper (public/showroom-sw.js) for this page;
//  - hands it the files of the shop's fabrics and models, so they are on the
//    device before anyone needs them (data-onbellek="hazir" on <html> when done);
//  - sends the outbox when the connection comes back, and every minute;
//  - tells the customer, in one calm line, what works while it is offline.

const FLUSH_EVERY_MS = 60_000;

export function OfflineAgent({ warm }: { warm: { "1k": string[]; "2k": string[] } }) {
  const online = useOnline();
  const [waiting, setWaiting] = useState(0);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let alive = true;
    const onMessage = (e: MessageEvent) => {
      const d = e.data as { type?: string; kept?: number; failed?: number };
      if (d?.type !== "isindi") return;
      document.documentElement.dataset.onbellek = "hazir";
      // what the device holds, for the settings sheet and the tests
      document.documentElement.dataset.onbellekSonuc = `${d.kept ?? 0}/${d.failed ?? 0}`;
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    void (async () => {
      try {
        await navigator.serviceWorker.register("/showroom-sw.js", { scope: "/showroom" });
        const reg = await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) {
          await new Promise<void>((resolve) => {
            navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true });
            window.setTimeout(resolve, 10_000);
          });
        }
        if (!alive) return;
        // The app's own files this page loaded before the helper was in charge
        // (the 3D scene comes in a separate part): kept too, or the next offline
        // start would open without its scene.
        const loaded = performance
          .getEntriesByType("resource")
          .map((e) => new URL(e.name, location.href))
          .filter((u) => u.origin === location.origin && u.pathname.startsWith("/_next/static/"))
          .map((u) => u.pathname + u.search);
        const urls = [...loaded, ...warm[preferredTextureSize()]];
        document.documentElement.dataset.onbellekListe = String(urls.length);
        reg.active?.postMessage({ type: "isit", urls });
        // The parts loaded later (dialogs) are found by the helper itself: it
        // follows the names each code part carries (public/showroom-sw.js).
      } catch {
        // no offline support on this browser: the screen still works online
      }
    })();
    return () => {
      alive = false;
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, [warm]);

  useEffect(() => {
    let alive = true;
    const send = async () => {
      await flush();
      if (alive) setWaiting(await pending());
    };
    void send();
    window.addEventListener("online", send);
    const timer = window.setInterval(() => void send(), FLUSH_EVERY_MS);
    return () => {
      alive = false;
      window.removeEventListener("online", send);
      window.clearInterval(timer);
    };
  }, []);

  if (online) return null;
  return (
    <div role="status" data-testid="cevrimdisi" className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-3">
      <p className="rounded-full bg-antrasit/90 px-6 py-3 text-center text-[clamp(1rem,1.3vw,1.125rem)] text-kagit shadow-lg">
        İnternet bağlantısı yok · kumaş deneme ve ölçüler çalışıyor{waiting ? `; ${waiting} kayıt bağlantı gelince gönderilecek` : ""}.
      </p>
    </div>
  );
}
