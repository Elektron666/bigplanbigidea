"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTestRunAction } from "@/app/panel/giydirme-actions";
import { MAX_FABRICS } from "@/lib/giydirme/kota";
import { Field, buttonClass, inputClass } from "./ui";

// A new test run: a name and up to four fabrics; the photos are added on the run's page.
export function NewTestRun({ fabrics }: { fabrics: { code: string; name: string }[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toggle = (c: string) => setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : p.length >= MAX_FABRICS ? p : [...p, c]));
  return (
    <section aria-labelledby="yeni-kosu" className="rounded-2xl border border-cizgi bg-kagit p-5">
      <h2 id="yeni-kosu" className="font-display text-[20px]">
        Yeni koşu
      </h2>
      <form
        className="mt-3 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            setError(null);
            const r = await createTestRunAction(name, picked);
            if (!r.ok) return setError(r.error);
            router.push(`/panel/giydirme/test/${r.id}`);
          });
        }}
      >
        <Field label="Koşunun adı" className="max-w-md">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Örn. Pilot öncesi, 20 koltuk" />
        </Field>
        <fieldset>
          <legend className="mb-2 text-[13px] text-antrasit-70">
            Kumaşlar (en çok {MAX_FABRICS}; seçili {picked.length})
          </legend>
          <div className="grid max-h-56 gap-1 overflow-y-auto sm:grid-cols-2 lg:grid-cols-4">
            {fabrics.map((f) => (
              <label key={f.code} className="flex min-h-10 items-center gap-2 text-[14px]">
                <input type="checkbox" className="h-5 w-5 accent-antrasit" checked={picked.includes(f.code)} disabled={!picked.includes(f.code) && picked.length >= MAX_FABRICS} onChange={() => toggle(f.code)} />
                {f.name}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className={buttonClass.primary}>
            Koşuyu oluştur
          </button>
          {error && (
            <p role="alert" className="text-[13px] text-[#9a3b31]">
              {error}
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
