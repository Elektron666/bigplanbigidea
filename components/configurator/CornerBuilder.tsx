"use client";

import { useRef, useState, type PointerEvent as RPointerEvent } from "react";
import {
  MODULE_TYPE_LABELS,
  layoutRects,
  measures,
  placed,
  problems,
  wallFit,
  type Arrangement,
  type ModuleSet,
  type ModuleType,
} from "@/lib/modul/dizilim";

// "Köşe kurucu" (Showroom package, job 4): a corner set to measure, by touch
// alone. Tap a module in the strip and it snaps into place (a left arm at the
// start, a right arm at the end, seats and corners before the right end);
// drag a module in the row to move it, tap × to take it out. A step that
// would make a set that cannot be built is not taken; the reason is shown.

const STRIP: ModuleType[] = ["kol-sol", "tekli", "kose", "kol-sag", "sezlong-sol", "sezlong-sag"];
const LEFT: ModuleType[] = ["kol-sol", "sezlong-sol"];
const RIGHT: ModuleType[] = ["kol-sag", "sezlong-sag"];
const SHORT: Record<ModuleType, string> = { "kol-sol": "Kol", "kol-sag": "Kol", tekli: "Oturum", kose: "Köşe", "sezlong-sol": "Şezlong", "sezlong-sag": "Şezlong", puf: "Puf" };

const cm = (n: number) => `${Math.round(n)} cm`;

/** Where a tapped module goes: left ends first, right ends last, the rest just before the right end. */
function insert(ids: string[], typeOf: (id: string) => ModuleType | undefined, id: string, type: ModuleType): string[] {
  if (LEFT.includes(type)) return [id, ...ids];
  if (RIGHT.includes(type)) return [...ids, id];
  const last = ids.at(-1);
  return last && RIGHT.includes(typeOf(last)!) ? [...ids.slice(0, -1), id, last] : [...ids, id];
}

