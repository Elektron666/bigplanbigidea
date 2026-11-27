"use client";

import { useState, useTransition } from "react";
import { saveFirmBrandsEmbedAction } from "@/app/panel/merkez-actions";
import { embedCode } from "@/lib/marka";
import { buttonClass } from "./ui";

// The shop's brands and its web embed (job 16).

export function FirmBrandsEmbed({ firmId, slug, site, allBrands, brands, embedDomains }: { firmId: string; slug: string; site: string; allBrands: string[]; brands: string[] | null; embedDomains: string[] }) {
  const [all, setAll] = useState(brands === null);
  const [on, setOn] = useState<string[]>(brands ?? allBrands);
  const [domains, setDomains] = useState(embedDomains.join(", "));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      const r = await saveFirmBrandsEmbedAction(firmId, all ? null : on, domains);
      setMsg(r.ok ? { ok: true, text: "Kaydedildi." } : { ok: false, text: r.error });
    });
  const code = embedCode(site, slug);
  return (
    <section aria-labelledby="marka-gomme" className="mb-8 rounded-2xl border border-cizgi bg-kagit p-5">
      <h2 id="marka-gomme" className="font-display text-[20px]">
        Markalar ve web sitesine gömme
      </h2>
      <fieldset className="mt-3">
        <legend className="mb-2 text-[13px] text-antrasit-70">Bu mağazada görünen kumaş markaları. Kapatılan markanın kumaşı mağazanın hiçbir ekranında görünmez.</legend>
        <label className="mb-2 flex min-h-11 items-center gap-2 text-[14px]">
          <input type="checkbox" className="h-4 w-4 accent-[#2a2a28]" checked={all} onChange={(e) => setAll(e.target.checked)} />
          Bütün markalar (yeni eklenenler dahil)
        </label>
        {!all && (
          <div className="flex flex-wrap gap-2">
            {allBrands.map((b) => (
              <label key={b} className="flex min-h-11 items-center gap-2 rounded-full border border-cizgi bg-white px-3 text-[14px]">
                <input type="checkbox" className="h-4 w-4 accent-[#2a2a28]" checked={on.includes(b)} onChange={() => setOn(on.includes(b) ? on.filter((x) => x !== b) : [...on, b])} />
                {b}
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <label className="mt-4 flex flex-col gap-1.5 text-[13px] text-antrasit-70">
        Gömmenin açılacağı alan adları (virgülle; ör. www.magazaniz.com). Boşsa gömme başka sitede açılmaz.
        <input value={domains} onChange={(e) => setDomains(e.target.value)} className="h-11 rounded-lg border border-cizgi bg-white px-3 text-[15px] text-antrasit" />
      </label>
      <label className="mt-3 flex flex-col gap-1.5 text-[13px] text-antrasit-70">
        Gömme kodu (mağazanın sitesine yapıştırılır)
        <textarea readOnly value={code} className="h-20 rounded-lg border border-cizgi bg-white p-2 font-mono text-[12px] text-antrasit" onFocus={(e) => e.currentTarget.select()} />
      </label>
      <p className="mt-1 text-[12px] text-antrasit-50">Gömülü sürümde kilit, vitrin döngüsü ve satıcı modu yoktur; numune talebi ve teklif açıktır.</p>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={save} disabled={pending} className={buttonClass.primary}>
          Markaları ve gömmeyi kaydet
        </button>
        {msg && (
          <p role="status" className={`text-[13px] ${msg.ok ? "text-[#35523a]" : "text-[#9a3b31]"}`}>
            {msg.text}
          </p>
        )}
      </div>
    </section>
  );
}
