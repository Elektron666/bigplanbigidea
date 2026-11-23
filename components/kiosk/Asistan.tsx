"use client";

import { useEffect, useRef, useState } from "react";
import type { Fabric, FurnitureModel } from "@/lib/types";
import { track } from "@/lib/track";
import type { WasteSettings } from "@/lib/teklif/metraj";
import { advise, styleChoices, TONE_LABELS, USE_ANSWER_LABELS, WALL_LABELS, type AdvisorResult, type Answers, type Tone, type Use, type Wall } from "@/lib/asistan/danisman";
import { answer, EXAMPLES, type Answer } from "@/lib/asistan/soru";
import { STYLE_LABELS, type StyleTag } from "@/lib/asistan/etiketler";

// The assistant (Showroom package, job 10 and Fatih Bey's "kendi yapay
// zekamız"): questions, ideas, metres, and the sofa advisor. It runs on the
// device, costs nothing and works offline; it answers only from what the
// panel holds (lib/asistan). Voice, where the device has it: the words are
// turned into text by the browser and not kept.

type Msg = { from: "kisi" | "asistan"; text?: string; answer?: Answer };
type Step = "duvar" | "cocuk" | "kullanim" | "tarz" | "renk";

const big = "min-h-14 rounded-2xl border px-5 text-[17px] text-left";
/** The clock, read in event handlers only (how long an advisor round took). */
const clock = () => Date.now();

