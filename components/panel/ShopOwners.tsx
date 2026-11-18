"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addOwnerAction, removeOwnerAction } from "@/app/panel/merkez-actions";
import type { ShopOwner } from "@/lib/central/types";
import { Field, buttonClass, inputClass } from "./ui";

const day = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Istanbul" });

// Who can sign in to the shop's own panel (yönetici only). There is no e-mail
// service: a new account's first password is shown here once, for ORMEN to
// hand over; the owner changes it on the first visit (Hesap page).
export function ShopOwners({ firmId, owners, shopPanelUrl, demo }: { firmId: string; owners: ShopOwner[]; shopPanelUrl: string; demo: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <section aria-labelledby="sahipler" className="mb-8 rounded-2xl border border-cizgi bg-kagit p-5">
      <h2 id="sahipler" className="font-display text-[20px]">
        Mağaza paneli hesapları
      </h2>
      <p className="mt-1 text-[14px] text-antrasit-70">
        Mağaza sahibi <span className="font-medium text-antrasit">{shopPanelUrl}</span> adresinden girer; yalnızca kendi tekliflerini, ürünlerini ve ekranlarını görür.
        {demo && " Örnek veri modunda giriş yalnızca demo mağaza hesabıyla yapılır; buradaki liste denemelik."}
      </p>
      {owners.length > 0 && (
        <ul className="mt-4 divide-y divide-cizgi rounded-xl border border-cizgi bg-white" aria-label="Hesaplar">
          {owners.map((o) => (
            <li key={o.userId} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{o.email}</p>
                <p className="text-[13px] text-antrasit-50">{day.format(new Date(o.since))} tarihinden beri</p>
              </div>
              {confirm === o.userId ? (
                <>
                  <span className="text-[14px]">Bu hesabın mağaza paneline erişimi kalksın mı?</span>
                  <button
                    type="button"
                    disabled={pending}
                    className={buttonClass.primary}
                    onClick={() =>
                      start(async () => {
                        const r = await removeOwnerAction(firmId, o.userId);
                        setConfirm(null);
                        setMessage(r.ok ? { ok: true, text: `${o.email} çıkarıldı.` } : { ok: false, text: r.error });
                        if (r.ok) router.refresh();
                      })
                    }
                  >
                    Evet, çıkar
                  </button>
                  <button type="button" className={buttonClass.secondary} onClick={() => setConfirm(null)}>
                    Vazgeç
                  </button>
                </>
              ) : (
                <button type="button" className={buttonClass.quiet} onClick={() => setConfirm(o.userId)}>
                  Erişimi kaldır
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {created && (
        <div role="status" className="mt-4 rounded-xl border border-[#c9d8c4] bg-[#E8EFE6] p-4 text-[14px] text-[#35523a]">
          <p>
            <strong>{created.email}</strong> için hesap açıldı. İlk şifre:
          </p>
          <p className="my-2 select-all font-mono text-[20px] tracking-wider text-antrasit" data-testid="ilk-sifre">
            {created.password}
          </p>
          <p>Bu şifre bir daha gösterilmez. Mağaza sahibine telefonla ya da WhatsApp ile iletin; ilk girişte “Hesap” sayfasından kendi şifresini koysun.</p>
        </div>
      )}
      <form
        className="mt-4 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            setMessage(null);
            setCreated(null);
            const r = await addOwnerAction(firmId, email);
            if (!r.ok) return setMessage({ ok: false, text: r.error });
            setEmail("");
            if (r.password) setCreated({ email: r.email, password: r.password });
            else setMessage({ ok: true, text: `${r.email} eklendi (hesabı zaten vardı; şifresi değişmedi).` });
            router.refresh();
          });
        }}
      >
        <Field label="Mağaza sahibinin e-postası" className="min-w-64 flex-1">
          <input type="email" required className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} autoComplete="off" />
        </Field>
        <button type="submit" disabled={pending} className={buttonClass.secondary}>
          Hesap ekle
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
