"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPairingAction, removeDeviceAction, requestSyncAction } from "@/app/panel/merkez-actions";
import { PAIRING_TTL_MINUTES, type Device } from "@/lib/devices/pairing";
import { Badge, Field, buttonClass, inputClass } from "./ui";

const when = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });

// The shop's showroom screens: add one with a short code, see where each
// stands, ask it to sync, remove it.
export function ShopDevices({ firmId, devices, showroomUrl, canRemove }: { firmId: string; devices: (Device & { state: { label: string; tone: "neutral" | "warn" | "off" } })[]; showroomUrl: string; canRemove: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("");
  const [code, setCode] = useState<{ code: string; name: string } | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: true } | { ok: false; error: string }>, done: string) =>
    start(async () => {
      const res = await fn();
      setMessage(res.ok ? { ok: true, text: done } : { ok: false, text: res.error });
      if (res.ok) router.refresh();
    });

  const add = () =>
    start(async () => {
      setMessage(null);
      const res = await createPairingAction(firmId, { name, branch });
      if (!res.ok) return setMessage({ ok: false, text: res.error });
      setCode({ code: res.code, name: name.trim() });
      setName("");
      setBranch("");
    });

  return (
    <section aria-labelledby="cihazlar" className="mb-8 rounded-2xl border border-cizgi bg-kagit p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="cihazlar" className="font-display text-[20px]">
            Cihazlar
          </h2>
          <p className="mt-1 text-[14px] text-antrasit-70">
            Mağazadaki ekranda <span className="font-medium text-antrasit">{showroomUrl}</span> adresini açın ve buradan aldığınız kodu yazın. Ekran bu mağazaya bağlanır, bir daha kod sormaz.
          </p>
        </div>
        {devices.length > 1 && (
          <button type="button" disabled={pending} onClick={() => run(() => requestSyncAction(firmId), "Bütün ekranlara “şimdi eşitle” gönderildi.")} className={buttonClass.secondary}>
            Hepsini şimdi eşitle
          </button>
        )}
      </div>

      {devices.length > 0 && (
        <ul className="mt-4 divide-y divide-cizgi rounded-xl border border-cizgi bg-white">
          {devices.map((d) => {
            const state = d.state;
            return (
              <li key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <div className="min-w-0 flex-1 basis-56">
                  <p className="font-medium">
                    {d.name}
                    {d.branch ? <span className="font-normal text-antrasit-50"> · {d.branch}</span> : null}
                  </p>
                  <p className="text-[13px] text-antrasit-50">
                    {d.lastSeenAt ? `Son görülme ${when.format(new Date(d.lastSeenAt))}` : "Henüz açılmadı"}
                    {d.lastSyncAt ? ` · son eşitleme ${when.format(new Date(d.lastSyncAt))}` : ""}
                    {d.appVersion ? ` · uygulama ${d.appVersion}` : ""}
                    {d.contentVersion !== null ? ` · içerik ${d.contentVersion}` : ""}
                  </p>
                </div>
                <Badge tone={state.tone}>{state.label}</Badge>
                <button type="button" disabled={pending} onClick={() => run(() => requestSyncAction(firmId, d.id), `“${d.name}” ekranına “şimdi eşitle” gönderildi.`)} className={buttonClass.quiet} aria-label={`${d.name}: şimdi eşitle`}>
                  Şimdi eşitle
                </button>
                {canRemove &&
                  (confirm === d.id ? (
                    <span className="flex items-center gap-1.5">
                      <button type="button" disabled={pending} onClick={() => run(() => removeDeviceAction(d.id), `“${d.name}” kaldırıldı.`)} className="inline-flex h-9 items-center rounded-full bg-[#9a3b31] px-3 text-[13px] text-white">
                        Evet, kaldır
                      </button>
                      <button type="button" onClick={() => setConfirm(null)} className={buttonClass.quiet}>
                        Vazgeç
                      </button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setConfirm(d.id)} className={buttonClass.quiet} aria-label={`${d.name}: kaldır`}>
                      Kaldır
                    </button>
                  ))}
              </li>
            );
          })}
        </ul>
      )}

      {code && (
        <div role="status" className="mt-4 rounded-xl bg-[#E8EFE6] px-5 py-4 text-[#2f4a34]">
          <p className="text-[14px]">“{code.name}” için eşleştirme kodu ({PAIRING_TTL_MINUTES} dakika geçerli, bir kez kullanılır):</p>
          <p className="mt-1 font-display text-[44px] leading-none tracking-[0.18em]" data-testid="eslestirme-kodu">
            {code.code}
          </p>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
        <Field label="Ekranın adı" hint="Ör. Giriş ekranı">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={inputClass} />
        </Field>
        <Field label="Şube (isteğe bağlı)" hint="Birden çok şube varsa">
          <input value={branch} onChange={(e) => setBranch(e.target.value)} maxLength={60} className={inputClass} />
        </Field>
        <button type="button" onClick={add} disabled={pending} className={`${buttonClass.primary} sm:mb-[26px]`}>
          Cihaz ekle
        </button>
      </div>
      {message && (
        <p role={message.ok ? "status" : "alert"} className={`mt-3 text-[13px] ${message.ok ? "text-[#35523a]" : "text-[#9a3b31]"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}
