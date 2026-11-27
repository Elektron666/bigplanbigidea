import "server-only";
import sharp from "sharp";
import { LABEL_PNG_BASE64, LABEL_SIZE, SALON_LABEL_PNG_BASE64, SALON_LABEL_SIZE } from "./etiket-png";

// Every try-on picture carries its label inside the picture itself (job 5:
// "görsele işlenmiş biçimde … görsel paylaşılsa da etiket üstünde kalır"):
// "Ön izleme · renk ve desen gerçeğinden farklı olabilir", bottom left, over
// a dark strip so it reads on any photo. Also used for the downloaded file.

// job 15 (the customer's room) has its own words: "ölçüler yaklaşıktır"
const LABELS = {
  giydirme: { png: Buffer.from(LABEL_PNG_BASE64, "base64"), size: LABEL_SIZE },
  salon: { png: Buffer.from(SALON_LABEL_PNG_BASE64, "base64"), size: SALON_LABEL_SIZE },
};
export type LabelKind = keyof typeof LABELS;

/** Where the label goes on a picture of this size (px): the same arithmetic the test checks. */
export function labelBox(width: number, height: number, kind: LabelKind = "giydirme"): { left: number; top: number; width: number; height: number } {
  const size = LABELS[kind].size;
  const w = Math.min(Math.round(width * 0.72), size.width * 2);
  const h = Math.round((w / size.width) * size.height);
  const margin = Math.round(width * 0.03);
  return { left: margin, top: Math.max(0, height - h - margin), width: w, height: h };
}

/** The picture with the label burnt in, as JPEG (at most 2048 px on the long side). */
export async function burnLabel(image: Uint8Array, kind: LabelKind = "giydirme"): Promise<{ jpeg: Uint8Array; width: number; height: number }> {
  const base = await sharp(image).rotate().resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true }).toBuffer({ resolveWithObject: true });
  const { width, height } = base.info;
  const box = labelBox(width, height, kind);
  const label = await sharp(LABELS[kind].png).resize(box.width, box.height).toBuffer();
  const out = await sharp(base.data).composite([{ input: label, left: box.left, top: box.top }]).jpeg({ quality: 88 }).toBuffer();
  return { jpeg: new Uint8Array(out), width, height };
}

/** A photo as it is kept: upright, at most 2048 px, JPEG, with its location and camera data left out. */
export async function cleanPhoto(input: Uint8Array): Promise<{ jpeg: Uint8Array; width: number; height: number }> {
  // sharp drops the EXIF block (GPS included) unless asked to keep it
  const out = await sharp(input).rotate().resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer({ resolveWithObject: true });
  return { jpeg: new Uint8Array(out.data), width: out.info.width, height: out.info.height };
}
