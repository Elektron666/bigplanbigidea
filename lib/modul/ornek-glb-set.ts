// The sample GLB module set (Showroom package, job 4, second part): six GLB
// files made by scripts/generate-module-glbs.ts, given to Örnek Mobilya in the
// memory store only (development and tests). It goes through exactly the path
// an uploaded set does: GLB files, sizes, joints from the files' boxes,
// metres. Its metres are made up for testing and are NOT ORMEN's figures.

import type { ModuleSet } from "./dizilim";

export const ORNEK_GLB_SIZES = { kolCm: 22, kolHeightCm: 68, tekliCm: 70, koseCm: 100, sezlongCm: 95, sezlongDepthCm: 165, depthCm: 100, heightCm: 80 } as const;
const S = ORNEK_GLB_SIZES;
const url = (key: string) => `/seed/moduller/${key}.glb`;

export const ORNEK_GLB_SET: ModuleSet = {
  id: "ornek-glb-set",
  slug: "deneme-glb",
  name: "Deneme GLB seti",
  refWidthCm: 140,
  modules: [
    { id: "kol-sol", type: "kol-sol", name: "Sol kol", widthCm: S.kolCm, depthCm: S.depthCm, heightCm: S.kolHeightCm, glbUrl: url("kol-sol"), metres: { zones: { kol: 0.8 } } },
    { id: "tekli", type: "tekli", name: "Oturum 70", widthCm: S.tekliCm, depthCm: S.depthCm, heightCm: S.heightCm, glbUrl: url("tekli"), metres: { zones: { govde: 1.1, oturak: 0.8, sirt: 0.7 } } },
    { id: "kose", type: "kose", name: "Köşe", widthCm: S.koseCm, depthCm: S.koseCm, heightCm: S.heightCm, glbUrl: url("kose"), metres: { zones: { govde: 1.6, oturak: 1.1, sirt: 1.2 } } },
    { id: "kol-sag", type: "kol-sag", name: "Sağ kol", widthCm: S.kolCm, depthCm: S.depthCm, heightCm: S.kolHeightCm, glbUrl: url("kol-sag"), metres: { zones: { kol: 0.8 } } },
    { id: "sezlong-sol", type: "sezlong-sol", name: "Sol şezlong", widthCm: S.sezlongCm, depthCm: S.sezlongDepthCm, heightCm: S.heightCm, glbUrl: url("sezlong-sol"), metres: { zones: { govde: 1.9, kol: 0.5, oturak: 1.5, sirt: 0.6 } } },
    { id: "sezlong-sag", type: "sezlong-sag", name: "Sağ şezlong", widthCm: S.sezlongCm, depthCm: S.sezlongDepthCm, heightCm: S.heightCm, glbUrl: url("sezlong-sag"), metres: { zones: { govde: 1.9, kol: 0.5, oturak: 1.5, sirt: 0.6 } } },
  ],
};
