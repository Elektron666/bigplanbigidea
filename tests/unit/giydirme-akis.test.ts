import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { privateFiles } from "@/lib/giydirme/dosyalar";
import { getGiydirme } from "@/lib/giydirme/store";
import { endSession, makeTries, sweepSessions } from "@/lib/giydirme/uret";
import type { GiydirmeProvider } from "@/lib/giydirme/saglayici";
import type { Fabric } from "@/lib/types";

const fabric = (code: string) =>
  ({ code, series: "MISSO", colorName: "Gri", type: "jakar", texture: { maps: { albedo: { "1k": "/x.jpg", "2k": "/x.jpg" } }, repeatCm: { w: 50, h: 50 }, thumbUrl: "", avgColor: "#999" } }) as unknown as Fabric;
const jpeg = async (w = 600, h = 400) => new Uint8Array(await sharp({ create: { width: w, height: h, channels: 3, background: "#b0aaa0" } }).jpeg().toBuffer());

/** A provider that counts its calls and can fail or be slow per fabric. */
function provider(behaviour: Record<string, "hata" | "yavas"> = {}) {
  const calls: string[] = [];
  const p: GiydirmeProvider = {
    id: "deneme",
    name: "Deneme",
    costPerImageUsd: 0.04,
    async generate({ instruction, signal, photo }) {
      const code = /ORMEN ([A-Z0-9-]+)\)/.exec(instruction)![1];
      calls.push(code);
      if (behaviour[code] === "hata") throw new Error("sağlayıcı hatası");
      if (behaviour[code] === "yavas")
        await new Promise((_, reject) => signal.addEventListener("abort", () => reject(new DOMException("zaman aşımı", "AbortError"))));
      return { image: photo, costUsd: null };
    },
  };
  return { p, calls };
}

const store = getGiydirme();
const files = privateFiles();
let firm = 0;

describe("making try-on pictures", () => {
  let firmId: string;
  beforeEach(() => {
    firmId = `firma-${++firm}`;
  });

  it("makes one labelled picture per fabric, logs each with its cost, and counts them against the quota", async () => {
    const s = await store.createSession(firmId, "cihaz-1");
    const { p } = provider();
    const r = await makeTries({ kind: "giydirme", session: s, quota: 10, photo: await jpeg(), fabrics: [fabric("MISSO-05"), fabric("LUMA-02")], provider: p, origin: "http://x", loadSwatch: () => jpeg(64, 64) });
    expect(r.ok && r.results.map((x) => [x.fabricCode, x.status, x.file])).toEqual([
      ["MISSO-05", "basarili", "sonuc-MISSO-05"],
      ["LUMA-02", "basarili", "sonuc-LUMA-02"],
    ]);
    expect(await files.exists(`oturum/${s.code}/sonuc-MISSO-05.jpg`)).toBe(true);
    expect(await store.countOk(firmId, "2000-01-01")).toBe(2);
    const [u] = (await store.usage("2000-01-01")).filter((x) => x.firmId === firmId);
    // the provider gave no price: its expected price is written
    expect(u).toMatchObject({ ok: 2, failed: 0, refused: 0, costUsd: 0.08 });
  });

  it("calls nobody when the quota is used up or not set, and writes the refusal at no cost", async () => {
    const s = await store.createSession(firmId, null);
    const { p, calls } = provider();
    const one = () => makeTries({ kind: "giydirme", session: s, quota: 1, photo: new Uint8Array(), fabrics: [fabric("MISSO-05")], provider: p, origin: "http://x", loadSwatch: () => jpeg(64, 64) });
    // photo bytes are not needed for a refusal: nothing is made
    const unset = await makeTries({ kind: "giydirme", session: s, quota: null, photo: new Uint8Array(), fabrics: [fabric("MISSO-05")], provider: p, origin: "http://x" });
    expect(unset).toMatchObject({ ok: false, reason: "kota-yok" });
    await store.logCall({ kind: "giydirme", firmId, deviceId: null, provider: "deneme", fabricCode: "X", ms: 1, costUsd: 0.04, status: "basarili" });
    expect(await one()).toEqual({ ok: false, reason: "kota-doldu", error: "Bu ayın fotoğraf denemesi hakkı doldu. Yeni ay başında yenilenir." });
    expect(calls).toEqual([]);
    const [u] = (await store.usage("2000-01-01")).filter((x) => x.firmId === firmId);
    expect(u).toMatchObject({ ok: 1, refused: 2, costUsd: 0.04 });
  });

  it("says plainly when a call fails or takes too long, and does not count it", async () => {
    const s = await store.createSession(firmId, null);
    const { p } = provider({ "HATA-01": "hata", "YAVAS-01": "yavas" });
    const r = await makeTries({ kind: "giydirme", session: s, quota: 5, photo: await jpeg(), fabrics: [fabric("MISSO-05"), fabric("HATA-01"), fabric("YAVAS-01")], provider: p, origin: "http://x", timeoutMs: 50, loadSwatch: () => jpeg(64, 64) });
    if (!r.ok) throw new Error(r.error);
    expect(r.results.map((x) => [x.fabricCode, x.status])).toEqual([
      ["MISSO-05", "basarili"],
      ["HATA-01", "basarisiz"],
      ["YAVAS-01", "zaman-asimi"],
    ]);
    expect(r.results[1].error).toBe("Bu kumaşla fotoğraf hazırlanamadı. Yeniden deneyin; deneme hakkınızdan düşmedi.");
    expect(r.results[2].error).toBe("Hizmet 60 saniyede cevap vermedi. Yeniden deneyin; deneme hakkınızdan düşmedi.");
    expect(await store.countOk(firmId, "2000-01-01")).toBe(1);
  });

  it("refuses more than four fabrics", async () => {
    const s = await store.createSession(firmId, null);
    const r = await makeTries({ kind: "giydirme", session: s, quota: 50, photo: new Uint8Array(), fabrics: ["A", "B", "C", "D", "E"].map((c) => fabric(`${c}-01`)), provider: provider().p, origin: "http://x" });
    expect(r).toEqual({ ok: false, reason: "kumas", error: "1–4 kumaş seçin." });
  });
});

