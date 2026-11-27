"use client";

import type { Suggestion } from "@/lib/oda/oneri";
import { footprintParts, roomRect, type Dims } from "@/lib/room/layout";
import type { RoomSpec } from "@/lib/room/spec";

// Job 14: the three layouts as small top views, so they are told apart at a
// glance; one tap puts one in the room, to be moved by hand afterwards.

export function LayoutSuggestions({ room, suggestions, note, dimsOf, onPick }: { room: RoomSpec; suggestions: Suggestion[]; note: string | null; dimsOf: (slug: string) => Dims; onPick: (s: Suggestion) => void }) {
  const r = roomRect(room);
  const w = r.maxX - r.minX;
  const d = r.maxZ - r.minZ;
  return (
    <section aria-label="Yerleşim önerileri" className="flex flex-col gap-3">
      {note && (
        <p role="status" className="rounded-lg bg-[#F4E9DD] px-3 py-2 text-[13px] text-ceviz">
          {note}
        </p>
      )}
      <div className="grid grid-cols-3 gap-2">
        {suggestions.map((s, i) => (
          <button key={i} type="button" onClick={() => onPick(s)} className="flex flex-col items-center gap-1.5 rounded-xl border border-cizgi bg-white p-2 text-left hover:border-cizgi-koyu" aria-label={`Öneri ${i + 1}: ${s.title}`} data-testid="yerlesim-onerisi">
            <svg viewBox={`${r.minX - 0.1} ${r.minZ - 0.1} ${w + 0.2} ${d + 0.2}`} className="h-24 w-full" aria-hidden="true">
              <rect x={r.minX} y={r.minZ} width={w} height={d} fill="#f5f1ea" stroke="#2a2a28" strokeWidth={0.04} />
              {s.placements.flatMap((p) =>
                footprintParts(p, dimsOf(p.modelSlug)).map((f, j) => <rect key={`${p.id}-${j}`} x={f.minX} y={f.minZ} width={f.maxX - f.minX} height={f.maxZ - f.minZ} fill={j === 0 && p === s.placements[0] ? "#8b6f55" : "#c4b29b"} />),
              )}
            </svg>
            <span className="text-[12px] leading-tight text-antrasit">{s.title}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
