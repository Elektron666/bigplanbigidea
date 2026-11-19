// The panel's try-on test bench (Showroom package, job 5, "Giydirme testi"):
// the figures at the top of a run, and the field gate. Pure.
//
// The gate (Fatih Bey): at least 16 of 20 sofas with a result that can be
// shown. Counted per sofa (photo): a sofa passes when every result of it that
// has been judged was judged "gösterilebilir" (strict: one bad fabric on a
// sofa fails it); a sofa none of whose results is judged yet is not counted.

export type Verdict = "gosterilebilir" | "gosterilemez";
export type ItemStatus = "bekliyor" | "basarili" | "basarisiz" | "zaman-asimi";

export interface TestItem {
  id: string;
  photoPath: string;
  fabricCode: string;
  resultPath: string | null;
  status: ItemStatus;
  ms: number | null;
  costUsd: number | null;
  error: string | null;
  verdict: Verdict | null;
  note: string | null;
}

export const GATE = { sofas: 20, shown: 16 } as const;

export interface RunStats {
  sofas: number;
  items: number;
  done: number;
  ok: number;
  failed: number;
  judged: number;
  shown: number;
  /** shown / judged, 0–1; null before anything is judged */
  ratio: number | null;
  /** average time of the pictures made, ms */
  avgMs: number | null;
  costUsd: number;
  sofasJudged: number;
  sofasShown: number;
  /** null until GATE.sofas sofas are judged */
  gate: "gecti" | "kaldi" | null;
}

export function runStats(items: TestItem[]): RunStats {
  const done = items.filter((i) => i.status !== "bekliyor");
  const ok = done.filter((i) => i.status === "basarili");
  const judged = items.filter((i) => i.verdict);
  const shown = judged.filter((i) => i.verdict === "gosterilebilir");
  const bySofa = new Map<string, TestItem[]>();
  for (const i of items) bySofa.set(i.photoPath, [...(bySofa.get(i.photoPath) ?? []), i]);
  let sofasJudged = 0;
  let sofasShown = 0;
  for (const list of bySofa.values()) {
    const j = list.filter((i) => i.verdict);
    if (!j.length) continue;
    sofasJudged++;
    if (j.every((i) => i.verdict === "gosterilebilir")) sofasShown++;
  }
  const ms = ok.map((i) => i.ms ?? 0);
  return {
    sofas: bySofa.size,
    items: items.length,
    done: done.length,
    ok: ok.length,
    failed: done.length - ok.length,
    judged: judged.length,
    shown: shown.length,
    ratio: judged.length ? shown.length / judged.length : null,
    avgMs: ms.length ? Math.round(ms.reduce((a, b) => a + b, 0) / ms.length) : null,
    costUsd: Math.round(items.reduce((s, i) => s + (i.costUsd ?? 0), 0) * 10_000) / 10_000,
    sofasJudged,
    sofasShown,
    // 16 of 20, or the same share of a bigger set
    gate: sofasJudged < GATE.sofas ? null : sofasShown / sofasJudged >= GATE.shown / GATE.sofas ? "gecti" : "kaldi",
  };
}
