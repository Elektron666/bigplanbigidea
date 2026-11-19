import "server-only";
import sharp from "sharp";
import { LABEL_PNG_BASE64, LABEL_SIZE } from "./etiket-png";

// Every try-on picture carries its label inside the picture itself (job 5:
// "görsele işlenmiş biçimde … görsel paylaşılsa da etiket üstünde kalır"):
// "Ön izleme · renk ve desen gerçeğinden farklı olabilir", bottom left, over
// a dark strip so it reads on any photo. Also used for the downloaded file.

const LABEL = Buffer.from(LABEL_PNG_BASE64, "base64");

/** Where the label goes on a picture of this size (px): the same arithmetic the test checks. */
export function labelBox(width: number, height: number): { left: number; top: number; width: number; height: number } {
  const w = Math.min(Math.round(width * 0.72), LABEL_SIZE.width * 2);
  const h = Math.round((w / LABEL_SIZE.width) * LABEL_SIZE.height);
  const margin = Math.round(width * 0.03);
  return { left: margin, top: Math.max(0, height - h - margin), width: w, height: h };
}

/** The picture with the label burnt in, as JPEG (at most 2048 px on the long side). */
export async function burnLabel(image: Uint8Array): Promise<{ jpeg: Uint8Array; width: number; height: number }> {
  const base = await sharp(image).rotate().resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true }).toBuffer({ resolveWithObject: true });
  const { width, height } = base.info;
  const box = labelBox(width, height);
  const label = await sharp(LABEL).resize(box.width, box.height).toBuffer();
  const out = await sharp(base.data).composite([{ input: label, left: box.left, top: box.top }]).jpeg({ quality: 88 }).toBuffer();
  return { jpeg: new Uint8Array(out), width, height };
}

/** A photo as it is kept: upright, at most 2048 px, JPEG, with its location and camera data left out. */
export async function cleanPhoto(input: Uint8Array): Promise<{ jpeg: Uint8Array; width: number; height: number }> {
  // sharp drops the EXIF block (GPS included) unless asked to keep it
  const out = await sharp(input).rotate().resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer({ resolveWithObject: true });
  return { jpeg: new Uint8Array(out.data), width: out.info.width, height: out.info.height };
}