interface SpeechRec {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: { 0: { transcript: string } }[] }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}
function speechRecognition(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function Asistan({
  models,
  fabrics,
  fabricsFor,
  currentModel,
  currentFabric,
  waste,
  firmSlug,
  onOpen,
  onClose,
}: {
  models: FurnitureModel[];
  fabrics: Fabric[];
  fabricsFor: (m: FurnitureModel) => Fabric[];
  currentModel: FurnitureModel | null;
  currentFabric: Fabric | null;
  waste: WasteSettings | null;
  firmSlug: string | null;
  /** Puts the model (or only the fabric) on the piece on the screen. */
  onOpen: (model: FurnitureModel | null, fabric: Fabric | null) => void;
  onClose: () => void;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "asistan", text: "Merhaba. Kumaşlar, metraj ve koltuk seçimi hakkında sorabilirsiniz; ya da birkaç soruyla size uygun koltuğu bulalım." }]);
  const [text, setText] = useState("");
  const [advisor, setAdvisor] = useState<{ step: Step; a: Partial<Answers>; started: number } | null>(null);
  const [result, setResult] = useState<AdvisorResult | null>(null);
  const [listening, setListening] = useState(false);
  const [Speech] = useState(speechRecognition);
  const end = useRef<HTMLDivElement>(null);
  const styles = styleChoices(models);

  // braces: newer browsers return a promise from scrollIntoView, and an effect may return only a clean-up function
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [msgs, advisor, result]);

  const ask = (q: string) => {
    const question = q.trim();
    if (!question) return;
    const a = answer(question, { models, fabrics, currentModel, currentFabric, waste, fabricsFor });
    setMsgs((m) => [...m, { from: "kisi", text: question }, { from: "asistan", answer: a }]);
    setText("");
    // only that a question was asked, and of what kind; never its words
    void track("asistan_soru", { firmSlug, fabricCode: a.fabrics?.[0]?.code });
    if (a.startAdvisor) startAdvisor();
  };

  const startAdvisor = () => {
    setResult(null);
    setAdvisor({ step: "duvar", a: {}, started: clock() });
  };

  const choose = (patch: Partial<Answers>, next: Step | null) => {
    if (!advisor) return;
    const a = { ...advisor.a, ...patch };
    // the style question is asked only when the shop's models carry styles
    const step = next === "tarz" && !styles.length ? "renk" : next;
    if (step) return setAdvisor({ ...advisor, step, a: step === "renk" && !styles.length ? { ...a, style: "farketmez" } : a });
    const full = { style: "farketmez", ...a } as Answers;
    const r = advise(models, fabricsFor, full);
    setResult(r);
    setAdvisor(null);
    void track("danisman_tamamlandi", { firmSlug, n: Math.round((clock() - advisor.started) / 1000) });
  };

  const listen = () => {
    if (!Speech) return;
    const rec = new Speech();
    rec.lang = "tr-TR";
    rec.interimResults = false;
    rec.onresult = (e) => ask(e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  };

  const options = <T,>(list: [T, string][], pick: (v: T) => void) => (
    <div className="grid gap-3 sm:grid-cols-2">
      {list.map(([v, label]) => (
        <button key={String(v)} type="button" onClick={() => pick(v)} className={`${big} border-cizgi bg-white hover:border-antrasit`}>
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div role="dialog" aria-modal="true" aria-label="Asistan" className="fixed inset-0 z-50 flex flex-col bg-kirik-beyaz text-antrasit">
      <header className="flex items-center justify-between gap-4 border-b border-cizgi px-6 py-4 sm:px-8">
        <h2 className="font-display text-[28px]">Asistan</h2>
        <button type="button" onClick={onClose} className="min-h-12 rounded-full border border-cizgi bg-white px-6 text-[16px]">
          Kapat
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-5 sm:px-8" aria-live="polite">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {msgs.map((m, i) =>
            m.from === "kisi" ? (
              <p key={i} className="self-end rounded-2xl bg-antrasit px-5 py-3 text-[17px] text-kagit">
                {m.text}
              </p>
            ) : (
              <div key={i} className="self-start rounded-2xl border border-cizgi bg-white px-5 py-4 text-[17px]" data-testid="asistan-cevap">
                {m.text && <p>{m.text}</p>}
                {m.answer?.lines.map((l, j) => (
                  <p key={j} className={j ? "mt-1 text-[15px] text-antrasit-70" : ""}>
                    {l}
                  </p>
                ))}
                {!!m.answer?.fabrics?.length && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {m.answer.fabrics.map((f) => (
                      <button key={f.code} type="button" onClick={() => onOpen(m.answer?.models?.[0] ?? null, f)} className="flex min-h-12 items-center gap-2 rounded-full border border-cizgi bg-kirik-beyaz py-1 pl-1 pr-4 text-[15px]" aria-label={`${f.code} kumaşını koltukta göster`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={f.texture.thumbUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                        {f.code}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ),
          )}

          {advisor && (
            <section aria-label="Koltuk danışmanı" className="rounded-2xl border border-cizgi bg-white p-5">
              {advisor.step === "duvar" && (
                <>
                  <h3 className="mb-3 text-[20px]">Koltuk hangi duvara gelecek? Duvarın uzunluğu:</h3>
                  {options(Object.entries(WALL_LABELS) as [Wall, string][], (v) => choose({ wall: v }, "cocuk"))}
                </>
              )}
              {advisor.step === "cocuk" && (
                <>
                  <h3 className="mb-3 text-[20px]">Evde çocuk ya da evcil hayvan var mı?</h3>
                  {options(
                    [
                      [true, "Evet"],
                      [false, "Hayır"],
                    ],
                    (v) => choose({ kids: v }, "kullanim"),
                  )}
                </>
              )}
              {advisor.step === "kullanim" && (
                <>
                  <h3 className="mb-3 text-[20px]">Koltuk ne sıklıkla kullanılacak?</h3>
                  {options(Object.entries(USE_ANSWER_LABELS) as [Use, string][], (v) => choose({ use: v }, "tarz"))}
                </>
              )}
              {advisor.step === "tarz" && (
                <>
                  <h3 className="mb-3 text-[20px]">Hangi tarz?</h3>
                  {options<StyleTag | "farketmez">([...styles.map((t) => [t, STYLE_LABELS[t]] as [StyleTag, string]), ["farketmez", "Fark etmez"]], (v) => choose({ style: v }, "renk"))}
                </>
              )}
              {advisor.step === "renk" && (
                <>
                  <h3 className="mb-3 text-[20px]">Renkte neye yakınsınız?</h3>
                  {options(Object.entries(TONE_LABELS) as [Tone, string][], (v) => choose({ tone: v }, null))}
                </>
              )}
            </section>
          )}

          {result && (
            <section aria-label="Öneriler" className="flex flex-col gap-3">
              {result.ok ? (
                result.suggestions.map((s) => (
                  <article key={s.model.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-cizgi bg-white p-4" data-testid="oneri">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.fabric.texture.thumbUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[19px]">
                        {s.model.name} · {s.fabric.code}
                      </h3>
                      <p className="text-[15px] text-antrasit-70">{s.reason}</p>
                    </div>
                    <button type="button" onClick={() => onOpen(s.model, s.fabric)} className="min-h-12 rounded-full bg-antrasit px-6 text-[16px] text-kagit">
                      3D&apos;de aç
                    </button>
                  </article>
                ))
              ) : (
                <p className="rounded-2xl bg-[#F4E9DD] px-5 py-4 text-[17px] text-ceviz">{result.message}</p>
              )}
              <button type="button" onClick={startAdvisor} className="min-h-12 self-start rounded-full border border-cizgi bg-white px-6 text-[16px]">
                Baştan sor
              </button>
            </section>
          )}
          <div ref={end} />
        </div>
      </div>

      <footer className="border-t border-cizgi bg-kagit px-6 py-4 sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Hazır sorular">
            <button type="button" onClick={startAdvisor} className="min-h-11 rounded-full bg-antrasit px-4 text-[15px] text-kagit">
              Bana koltuk öner
            </button>
            {EXAMPLES.slice(0, 4).map((e) => (
              <button key={e} type="button" onClick={() => ask(e)} className="min-h-11 rounded-full border border-cizgi bg-white px-4 text-[15px]">
                {e}
              </button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              ask(text);
            }}
          >
            <label htmlFor="asistan-soru" className="sr-only">
              Sorunuz
            </label>
            <input id="asistan-soru" value={text} onChange={(e) => setText(e.target.value)} maxLength={200} autoComplete="off" placeholder="Sorunuzu yazın" className="h-14 min-w-0 flex-1 rounded-full border border-cizgi bg-white px-5 text-[17px]" />
            {/* the button only where the device can listen; the voice is not kept */}
            {Speech && (
              <button type="button" onClick={listen} disabled={listening} className="h-14 rounded-full border border-cizgi bg-white px-5 text-[16px]" aria-label="Sesle sor">
                {listening ? "Dinliyorum…" : "Sesle sor"}
              </button>
            )}
            <button type="submit" className="h-14 rounded-full bg-antrasit px-6 text-[17px] text-kagit">
              Sor
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}
