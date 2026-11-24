"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import type { Fabric } from "@/lib/types";
import { track } from "@/lib/track";
import { MAX_FABRICS } from "@/lib/giydirme/kota";
import { openSession, rememberSession } from "@/lib/giydirme/istemci";

// "Fotoğraftan dene" (Showroom package, job 5) on the showroom screen: a
// photo of the customer's sofa (the screen's camera, a phone by QR, or one of
// the shop's kept photos), up to four fabrics, then the pictures, each with
// a before–after slider. Every picture carries its "Ön izleme" label in the
// picture itself (made on the server). The photo is deleted from the server
// when the visit ends (KioskShell → endOpenSession), unless the shop keeps it.

type Step = "foto" | "kumas" | "uretiliyor" | "sonuc";
type Result = { fabricCode: string; status: "basarili" | "basarisiz" | "zaman-asimi"; file?: string; ms: number; error?: string };

const big = "min-h-14 rounded-full px-6 text-[17px] disabled:opacity-40";
const fileUrl = (code: string, name: string, v: number) => `/api/giydirme/dosya?kod=${code}&ad=${encodeURIComponent(name)}&v=${v}`;

/** Before and after, one over the other; the slider shows how much of the "after" picture. */
function BeforeAfter({ before, after, label }: { before: string; after: string; label: string }) {
  // the "after" picture whole at first, so its label is read in full; the slider sits at the top, away from the label
  const [x, setX] = useState(100);
  return (
    <div className="relative overflow-hidden rounded-2xl bg-cizgi/40" data-testid="once-sonra">
      {/* eslint-disable-next-line @next/next/no-img-element -- private, per-session pictures: not for the image optimiser */}
      <img src={before} alt={`Önce: ${label}`} className="block h-auto w-full select-none" draggable={false} />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - x}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={after} alt={`Sonra: ${label}`} className="block h-auto w-full select-none" draggable={false} />
      </div>
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${x}%` }} />
      <input
        type="range"
        min={0}
        max={100}
        value={x}
        onChange={(e) => setX(Number(e.target.value))}
        aria-label={`Önce–sonra: ${label}`}
        className="absolute inset-x-4 top-3 h-10 cursor-ew-resize accent-white"
      />
    </div>
  );
}

export function PhotoTryOn({
  fabrics,
  initialCode,
  firmSlug,
  onOpen3d,
  onQuote,
  onClose,
}: {
  fabrics: Fabric[];
  initialCode: string;
  firmSlug: string | null;
  onOpen3d: (f: Fabric) => void;
  onQuote: ((f: Fabric) => void) | null;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("foto");
  const [session, setSession] = useState<{ code: string; phoneUrl: string; saved: string[] } | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photoV, setPhotoV] = useState(0);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [consent, setConsent] = useState(false);
  const [keep, setKeep] = useState(false);
  const [picked, setPicked] = useState<string[]>(() => (fabrics.some((f) => f.code === initialCode) ? [initialCode] : []));
  const [results, setResults] = useState<Result[]>([]);
  const [started, setStarted] = useState(0);
  const [now, setNow] = useState(0);
  const [camera, setCamera] = useState<MediaStream | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const byCode = new Map(fabrics.map((f) => [f.code, f]));

  // the visit's session: the one already open (the window was closed and opened again), or a new one
  useEffect(() => {
    let alive = true;
    (async () => {
      const known = openSession();
      if (known) {
        const res = await fetch(`/api/giydirme/oturum?kod=${known.code}`).catch(() => null);
        const out = res?.ok ? ((await res.json()) as { photo: boolean; keep: boolean }) : null;
        if (!alive) return;
        if (out) {
          setSession(known);
          setQr(await QRCode.toDataURL(known.phoneUrl, { margin: 1, width: 360 }));
          setKeep(out.keep);
          if (out.photo) {
            setHasPhoto(true);
            setStep("kumas");
          }
          return;
        }
        rememberSession(null);
      }
      const res = await fetch("/api/giydirme/oturum", { method: "POST" }).catch(() => null);
      const out = res ? ((await res.json().catch(() => ({}))) as { code?: string; phoneUrl?: string; saved?: string[]; error?: string }) : { error: "Bağlantı kurulamadı." };
      if (!alive) return;
      if (!res?.ok || !out.code) return setError(out.error ?? "Fotoğraftan deneme şu an açılamadı.");
      const s = { code: out.code, phoneUrl: out.phoneUrl!, saved: out.saved ?? [] };
      setSession(s);
      rememberSession(s);
      setQr(await QRCode.toDataURL(s.phoneUrl, { margin: 1, width: 360 }));
    })();
    return () => {
      alive = false;
    };
  }, []);

  // a photo from the phone: asked for every two seconds while waiting for one
  useEffect(() => {
    if (!session || step !== "foto") return;
    const t = window.setInterval(async () => {
      const res = await fetch(`/api/giydirme/oturum?kod=${session.code}`).catch(() => null);
      const out = res?.ok ? ((await res.json()) as { photo: boolean; from: string | null }) : null;
      if (out?.photo && out.from === "telefon") {
        setHasPhoto(true);
        setPhotoV((v) => v + 1);
        setStep("kumas");
      }
    }, 2000);
    return () => window.clearInterval(t);
  }, [session, step]);

  // the camera, while it is on
  useEffect(() => {
    if (video.current && camera) video.current.srcObject = camera;
    return () => camera?.getTracks().forEach((t) => t.stop());
  }, [camera]);

  // the progress bar's clock while the pictures are made
  useEffect(() => {
    if (step !== "uretiliyor") return;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [step]);

  const startCamera = async () => {
    setError(null);
    try {
      setCamera(await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1920 } }, audio: false }));
    } catch {
      setError("Kamera açılamadı. Telefondan göndermeyi deneyin.");
    }
  };

  const upload = async (blob: Blob) => {
    if (!session) return;
    setError(null);
    const res = await fetch(`/api/giydirme/foto?kod=${session.code}`, { method: "POST", headers: { "content-type": blob.type || "image/jpeg" }, body: blob }).catch(() => null);
    const out = res ? ((await res.json().catch(() => ({}))) as { error?: string }) : { error: "Bağlantı kurulamadı." };
    if (!res?.ok) return setError(out.error ?? "Fotoğraf gönderilemedi.");
    setHasPhoto(true);
    setPhotoV((v) => v + 1);
    setStep("kumas");
  };

  const snap = async () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.9));
    camera?.getTracks().forEach((t) => t.stop());
    setCamera(null);
    if (blob) await upload(blob);
  };

  const pickSaved = async (id: string) => {
    if (!session) return;
    const res = await fetch(`/api/giydirme/foto?kod=${session.code}&kayitli=${id}`, { method: "POST" }).catch(() => null);
    if (!res?.ok) return setError("Kayıtlı fotoğraf açılamadı.");
    setHasPhoto(true);
    setPhotoV((v) => v + 1);
    setStep("kumas");
  };

  const toggleKeep = async (on: boolean) => {
    setKeep(on);
    if (session) await fetch(`/api/giydirme/sakla?kod=${session.code}&sakla=${on ? 1 : 0}`, { method: "POST" }).catch(() => undefined);
  };

  const generate = useCallback(
    async (codes: string[], merge: boolean) => {
      if (!session || !codes.length) return;
      setError(null);
      setStarted(Date.now());
      setNow(Date.now());
      setStep("uretiliyor");
      void track("foto_istendi", { firmSlug, n: codes.length });
      const t0 = Date.now();
      const res = await fetch(`/api/giydirme/uret?kod=${session.code}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kumaslar: codes }) }).catch(() => null);
      const out = res ? ((await res.json().catch(() => ({}))) as { results?: Result[]; error?: string }) : { error: "Bağlantı kurulamadı. Yeniden deneyin." };
      if (!res?.ok || !out.results) {
        setStep("kumas");
        void track("foto_basarisiz", { firmSlug, n: Math.round((Date.now() - t0) / 1000) });
        return setError(out.error ?? "Hazırlanamadı. Yeniden deneyin.");
      }
      for (const r of out.results) void track(r.status === "basarili" ? "foto_basarili" : "foto_basarisiz", { firmSlug, fabricCode: r.fabricCode, n: Math.round((Date.now() - t0) / 1000) });
      setResults((prev) => (merge ? prev.map((p) => out.results!.find((x) => x.fabricCode === p.fabricCode) ?? p) : out.results!));
      setStep("sonuc");
    },
    [session, firmSlug],
  );

  const toggle = (code: string) => setPicked((p) => (p.includes(code) ? p.filter((c) => c !== code) : p.length >= MAX_FABRICS ? p : [...p, code]));
  const elapsed = Math.max(0, (now - started) / 1000);
  // a progress that moves like the work does: quick at first, slowing towards 30 s, never "done" before it is
  const progress = Math.min(95, Math.round(100 * (1 - Math.exp(-elapsed / 14))));

  return (
    // while it is open the screen does not restart: the visitor may be sending the photo from their phone
    <div role="dialog" aria-modal="true" aria-label="Fotoğraftan dene" data-mesgul className="fixed inset-0 z-50 flex flex-col bg-kirik-beyaz text-antrasit">
      <header className="flex items-center justify-between gap-4 border-b border-cizgi px-8 py-5">
        <h2 className="font-display text-[30px]">Fotoğraftan dene</h2>
        <button type="button" onClick={onClose} className={`${big} border border-cizgi bg-white`}>
          Kapat
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {error && (
          <p role="alert" className="mb-5 rounded-2xl bg-[#fbeeec] px-5 py-4 text-[18px] text-[#7a2f27]">
            {error}
          </p>
        )}

        {step === "foto" && session && (
          <div className="grid gap-8 lg:grid-cols-2">
            <section aria-labelledby="ft-kamera" className="flex flex-col gap-4">
              <h3 id="ft-kamera" className="text-[22px]">
                Ekranın kamerasıyla çekin
              </h3>
              {camera ? (
                <>
                  <video ref={video} autoPlay playsInline muted className="w-full rounded-2xl bg-black" />
                  <button type="button" onClick={() => void snap()} disabled={!consent} className={`${big} bg-antrasit text-kagit`}>
                    Çek
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => void startCamera()} className={`${big} border border-cizgi bg-white`}>
                  Kamerayı aç
                </button>
              )}
              <label className="flex items-start gap-3 text-[16px] leading-snug">
                <input type="checkbox" className="mt-1 h-6 w-6 shrink-0 accent-antrasit" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>Müşteri, fotoğrafın yalnızca bu deneme için kullanılacağını, bir yapay zekâ hizmetine gönderileceğini ve ziyaret bitince silineceğini biliyor.</span>
              </label>
              {session.saved.length > 0 && (
                <div>
                  <h3 className="mb-2 text-[18px]">Kayıtlı ürün fotoğrafları</h3>
                  <div className="flex flex-wrap gap-3">
                    {session.saved.map((id) => (
                      <button key={id} type="button" onClick={() => void pickSaved(id)} className="overflow-hidden rounded-xl border border-cizgi" aria-label="Kayıtlı fotoğrafı kullan">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/api/giydirme/dosya?kayitli=${id}`} alt="" className="h-28 w-40 object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
            <section aria-labelledby="ft-telefon" className="flex flex-col items-center gap-4 rounded-2xl border border-cizgi bg-white p-6 text-center">
              <h3 id="ft-telefon" className="text-[22px]">
                Ya da telefondan gönderin
              </h3>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {qr && <img src={qr} alt="Telefonla okutun: fotoğraf yükleme sayfası" className="h-64 w-64" data-testid="foto-qr" />}
              <p className="text-[17px] text-antrasit-70">Telefonun kamerasıyla okutun, açılan sayfadan fotoğrafı seçin. Fotoğraf birkaç saniyede buraya gelir.</p>
              <p className="text-[14px] text-antrasit-50" data-testid="foto-kod">
                Kod: {session.code}
              </p>
            </section>
          </div>
        )}

        {step === "kumas" && session && (
          <div className="grid gap-8 lg:grid-cols-[2fr_3fr]">
            <div className="flex flex-col gap-4">
              {hasPhoto && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fileUrl(session.code, "foto", photoV)} alt="Çekilen fotoğraf" className="w-full rounded-2xl" />
              )}
              <button type="button" onClick={() => setStep("foto")} className={`${big} border border-cizgi bg-white`}>
                Fotoğrafı değiştir
              </button>
              <label className="flex items-center gap-3 text-[16px]">
                <input type="checkbox" className="h-6 w-6 accent-antrasit" checked={keep} onChange={(e) => void toggleKeep(e.target.checked)} />
                Ürün fotoğrafı olarak sakla (mağazanın kendi ürünü; müşteri fotoğrafı saklanmaz)
              </label>
            </div>
            <div className="flex flex-col gap-4">
              <h3 className="text-[22px]">
                Kumaş seçin <span className="text-antrasit-50">(en çok {MAX_FABRICS}; seçili {picked.length})</span>
              </h3>
              <div role="group" aria-label="Kumaşlar" className="grid max-h-[50vh] grid-cols-4 gap-3 overflow-y-auto">
                {fabrics.map((f) => {
                  const on = picked.includes(f.code);
                  return (
                    <button
                      key={f.code}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(f.code)}
                      disabled={!on && picked.length >= MAX_FABRICS}
                      className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-[14px] disabled:opacity-40 ${on ? "border-antrasit bg-white ring-2 ring-antrasit" : "border-cizgi bg-white"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f.texture.thumbUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
                      {f.code}
                    </button>
                  );
                })}
              </div>
              <button type="button" onClick={() => void generate(picked, false)} disabled={!picked.length || !hasPhoto} className={`${big} bg-antrasit text-kagit`}>
                Üret ({picked.length} kumaş)
              </button>
            </div>
          </div>
        )}

        {step === "uretiliyor" && (
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-16 text-center" role="status" aria-live="polite">
            <p className="text-[26px]">Kumaşlar fotoğrafa giydiriliyor…</p>
            <div className="h-4 w-full overflow-hidden rounded-full bg-cizgi">
              <div className="h-full rounded-full bg-antrasit transition-[width] duration-300" style={{ width: `${progress}%` }} data-testid="ilerleme" />
            </div>
            <p className="text-[18px] text-antrasit-70">Yaklaşık 30 sn · {Math.round(elapsed)} sn geçti</p>
          </div>
        )}

        {step === "sonuc" && session && (
          <div className="flex flex-col gap-5">
            <p className="rounded-2xl bg-[#F4E9DD] px-5 py-4 text-[18px] text-ceviz">Kesin görünüm için 3D&apos;de açın, renk onayı için numune isteyin.</p>
            <div className={`grid gap-5 ${results.length > 1 ? "lg:grid-cols-2" : ""}`}>
              {results.map((r) => {
                const f = byCode.get(r.fabricCode);
                return (
                  <section key={r.fabricCode} aria-label={`Sonuç: ${r.fabricCode}`} className="flex flex-col gap-3 rounded-2xl border border-cizgi bg-white p-4">
                    <h3 className="text-[20px]">
                      {r.fabricCode} {f && <span className="text-antrasit-50">· {f.colorName}</span>}
                    </h3>
                    {r.status === "basarili" && r.file ? (
                      <BeforeAfter before={fileUrl(session.code, "foto", photoV)} after={fileUrl(session.code, r.file, photoV)} label={r.fabricCode} />
                    ) : (
                      <div className="flex flex-col items-start gap-3 rounded-xl bg-[#fbeeec] p-4">
                        <p className="text-[17px] text-[#7a2f27]">{r.error}</p>
                        <button type="button" onClick={() => void generate([r.fabricCode], true)} className={`${big} border border-cizgi bg-white`}>
                          Yeniden dene
                        </button>
                      </div>
                    )}
                    {f && (
                      <div className="flex flex-wrap gap-3">
                        <button type="button" onClick={() => onOpen3d(f)} className={`${big} bg-antrasit text-kagit`}>
                          3D&apos;de aç
                        </button>
                        {onQuote && (
                          <button type="button" onClick={() => onQuote(f)} className={`${big} border border-cizgi bg-white`}>
                            Teklif
                          </button>
                        )}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
            <button type="button" onClick={() => setStep("kumas")} className={`${big} self-start border border-cizgi bg-white`}>
              Başka kumaşlar dene
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
