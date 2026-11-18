import { describe, expect, it } from "vitest";
import { cleanPin, exitGesture, hashPin, verifyPin, weakPin } from "@/lib/devices/pin";
import { MemoryCentral } from "@/lib/central/memory";

describe("shop PIN", () => {
  it("is 4 to 6 digits and nothing else", () => {
    for (const ok of ["4821", "48213", "482137"]) expect(cleanPin(ok)).toBe(ok);
    for (const bad of ["482", "4821377", "48a1", " 4821", "", null, 4821]) expect(cleanPin(bad)).toBeNull();
  });

  it("refuses the PINs anyone would try first", () => {
    for (const weak of ["0000", "1111", "999999", "1234", "12345", "4321", "987654"]) expect(weakPin(weak), weak).toBe(true);
    for (const fine of ["4821", "1357", "902114"]) expect(weakPin(fine), fine).toBe(false);
  });

  it("stores a salted hash that only the right PIN matches", () => {
    const a = hashPin("4821");
    const b = hashPin("4821");
    expect(a).not.toContain("4821");
    expect(a).not.toBe(b); // salted: the same PIN never hashes the same twice
    expect(verifyPin("4821", a)).toBe(true);
    expect(verifyPin("4822", a)).toBe(false);
    for (const empty of [null, undefined, "", "duz-metin", "scrypt::"]) expect(verifyPin("4821", empty)).toBe(false);
  });

  it("opens on the fifth tap within three seconds, and forgets slow taps", () => {
    let s = { taps: [] as number[], open: false };
    for (const t of [0, 400, 800, 1200]) s = exitGesture(s.taps, t);
    expect(s.open).toBe(false);
    expect(exitGesture(s.taps, 1600).open).toBe(true);
    // four quick taps, a pause, then one more: not five in a row
    s = { taps: [], open: false };
    for (const t of [0, 400, 800, 1200, 5000]) s = exitGesture(s.taps, t);
    expect(s.open).toBe(false);
    expect(s.taps).toEqual([5000]);
  });

  it("is kept per shop in the store", async () => {
    const c = new MemoryCentral();
    expect(await c.checkShopPin("firm-a", "4821")).toBeNull(); // no PIN set yet
    await c.setShopPin("firm-a", "4821");
    expect(await c.checkShopPin("firm-a", "4821")).toBe(true);
    expect(await c.checkShopPin("firm-a", "1357")).toBe(false);
    // another shop's PIN is another matter
    expect(await c.checkShopPin("firm-b", "4821")).toBeNull();
  });
});
