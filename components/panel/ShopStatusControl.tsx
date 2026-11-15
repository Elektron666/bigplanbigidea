"use client";

import { useState, useTransition } from "react";
import { setShopStatusAction } from "@/app/panel/merkez-actions";
import { SHOP_STATUSES, SHOP_STATUS_LABELS, type ShopStatus } from "@/lib/central/shops";

/** A shop's status on the list row; suspending and bringing back is one tap. */
export function ShopStatusControl({ id, name, status }: { id: string; name: string; status: ShopStatus }) {
  const [shown, setShown] = useState(status);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const change = (next: ShopStatus) =>
    start(async () => {
      setError(null);
      const res = await setShopStatusAction(id, next);
      if (res.ok) setShown(next);
      else setError(res.error);
    });
  return (
    <span className="flex flex-wrap items-center justify-end gap-2">
      {error && (
        <span role="alert" className="text-[12px] text-[#9a3b31]">
          {error}
        </span>
      )}
      <select
        aria-label={`${name}: durum`}
        value={shown}
        disabled={pending}
        onChange={(e) => change(e.target.value as ShopStatus)}
        className="h-9 rounded-full border border-cizgi bg-white px-3 text-[13px] text-antrasit focus:border-antrasit-50 focus:outline-none disabled:opacity-50"
      >
        {SHOP_STATUSES.map((s) => (
          <option key={s} value={s}>
            {SHOP_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={pending}
        onClick={() => change(shown === "askida" ? "aktif" : "askida")}
        className="inline-flex h-9 items-center rounded-full border border-cizgi bg-white px-3 text-[13px] text-antrasit transition-colors hover:border-cizgi-koyu disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-antrasit"
      >
        {shown === "askida" ? "Geri aç" : "Askıya al"}
      </button>
    </span>
  );
}
