"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { undoAuditAction } from "@/app/panel/merkez-actions";

export function UndoButton({ id, summary }: { id: string; summary: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!confirm)
    return (
      <button type="button" onClick={() => setConfirm(true)} className="h-9 rounded-full border border-cizgi bg-white px-3 text-[13px]" aria-label={`Geri al: ${summary}`}>
        Geri al
      </button>
    );
  return (
    <span className="flex items-center gap-1.5">
      {error && <span role="alert" className="text-[12px] text-[#9a3b31]">{error}</span>}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await undoAuditAction(id);
            if (!r.ok) return setError(r.error);
            setConfirm(false);
            router.refresh();
          })
        }
        className="h-9 rounded-full bg-antrasit px-3 text-[13px] text-kagit"
      >
        Evet, geri al
      </button>
      <button type="button" onClick={() => setConfirm(false)} className="h-9 rounded-full px-3 text-[13px] text-antrasit-70">
        Vazgeç
      </button>
    </span>
  );
}
