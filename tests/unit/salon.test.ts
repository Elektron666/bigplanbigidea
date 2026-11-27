import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { privateFiles } from "@/lib/giydirme/dosyalar";
import { getGiydirme } from "@/lib/giydirme/store";
import { endSession } from "@/lib/giydirme/uret";
import { makeSalon, salonInstruction } from "@/lib/giydirme/salon";
import { labelBox } from "@/lib/giydirme/etiket";
import { sahteProvider } from "@/lib/giydirme/sahte";
import type { GiydirmeProvider } from "@/lib/giydirme/saglayici";

// Job 15: the customer's room. Same quota and log as job 5; a failed picture
// does not count; the label is in the picture; the photo goes with the session.

const jpeg = async (w = 800, h = 600, c = "#d8d2c8") => new Uint8Array(await sharp({ create: { width: w, height: h, channels: 3, background: c } }).jpeg().toBuffer());
const store = getGiydirme();
const files = privateFiles();
const provider = (fail = false): GiydirmeProvider => ({
  ...sahteProvider,
  id: "deneme",
  async placeInRoom({ room }) {
    if (fail) throw new Error("sağlayıcı hatası");
    return { image: room, costUsd: 0.05 };
  },
});

describe("the room preview", () => {
  it("says the product's real size in the instruction", () => {
    expect(salonInstruction({ name: "Lara Üçlü", w: 220, d: 95, h: 85, fabrics: ["Kum bukle (ORMEN LUMA-02)"] })).toContain("Lara Üçlü, 220 cm wide, 95 cm deep, 85 cm high; upholstered in Kum bukle (ORMEN LUMA-02).");
  });

  it("burns the room label into the picture, counts it against the shop's quota, and logs it", async () => {
    const s = await store.createSession("salon-1", "cihaz-1");
    const r = await makeSalon({ session: s, quota: 5, room: await jpeg(), product: await jpeg(200, 150, "#806040"), instruction: "x", provider: provider() });
    expect(r.ok).toBe(true);
    const file = await files.get(`oturum/${s.code}/${(r as { file: string }).file}.jpg`);
    // the label strip is dark where the plain room was light
    const box = labelBox(800, 600, "salon");
    const { data } = await sharp(file!).extract({ left: box.left + 4, top: box.top + 4, width: 6, height: 6 }).raw().toBuffer({ resolveWithObject: true });
    expect(data[0]).toBeLessThan(120);
    expect(await store.countOk("salon-1", "2000-01-01")).toBe(1);
  });

  it("does not count a failed picture, and calls nobody once the quota is used", async () => {
    const s = await store.createSession("salon-2", "cihaz-1");
    const bad = await makeSalon({ session: s, quota: 1, room: await jpeg(), product: await jpeg(), instruction: "x", provider: provider(true) });
    expect(bad).toMatchObject({ ok: false, status: 502 });
    expect(await store.countOk("salon-2", "2000-01-01")).toBe(0);
    expect((await makeSalon({ session: s, quota: 1, room: await jpeg(), product: await jpeg(), instruction: "x", provider: provider() })).ok).toBe(true);
    let called = false;
    const spy: GiydirmeProvider = { ...provider(), async placeInRoom(i) { called = true; return { image: i.room, costUsd: 0 }; } };
    expect(await makeSalon({ session: s, quota: 1, room: await jpeg(), product: await jpeg(), instruction: "x", provider: spy })).toMatchObject({ ok: false, status: 429 });
    expect(called).toBe(false);
  });

  it("deletes the room photo and the picture when the session ends; the room photo cannot be kept", async () => {
    const s = await store.createSession("salon-3", "cihaz-1", "salon");
    await files.put(`oturum/${s.code}/foto.jpg`, await jpeg());
    await store.setPhoto(s.code, `oturum/${s.code}/foto.jpg`, "telefon");
    // even if the keep flag were set somehow, a room photo is not kept
    await store.setKeep(s.code, true);
    const r = await makeSalon({ session: (await store.getSession(s.code))!, quota: 5, room: await jpeg(), product: await jpeg(), instruction: "x", provider: provider() });
    const name = (r as { file: string }).file;
    expect(await files.exists(`oturum/${s.code}/${name}.jpg`)).toBe(true);
    const out = await endSession(s.code);
    expect(out.kept).toBe(false);
    expect(await files.exists(`oturum/${s.code}/foto.jpg`)).toBe(false);
    expect(await files.exists(`oturum/${s.code}/${name}.jpg`)).toBe(false);
  });
});
