"use client";

import { useState } from "react";
import { saveFabricLinksAction } from "@/app/panel/kumas-actions";
import { buttonClass, inputClass } from "./ui";

// A fabric's muadil and uyumlu lists (job 8; uyumlu is for the set scene, job
// 6). ORMEN types the codes; an empty muadil list lets the screen offer
// "Benzer" fabrics by type and colour family, an empty uyumlu list offers none.

const TEXT = {
  muadil: { title: "Muadil kumaşlar", hint: "Bu kumaş stokta yokken önerilecek kumaşlar, sırasıyla. Boş bırakılırsa ekran aynı tip ve renk ailesinden kumaşları “Benzer” etiketiyle önerir." },
  uyumlu: { title: "Uyumlu kumaşlar", hint: "Kombinde (berjer, kırlent) bu kumaşla birlikte önerilecek kumaşlar. Boş bırakılırsa öneri yapılmaz." },
} as const;

export function FabricLinks({ fabricId, kind, codes }: { fabricId: string; kind: "muadil" | "uyumlu"; codes: string[] }) {
  const [text, setText] = useState(codes.join(", "));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const id = `liste-${kind}`;
  const save = async () => {
    setSaving(true);
    const res = await saveFabricLinksAction(fabricId, kind, text);
    setSaving(false);
    if (!res.ok) return setMsg({ ok: false, text: res.error });
    setText(res.codes.join(", "));
    setMsg({ ok: true, text: res.codes.length ? "Kaydedildi." : "Liste boşaltıldı." });
  };
  return (
    <div role="group" aria-label={TEXT[kind].title} className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[14px] font-medium">
        {TEXT[kind].title}
      </label>
      <p className="text-[12px] text-antrasit-50">{TEXT[kind].hint}</p>
      <div className="flex flex-wrap gap-2">
        <input id={id} value={text} onChange={(e) => setText(e.target.value)} placeholder="ör. LUMA-03, MISSO-02" className={`${inputClass} min-w-0 flex-1 basis-60`} />
        {/* its own name: the fabric form above has its own "Kaydet" */}
        <button type="button" onClick={save} disabled={saving} aria-label={`${TEXT[kind].title} listesini kaydet`} className={buttonClass.secondary}>
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
      {msg && (
        <p role="status" className={`text-[13px] ${msg.ok ? "text-[#35523a]" : "text-[#8a3a30]"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
