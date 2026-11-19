import { describe, expect, it } from "vitest";
import { runStats, type TestItem } from "@/lib/giydirme/test-tezgahi";

const item = (photo: number, fabric: string, over: Partial<TestItem> = {}): TestItem => ({
  id: `${photo}-${fabric}`, photoPath: `test/r/foto-${photo}.jpg`, fabricCode: fabric, resultPath: null, status: "basarili", ms: 20_000, costUsd: 0.04, error: null, verdict: null, note: null, ...over,
});

describe("the try-on test bench", () => {
  it("counts pictures, time, cost and the share judged showable", () => {
    const s = runStats([
      item(1, "A", { verdict: "gosterilebilir", ms: 18_000 }),
      item(1, "B", { verdict: "gosterilemez", ms: 22_000 }),
      item(2, "A", { status: "basarisiz", ms: 5000, costUsd: null }),
      item(2, "B", { status: "bekliyor", ms: null, costUsd: null }),
    ]);
    expect(s).toMatchObject({ sofas: 2, items: 4, done: 3, ok: 2, failed: 1, judged: 2, shown: 1, ratio: 0.5, avgMs: 20_000, costUsd: 0.08 });
    // sofa 1 has a bad fabric: it does not pass; sofa 2 is not judged
    expect(s).toMatchObject({ sofasJudged: 1, sofasShown: 0, gate: null });
  });

  it("passes the field gate at 16 of 20 sofas, and not at 15", () => {
    const run = (good: number) =>
      runStats(Array.from({ length: 20 }, (_, i) => item(i, "A", { verdict: i < good ? "gosterilebilir" : "gosterilemez" })));
    expect(run(16)).toMatchObject({ sofasJudged: 20, sofasShown: 16, gate: "gecti", ratio: 0.8 });
    expect(run(15)).toMatchObject({ sofasShown: 15, gate: "kaldi" });
  });
});
