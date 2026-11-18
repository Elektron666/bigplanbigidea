"use client";

import { useState, useTransition } from "react";
import { setWasteAction } from "@/app/panel/merkez-actions";
import { WASTE_LABELS, type WasteSettings } from "@/lib/teklif/metraj";
import { buttonClass, inputClass } from "./ui";

const show = (n: number | null) => (n === null ? "" : String(n).replace(".", ","));

// ORMEN's waste figures for the quote's metres (job 3). Left empty they add
// nothing and the quote says "fire dahil değildir"; no figure is suggested.
export function WasteForm({ waste, canEdit }: { waste: WasteSettings; canEdit: boolean }) {
  const [v, setV] = useState({ duz: show(waste.duz), donuk: show(waste.donuk), raporlu: show(waste.raporlu), roundStep: show(waste.roundStep) });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <section aria-labelledby="fire" className="mb-8 rounded-2xl border border-cizgi bg-kagit p-5">
      <h2 id="fire" className="font-display text-[20px]">
        Fire ve yuvarlama
      </h2>
      <p className="mt-1 text-[14px] text-antrasit-70">
        Teklifteki metraja eklenecek fire, yüzde olarak. <strong className="font-medium">ORMEN girecek;</strong> boş bırakılan için fire eklenmez ve teklifte “fire dahil değildir” yazar. Toplamlar yuvarlama adımına yukarı yuvarlanır.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {(["duz", "donuk", "raporlu"] as const).map((k) => (
          <label key={k} className="flex flex-col gap-1.5 text-[13px] text-antrasit-70">
            Fire, {WASTE_LABELS[k]} (%)
            <input value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} disabled={!canEdit} inputMode="decimal" placeholder="ORMEN girecek" className={inputClass} />
          </label>
        ))}
        <label className="flex flex-col gap-1.5 text-[13px] text-antrasit-70">
          Yuvarlama adımı (m)
          <input value={v.roundStep} onChange={(e) => setV({ ...v, roundStep: e.target.value })} disabled={!canEdit} inputMode="decimal" className={inputClass} />
        </label>
      </div>
      {canEdit ? (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await setWasteAction(v);
                setMsg(r.ok ? { ok: true, text: "Kaydedildi. Ekranlar bir sonraki eşitlemede yeni katsayılarla hesaplar." } : { ok: false, text: r.error });
              })
            }
            className={buttonClass.primary}
          >
            Kaydet
          </button>
          {msg && (
            <p role={msg.ok ? "status" : "alert"} className={`text-[13px] ${msg.ok ? "text-[#35523a]" : "text-[#9a3b31]"}`}>
              {msg.text}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-[13px] text-antrasit-50">Katsayıları yalnızca ORMEN yöneticisi değiştirir.</p>
      )}
    </section>
  );
}
