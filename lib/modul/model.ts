// A built corner set as a model the configurator can show, share and quote
// (Showroom package, job 4). Pure.
//
// The set travels in links as ?mk=<set>:<modules>[~a] (lib/modul/dizilim.ts);
// on the page it is one more model, at the fixed address "kose-kurucu", with
// the sum of its modules' metres. A set whose modules all have their GLB files
// is drawn from them, each put on its joints (lib/modul/assemble.ts); any
// other set (the sample set, or an uploaded one still missing a file) by the
// parametric corner sofa of the same sizes.

import type { FurnitureModel, SetDiagram } from "@/lib/types";
import { paramDimensions, type ParametricParams } from "@/lib/parametric/spec";
import { FABRIC_MATERIAL } from "@/lib/three/constants";
import { decodeArrangement, encodeArrangement, jointTargets, layoutRects, measures, MODULE_TYPE_LABELS, placed, problems, setMetres, toParametric, type Arrangement, type ModuleSet } from "./dizilim";
import { ORNEK_SET } from "./ornek-set";

export const KURULUM_SLUG = "kose-kurucu";
const STYLE: Pick<ParametricParams, "kol" | "sirt" | "ayak"> = { kol: "kalin", sirt: "orta", ayak: "gizli" };

/** Pages without a shop (and tests) offer the sample set alone. */
export const DEFAULT_SETS: ModuleSet[] = [ORNEK_SET];

/** The set drawn from its modules' GLB files, or null when one of them has none. */
function fromFiles(set: ModuleSet, a: Arrangement): { source: FurnitureModel["source"]; dimensionsCm: FurnitureModel["dimensionsCm"] } | { error: string } | null {
  const seq = placed(set, a);
  if (!seq.length || seq.some((x) => !x.module.glbUrl)) return null;
  const bad = problems(set, a).find((p) => p.level === "hata");
  if (bad) return { error: bad.text };
  // a corner at an end has nothing to turn to: the set is drawn once the next module is there
  if (seq[0].type === "kose" || seq.at(-1)!.type === "kose") return { error: "Köşe modülünün iki yanında da modül olmalı." };
  const m = measures(set, a);
  const parts = jointTargets(set, a).map((j) => ({ url: j.module.glbUrl!, corner: j.corner, target: j.target, ...(j.module.joints ? { joints: j.module.joints } : {}) }));
  // the set's real floor shape for the plan (the space inside the L stays free), centred as the 3D is
  const floor = layoutRects(set, a).map((r) => ({ x0: r.x - m.widthCm / 2, x1: r.x + r.w - m.widthCm / 2, z0: r.z - m.depthCm / 2, z1: r.z + r.d - m.depthCm / 2 }));
  return { source: { kind: "moduller", parts, mirrored: a.mirrored, floor }, dimensionsCm: { w: m.widthCm, d: m.depthCm, h: m.heightCm } };
}

/** The set's top view, as the builder draws it (sizes are the modules' own). */
export function setDiagram(set: ModuleSet, a: Arrangement): SetDiagram {
  const m = measures(set, a);
  const seq = placed(set, a);
  return {
    widthCm: m.widthCm,
    depthCm: m.depthCm,
    backCm: m.backCm,
    leftCm: m.leftCm,
    rightCm: m.rightCm,
    rects: layoutRects(set, a).map((r) => ({ x: r.x, z: r.z, w: r.w, d: r.d, corner: r.type === "kose", label: seq[r.index]?.module.name ?? MODULE_TYPE_LABELS[r.type] })),
  };
}

export function builtModel(set: ModuleSet, a: Arrangement): { ok: true; model: FurnitureModel } | { ok: false; error: string } {
  const files = fromFiles(set, a);
  if (files && "error" in files) return { ok: false, error: files.error };
  let drawing: { source: FurnitureModel["source"]; dimensionsCm: FurnitureModel["dimensionsCm"] };
  if (files) drawing = files;
  else {
    const drawn = toParametric(set, a, STYLE);
    if (!drawn.ok) return drawn;
    drawing = { source: { kind: "parametric", params: drawn.params }, dimensionsCm: paramDimensions(drawn.params) };
  }
  const code = encodeArrangement(set.slug, a);
  const metres = setMetres(set, a);
  return {
    ok: true,
    model: {
      id: `kurulum:${code}`,
      slug: KURULUM_SLUG,
      name: set.sample ? "Köşe takımı (örnek set)" : `Köşe takımı · ${set.name}`,
      firmId: null,
      source: drawing.source,
      // the material the modules dress with fabric (without it the sofa would stay bare grey)
      fabricMaterialNames: [FABRIC_MATERIAL],
      dimensionsCm: drawing.dimensionsCm,
      ...(metres ? { meterage: metres } : {}),
      isActive: true,
      sortOrder: 9999,
      kurulum: code,
      diagram: setDiagram(set, a),
    },
  };
}

/** A set from a link, or null when the link's set is unknown or cannot be built. */
export function modelFromCode(code: string | null | undefined, sets: ModuleSet[] = DEFAULT_SETS): FurnitureModel | null {
  const d = decodeArrangement(code);
  const set = d && sets.find((s) => s.slug === d.setSlug);
  if (!d || !set) return null;
  const r = builtModel(set, d.arrangement);
  return r.ok ? r.model : null;
}

/** The page's models, with the set from the link added when there is one. */
export function withBuiltSet(models: FurnitureModel[], code: string | string[] | null | undefined, sets: ModuleSet[] = DEFAULT_SETS): FurnitureModel[] {
  const m = modelFromCode(Array.isArray(code) ? code[0] : code, sets);
  return m ? [...models.filter((x) => x.slug !== KURULUM_SLUG), m] : models;
}
