// The sample module set (Showroom package, job 4): simple but tidy, for
// development and tests. Its sizes are believable; its metres are made up for
// testing and are NOT ORMEN's figures: the screen marks it "Örnek set".
// ORMEN uploads the real sets in the panel; they work the same way.

import type { ModuleSet } from "./dizilim";

const H = 82;

export const ORNEK_SET: ModuleSet = {
  id: "ornek-set",
  slug: "ornek-set",
  name: "Örnek modül seti",
  refWidthCm: 140,
  sample: true,
  modules: [
    { id: "kol-sol", type: "kol-sol", name: "Sol kol", widthCm: 25, depthCm: 95, heightCm: H, metres: { zones: { kol: 0.9 } } },
    { id: "kol-sag", type: "kol-sag", name: "Sağ kol", widthCm: 25, depthCm: 95, heightCm: H, metres: { zones: { kol: 0.9 } } },
    { id: "tekli", type: "tekli", name: "Tekli oturum", widthCm: 65, depthCm: 95, heightCm: H, metres: { zones: { govde: 1, oturak: 0.7, sirt: 0.6 } } },
    { id: "kose", type: "kose", name: "Köşe", widthCm: 95, depthCm: 95, heightCm: H, metres: { zones: { govde: 1.5, oturak: 1, sirt: 1.1 } } },
    { id: "sezlong-sol", type: "sezlong-sol", name: "Sol şezlong", widthCm: 90, depthCm: 160, heightCm: H, metres: { zones: { govde: 1.8, oturak: 1.4, sirt: 0.6 } } },
    { id: "sezlong-sag", type: "sezlong-sag", name: "Sağ şezlong", widthCm: 90, depthCm: 160, heightCm: H, metres: { zones: { govde: 1.8, oturak: 1.4, sirt: 0.6 } } },
    { id: "puf", type: "puf", name: "Puf", widthCm: 70, depthCm: 70, heightCm: 44, metres: { zones: { govde: 1.2 } } },
  ],
};
