"use client";

import { useState, useTransition } from "react";
import { setOrderStatusAction } from "@/app/panel/merkez-actions";
import { ORDER_STATUS_LABELS, type OrderStatus as Status } from "@/lib/teklif/sabitler";

const STATUSES = Object.keys(ORDER_STATUS_LABELS) as Status[];

export function OrderStatus({ id, status, label }: { id: string; status: Status; label: string }) {
  const [shown, setShown] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <span className="flex items-center gap-2">
      {error && <span role="alert" className="text-[12px] text-[#9a3b31]">{error}</span>}
      <select
        aria-label={`${label}: durum`}
        value={shown}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as Status;
          start(async () => {
            const r = await setOrderStatusAction(id, next);
            if (r.ok) setShown(next);
            else setError(r.error);
          });
        }}
        className="h-9 rounded-full border border-cizgi bg-white px-3 text-[13px]"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {ORDER_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </span>
  );
}
