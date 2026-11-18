"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveShopRecordAction } from "@/app/panel/merkez-actions";
import type { ShopRecord } from "@/lib/central/record";
import { Field, buttonClass, inputClass } from "./ui";

// The shop's own record at the centre (job 0): what the shop list filters
// and sorts by, plus the two settings its screens read (loop time, update
// mode) and the photo try-on quota. Nothing here is shown to customers.
const fields = (record: ShopRecord) => ({
  city: record.city ?? "",
  region: record.region ?? "",
  package: record.package ?? "",
  tags: record.tags.join(", "),
  contact: record.contact ?? "",
  installedOn: record.installedOn ?? "",
  updateMode: record.updateMode,
  vitrinSn: record.vitrinSn === null ? "" : String(record.vitrinSn),
  aiQuota: record.aiQuota === null ? "" : String(record.aiQuota),
});

export function ShopRecordForm({ firmId, record }: { firmId: string; record: ShopRecord }) {
  const router = useRouter();
  const [f, setF] = useState(() => fields(record));
  // changed elsewhere (a template applied, an undo): the form shows it, the message stays
  const [shown, setShown] = useState(record);
  if (JSON.stringify(shown) !== JSON.stringify(record)) {
    setShown(record);
    setF(fields(record));
  }
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = () =>
    start(async () => {
      setMessage(null);
      const res = await saveShopRecordAction(firmId, f);
      setMessage(res.ok ? { ok: true, text: "Mağaza kaydı kaydedildi." } : { ok: false, text: res.error });
      if (res.ok) router.refresh();
    });

  return (
    <section aria-labelledby="kayit" className="mb-8 rounded-2xl border border-cizgi bg-kagit p-5">
      <h2 id="kayit" className="font-display text-[20px]">
        Mağaza kaydı
      </h2>
      <p className="mt-1 text-[14px] text-antrasit-70">Mağaza listesindeki süzgeçler bu bilgilerle çalışır. Müşteriye gösterilmez.</p>
      <form
        className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label="Şehir">
          <input className={inputClass} value={f.city} onChange={set("city")} maxLength={60} autoComplete="off" />
        </Field>
        <Field label="Bölge">
          <input className={inputClass} value={f.region} onChange={set("region")} maxLength={60} autoComplete="off" />
        </Field>
        <Field label="Paket">
          <input className={inputClass} value={f.package} onChange={set("package")} maxLength={40} autoComplete="off" />
        </Field>
        <Field label="Etiketler" hint="Virgülle ayırın: siteler, pilot">
          <input className={inputClass} value={f.tags} onChange={set("tags")} maxLength={300} autoComplete="off" />
        </Field>
        <Field label="Yetkili" hint="Mağazada aranacak kişi">
          <input className={inputClass} value={f.contact} onChange={set("contact")} maxLength={120} autoComplete="off" />
        </Field>
        <Field label="Kurulum tarihi">
          <input type="date" className={inputClass} value={f.installedOn} onChange={set("installedOn")} />
        </Field>
        <Field label="Güncellemeler">
          <select className={inputClass} value={f.updateMode} onChange={set("updateMode")}>
            <option value="otomatik">Otomatik (ekran boştayken)</option>
            <option value="onayli">Onaylı (mağaza onaylar)</option>
          </select>
        </Field>
        <Field label="Vitrin süresi (sn)" hint="Boş bırakılırsa 60 sn. 30–600 arası.">
          <input className={inputClass} value={f.vitrinSn} onChange={set("vitrinSn")} inputMode="numeric" maxLength={3} />
        </Field>
        <Field label="Aylık fotoğraf denemesi kotası" hint="Boş: ORMEN belirlemedi, deneme yapılmaz.">
          <input className={inputClass} value={f.aiQuota} onChange={set("aiQuota")} inputMode="numeric" maxLength={6} />
        </Field>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-3">
          <button type="submit" disabled={pending} className={buttonClass.primary}>
            Kaydı kaydet
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
