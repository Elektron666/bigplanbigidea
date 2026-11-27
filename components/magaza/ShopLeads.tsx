"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteLeadsAction, setLeadRetentionAction } from "@/app/magaza/actions";
import { RETENTION, showPhone } from "@/lib/musteri/kayit";
import type { Lead } from "@/lib/musteri/store";
import { buttonClass, inputClass } from "@/components/panel/ui";

const when = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });

export function ShopLeads({ leads, retention, readOnly }: { leads: Lead[]; retention: number | null; readOnly: boolean }) {
  const router = useRouter();
  const [days, setDays] = useState(retention?.toString() ?? "");
  const [picked, setPicked] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const remove = (ids: string[]) =>
    start(async () => {
      const r = await deleteLeadsAction(ids);
      setMsg(r.ok ? { ok: true, text: `${r.removed} kayıt silindi.` } : { ok: false, text: r.error });
      setPicked([]);
      router.refresh();
    });
  const saveDays = () =>
    start(async () => {
      const r = await setLeadRetentionAction(days);
      setMsg(r.ok ? { ok: true, text: days ? `Saklama süresi ${days} gün.` : "Bilgi toplama kapatıldı." } : { ok: false, text: r.error });
      router.refresh();
    });
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="saklama" className="rounded-2xl border border-cizgi bg-kagit p-5">
        <h2 id="saklama" className="font-medium">
          Saklama süresi
        </h2>
        <p className="mt-1 text-[13px] text-antrasit-70">
          Müşteri bilgisi yalnızca süre girilmişse toplanır (telefondaki videoda “Size dönelim mi?” formu çıkar). Süresi dolan kayıt kendiliğinden silinir. {RETENTION.min}–{RETENTION.max} gün; boş bırakılırsa bilgi toplanmaz.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[14px]">
            <input value={days} onChange={(e) => setDays(e.target.value)} inputMode="numeric" maxLength={3} disabled={readOnly} className={`${inputClass} w-24`} aria-label="Saklama süresi (gün)" />
            gün
          </label>
          {!readOnly && (
            <button type="button" onClick={saveDays} disabled={pending} className={buttonClass.secondary}>
              Kaydet
            </button>
          )}
        </div>
      </section>
      {msg && (
        <p role="status" className={`text-[14px] ${msg.ok ? "text-[#35523a]" : "text-[#9a3b31]"}`}>
          {msg.text}
        </p>
      )}
      {leads.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-cizgi-koyu p-10 text-center text-[15px] text-antrasit-50">{readOnly ? "Müşteri bilgileri destek görünümünde gösterilmez." : "Henüz kayıt yok."}</p>
      ) : (
        <section aria-label="İlgilenen müşteriler">
          {!readOnly && (
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-[14px]">
                <input type="checkbox" className="h-5 w-5 accent-[#2a2a28]" checked={picked.length === leads.length} onChange={(e) => setPicked(e.target.checked ? leads.map((l) => l.id) : [])} />
                Hepsini seç
              </label>
              <button type="button" onClick={() => remove(picked)} disabled={pending || !picked.length} className={buttonClass.secondary}>
                Seçilenleri sil ({picked.length})
              </button>
            </div>
          )}
          <ul className="divide-y divide-cizgi rounded-2xl border border-cizgi bg-kagit">
            {leads.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-3" data-testid="musteri">
                {!readOnly && <input type="checkbox" aria-label={`${l.name} seç`} className="h-5 w-5 accent-[#2a2a28]" checked={picked.includes(l.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, l.id] : picked.filter((x) => x !== l.id))} />}
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{l.name}</span> · <a href={`tel:+${l.phone}`} className="underline underline-offset-4">{showPhone(l.phone)}</a>
                  <span className="block text-[13px] text-antrasit-70">
                    {l.product ?? "—"} · {when.format(new Date(l.createdAt))}
                  </span>
                </span>
                {!readOnly && (
                  <button type="button" onClick={() => remove([l.id])} disabled={pending} className={buttonClass.quiet} aria-label={`${l.name} sil`}>
                    Sil
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
