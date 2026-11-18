import { describe, expect, it } from "vitest";
import { attractFabrics, idleState, nextAttract, parseKiosk } from "@/lib/kiosk";

describe("kiosk", () => {
  it("reads the link parameter", () => {
    expect(parseKiosk({})).toBeNull();
    expect(parseKiosk({ kiosk: "" })).toEqual({ idleSeconds: 90 });
    expect(parseKiosk({ kiosk: "1" })).toEqual({ idleSeconds: 90 });
    expect(parseKiosk({ kiosk: "120" })).toEqual({ idleSeconds: 120 });
    expect(parseKiosk({ kiosk: "5000" })).toEqual({ idleSeconds: 600 });
    expect(parseKiosk({ kiosk: ["45", "x"] })).toEqual({ idleSeconds: 45 });
  });
  it("warns in the last 10 seconds, then resets", () => {
    expect(idleState(10_000, 90)).toEqual({ remaining: 80, warn: false, reset: false });
    expect(idleState(81_000, 90)).toEqual({ remaining: 9, warn: true, reset: false });
    expect(idleState(90_000, 90)).toEqual({ remaining: 0, warn: false, reset: true });
  });
});

describe("vitrin döngüsü", () => {
  const f = (code: string, isPlaceholder = false) => ({ code, isPlaceholder });
  it("yalnızca gerçek kumaşlar; ikiden azsa döngü yok", () => {
    expect(attractFabrics([f("A"), f("X", true), f("B")]).map((x) => x.code)).toEqual(["A", "B"]);
    expect(attractFabrics([f("A"), f("X", true)])).toEqual([]);
  });
  it("sıradaki kumaş, sondan başa döner", () => {
    const list = [f("A"), f("B"), f("C")];
    expect(nextAttract(list, "A")?.code).toBe("B");
    expect(nextAttract(list, "C")?.code).toBe("A");
    expect(nextAttract(list, "LUMA-02")?.code).toBe("A");
    expect(nextAttract([], "A")).toBeUndefined();
  });
});

describe("paired showroom screen", () => {
  it("waits 60 s unless the shop was given another time", async () => {
    const { showroomIdleSeconds } = await import("@/lib/kiosk");
    expect(showroomIdleSeconds({})).toBe(60);
    expect(showroomIdleSeconds(null)).toBe(60);
    expect(showroomIdleSeconds({ vitrinSn: 120 })).toBe(120);
    expect(showroomIdleSeconds({ vitrinSn: "45" })).toBe(45);
    // out of range or nonsense falls back to the default
    expect(showroomIdleSeconds({ vitrinSn: 5 })).toBe(60);
    expect(showroomIdleSeconds({ vitrinSn: 5000 })).toBe(60);
    expect(showroomIdleSeconds({ vitrinSn: "uzun" })).toBe(60);
  });
});

describe("showroom loop: models", () => {
  it("turns through the models the shop brought forward, or all of them when none", async () => {
    const { attractModels, nextAttractModel } = await import("@/lib/kiosk");
    const models = [{ slug: "a" }, { slug: "b", featured: true }, { slug: "c" }, { slug: "d", featured: true }];
    expect(attractModels(models).map((m) => m.slug)).toEqual(["b", "d"]);
    expect(attractModels([{ slug: "a" }, { slug: "c" }]).map((m) => m.slug)).toEqual(["a", "c"]);
    expect(nextAttractModel(attractModels(models), "b")?.slug).toBe("d");
    expect(nextAttractModel(attractModels(models), "d")?.slug).toBe("b");
    // the piece on screen is not one of them (a shared link, a preset): start from the first
    expect(nextAttractModel(attractModels(models), "a")?.slug).toBe("b");
  });

  it("changes the model every third fabric, never with a single model", async () => {
    const { attractChangesModel } = await import("@/lib/kiosk");
    expect([1, 2, 3, 4, 5, 6].map((s) => attractChangesModel(s, 2))).toEqual([false, false, true, false, false, true]);
    expect(attractChangesModel(3, 1)).toBe(false);
    expect(attractChangesModel(0, 3)).toBe(false);
  });
});
