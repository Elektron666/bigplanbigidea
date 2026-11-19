import { describe, expect, it } from "vitest";
import { jointTargets, layoutRects, type Arrangement, type ModuleSet } from "@/lib/modul/dizilim";
import { boxJoints, placeOnJoints } from "@/lib/modul/glb";
import { ORNEK_SET } from "@/lib/modul/ornek-set";

// The GLB of every module modelled in its own place (its box from 10 to 10+w
// across and from -40 to -40+d front to back, i.e. not at the origin), as an
// uploaded file would be. Placed on its joints, it must cover exactly the
// module's rectangle on the top-view diagram.

const turn = (p: { x: number; z: number }, t: { yaw: number; x: number; z: number }) => ({
  x: p.x * Math.cos(t.yaw) + p.z * Math.sin(t.yaw) + t.x,
  z: -p.x * Math.sin(t.yaw) + p.z * Math.cos(t.yaw) + t.z,
});
const round = (n: number) => Math.round(n * 1000) / 1000 + 0;

function covered(set: ModuleSet, a: Arrangement) {
  return jointTargets(set, a).map((j) => {
    const m = j.module;
    const box = { minX: 10, maxX: 10 + m.widthCm, minZ: -40, maxZ: -40 + m.depthCm };
    const t = placeOnJoints(boxJoints(box, j.corner), j.target);
    expect(t.gapCm, `${j.index}`).toBe(0);
    const pts = [
      { x: box.minX, z: box.minZ },
      { x: box.maxX, z: box.maxZ },
    ].map((p) => turn(p, t));
    return {
      index: j.index,
      x: round(Math.min(pts[0].x, pts[1].x)),
      z: round(Math.min(pts[0].z, pts[1].z)),
      w: round(Math.abs(pts[0].x - pts[1].x)),
      d: round(Math.abs(pts[0].z - pts[1].z)),
    };
  });
}
const rectsOf = (set: ModuleSet, a: Arrangement) => layoutRects(set, a).map(({ index, x, z, w, d }) => ({ index, x, z, w, d })).sort((p, q) => p.index - q.index);

describe("placing module GLBs on their joints", () => {
  it("puts every module of an L set on its rectangle, whatever the model's own origin", () => {
    const a = { ids: ["kol-sol", "tekli", "kose", "tekli", "tekli", "tekli", "kol-sag"], mirrored: false };
    expect(covered(ORNEK_SET, a)).toEqual(rectsOf(ORNEK_SET, a));
  });

  it("does the same for a U set and a straight set with a chaise", () => {
    for (const ids of [
      ["kol-sol", "tekli", "kose", "tekli", "tekli", "kose", "tekli", "kol-sag"],
      ["sezlong-sol", "tekli", "tekli", "kol-sag"],
    ]) {
      const a = { ids, mirrored: false };
      expect(covered(ORNEK_SET, a), ids.join(".")).toEqual(rectsOf(ORNEK_SET, a));
    }
  });

  it("turns the left return to face the room, and the right return the other way", () => {
    const a = { ids: ["kol-sol", "tekli", "kose", "tekli", "tekli", "kose", "tekli", "kol-sag"], mirrored: false };
    const yaw = jointTargets(ORNEK_SET, a).map((j) => {
      const t = placeOnJoints(boxJoints({ minX: 0, maxX: j.module.widthCm, minZ: 0, maxZ: j.module.depthCm }, j.corner), j.target);
      return Math.round((t.yaw * 180) / Math.PI);
    });
    // left return +90° (front to +x), back run 0°, second corner and right return −90° (front to −x)
    expect(yaw).toEqual([90, 90, 0, 0, 0, -90, -90, -90]);
  });

  it("says how far a model's joints are from the size given in the panel, and does not stretch it", () => {
    const t = placeOnJoints({ sol: { x: 0, z: 0 }, sag: { x: 63, z: 0 } }, { sol: { x: 100, z: 0 }, sag: { x: 165, z: 0 } });
    expect(t).toEqual({ yaw: 0, x: 100, z: 0, gapCm: 2 });
  });
});
