// A built corner set as a model the configurator can show, share and quote
// (Showroom package, job 4). Pure.
//
// The set travels in links as ?mk=<set>:<modules>[~a] (lib/modul/dizilim.ts);
// on the page it is one more model, at the fixed address "kose-kurucu", drawn
// by the parametric corner sofa, with the sum of its modules' metres.

import type { FurnitureModel } from "@/lib/types";
import { paramDimensions, type ParametricParams } from "@/lib/parametric/spec";
import { FABRIC_MATERIAL } from "@/lib/three/constants";
import { decodeArrangement, encodeArrangement, setMetres, toParametric, type Arrangement, type ModuleSet } from "./dizilim";
import { ORNEK_SET } from "./ornek-set";

export const KURULUM_SLUG = "kose-kurucu";
const STYLE: Pick<ParametricParams, "kol" | "sirt" | "ayak"> = { kol: "kalin", sirt: "orta", ayak: "gizli" };

/** The module sets a page offers. Today the sample set; the panel's uploaded sets join it (job 4, second part). */
export function moduleSets(): ModuleSet[] {
  return [ORNEK_SET];
}

export function builtModel(set: ModuleSet, a: Arrangement): { ok: true; model: FurnitureModel } | { ok: false; error: string } {
  const drawn = toParametric(set, a, STYLE);
  if (!drawn.ok) return drawn;
  const code = encodeArrangement(set.slug, a);
  const metres = setMetres(set, a);
  return {
    ok: true,
    model: {
      id: `kurulum:${code}`,
      slug: KURULUM_SLUG,
      name: set.sample ? "Köşe takımı (örnek set)" : `Köşe takımı · ${set.name}`,
      firmId: null,
      source: { kind: "parametric", params: drawn.params },
      // the material code-built models dress with fabric (without it the sofa would stay bare grey)
      fabricMaterialNames: [FABRIC_MATERIAL],
      dimensionsCm: paramDimensions(drawn.params),
      ...(metres ? { meterage: metres } : {}),
      isActive: true,
      sortOrder: 9999,
      kurulum: code,
    },
  };
}

/** A set from a link, or null when the link's set is unknown or cannot be built. */
export function modelFromCode(code: string | null | undefined, sets: ModuleSet[] = moduleSets()): FurnitureModel | null {
  const d = decodeArrangement(code);
  const set = d && sets.find((s) => s.slug === d.setSlug);
  if (!d || !set) return null;
  const r = builtModel(set, d.arrangement);
  return r.ok ? r.model : null;
}

/** The page's models, with the set from the link added when there is one. */
export function withBuiltSet(models: FurnitureModel[], code: string | string[] | null | undefined): FurnitureModel[] {
  const m = modelFromCode(Array.isArray(code) ? code[0] : code);
  return m ? [...models.filter((x) => x.slug !== KURULUM_SLUG), m] : models;
}
