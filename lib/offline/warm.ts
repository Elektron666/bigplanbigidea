// What a showroom screen keeps on the device so it works without internet
// (Showroom package, job 1): every fabric's textures at the size the screen
// uses, each model file, the floors, the logo and the 3D decoder. Pure.

import type { Fabric, Firm, FurnitureModel, TextureSize } from "@/lib/types";
import { FLOORS } from "@/lib/room/spec";
import { PDF_FONT_FILES } from "@/lib/teklif/sabitler";

export const DRACO_FILES = ["/draco/draco_decoder.js", "/draco/draco_decoder.wasm", "/draco/draco_wasm_wrapper.js"] as const;

export function warmUrls(p: { fabrics: Fabric[]; models: FurnitureModel[]; firm: Firm | null }, size: TextureSize): string[] {
  const out = new Set<string>();
  const add = (u: string | undefined) => {
    if (u) out.add(u);
  };
  for (const f of p.fabrics) {
    add(f.texture.thumbUrl);
    add(f.texture.maps.albedo[size]);
    add(f.texture.maps.normal?.[size]);
    add(f.texture.maps.roughness?.[size]);
  }
  for (const m of p.models) {
    if (m.source.kind === "glb") add(m.source.url);
    add(m.coverUrl);
  }
  for (const fl of FLOORS) for (const u of [fl.albedo, fl.roughness, fl.normal, fl.thumb]) add(u);
  add(p.firm?.logoUrl);
  for (const d of DRACO_FILES) add(d);
  // the quote's PDF is made on the screen, offline too
  for (const f of [...PDF_FONT_FILES.regular, ...PDF_FONT_FILES.bold]) add(f);
  return [...out];
}