describe("the end of a session", () => {
  it("deletes the photo and the pictures from the server, unless the shop keeps the photo as a product photo", async () => {
    const a = await store.createSession("firma-son", null);
    await files.put(`oturum/${a.code}/foto.jpg`, await jpeg());
    await files.put(`oturum/${a.code}/sonuc-MISSO-05.jpg`, await jpeg());
    await store.setPhoto(a.code, `oturum/${a.code}/foto.jpg`, "ekran");
    expect(await endSession(a.code)).toEqual({ removed: 2, kept: false });
    expect(await files.exists(`oturum/${a.code}/foto.jpg`)).toBe(false);
    expect(await store.getSession(a.code)).toBeNull();
    // twice is harmless
    expect(await endSession(a.code)).toEqual({ removed: 0, kept: false });

    const b = await store.createSession("firma-son", null);
    await files.put(`oturum/${b.code}/foto.jpg`, await jpeg());
    await store.setPhoto(b.code, `oturum/${b.code}/foto.jpg`, "ekran");
    await store.setKeep(b.code, true);
    expect(await endSession(b.code)).toEqual({ removed: 1, kept: true });
    const kept = await store.listFirmPhotos("firma-son");
    expect(kept).toHaveLength(1);
    expect(await files.exists(kept[0].path)).toBe(true);
    expect(kept[0].path.startsWith("magaza/firma-son/")).toBe(true);
  });

  it("sweeps sessions left open past their time (a screen switched off mid-try)", async () => {
    const s = await store.createSession("firma-supur", null);
    await files.put(`oturum/${s.code}/foto.jpg`, await jpeg());
    expect(await sweepSessions(new Date(Date.now() + 3 * 3_600_000))).toBeGreaterThanOrEqual(1);
    expect(await files.exists(`oturum/${s.code}/foto.jpg`)).toBe(false);
  });

  it("lets a phone send one photo per code", async () => {
    const s = await store.createSession("firma-tel", null);
    expect(await store.takePhoneTurn(s.code)).toBe(true);
    expect(await store.takePhoneTurn(s.code)).toBe(false);
  });
});
