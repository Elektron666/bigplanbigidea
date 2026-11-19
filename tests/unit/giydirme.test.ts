import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { burnLabel, cleanPhoto, labelBox } from "@/lib/giydirme/etiket";
import { monthStartIso, quotaState } from "@/lib/giydirme/kota";
import { fabricBrief, instruction } from "@/lib/giydirme/talimat";
import { sahteProvider } from "@/lib/giydirme/sahte";
import type { Fabric } from "@/lib/types";

const fabric = (over: Partial<Fabric> = {}): Fabric =>
  ({
    id: "1", code: "MISSO-05", series: "MISSO", colorName: "Gri Bej", colorFamily: "gri", type: "jakar", pattern: "desenli", patternRepeatCm: { w: 32, h: 18 },
    isActive: true, isPlaceholder: false, sortOrder: 0,
    texture: { maps: { albedo: { "1k": "/a.jpg", "2k": "/a.jpg" } }, repeatCm: { w: 50, h: 50 }, thumbUrl: "/t.jpg", avgColor: "#999999" },
    ...over,
  }) as Fabric;

/** A plain photo-like picture: a soft grey gradient, w × h. */
async function photo(w = 1200, h = 900) {
  const raw = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw.fill(150 + Math.round((x / w) * 60), (y * w + x) * 3, (y * w + x) * 3 + 3);
  return new Uint8Array(await sharp(raw, { raw: { width: w, height: h, channels: 3 } }).jpeg().toBuffer());
}

describe("what the model is told", () => {
  it("keeps everything but the fabric, and gives the fabric's real type, colour and pattern scale", () => {
    const t = instruction(fabricBrief(fabric()));
    expect(t).toContain("Fabric: jacquard, colour \"Gri Bej\" (ORMEN MISSO-05).");
    expect(t).toContain("one pattern repeat measures 32 × 18 cm");
    expect(t).toContain("Keep exactly as they are: the shape and proportions of the furniture, every seam");
    expect(t).toContain("the legs, any wood or metal, the floor, the walls, the background");
    expect(t).toContain("lighting, shadows and camera angle");
  });

  it("says nothing about a pattern repeat that was not entered", () => {
    const t = instruction(fabricBrief(fabric({ pattern: undefined, patternRepeatCm: undefined, type: "bukle" })));
    expect(t).not.toContain("pattern repeat");
    expect(t).toContain("shows 50 × 50 cm of the real fabric");
    expect(t).toContain("Fabric: bouclé");
  });
});

describe("the monthly quota", () => {
  it("refuses without a number from ORMEN, and when the month's tries are used", () => {
    expect(quotaState(null, 0)).toMatchObject({ allowed: false, reason: "kota-yok" });
    expect(quotaState(40, 40)).toMatchObject({ allowed: false, reason: "kota-doldu", message: "Bu ayın fotoğraf denemesi hakkı doldu. Yeni ay başında yenilenir." });
    expect(quotaState(40, 38, 4)).toEqual({ allowed: false, reason: "kota-doldu", message: "Bu ay 2 deneme hakkı kaldı; daha az kumaş seçin." });
    expect(quotaState(40, 36, 4)).toEqual({ allowed: true, left: 4 });
  });

  it("counts the month in Istanbul", () => {
    // 1 December 01:00 in Istanbul is still 30 November in UTC
    expect(monthStartIso(new Date("2026-11-30T22:00:00Z"))).toBe("2026-11-30T21:00:00.000Z");
    expect(monthStartIso(new Date("2026-11-18T10:00:00Z"))).toBe("2026-10-31T21:00:00.000Z");
  });
});

describe("the label in the picture", () => {
  it("is burnt into the pixels, bottom left, so a downloaded or shared file keeps it", async () => {
    const src = await photo();
    const { jpeg, width, height } = await burnLabel(src);
    expect([width, height]).toEqual([1200, 900]);
    const box = labelBox(width, height);
    // stats() reads the whole input, not the cut: cut first, then measure
    const region = async (img: Uint8Array, r: { left: number; top: number; width: number; height: number }) => (await sharp(await sharp(img).extract(r).toBuffer()).stats()).channels[0];
    const inLabel = { left: box.left + 10, top: box.top + 4, width: box.width - 20, height: box.height - 8 };
    const mean = async (img: Uint8Array) => (await region(img, inLabel)).mean;
    // the strip is dark where the photo was light grey
    expect(await mean(src)).toBeGreaterThan(140);
    expect(await mean(jpeg)).toBeLessThan(110);
    // and the white letters are there: the strip is not one flat colour
    expect((await region(jpeg, inLabel)).max).toBeGreaterThan(200);
    // the rest of the picture is untouched
    const top = async (img: Uint8Array) => (await region(img, { left: 0, top: 0, width, height: 100 })).mean;
    expect(Math.abs((await top(jpeg)) - (await top(src)))).toBeLessThan(2);
  });

  it("keeps the label readable on a narrow phone picture", () => {
    const b = labelBox(720, 1280);
    expect(b.width).toBe(518);
    expect(b.height).toBeGreaterThanOrEqual(38);
    expect(b.top + b.height).toBeLessThanOrEqual(1280);
  });
});

describe("a customer's photo as it is kept", () => {
  it("loses its location and camera data", async () => {
    const withGps = await sharp(await photo(800, 600)).withExif({ IFD0: { Make: "Telefon" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "40/1 11/1 0/1" } }).jpeg().toBuffer();
    expect((await sharp(withGps).metadata()).exif).toBeDefined();
    const kept = await cleanPhoto(new Uint8Array(withGps));
    expect((await sharp(kept.jpeg).metadata()).exif).toBeUndefined();
    expect([kept.width, kept.height]).toEqual([800, 600]);
  });
});

describe("the stand-in provider", () => {
  it("makes a picture without calling anyone, and fails or stops when told to", async () => {
    process.env.GIYDIRME_SAHTE_MS = "10";
    const fab = await photo(64, 64);
    const ok = await sahteProvider.generate({ photo: await photo(), fabricImage: fab, instruction: instruction(fabricBrief(fabric())), signal: new AbortController().signal });
    expect(ok.costUsd).toBe(0);
    expect((await sharp(ok.image).metadata()).width).toBe(1200);
    // a tall fabric picture (as some real ones are) on a small photo
    const tall = await sharp({ create: { width: 300, height: 1400, channels: 3, background: "#806040" } }).jpeg().toBuffer();
    const small = await sahteProvider.generate({ photo: await photo(400, 300), fabricImage: new Uint8Array(tall), instruction: "x", signal: new AbortController().signal });
    expect((await sharp(small.image).metadata()).height).toBe(300);
    process.env.GIYDIRME_SAHTE_HATA = "MISSO-05";
    await expect(sahteProvider.generate({ photo: await photo(), fabricImage: fab, instruction: instruction(fabricBrief(fabric())), signal: new AbortController().signal })).rejects.toThrow();
    delete process.env.GIYDIRME_SAHTE_HATA;
    process.env.GIYDIRME_SAHTE_MS = "5000";
    const ac = new AbortController();
    const slow = sahteProvider.generate({ photo: await photo(), fabricImage: fab, instruction: "x", signal: ac.signal });
    ac.abort();
    await expect(slow).rejects.toThrow("zaman aşımı");
    delete process.env.GIYDIRME_SAHTE_MS;
  });
});
