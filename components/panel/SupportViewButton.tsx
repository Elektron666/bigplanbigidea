"use client";

import { useState, useTransition } from "react";
import { openSupportViewAction } from "@/app/panel/merkez-actions";
import { buttonClass } from "./ui";

// "Mağaza gibi görüntüle" (yönetici only): opens the shop's own panel as the
// shop, read-only, for support. The opening is written to the change log.
export function SupportViewButton({ firmId }: { firmId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <button
        type="button"
        disabled={pending}
        className={buttonClass.secondary}
        onClick={() =>
          start(async () => {
            setError(null);
            // on success the action moves to /magaza; it only comes back with an error
            const r = await openSupportViewAction(firmId);
            if (r && !r.ok) setError(r.error);
          })
        }
      >
        Mağaza gibi görüntüle
      </button>
      {error && (
        <p role="alert" className="text-[13px] text-[#9a3b31]">
          {error}
        </p>
      )}
    </>
  );
}
