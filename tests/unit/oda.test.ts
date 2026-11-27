import { describe, expect, it } from "vitest";
import { clearanceOf, clearanceWarnings, decodePlan, decorRect, doorZone, encodePlan, fixtureRect, gapCm, validateFixture, type Decor, type Fixture } from "@/lib/oda/plan";
import type { RoomSpec } from "@/lib/room/spec";
import { roomRect } from "@/lib/room/layout";

// Job 9: the room plan. A 4 × 5 m room with a door and a window, positions on
// the walls, clearance warnings, the door kept free, the link.

const ROOM: RoomSpec = { shape: "dikdortgen", widthCm: 400, depthCm: 500, heightCm: 270, wallId: "kirik-beyaz", floorId: "acik-mese" };
const door: Fixture = { id: "k", kind: "kapi", wall: "sol", offsetCm: 380, widthCm: 90, depthCm: 0 };
const win: Fixture = { id: "p", kind: "pencere", wall: "arka", offsetCm: 125, widthCm: 150, depthCm: 0 };

describe("room plan", () => {
  it("puts a fixture on its wall at the entered place, in cm", () => {
    const r = roomRect(ROOM);
    // window: 125 cm from the back wall's left end, 150 wide
    expect(fixtureRect(ROOM, win)).toMatchObject({ minX: r.minX + 1.25, maxX: r.minX + 2.75, minZ: 0 });
    // the door on the left wall, 380 cm from the back
    expect(fixtureRect(ROOM, door)).toMatchObject({ minX: r.minX, minZ: 3.8, maxZ: 4.7 });
    expect(validateFixture(ROOM, { ...door, offsetCm: 450 })).toBe("Kapı duvarın dışına taşıyor.");
    expect(validateFixture(ROOM, door)).toBeNull();
  });

  it("keeps the floor in front of a door free: as deep as the door is wide, at least the clearance", () => {
    const z = doorZone(ROOM, door, 60);
    expect(Math.round((z.maxX - z.minX) * 100)).toBe(90);
    expect(Math.round((z.maxZ - z.minZ) * 100)).toBe(90);
    expect(Math.round((doorZone(ROOM, { ...door, widthCm: 50 }, 60).maxX - roomRect(ROOM).minX) * 100)).toBe(60);
  });

  it("measures the gap between two things", () => {
    expect(gapCm({ minX: 0, maxX: 1, minZ: 0, maxZ: 1 }, { minX: 1.45, maxX: 2, minZ: 0, maxZ: 1 })).toBe(45);
    expect(gapCm({ minX: 0, maxX: 1, minZ: 0, maxZ: 1 }, { minX: 0.5, maxX: 2, minZ: 0, maxZ: 1 })).toBe(0);
  });

  it("warns below the clearance, and when a piece stands in front of the door", () => {
    const sofa = { name: "Lara Üçlü", rects: [{ minX: -1.1, maxX: 1.1, minZ: 0.05, maxZ: 1 }], furniture: true };
    const table: Decor = { id: "s", kind: "sehpa", x: 0, z: 1.45, rot: 0, widthCm: 100, depthCm: 60 };
    const things = [sofa, { name: "Sehpa", rects: [decorRect(table)], furniture: false }];
    // the table starts at 1,15 m: 15 cm from the sofa
    expect(clearanceWarnings(ROOM, things, [], 60)).toEqual([{ kind: "gecis", text: "Lara Üçlü ile Sehpa arası 15 cm; geçiş için en az 60 cm önerilir.", names: ["Lara Üçlü", "Sehpa"] }]);
    expect(clearanceWarnings(ROOM, things, [], 10)).toEqual([]);
    // a berjer just inside the door
    const berjer = { name: "Berjer", rects: [{ minX: -1.95, maxX: -1.1, minZ: 3.9, maxZ: 4.75 }], furniture: true };
    expect(clearanceWarnings(ROOM, [berjer], [door], 60)).toEqual([{ kind: "kapi", text: "Kapının önü kapalı: Berjer.", names: ["Berjer"] }]);
    // two decor shapes are not checked against each other
    expect(clearanceWarnings(ROOM, [{ name: "Sehpa", rects: [decorRect(table)], furniture: false }, { name: "TV ünitesi", rects: [{ minX: 0, maxX: 1, minZ: 2.2, maxZ: 2.5 }], furniture: false }], [], 60)).toEqual([]);
  });

  it("takes the shop's clearance, else 60 cm", () => {
    expect(clearanceOf({ gecisCm: 80 })).toBe(80);
    expect(clearanceOf({})).toBe(60);
    expect(clearanceOf({ gecisCm: 5 })).toBe(60);
  });

  it("carries fixtures and decor in the link, and drops what does not fit", () => {
    const decor: Decor[] = [{ id: "a", kind: "hali", x: 0, z: 2.5, rot: 90, widthCm: 200, depthCm: 300 }];
    const s = encodePlan([door, win, { id: "o", kind: "kolon", wall: "sag", offsetCm: 0, widthCm: 40, depthCm: 40 }], decor);
    const back = decodePlan(s, ROOM);
    expect(back.fixtures.map((f) => [f.kind, f.wall, f.offsetCm, f.widthCm, f.depthCm])).toEqual([
      ["kapi", "sol", 380, 90, 0],
      ["pencere", "arka", 125, 150, 0],
      ["kolon", "sag", 0, 40, 40],
    ]);
    expect(back.decor.map((d) => [d.kind, d.x, d.z, d.rot, d.widthCm, d.depthCm])).toEqual([["hali", 0, 2.5, 90, 200, 300]]);
    // a smaller room: the door falls off its wall and is left out
    expect(decodePlan(s, { ...ROOM, depthCm: 300 }).fixtures.map((f) => f.kind)).toEqual(["pencere", "kolon"]);
    expect(decodePlan("x.y.z_", ROOM)).toEqual({ fixtures: [], decor: [] });
  });
});
