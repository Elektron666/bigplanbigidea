"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addSubscriptionAction, setPaidAction } from "@/app/panel/merkez-actions";
import type { Subscription } from "@/lib/central/record";
import { Badge, Field, buttonClass, inputClass } from "./ui";

const money = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 });
const day = (iso: string) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

// Maintenance fees (job 0): yönetici only; the page leaves this section out
// for everyone else, and the actions refuse them too.
export function ShopFees({ firmId, rows, today }: { firmId: string; rows: Subscription[]; today: string }) {
  const router = useRouter();
  const [f, setF] = useState({ dueOn: "", amount: "", period: "aylik", note: "" });
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
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
    <section aria-labelledby="bakim" className="mb-8 rounded-2xl border border-cizgi bg-kagit p-5">
      <h2 id="bakim" className="font-display text-[20px]">
        Bakım bedeli
      </h2>
      <p className="mt-1 text-[14px] text-antrasit-70">Yalnızca ORMEN yöneticisi görür. Tutarlar değişiklik günlüğüne yazılmaz.</p>
      {rows.length > 0 ? (
        <ul className="mt-4 divide-y divide-cizgi rounded-xl border border-cizgi bg-white" aria-label="Vadeler">
          {rows.map((s) => {
            const late = !s.paidOn && s.dueOn < today;
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {day(s.dueOn)} · {s.amount === null ? "tutar girilmedi" : money.format(s.amount)} · {s.period === "yillik" ? "yıllık" : "aylık"}
                  </p>
                  {s.note && <p className="text-[13px] text-antrasit-50">{s.note}</p>}
                </div>
                {s.paidOn ? <Badge>ödendi · {day(s.paidOn)}</Badge> : late ? <Badge tone="warn">gecikti</Badge> : <Badge tone="off">bekliyor</Badge>}
                <button
                  type="button"
                  disabled={pending}
                  className={buttonClass.quiet}
                  onClick={() => run(() => setPaidAction(s.id, !s.paidOn), s.paidOn ? "Ödenmedi olarak düzeltildi." : "Ödendi olarak işaretlendi.")}
                >
                  {s.paidOn ? "Ödenmedi yap" : "Ödendi"}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 text-[14px] text-antrasit-50">Henüz vade girilmedi.</p>
      )}
      <form
        className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => addSubscriptionAction(firmId, f), "Vade eklendi.", () => setF({ dueOn: "", amount: "", period: "aylik", note: "" }));
        }}
      >
        <Field label="Son ödeme tarihi">
          <input type="date" required className={inputClass} value={f.dueOn} onChange={(e) => setF({ ...f, dueOn: e.target.value })} />
        </Field>
        <Field label="Tutar (TL)" hint="Bilinmiyorsa boş kalabilir.">
          <input className={inputClass} value={f.amount} inputMode="decimal" maxLength={14} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        </Field>
        <Field label="Dönem">
          <select className={inputClass} value={f.period} onChange={(e) => setF({ ...f, period: e.target.value })}>
            <option value="aylik">Aylık</option>
            <option value="yillik">Yıllık</option>
          </select>
        </Field>
        <Field label="Not">
          <input className={inputClass} value={f.note} maxLength={200} onChange={(e) => setF({ ...f, note: e.target.value })} />
        </Field>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
          <button type="submit" disabled={pending} className={buttonClass.secondary}>
            Vade ekle
          </button>
          {message && (
            <p role={message.ok ? "status" : "alert"} className={`text-[13px] ${message.ok ? "text-[#35523a]" : "text-[#9a3b31]"}`}>
              {message.text}
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
