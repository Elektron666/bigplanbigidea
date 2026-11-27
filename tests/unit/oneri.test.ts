import { describe, expect, it } from "vitest";
import { suggestLayouts, type PieceIn } from "@/lib/oda/oneri";
import { doorZone, gapCm, type Fixture } from "@/lib/oda/plan";
import { footprintParts, type Footprint } from "@/lib/room/layout";
import type { RoomSpec } from "@/lib/room/spec";

// Job 14: three layouts by rule. None puts a thing on another, none closes the
// door or the window, none goes below the clearance; each is told apart by
// the wall the main piece stands on; they come within 3 seconds.

const ROOM: RoomSpec = { shape: "dikdortgen", widthCm: 400, depthCm: 500, heightCm: 270, wallId: "kirik-beyaz", floorId: "acik-mese" };
const door: Fixture = { id: "k", kind: "kapi", wall: "sol", offsetCm: 390, widthCm: 90, depthCm: 0 };
const win: Fixture = { id: "p", kind: "pencere", wall: "arka", offsetCm: 125, widthCm: 150, depthCm: 0 };
const piece = (id: string, w: number, d: number): PieceIn => ({ id, modelSlug: id, fabricCode: "LUMA-02", name: id, dims: { w, d } });
const overlap = (a: Footprint, b: Footprint) => a.minX < b.maxX - 0.005 && a.maxX > b.minX + 0.005 && a.minZ < b.maxZ - 0.005 && a.maxZ > b.minZ + 0.005;

describe("layout suggestions", () => {
  const pieces = [piece("Lara Üçlü", 220, 95), piece("Berjer", 85, 85), piece("Puf", 60, 60)];

  it("gives three layouts, each with the main piece on another wall, within 3 s", () => {
    const t0 = performance.now();
    const r = suggestLayouts(ROOM, pieces, [door, win], [], 60);
    expect(performance.now() - t0).toBeLessThan(3000);
    expect(r.suggestions).toHaveLength(3);
    const mainRots = r.suggestions.map((s) => s.placements.find((p) => p.modelSlug === "Lara Üçlü")!.rot);
    expect(new Set(mainRots).size).toBe(3);
    // the window is on the back wall: the first faces it from the front wall
    expect(r.suggestions[0].title).toBe("Ön duvarda, pencereye dönük");
  });

  it("never puts things on each other, never in front of the door or the window, never below the clearance", () => {
    const r = suggestLayouts(ROOM, pieces, [door, win], [], 60);
    const keep = [doorZone(ROOM, door, 60), doorZone(ROOM, { ...win, widthCm: 60 }, 60)];
    for (const s of r.suggestions) {
      expect(s.missing).toEqual([]);
      const rects = s.placements.map((p) => footprintParts(p, pieces.find((x) => x.modelSlug === p.modelSlug)!.dims));
      for (let i = 0; i < rects.length; i++) {
        for (const r1 of rects[i]) for (const z of keep) expect(overlap(r1, z)).toBe(false);
        for (let j = i + 1; j < rects.length; j++) for (const a of rects[i]) for (const b of rects[j]) expect(gapCm(a, b)).toBeGreaterThanOrEqual(60);
      }
    }
  });

  it("says in plain words what does not fit, with a smaller one of the shop's", () => {
    const small: RoomSpec = { ...ROOM, widthCm: 250, depthCm: 250 };
    const r = suggestLayouts(small, [piece("Köşe Takımı", 290, 190)], [], [], 60, () => "Lara Üçlü (220 cm)");
    expect(r.suggestions).toEqual([]);
    expect(r.note).toBe("Köşe Takımı bu odada kapıları ve geçişi kapatmadan hiçbir duvara sığmıyor. Daha küçük: Lara Üçlü (220 cm).");
  });
});
