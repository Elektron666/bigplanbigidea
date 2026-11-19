// What the image model is told (Showroom package, job 5). Pure, so the words
// are tested and the same for every provider. The brief: only the upholstered
// surfaces change; the sofa's form, seams, legs, wood, the floor, the
// background and the light stay as they are. The fabric is described with
// what the panel holds about it (type, colour, pattern repeat), never with
// anything that was not entered.

import type { Fabric } from "@/lib/types";

const TYPE_EN: Record<Fabric["type"], string> = {
  bukle: "bouclé",
  dokuma: "woven",
  nubuk: "nubuck-look",
  kadife: "velvet",
  "keten-gorunumlu": "linen-look",
  jakar: "jacquard",
  sonil: "chenille",
};

export interface FabricBrief {
  code: string;
  type: string;
  colorName: string;
  /** Pattern repeat of a patterned fabric, cm; null when plain or not known. */
  repeatCm: { w: number; h: number } | null;
  /** Real-world size of the reference picture, cm. */
  swatchCm: { w: number; h: number };
}

export function fabricBrief(f: Fabric): FabricBrief {
  return {
    code: f.code,
    type: TYPE_EN[f.type],
    colorName: f.colorName,
    repeatCm: f.pattern === "desenli" && f.patternRepeatCm ? f.patternRepeatCm : null,
    swatchCm: f.texture.repeatCm,
  };
}

/**
 * The instruction sent with the photo and the fabric's reference picture.
 * English: the image models follow it more reliably; the screen is Turkish.
 */
export function instruction(b: FabricBrief): string {
  const scale = b.repeatCm
    ? `The fabric is patterned; one pattern repeat measures ${b.repeatCm.w} × ${b.repeatCm.h} cm on the real fabric. Keep the pattern at that real-world scale relative to the sofa.`
    : `The reference picture shows ${b.swatchCm.w} × ${b.swatchCm.h} cm of the real fabric. Keep its texture at that real-world scale relative to the sofa.`;
  return [
    "Edit the photo: reupholster the sofa or armchair in it with the fabric shown in the second image.",
    `Fabric: ${b.type}, colour "${b.colorName}" (ORMEN ${b.code}).`,
    scale,
    "Change only the upholstered fabric surfaces: seat and back cushions, arms, the upholstered frame and loose cushions on the piece.",
    "Keep exactly as they are: the shape and proportions of the furniture, every seam, piping and stitch line, the legs, any wood or metal, the floor, the walls, the background, every other object, and the lighting, shadows and camera angle.",
    "Do not add, remove or move anything. Do not change the colour of anything that is not the sofa's fabric.",
    "The result must look like a real photograph of the same room.",
  ].join("\n");
}
