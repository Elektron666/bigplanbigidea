"use client";

import { useState, useTransition } from "react";
import { setFeatureAction } from "@/app/panel/merkez-actions";
import { FEATURE_LABELS, FEATURES, featureOn, type Feature } from "@/lib/central/features";

// The shop's features, one switch each (task section 3). A change reaches the
// shop's page at once and its showroom screens at their next sync.
export function ShopFeatures({ firmId, features }: { firmId: string; features: Record<string, boolean> | undefined }) {
  const [state, setState] = useState<Record<string, boolean>>(() => Object.fromEntries(FEATURES.map((f) => [f, featureOn(features, f)])));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const flip = (f: Feature) =>
    start(async () => {
      const next = !state[f];
      setError(null);
      const r = await setFeatureAction(firmId, f, next);
      if (r.ok) setState((s) => ({ ...s, [f]: next }));
      else setError(r.error);
    });
  return (
    <section aria-labelledby="ozellikler" className="mb-8 rounded-2xl border border-cizgi bg-kagit p-5">
      <h2 id="ozellikler" className="font-display text-[20px]">
        Özellikler
      </h2>
      <p className="mt-1 text-[14px] text-antrasit-70">Bu mağazada açık olanlar. Kapalı bir özellik mağazanın sayfasında ve ekranında görünmez.</p>
      <ul className="mt-3 divide-y divide-cizgi">
        {FEATURES.map((f) => (
          <li key={f} className="flex items-center gap-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{FEATURE_LABELS[f].name}</p>
              <p className="text-[13px] text-antrasit-50">{FEATURE_LABELS[f].hint}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={state[f]}
              aria-label={`${FEATURE_LABELS[f].name} açık`}
              disabled={pending}
              onClick={() => flip(f)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-antrasit ${state[f] ? "bg-antrasit" : "bg-cizgi-koyu"}`}
            >
              <span className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${state[f] ? "translate-x-[22px]" : "translate-x-0.5"}`} />
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-[13px] text-[#9a3b31]">
          {error}
        </p>
      )}
    </section>
  );
}
