"use client";

import { createContext, useContext, useId, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { bulkShopAction } from "@/app/panel/merkez-actions";
import { FEATURE_LABELS, FEATURES } from "@/lib/central/features";
import type { ShopQuery } from "@/lib/central/shops";
import { buttonClass, inputClass } from "./ui";

// Bulk work on the shop list (job 0): tick shops (or take every shop the
// filter finds), choose one step, apply. Staged roll-out is the same step on
// a filtered group first (durum: Pilot, or a tag), then on all.

type Pick = { ids: Set<string>; toggle: (id: string) => void; setMany: (ids: string[], on: boolean) => void };
const Ctx = createContext<Pick | null>(null);

export function ShopSelection({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setIds((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const setMany = (list: string[], on: boolean) =>
    setIds((s) => {
      const n = new Set(s);
      for (const id of list) {
        if (on) n.add(id);
        else n.delete(id);
      }
      return n;
    });
  return <Ctx.Provider value={{ ids, toggle, setMany }}>{children}</Ctx.Provider>;
}

export function PickBox({ id, name }: { id: string; name: string }) {
  const c = useContext(Ctx)!;
  return (
    <label className="-m-2 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center">
      <input type="checkbox" className="h-5 w-5 accent-antrasit" checked={c.ids.has(id)} onChange={() => c.toggle(id)} aria-label={`${name} seç`} />
    </label>
  );
}

export function PickPage({ ids }: { ids: string[] }) {
  const c = useContext(Ctx)!;
  const all = ids.length > 0 && ids.every((id) => c.ids.has(id));
  return (
    <label className="flex items-center gap-2 text-[13px] text-antrasit-70">
      <input type="checkbox" className="h-5 w-5 accent-antrasit" checked={all} onChange={() => c.setMany(ids, !all)} />
      Bu sayfadakilerin hepsini seç
    </label>
  );
}

/** A label tied to its control by id, so the control's name is the label alone (not its options too). */
function Labeled({ label, className, children }: { label: string; className: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1.5 text-[13px] text-antrasit-70 ${className}`}>
      <label htmlFor={id}>{label}</label>
      {children(id)}
    </div>
  );
}

const STEPS = [
  { value: "ozellik-ac", label: "Özellik aç" },
  { value: "ozellik-kapat", label: "Özellik kapat" },
  { value: "seri-ac", label: "Kumaş serisi aç" },
  { value: "seri-kapat", label: "Kumaş serisi kapat" },
  { value: "kota", label: "Deneme kotasını değiştir" },
  { value: "etiket-ekle", label: "Etiket ekle" },
  { value: "etiket-cikar", label: "Etiket çıkar" },
  { value: "guncelle", label: "Güncelleme gönder (şimdi eşitle)" },
] as const;

export function ShopBulkBar({ total, query, series }: { total: number; query: Pick_<ShopQuery, "search" | "status" | "city" | "tag">; series: string[] }) {
  const c = useContext(Ctx)!;
  const router = useRouter();
  const [step, setStep] = useState<(typeof STEPS)[number]["value"]>("ozellik-ac");
  const [feature, setFeature] = useState<string>(FEATURES[0]);
  const [serie, setSerie] = useState(series[0] ?? "");
  const [value, setValue] = useState("");
  const [everyone, setEveryone] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const count = everyone ? total : c.ids.size;
  if (!c.ids.size && !everyone) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3 text-[13px] text-antrasit-50">
        <span>Toplu işlem için mağazaları işaretleyin ya da</span>
        <button type="button" className={buttonClass.quiet} onClick={() => setEveryone(true)}>
          süzgeçteki {total} mağazanın hepsini seçin
        </button>
        {message && (
          <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-[#35523a]" : "text-[#9a3b31]"}>
            {message.text}
          </p>
        )}
      </div>
    );
  }

  const op = () => {
    switch (step) {
      case "ozellik-ac":
      case "ozellik-kapat":
        return { kind: "ozellik", feature, on: step === "ozellik-ac" };
      case "seri-ac":
      case "seri-kapat":
        return { kind: "seri", series: serie, on: step === "seri-ac" };
      case "kota":
        return { kind: "kota", quota: value };
      case "etiket-ekle":
      case "etiket-cikar":
        return { kind: "etiket", tag: value, on: step === "etiket-ekle" };
      default:
        return { kind: "guncelle" };
    }
  };
  const apply = () =>
    start(async () => {
      setMessage(null);
      const res = await bulkShopAction(op(), everyone ? { query } : { ids: [...c.ids] });
      setConfirming(false);
      if (!res.ok) return setMessage({ ok: false, text: res.error });
      setMessage({ ok: true, text: `${res.changed} mağazada yapıldı${res.same ? `, ${res.same} mağaza zaten öyleydi` : ""}. Günlükten mağaza mağaza geri alınabilir.` });
      c.setMany([...c.ids], false);
      setEveryone(false);
      router.refresh();
    });

  return (
    <aside aria-label="Toplu işlem" className="sticky bottom-3 z-10 mt-4 rounded-2xl border border-cizgi-koyu bg-kagit p-4 shadow-lg">
      <div className="flex flex-wrap items-end gap-3">
        <p className="basis-full text-[14px] font-medium" data-testid="toplu-sayi">
          {everyone ? `Süzgeçteki ${total} mağazanın hepsi` : `${c.ids.size} mağaza seçili`}
          <button
            type="button"
            className={`${buttonClass.quiet} ml-2`}
            onClick={() => {
              setEveryone(false);
              c.setMany([...c.ids], false);
              setConfirming(false);
            }}
          >
            Seçimi kaldır
          </button>
        </p>
        <Labeled label="İşlem" className="min-w-56">
          {(id) => (
            <select id={id} className={inputClass} value={step} onChange={(e) => (setStep(e.target.value as typeof step), setConfirming(false))}>
              {STEPS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          )}
        </Labeled>
        {step.startsWith("ozellik") && (
          <Labeled label="Özellik" className="min-w-56">
            {(id) => (
              <select id={id} className={inputClass} value={feature} onChange={(e) => setFeature(e.target.value)}>
                {FEATURES.map((f) => (
                  <option key={f} value={f}>
                    {FEATURE_LABELS[f].name}
                  </option>
                ))}
              </select>
            )}
          </Labeled>
        )}
        {step.startsWith("seri") && (
          <Labeled label="Seri" className="min-w-48">
            {(id) => (
              <select id={id} className={inputClass} value={serie} onChange={(e) => setSerie(e.target.value)}>
                {series.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
          </Labeled>
        )}
        {(step === "kota" || step.startsWith("etiket")) && (
          <Labeled label={step === "kota" ? "Aylık kota (boş: kaldır)" : "Etiket"} className="min-w-48">
            {(id) => <input id={id} className={inputClass} value={value} onChange={(e) => setValue(e.target.value)} inputMode={step === "kota" ? "numeric" : "text"} maxLength={30} />}
          </Labeled>
        )}
        {confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px]">{count} mağazaya uygulansın mı?</span>
            <button type="button" disabled={pending} className={buttonClass.primary} onClick={apply}>
              Evet, uygula
            </button>
            <button type="button" disabled={pending} className={buttonClass.secondary} onClick={() => setConfirming(false)}>
              Vazgeç
            </button>
          </div>
        ) : (
          <button type="button" disabled={pending} className={buttonClass.primary} onClick={() => setConfirming(true)}>
            Uygula
          </button>
        )}
      </div>
      {message && (
        <p role={message.ok ? "status" : "alert"} className={`mt-2 text-[13px] ${message.ok ? "text-[#35523a]" : "text-[#9a3b31]"}`}>
          {message.text}
        </p>
      )}
    </aside>
  );
}

type Pick_<T, K extends keyof T> = { [P in K]?: T[P] };
