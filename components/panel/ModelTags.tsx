"use client";

import { useState, useTransition } from "react";
import { setModelTagsAction } from "@/app/panel/merkez-actions";
import { STYLE_LABELS, STYLE_TAGS, USE_LABELS, USE_TAGS } from "@/lib/asistan/etiketler";

// The advisor's tags of a model (job 10): its style and what it suits. The
// advisor only says what is ticked here; a model without tags is still
// offered, without tag points.
export function ModelTags({ modelId, styleTags, useTags }: { modelId: string; styleTags: string[]; useTags: string[] }) {
  const [style, setStyle] = useState(styleTags);
  const [use, setUse] = useState(useTags);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const save = (s: string[], u: string[]) =>
    start(async () => {
      setMessage(null);
      const r = await setModelTagsAction(modelId, s, u);
      setMessage(r.ok ? { ok: true, text: "Etiketler kaydedildi." } : { ok: false, text: r.error });
    });
  const chip = (on: boolean) => `min-h-10 rounded-full border px-4 text-[14px] ${on ? "border-antrasit bg-antrasit text-kagit" : "border-cizgi bg-white text-antrasit"}`;
  return (
    <section aria-labelledby="danisman-etiket" className="mb-8 rounded-2xl border border-cizgi bg-kagit p-5">
      <h2 id="danisman-etiket" className="font-display text-[20px]">
        Danışman etiketleri
      </h2>
      <p className="mt-1 text-[14px] text-antrasit-70">Koltuk danışmanı öneri yaparken bunlara bakar ve gerekçede yalnızca işaretli olanları söyler.</p>
      <div role="group" aria-label="Tarz" className="mt-3 flex flex-wrap gap-2">
        <span className="w-full text-[13px] text-antrasit-70">Tarz</span>
        {STYLE_TAGS.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={style.includes(t)}
            disabled={pending}
            className={chip(style.includes(t))}
            onClick={() => {
              const next = style.includes(t) ? style.filter((x) => x !== t) : [...style, t];
              setStyle(next);
              save(next, use);
            }}
          >
            {STYLE_LABELS[t]}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Kullanım" className="mt-4 flex flex-wrap gap-2">
        <span className="w-full text-[13px] text-antrasit-70">Kullanım</span>
        {USE_TAGS.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={use.includes(t)}
            disabled={pending}
            className={chip(use.includes(t))}
            onClick={() => {
              const next = use.includes(t) ? use.filter((x) => x !== t) : [...use, t];
              setUse(next);
              save(style, next);
            }}
          >
            {USE_LABELS[t]}
          </button>
        ))}
      </div>
      {message && (
        <p role={message.ok ? "status" : "alert"} className={`mt-3 text-[13px] ${message.ok ? "text-[#35523a]" : "text-[#9a3b31]"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}