export function CornerBuilder({ set, value, onChange, error }: { set: ModuleSet; value: Arrangement; onChange: (a: Arrangement) => void; error?: string | null }) {
  const [walls, setWalls] = useState({ back: "", side: "" });
  const [refused, setRefused] = useState<string | null>(null);
  const typeOf = (id: string) => set.modules.find((m) => m.id === id)?.type;
  const moduleOf = (type: ModuleType) => set.modules.find((m) => m.type === type);
  const m = measures(set, value);
  const list = problems(set, value);
  const seq = placed(set, value);
  const fit = wallFit(m, { backCm: Number(walls.back) || null, sideCm: Number(walls.side) || null });

  // a change is taken only when it leaves no error (warnings are fine: the set is being built)
  const attempt = (next: Arrangement) => {
    const bad = problems(set, next).find((p) => p.level === "hata");
    if (bad) return setRefused(bad.text);
    setRefused(null);
    onChange(next);
  };
  const add = (type: ModuleType) => {
    const mod = moduleOf(type);
    if (!mod) return;
    const ids = value.ids;
    if (LEFT.includes(type) && ids[0] && LEFT.includes(typeOf(ids[0])!)) return setRefused("Sol uçta zaten bir kol ya da şezlong var.");
    if (RIGHT.includes(type) && ids.at(-1) && RIGHT.includes(typeOf(ids.at(-1)!)!)) return setRefused("Sağ uçta zaten bir kol ya da şezlong var.");
    attempt({ ...value, ids: insert(ids, typeOf, mod.id, type) });
  };
  const remove = (i: number) => {
    const ids = value.ids.filter((_, j) => j !== i);
    // taking a module out may leave a gap the rules do not allow; it is taken out anyway, the problems say what to fix
    setRefused(null);
    onChange({ ...value, ids });
  };

  // drag to reorder, by pointer (works with a finger; HTML drag and drop does not on touch screens)
  const row = useRef<HTMLOListElement>(null);
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null);
  const targetAt = (clientX: number) => {
    const chips = Array.from(row.current?.querySelectorAll<HTMLElement>("[data-chip]") ?? []);
    const i = chips.findIndex((c) => {
      const r = c.getBoundingClientRect();
      return clientX < r.left + r.width / 2;
    });
    return i === -1 ? chips.length - 1 : i;
  };
  const onDown = (i: number) => (e: RPointerEvent<HTMLLIElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ from: i, to: i });
  };
  const onMove = (e: RPointerEvent<HTMLLIElement>) => {
    if (drag) setDrag({ ...drag, to: targetAt(e.clientX) });
  };
  const onUp = () => {
    if (!drag) return;
    const { from, to } = drag;
    setDrag(null);
    if (from === to) return;
    const ids = [...value.ids];
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    attempt({ ...value, ids });
  };

  // the top view, drawn to scale
  const rects = layoutRects(set, value);
  const pad = 30;
  const vw = Math.max(m.widthCm, 100) + pad * 2;
  const vh = Math.max(m.depthCm, 100) + pad * 2;

  return (
    <section aria-labelledby="kose-kurucu" className="flex flex-col gap-4" data-testid="kose-kurucu">
      <div className="flex items-center justify-between gap-3">
        <h2 id="kose-kurucu" className="font-display text-[22px]">
          Köşe kurucu
        </h2>
        {set.sample && <span className="rounded-full bg-[#F4E9DD] px-3 py-1 text-[13px] text-ceviz">Örnek set</span>}
      </div>

      {seq.length > 0 ? (
        <svg viewBox={`0 0 ${vw} ${vh}`} className="w-full rounded-xl border border-cizgi bg-white" role="img" aria-label={`Üstten şema: ${cm(m.widthCm)} × ${cm(m.depthCm)}`}>
          <line x1={pad} y1={pad - 12} x2={pad + m.widthCm} y2={pad - 12} stroke="#2a2a28" strokeWidth="1.5" />
          <text x={pad + m.widthCm / 2} y={pad - 17} textAnchor="middle" fontSize="15" fill="#2a2a28">
            {cm(m.backCm)}
          </text>
          {rects.map((r) => (
            <g key={r.index}>
              <rect x={pad + r.x} y={pad + r.z} width={r.w} height={r.d} fill={r.type === "kose" ? "#e6dccd" : "#efe8dd"} stroke="#6b6963" strokeWidth="1.5" />
              <text x={pad + r.x + r.w / 2} y={pad + r.z + r.d / 2 + 5} textAnchor="middle" fontSize="13" fill="#55544f">
                {SHORT[r.type]}
              </text>
            </g>
          ))}
          {m.leftCm > 0 && (
            <text x={pad - 8} y={pad + m.leftCm / 2} textAnchor="middle" fontSize="15" fill="#2a2a28" transform={`rotate(-90 ${pad - 8} ${pad + m.leftCm / 2})`}>
              {cm(m.leftCm)}
            </text>
          )}
          {m.rightCm > 0 && (
            <text x={pad + m.widthCm + 18} y={pad + m.rightCm / 2} textAnchor="middle" fontSize="15" fill="#2a2a28" transform={`rotate(90 ${pad + m.widthCm + 18} ${pad + m.rightCm / 2})`}>
              {cm(m.rightCm)}
            </text>
          )}
        </svg>
      ) : (
        <p className="rounded-xl border border-dashed border-cizgi-koyu p-6 text-center text-[16px] text-antrasit-70">Alttaki şeritten modüllere dokunun; takım burada ve sahnede kurulur.</p>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[16px]" data-testid="kose-olculer">
        <dt className="text-antrasit-70">Arka</dt>
        <dd>{cm(m.backCm)}</dd>
        {m.leftCm > 0 && (
          <>
            <dt className="text-antrasit-70">Sol kol</dt>
            <dd>{cm(m.leftCm)}</dd>
          </>
        )}
        {m.rightCm > 0 && (
          <>
            <dt className="text-antrasit-70">Sağ kol</dt>
            <dd>{cm(m.rightCm)}</dd>
          </>
        )}
        <dt className="text-antrasit-70">Kapladığı alan</dt>
        <dd>
          {cm(m.widthCm)} × {cm(m.depthCm)}
        </dd>
      </dl>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-[14px] text-antrasit-70">
          Arka duvar (cm)
          <input value={walls.back} onChange={(e) => setWalls({ ...walls, back: e.target.value.replace(/\D/g, "").slice(0, 4) })} inputMode="numeric" className="h-14 rounded-xl border border-cizgi bg-white px-4 text-[18px] text-antrasit" />
        </label>
        <label className="flex flex-col gap-1.5 text-[14px] text-antrasit-70">
          Yan duvar (cm)
          <input value={walls.side} onChange={(e) => setWalls({ ...walls, side: e.target.value.replace(/\D/g, "").slice(0, 4) })} inputMode="numeric" className="h-14 rounded-xl border border-cizgi bg-white px-4 text-[18px] text-antrasit" />
        </label>
      </div>
      {fit.fits !== null && (
        <p role="status" data-testid="duvar" className={`rounded-xl px-4 py-3 text-[17px] ${fit.fits ? "bg-[#E8EFE6] text-[#2f4a34]" : "bg-[#fbeeec] text-[#7a2f27]"}`}>
          {fit.fits
            ? "Duvarlara sığıyor."
            : [fit.overBackCm ? `Arka duvardan ${cm(fit.overBackCm)} taşıyor` : "", fit.overSideCm ? `yan duvardan ${cm(fit.overSideCm)} taşıyor` : ""].filter(Boolean).join(", ") + "."}
        </p>
      )}

      {(refused || error) && (
        <p role="alert" className="rounded-xl bg-[#fbeeec] px-4 py-3 text-[16px] text-[#7a2f27]">
          {refused ?? error}
        </p>
      )}
      {list.length > 0 && !refused && (
        <ul className="flex flex-col gap-1 text-[15px]">
          {list.map((p) => (
            <li key={p.text} className={p.level === "hata" ? "text-[#9a3b31]" : "text-antrasit-70"}>
              {p.text}
            </li>
          ))}
        </ul>
      )}

      {value.ids.length > 0 && (
        <ol ref={row} aria-label="Takımdaki modüller (sürükleyerek sırasını değiştirin)" className="flex flex-wrap gap-2 [touch-action:none]">
          {value.ids.map((id, i) => {
            const type = typeOf(id)!;
            const moving = drag?.from === i;
            const gapBefore = drag && drag.to === i && drag.from > i;
            const gapAfter = drag && drag.to === i && drag.from < i;
            return (
              <li
                key={`${id}-${i}`}
                data-chip
                onPointerDown={onDown(i)}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={() => setDrag(null)}
                className={`flex h-14 cursor-grab select-none items-center gap-1 rounded-xl border bg-white pl-4 pr-1 text-[16px] ${moving ? "border-antrasit opacity-60" : "border-cizgi"} ${gapBefore ? "ml-6" : ""} ${gapAfter ? "mr-6" : ""}`}
              >
                <span>{MODULE_TYPE_LABELS[type]}</span>
                <button type="button" onClick={() => remove(i)} aria-label={`${i + 1}. modülü (${MODULE_TYPE_LABELS[type]}) çıkar`} className="flex h-12 w-12 items-center justify-center rounded-full text-[22px] text-antrasit-70 hover:bg-cizgi/60">
                  ×
                </button>
              </li>
            );
          })}
        </ol>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onChange({ ...value, mirrored: !value.mirrored })} disabled={!value.ids.length} className="h-14 rounded-full border border-cizgi bg-white px-6 text-[16px] disabled:opacity-40">
          Sağ ↔ sol çevir
        </button>
        <button type="button" onClick={() => onChange({ ids: [], mirrored: false })} disabled={!value.ids.length} className="h-14 rounded-full border border-cizgi bg-white px-6 text-[16px] disabled:opacity-40">
          Temizle
        </button>
      </div>

      <div role="group" aria-label="Modül ekle" className="grid grid-cols-3 gap-2 border-t border-cizgi pt-4">
        {STRIP.filter((t) => moduleOf(t)).map((t) => {
          const mod = moduleOf(t)!;
          return (
            <button key={t} type="button" onClick={() => add(t)} className="flex h-20 flex-col items-center justify-center rounded-xl border border-cizgi bg-white px-2 text-[16px] transition-colors active:bg-cizgi/60" aria-label={`${MODULE_TYPE_LABELS[t]} ekle (${mod.widthCm} × ${mod.depthCm} cm)`}>
              <span>+ {MODULE_TYPE_LABELS[t]}</span>
              <span className="text-[13px] text-antrasit-50">
                {mod.widthCm} × {mod.depthCm} cm
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
