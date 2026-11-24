"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Fabric } from "@/lib/types";
import { matchCode } from "@/lib/fabric/code-match";
import { codeFromScan } from "@/lib/kartela/qr";
import { record } from "@/lib/olcum";

// "Sihirli kartela" (Showroom package, job 2): the salesperson holds the
// swatch card's QR label up to the screen; the camera reads it and the fabric
// goes onto the sofa (the chosen part, or the whole piece).
//  - Reading happens on the device: Android's own barcode reader when the
//    browser has it, otherwise jsQR. Both work without internet.
//  - A screen without a camera, or one that was refused the camera, shows no
//    button; the code box above it stays the way in.
//  - The camera is on only while the reading window is open, and closes
//    itself after half a minute.

type Detector = { detect(source: CanvasImageSource): Promise<{ rawValue: string }[]> };
type Reader = (video: HTMLVideoElement, canvas: HTMLCanvasElement) => Promise<string | null>;

const SCAN_EVERY_MS = 150;
const GIVE_UP_MS = 30_000;
/** Share of the picture left out on each side: what remains is the guide box the screen shows. */
const CROP = 0.18;
/** The read area is at most this wide: enough for a 26 mm label at 40 cm, light for a slow device. */
const READ_WIDTH = 900;

async function makeReader(): Promise<Reader> {
  const BD = (window as unknown as { BarcodeDetector?: { new (o: { formats: string[] }): Detector; getSupportedFormats?: () => Promise<string[]> } }).BarcodeDetector;
  const formats: string[] = BD?.getSupportedFormats ? await BD.getSupportedFormats().catch(() => [] as string[]) : [];
  if (BD && formats.includes("qr_code")) {
    const detector = new BD({ formats: ["qr_code"] });
    return async (video) => (await detector.detect(video).catch(() => []))[0]?.rawValue ?? null;
  }
  const jsQR = (await import("jsqr")).default;
  return async (video, canvas) => {
    if (!video.videoWidth) return null;
    // Only the middle of the picture, where the guide box asks for the label,
    // at the camera's own resolution: the QR's squares stay large enough to
    // read, and there are fewer pixels to go through than in the whole frame.
    const sx = Math.round(video.videoWidth * CROP);
    const sy = Math.round(video.videoHeight * CROP);
    const sw = video.videoWidth - 2 * sx;
    const sh = video.videoHeight - 2 * sy;
    const scale = Math.min(1, READ_WIDTH / sw);
    const w = Math.round(sw * scale);
    const h = Math.round(sh * scale);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
    return jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" })?.data ?? null;
  };
}

type Camera = "bilinmiyor" | "var" | "yok";

export function KartelaScanner({ fabrics, onSelect, onScanned }: { fabrics: Fabric[]; onSelect: (f: Fabric) => void; onScanned?: (f: Fabric) => void }) {
  const [camera, setCamera] = useState<Camera>("bilinmiyor");
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const fabricsRef = useRef(fabrics);
  useEffect(() => {
    fabricsRef.current = fabrics;
  }, [fabrics]);

  // is there a camera at all? (labels only, no permission asked)
  useEffect(() => {
    const md = navigator.mediaDevices;
    // an old or locked-down browser may have no mediaDevices at all
    const list = typeof md?.enumerateDevices === "function" && typeof md.getUserMedia === "function" ? md.enumerateDevices() : Promise.resolve([] as MediaDeviceInfo[]);
    list
      .then((list) => setCamera(list.some((d) => d.kind === "videoinput") ? "var" : "yok"))
      .catch(() => setCamera("yok"));
  }, []);

  const stop = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setOpen(false);
    setHint(null);
  }, []);

  useEffect(() => stop, [stop]);

  const pressedAt = useRef(0);
  const start = async () => {
    pressedAt.current = performance.now();
    setMessage(null);
    setOpen(true);
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    } catch (e) {
      stop();
      const denied = e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError");
      // refused or missing: the button goes, the code box stays the way in
      setCamera("yok");
      setMessage(denied ? "Kamera izni verilmemiş. Kartelanın kodunu yukarıya yazın." : "Kamera açılamadı. Kartelanın kodunu yukarıya yazın.");
    }
  };

  // the reading loop, while the window is open and the camera runs
  useEffect(() => {
    if (!open) return;
    let alive = true;
    let timer: number | undefined;
    const startedAt = Date.now();
    void (async () => {
      const read = await makeReader();
      canvas.current ??= document.createElement("canvas");
      const tick = async () => {
        if (!alive) return;
        const v = video.current;
        if (v && stream.current && v.srcObject !== stream.current) {
          v.srcObject = stream.current;
          void v.play().catch(() => undefined);
        }
        if (Date.now() - startedAt > GIVE_UP_MS) {
          stop();
          setMessage("Etiket okunamadı. Etiketi kameraya daha yakın tutup yeniden deneyin ya da kodu yazın.");
          return;
        }
        const text = v && v.readyState >= 2 ? await read(v, canvas.current!) : null;
        if (!alive) return;
        if (text) {
          const code = codeFromScan(text);
          if (!code) {
            setHint("Bu QR bir kartela etiketi değil.");
          } else {
            const fabric = matchCode(fabricsRef.current, code).exact;
            stop();
            if (fabric) {
              // from the button to the fabric chosen: for the device test (?olcum) and the tests
              const ms = Math.round(performance.now() - pressedAt.current);
              record({ kartelaMs: ms });
              document.documentElement.dataset.kartelaMs = String(ms);
              onSelect(fabric);
              onScanned?.(fabric);
            } else {
              setMessage(`${code} bu mağazada yok. Başka bir kartela deneyin.`);
            }
            return;
          }
        }
        timer = window.setTimeout(() => void tick(), SCAN_EVERY_MS);
      };
      void tick();
    })();
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [open, onSelect, onScanned, stop]);

  // a message clears itself
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), 6000);
    return () => window.clearTimeout(t);
  }, [message]);

  return (
    <>
      {camera === "var" && (
        <button
          type="button"
          onClick={() => void start()}
          className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-antrasit px-5 text-[17px] text-kagit transition-colors hover:bg-ceviz focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-antrasit"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
            <path d="M8 12h8" />
          </svg>
          Kartela okut
        </button>
      )}
      {message && (
        <p role="status" className="mt-3 rounded-xl bg-[#F4E9DD] px-4 py-3 text-[16px] text-ceviz">
          {message}
        </p>
      )}

      {open && (
        <div role="dialog" aria-modal="true" aria-labelledby="kartela-oku" data-mesgul className="fixed inset-0 z-[60] flex items-center justify-center bg-antrasit/70 p-6">
          <div className="flex w-full max-w-[44rem] flex-col items-center gap-4 rounded-3xl bg-kagit p-6 shadow-2xl">
            <h2 id="kartela-oku" className="font-display text-[clamp(1.5rem,2.4vw,2rem)]">
              Kartelanın QR etiketini kameraya tutun
            </h2>
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-antrasit">
              {/* mirrored, like a mirror: moving the card left moves it left on screen */}
              <video ref={video} muted playsInline autoPlay className="h-full w-full -scale-x-100 object-cover" />
              <div className="pointer-events-none absolute inset-[18%] rounded-2xl border-4 border-white/80" aria-hidden />
            </div>
            <p role="status" className="min-h-[1.5rem] text-[17px] text-antrasit-70">
              {hint ?? "Etiket kutunun içine girince kendiliğinden okunur."}
            </p>
            <button type="button" onClick={stop} className="h-14 rounded-full border border-cizgi bg-white px-10 text-[17px]">
              Vazgeç
            </button>
          </div>
        </div>
      )}
    </>
  );
}
