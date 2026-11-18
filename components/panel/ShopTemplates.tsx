"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applyTemplateAction, saveTemplateFromShopAction } from "@/app/panel/merkez-actions";
import { FEATURE_LABELS, FEATURES } from "@/lib/central/features";
import type { ShopTemplate } from "@/lib/central/record";
import { Field, buttonClass, inputClass } from "./ui";

/** One line a person can check before applying: what the template turns on and sets. */
function describe(t: ShopTemplate): string {
  const on = FEATURES.filter((f) => t.features[f] === true).map((f) => FEATURE_LABELS[f].name);
  const off = FEATURES.filter((f) => t.features[f] === false).map((f) => FEATURE_LABELS[f].name);
  const parts = [
    on.length ? `açık: ${on.join(", ")}` : null,
    off.length ? `kapalı: ${off.join(", ")}` : null,
    t.fabricSeries.length ? `seriler: ${t.fabricSeries.join(", ")}` : "bütün seriler",
    t.vitrinSn ? `vitrin ${t.vitrinSn} sn` : null,
    t.updateMode === "onayli" ? "onaylı güncelleme" : "otomatik güncelleme",
    t.package ? `paket: ${t.package}` : null,
    t.aiQuota !== null ? `deneme kotası ${t.aiQuota}` : null,
  ];
  return parts.filter(Boolean).join(" · ");
}

// Shop templates (job 0): a new shop is set up from one in a single step, and
// a well set-up shop is kept as a template for the next ones.
export function ShopTemplates({ firmId, templates }: { firmId: string; templates: ShopTemplate[] }) {
  const router = useRouter();
  const [pick, setPick] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  // the list may arrive after the first render (a template just saved): the first one until one is picked
  const chosen = templates.find((t) => t.id === pick) ?? templates[0];
  const run = (fn: () => Promise<{ ok: true } | { ok: false; error: string }>, done: string, after?: () => void) =>
    start(async () => {
      setMessage(null);
      const res = await fn();
      setMessage(res.ok ? { ok: true, text: done } : { ok: false, text: res.error });
      if (res.ok) {
        after?.();
        router.refresh();
      }
    });

  return (
    <section aria-labelledby="sablon" className="mb-8 rounded-2xl border border-cizgi bg-kagit p-5">
      <h2 id="sablon" className="font-display text-[20px]">
        Şablon
      </h2>
      {templates.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <Field label="Şablondan kur" className="min-w-64 flex-1">
            <select className={inputClass} value={chosen?.id ?? ""} onChange={(e) => setPick(e.target.value)}>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <button type="button" disabled={pending || !chosen} className={buttonClass.primary} onClick={() => chosen && run(() => applyTemplateAction(firmId, chosen.id), `“${chosen.name}” uygulandı. Günlükten geri alınabilir.`)}>
            Şablonu uygula
          </button>
          {chosen && <p className="w-full text-[13px] text-antrasit-50">{describe(chosen)}</p>}
          <p className="w-full text-[13px] text-antrasit-50">Mağazanın adı, adresi, yetkilisi ve ürünleri değişmez.</p>
        </div>
      ) : (
        <p className="mt-1 text-[14px] text-antrasit-70">Henüz şablon yok. Bu mağazayı iyi kurduktan sonra aşağıdan şablon olarak kaydedin; sonraki mağazalar tek adımda aynı ayarlarla açılır.</p>
      )}
      <form
        className="mt-5 flex flex-wrap items-end gap-3 border-t border-cizgi pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => saveTemplateFromShopAction(firmId, name), "Şablon kaydedildi.", () => setName(""));
        }}
      >
        <Field label="Bu mağazanın ayarlarını şablon olarak kaydet" hint="Aynı adda bir şablon varsa yerine geçer." className="min-w-64 flex-1">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Şablon adı" />
        </Field>
        <button type="submit" disabled={pending} className={buttonClass.secondary}>
          Şablon olarak kaydet
        </button>
      </form>
      {message && (
        <p role={message.ok ? "status" : "alert"} className={`mt-3 text-[13px] ${message.ok ? "text-[#35523a]" : "text-[#9a3b31]"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}
