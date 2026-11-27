import "server-only";
import sharp from "sharp";
import type { GiydirmeProvider } from "./saglayici";

// The local stand-in provider (development and tests only; see saglayici.ts).
// It washes the photo with the fabric so the whole flow can be tried, and is
// plainly not a real result. It calls nobody and costs nothing.
//
// For tests: GIYDIRME_SAHTE_MS sets how long it "works" (default 1200 ms);
// a fabric code listed in GIYDIRME_SAHTE_HATA fails, to try the error path.

export const sahteProvider: GiydirmeProvider = {
  id: "sahte",
  name: "Deneme sağlayıcı (gerçek değil)",
  costPerImageUsd: 0,
  async generate({ photo, fabricImage, instruction, signal }) {
    const wait = Number(process.env.GIYDIRME_SAHTE_MS ?? 1200);
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(resolve, wait);
      signal.addEventListener("abort", () => {
        clearTimeout(t);
        reject(new DOMException("zaman aşımı", "AbortError"));
      });
    });
    const failing = (process.env.GIYDIRME_SAHTE_HATA ?? "").split(",").filter(Boolean);
    if (failing.some((code) => instruction.includes(`ORMEN ${code})`))) throw new Error("Deneme sağlayıcı bu kumaşta hata verdi (test).");
    const meta = await sharp(photo).metadata();
    const w = meta.width ?? 1024;
    // a square tile, whatever the fabric picture's shape (a tall one would not fit the photo)
    const side = Math.max(64, Math.min(Math.round(w / 6), (meta.height ?? 768) - 1));
    const tile = await sharp(fabricImage).resize(side, side, { fit: "cover" }).toBuffer();
    const washed = await sharp(photo)
      .rotate()
      .composite([{ input: tile, tile: true, blend: "multiply" }])
      .jpeg({ quality: 85 })
      .toBuffer();
    return { image: new Uint8Array(washed), costUsd: 0 };
  },
  // the product picture pasted on the lower middle of the room photo: plainly a stand-in
  async placeInRoom({ room, product, instruction, signal }) {
    const wait = Number(process.env.GIYDIRME_SAHTE_MS ?? 1200);
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(resolve, wait);
      signal.addEventListener("abort", () => {
        clearTimeout(t);
        reject(new DOMException("zaman aşımı", "AbortError"));
      });
    });
    if ((process.env.GIYDIRME_SAHTE_HATA ?? "").split(",").some((c) => c && instruction.includes(c))) throw new Error("Deneme sağlayıcı bu üründe hata verdi (test).");
    const base = await sharp(room).rotate().toBuffer({ resolveWithObject: true });
    const w = Math.round(base.info.width * 0.5);
    const piece = await sharp(product).resize({ width: w, height: Math.round(base.info.height * 0.5), fit: "inside" }).toBuffer({ resolveWithObject: true });
    const out = await sharp(base.data)
      .composite([{ input: piece.data, left: Math.round((base.info.width - piece.info.width) / 2), top: Math.max(0, base.info.height - piece.info.height - Math.round(base.info.height * 0.08)) }])
      .jpeg({ quality: 85 })
      .toBuffer();
    return { image: new Uint8Array(out), costUsd: 0 };
  },
};
