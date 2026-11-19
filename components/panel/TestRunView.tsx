"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { runTestBatchAction, setVerdictAction } from "@/app/panel/giydirme-actions";
import type { TestRun } from "@/lib/giydirme/store";
import { GATE, type RunStats, type TestItem } from "@/lib/giydirme/test-tezgahi";
import { Badge, buttonClass, inputClass } from "./ui";

const usd = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 });
const pct = (r: number | null) => (r === null ? "—" : `%${Math.round(r * 100)}`);
const sec = (ms: number | null) => (ms === null ? "—" : `${(ms / 1000).toFixed(1).replace(".", ",")} sn`);
const img = (path: string) => `/api/panel/giydirme/dosya?yol=${encodeURIComponent(path)}`;

function Verdict({ item }: { item: TestItem }) {
  const router = useRouter();
  const [note, setNote] = useState(item.note ?? "");
  const [pending, start] = useTransition();
  const save = (verdict: TestItem["verdict"], n = note) =>
    start(async () => {
      await setVerdictAction(item.id, verdict, n);
      router.refresh();
    });
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2" role="group" aria-label={`${item.fabricCode} için karar`}>
        {(["gosterilebilir", "gosterilemez"] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={item.verdict === v}
            disabled={pending}
            onClick={() => save(item.verdict === v ? null : v)}
            className={`min-h-10 rounded-full border px-4 text-[13px] ${item.verdict === v ? (v === "gosterilebilir" ? "border-[#35523a] bg-[#E8EFE6] text-[#2f4a34]" : "border-[#9a3b31] bg-[#fbeeec] text-[#7a2f27]") : "border-cizgi bg-white"}`}
          >
            {v === "gosterilebilir" ? "Gösterilebilir" : "Gösterilemez"}
          </button>
        ))}
      </div>
      <input className={inputClass} value={note} maxLength={300} placeholder="Not (desen ölçeği, ayaklar…)" aria-label={`${item.fabricCode} notu`} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== (item.note ?? "") && save(item.verdict, note)} />
    </div>
  );
}

export function TestRunView({ run, stats }: { run: TestRun; stats: RunStats }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const photos = [...new Set(run.items.map((i) => i.photoPath))];

  const upload = async (files: FileList) => {
    setError(null);
    let n = 0;
    for (const f of Array.from(files)) {
      setBusy(`Yükleniyor ${++n}/${files.length}…`);
      const res = await fetch(`/api/panel/giydirme/foto?kosu=${run.id}`, { method: "POST", headers: { "content-type": f.type || "image/jpeg" }, body: f }).catch(() => null);
      if (!res?.ok) setError(((await res?.json().catch(() => null)) as { error?: string } | null)?.error ?? `${f.name} yüklenemedi.`);
    }
    setBusy(null);
    router.refresh();
  };

  const runAll = async () => {
    setError(null);
    let left = stats.items - stats.done;
    while (left > 0) {
      setBusy(`Çalışıyor: ${stats.items - left}/${stats.items}`);
      const r = await runTestBatchAction(run.id);
      if (!r.ok) {
        setError(r.error);
        break;
      }
      left = r.left;
      router.refresh();
    }
    setBusy(null);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="test-ozet">
        {[
          ["Gösterilebilir oranı", pct(stats.ratio), `${stats.shown} / ${stats.judged} işaretlenen görsel`],
          ["Koltuk şartı", `${stats.sofasShown} / ${stats.sofasJudged}`, stats.gate === null ? `en az ${GATE.sofas} koltuk işaretlenince karar çıkar` : stats.gate === "gecti" ? `şart sağlandı (en az ${GATE.shown}/${GATE.sofas})` : `şart sağlanmadı (en az ${GATE.shown}/${GATE.sofas})`],
          ["Ortalama süre", sec(stats.avgMs), `${stats.ok} başarılı · ${stats.failed} başarısız`],
          ["Toplam maliyet", usd.format(stats.costUsd), `${stats.done}/${stats.items} görsel yapıldı`],
        ].map(([t, v, n]) => (
          <div key={t} className="rounded-2xl border border-cizgi bg-kagit p-5">
            <dt className="eyebrow">{t}</dt>
            <dd className="mt-2 font-display text-[32px] leading-none">{v}</dd>
            <dd className="mt-2 text-[13px] text-antrasit-50">{n}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center gap-3">
        <label className={`${buttonClass.secondary} cursor-pointer`}>
          <input type="file" accept="image/*" multiple className="sr-only" disabled={!!busy} onChange={(e) => e.target.files?.length && void upload(e.target.files)} aria-label="Fotoğraf ekle" />
          Fotoğraf ekle ({photos.length} koltuk)
        </label>
        <button type="button" disabled={!!busy || stats.done === stats.items} onClick={() => void runAll()} className={buttonClass.primary}>
          {stats.done === stats.items && stats.items ? "Hepsi yapıldı" : `Çalıştır (${stats.items - stats.done} görsel)`}
        </button>
        {busy && (
          <p role="status" className="text-[14px] text-antrasit-70">
            {busy}
          </p>
        )}
        {error && (
          <p role="alert" className="text-[14px] text-[#9a3b31]">
            {error}
          </p>
        )}
      </div>

      <ol className="flex flex-col gap-4" aria-label="Koltuklar">
        {photos.map((p, n) => (
          <li key={p} className="rounded-2xl border border-cizgi bg-kagit p-4" aria-label={`${n + 1}. koltuk`}>
            <div className="grid gap-4 md:grid-cols-[200px_1fr]">
              {/* eslint-disable-next-line @next/next/no-img-element -- private test photos */}
              <img src={img(p)} alt={`${n + 1}. koltuk, özgün fotoğraf`} className="w-full rounded-xl" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {run.items
                  .filter((i) => i.photoPath === p)
                  .map((i) => (
                    <div key={i.id} className="flex flex-col gap-2" data-testid="test-sonuc">
                      <p className="text-[14px] font-medium">
                        {i.fabricCode} {i.status !== "basarili" && i.status !== "bekliyor" && <Badge tone="warn">{i.status === "zaman-asimi" ? "zaman aşımı" : "başarısız"}</Badge>}
                      </p>
                      {i.resultPath ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img(i.resultPath)} alt={`${n + 1}. koltuk, ${i.fabricCode}`} className="w-full rounded-xl" />
                      ) : (
                        <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-cizgi/40 text-[13px] text-antrasit-50">{i.status === "bekliyor" ? "bekliyor" : (i.error ?? "yok")}</div>
                      )}
                      {i.status === "basarili" && <p className="text-[12px] text-antrasit-50">{sec(i.ms)} · {usd.format(i.costUsd ?? 0)}</p>}
                      {i.status === "basarili" && <Verdict item={i} />}
                    </div>
                  ))}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
