"use client";

import type { RoomSpec } from "@/lib/room/spec";
import {
  DECOR,
  DECOR_LABELS,
  DECOR_START,
  FIXTURES,
  FIXTURE_LABELS,
  FIXTURE_START,
  WALLS,
  WALL_LABELS,
  wallLength,
  type Decor,
  type Fixture,
  type Wall,
} from "@/lib/oda/plan";

// The room plan by touch (job 9): doors, windows, columns and radiators on
// the walls, and plain decor on the floor. Every size with − / + (10 cm), no
// typing needed.

const STEP = 10;
let seq = 0;
const nextId = (p: string) => `${p}${Date.now().toString(36)}${seq++}`;

function Stepper({ label, value, min, max, onChange, unit = "cm" }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; unit?: string }) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  return (
    <div className="flex flex-col gap-1" role="group" aria-label={label}>
      <span className="text-[12px] text-antrasit-70">{label}</span>
      <span className="flex items-center gap-1">
        <button type="button" onClick={() => onChange(clamp(value - STEP))} disabled={value <= min} aria-label={`${label} azalt`} className="h-11 w-11 rounded-lg border border-cizgi bg-white text-[18px] disabled:opacity-40">
          −
        </button>
        <output className="min-w-16 text-center text-[15px] tabular-nums">
          {value} {unit}
        </output>
        <button type="button" onClick={() => onChange(clamp(value + STEP))} disabled={value >= max} aria-label={`${label} artır`} className="h-11 w-11 rounded-lg border border-cizgi bg-white text-[18px] disabled:opacity-40">
          +
        </button>
      </span>
    </div>
  );
}

export function PlanEditor({ room, fixtures, decor, onFixtures, onDecor }: { room: RoomSpec; fixtures: Fixture[]; decor: Decor[]; onFixtures: (f: Fixture[]) => void; onDecor: (d: Decor[]) => void }) {
  const walls = WALLS.filter((w) => w !== "on" || room.shape === "dikdortgen" || room.shape === "l");
  const addFixture = (kind: Fixture["kind"]) => {
    const s = FIXTURE_START[kind];
    const wall: Wall = "arka";
    onFixtures([...fixtures, { id: nextId("s"), kind, wall, offsetCm: Math.max(0, Math.round((wallLength(room, wall) - s.w) / 2 / STEP) * STEP), widthCm: s.w, depthCm: s.d }]);
  };
  const setFixture = (id: string, patch: Partial<Fixture>) =>
    onFixtures(
      fixtures.map((f) => {
        if (f.id !== id) return f;
        const next = { ...f, ...patch };
        // a fixture stays on its wall
        const len = wallLength(room, next.wall);
        next.widthCm = Math.min(next.widthCm, len);
        next.offsetCm = Math.max(0, Math.min(next.offsetCm, len - next.widthCm));
        return next;
      }),
    );
  const addDecor = (kind: Decor["kind"]) => {
    const s = DECOR_START[kind];
    onDecor([...decor, { id: nextId("d"), kind, x: 0, z: Math.round(room.depthCm / 2 / STEP) * STEP / 100, rot: 0, widthCm: s.w, depthCm: s.d }]);
  };
  const setDecor = (id: string, patch: Partial<Decor>) => onDecor(decor.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const half = room.widthCm / 2;

  return (
    <div className="flex flex-col gap-7">
      <section aria-labelledby="sabitler">
        <h3 id="sabitler" className="eyebrow mb-3">
          Kapı, pencere, kolon, radyatör
        </h3>
        <div className="flex flex-wrap gap-2">
          {FIXTURES.map((k) => (
            <button key={k} type="button" onClick={() => addFixture(k)} className="min-h-11 rounded-full border border-cizgi bg-white px-4 text-[13px]">
              + {FIXTURE_LABELS[k]}
            </button>
          ))}
        </div>
        <ul className="mt-3 flex flex-col gap-3">
          {fixtures.map((f, i) => (
            <li key={f.id} className="rounded-xl border border-cizgi p-3" aria-label={`${FIXTURE_LABELS[f.kind]} ${i + 1}`}>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">{FIXTURE_LABELS[f.kind]}</span>
                <button type="button" onClick={() => onFixtures(fixtures.filter((x) => x.id !== f.id))} className="h-9 rounded-full px-3 text-[12px] text-antrasit-70 hover:text-antrasit">
                  Kaldır
                </button>
              </div>
              <div className="mb-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Duvar">
                {walls.map((w) => (
                  <button key={w} type="button" role="radio" aria-checked={f.wall === w} onClick={() => setFixture(f.id, { wall: w })} className={`min-h-10 rounded-full border px-3 text-[12px] ${f.wall === w ? "border-antrasit bg-antrasit text-kagit" : "border-cizgi bg-white"}`}>
                    {WALL_LABELS[w]}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Stepper label="Duvar başından" value={f.offsetCm} min={0} max={wallLength(room, f.wall) - f.widthCm} onChange={(v) => setFixture(f.id, { offsetCm: v })} />
                <Stepper label="Genişlik" value={f.widthCm} min={20} max={Math.min(600, wallLength(room, f.wall))} onChange={(v) => setFixture(f.id, { widthCm: v })} />
                {(f.kind === "kolon" || f.kind === "radyator") && <Stepper label="Derinlik" value={f.depthCm} min={10} max={200} onChange={(v) => setFixture(f.id, { depthCm: v })} />}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="dekor">
        <h3 id="dekor" className="eyebrow mb-1">
          Dekor
        </h3>
        <p className="mb-3 text-[12px] text-antrasit-50">Genel şekillerdir; satılan ürün değildir.</p>
        <div className="flex flex-wrap gap-2">
          {DECOR.map((k) => (
            <button key={k} type="button" onClick={() => addDecor(k)} className="min-h-11 rounded-full border border-cizgi bg-white px-4 text-[13px]">
              + {DECOR_LABELS[k]}
            </button>
          ))}
        </div>
        <ul className="mt-3 flex flex-col gap-3">
          {decor.map((d, i) => (
            <li key={d.id} className="rounded-xl border border-cizgi p-3" aria-label={`${DECOR_LABELS[d.kind]} ${i + 1}`}>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">{DECOR_LABELS[d.kind]}</span>
                <span className="flex gap-1">
                  <button type="button" onClick={() => setDecor(d.id, { rot: d.rot === 90 ? 0 : 90 })} className="h-9 rounded-full border border-cizgi px-3 text-[12px]">
                    Döndür
                  </button>
                  <button type="button" onClick={() => onDecor(decor.filter((x) => x.id !== d.id))} className="h-9 rounded-full px-3 text-[12px] text-antrasit-70 hover:text-antrasit">
                    Kaldır
                  </button>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Stepper label="Sağa / sola" value={Math.round(d.x * 100)} min={-half} max={half} onChange={(v) => setDecor(d.id, { x: v / 100 })} />
                <Stepper label="Duvardan uzaklık" value={Math.round(d.z * 100)} min={0} max={room.depthCm} onChange={(v) => setDecor(d.id, { z: v / 100 })} />
                <Stepper label="Genişlik" value={d.widthCm} min={20} max={800} onChange={(v) => setDecor(d.id, { widthCm: v })} />
                <Stepper label="Derinlik" value={d.depthCm} min={d.kind === "perde" ? 2 : 20} max={800} onChange={(v) => setDecor(d.id, { depthCm: v })} />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
