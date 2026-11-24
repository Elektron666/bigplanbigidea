"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { foldTr } from "@/lib/i18n/tr";
import { parseStockCsv, STOCK_CSV_EXAMPLE, STOCK_LABELS, STOCK_STATUSES, type StockCsvResult, type StockMap } from "@/lib/kumas/stok";
import { importStockCsvAction, saveStockAction } from "@/app/panel/kumas-actions";
import { buttonClass, inputClass } from "./ui";

// Fabric stock in the panel (job 8): by hand in the table, or many at once
// from a CSV (kod;stok;termin_gun). A CSV is read here first, so the bad rows
// are seen before anything is saved; the server reads it again and applies
// the good ones in one go.

export interface StockFabric {
  code: string;
  series: string;
  colorName: string;
  thumbUrl: string;
  isActive: boolean;
}

type Edit = { status: string; leadDays: string };

export function StockEditor({ fabrics, stock }: { fabrics: StockFabric[]; stock: StockMap }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [onlyOut, setOnlyOut] = useState(false);
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [csv, setCsv] = useState<{ name: string; text: string; preview: StockCsvResult } | null>(null);
  const [csvResult, setCsvResult] = useState<{ applied: number; errors: StockCsvResult["errors"] } | null>(null);

  const codes = useMemo(() => new Set(fabrics.map((f) => f.code)), [fabrics]);
  const current = (code: string): Edit => edits[code] ?? { status: stock[code]?.status ?? "", leadDays: stock[code]?.leadDays?.toString() ?? "" };
  const changed = Object.entries(edits).filter(([code, e]) => e.status !== (stock[code]?.status ?? "") || e.leadDays !== (stock[code]?.leadDays?.toString() ?? ""));
  const shown = fabrics.filter((f) => {
    if (onlyOut && current(f.code).status !== "yok") return false;
    const needle = foldTr(q.trim());
    return !needle || foldTr(`${f.code} ${f.series} ${f.colorName}`).includes(needle);
  });

  const edit = (code: string, patch: Partial<Edit>) => setEdits((old) => ({ ...old, [code]: { ...current(code), ...patch } }));

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const res = await saveStockAction(changed.map(([code, e]) => ({ code, status: e.status, leadDays: e.status ? e.leadDays : "" })));
    setSaving(false);
    if (!res.ok) return setMsg({ ok: false, text: res.error });
    setEdits({});
    setMsg({ ok: true, text: `${res.saved} kumaşın stoğu kaydedildi.` });
    router.refresh();
  };

  const readCsv = async (file: File | undefined) => {
    setCsvResult(null);
    if (!file) return setCsv(null);
    const text = await file.text();
    setCsv({ name: file.name, text, preview: parseStockCsv(text, (w) => (codes.has(w.trim().toLocaleUpperCase("tr-TR")) ? w.trim().toLocaleUpperCase("tr-TR") : null)) });
  };

  const applyCsv = async () => {
    if (!csv) return;
    setSaving(true);
    const res = await importStockCsvAction(csv.text);
    setSaving(false);
    if (!res.ok) return setMsg({ ok: false, text: res.error });
    setCsvResult({ applied: res.applied, errors: res.errors });
    setCsv(null);
    router.refresh();
  };

  const template = `data:text/csv;charset=utf-8,${encodeURIComponent(STOCK_CSV_EXAMPLE)}`;

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="stok-csv" className="rounded-2xl border border-cizgi bg-kagit p-4">
        <h2 id="stok-csv" className="font-medium">CSV ile toplu güncelle</h2>
        <p className="mt-1 text-[13px] text-antrasit-70">
          Sütunlar: <code>kod</code>, <code>stok</code> (var, az, yok), <code>termin_gun</code> (isteğe bağlı). Excel&apos;in noktalı virgüllü dosyası da olur. Hatalı satırlar satır numarasıyla gösterilir; doğru olanlar tek seferde uygulanır.{" "}
          <a href={template} download="stok-sablonu.csv" className="underline underline-offset-4">
            Şablonu indir
          </a>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className={`${buttonClass.secondary} cursor-pointer`}>
            Dosya seç
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => void readCsv(e.target.files?.[0])} aria-label="Stok CSV dosyası" />
          </label>
          {csv && (
            <>
              <span className="text-[13px] text-antrasit-70">
                {csv.name}: {csv.preview.rows.length} satır uygulanacak{csv.preview.errors.length ? `, ${csv.preview.errors.length} satır hatalı` : ""}.
              </span>
              <button type="button" onClick={applyCsv} disabled={saving || !csv.preview.rows.length} className={buttonClass.primary}>
                {csv.preview.rows.length} satırı uygula
              </button>
            </>
          )}
        </div>
        {(csv?.preview.errors.length || csvResult) && (
          <div className="mt-3 text-[13px]" role="status">
            {csvResult && <p className="mb-1 text-[#35523a]">{csvResult.applied} kumaşın stoğu güncellendi.{csvResult.errors.length ? ` ${csvResult.errors.length} satır uygulanmadı:` : ""}</p>}
            <ul className="max-h-48 overflow-y-auto rounded-lg bg-[#F4E2DE] px-3 py-2 text-[#8a3a30]" aria-label="Hatalı satırlar">
              {(csvResult?.errors ?? csv?.preview.errors ?? []).map((e) => (
                <li key={`${e.line}-${e.code}`}>
                  {e.line}. satır{e.code ? ` (${e.code})` : ""}: {e.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section aria-labelledby="stok-tablo">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 id="stok-tablo" className="sr-only">
            Kumaşların stoğu
          </h2>
          <label className="min-w-0 flex-1 basis-56">
            <span className="sr-only">Kumaş ara</span>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kod, seri ya da renk" className={inputClass} />
          </label>
          <label className="flex items-center gap-2 text-[14px]">
            <input type="checkbox" checked={onlyOut} onChange={(e) => setOnlyOut(e.target.checked)} className="h-4 w-4 accent-[#2a2a28]" />
            Yalnızca stokta olmayanlar
          </label>
          <button type="button" onClick={save} disabled={saving || !changed.length} className={buttonClass.primary}>
            {saving ? "Kaydediliyor…" : `Değişiklikleri kaydet${changed.length ? ` (${changed.length})` : ""}`}
          </button>
        </div>
        {msg && (
          <p role="status" className={`mb-3 rounded-xl px-4 py-3 text-[14px] ${msg.ok ? "bg-[#E8EFE6] text-[#35523a]" : "bg-[#F4E2DE] text-[#8a3a30]"}`}>
            {msg.text}
          </p>
        )}
        <div className="overflow-x-auto rounded-2xl border border-cizgi bg-white">
          <table className="w-full text-[14px]">
            <thead className="border-b border-cizgi text-left text-[12px] text-antrasit-70">
              <tr>
                <th className="px-3 py-2 font-normal">Kumaş</th>
                <th className="px-3 py-2 font-normal">Stok</th>
                <th className="px-3 py-2 font-normal">Termin (gün)</th>
                <th className="px-3 py-2 font-normal">Son değişiklik</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((f) => {
                const e = current(f.code);
                return (
                  <tr key={f.code} className="border-b border-cizgi/60 last:border-0">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={f.thumbUrl} alt="" className="h-8 w-8 rounded-full" />
                        <span>
                          <span className="font-medium">{f.code}</span> <span className="text-antrasit-70">{f.colorName}</span>
                          {!f.isActive && <span className="ml-1 text-[12px] text-antrasit-50">(yayında değil)</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <select value={e.status} onChange={(ev) => edit(f.code, { status: ev.target.value })} className={`${inputClass} h-10 min-w-36`} aria-label={`${f.code} stok durumu`}>
                        <option value="">Girilmedi</option>
                        {STOCK_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STOCK_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        inputMode="numeric"
                        value={e.leadDays}
                        disabled={!e.status}
                        onChange={(ev) => edit(f.code, { leadDays: ev.target.value })}
                        className={`${inputClass} h-10 w-24`}
                        aria-label={`${f.code} termin günü`}
                      />
                    </td>
                    <td className="px-3 py-2 text-[12px] text-antrasit-50">{stock[f.code] ? new Date(stock[f.code].updatedAt).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" }) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!shown.length && <p className="px-3 py-6 text-center text-[14px] text-antrasit-70">Bu aramada kumaş yok.</p>}
        </div>
      </section>
    </div>
  );
}
