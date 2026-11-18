// Corner set builder (Showroom package, job 4, "Köşe kurucu"): modules put
// side by side make a sofa to measure. Pure: the rules, the measurements and
// the metres; the 3D comes from the parametric corner sofa (lib/parametric).
//
// A set is read along the wall, from the front of the left side, back along
// the left wall, across the back wall, and forward along the right wall:
//   [kol-sol, tekli, tekli, kose, tekli, tekli, tekli, kol-sag]
// A corner module turns the run by 90°. Modules before the first corner make
// the left return, those after the last corner the right return (two corners
// make a U), the ones between (or all of them, without a corner) the back run.
// Mirroring turns the whole set left for right: the order of the modules and
// every size stay the same, the left return becomes the right one.

import type { ParametricParams, Uc } from "@/lib/parametric/spec";
import { LIMITS, validateParams } from "@/lib/parametric/spec";

export const MODULE_TYPES = ["kol-sol", "kol-sag", "tekli", "kose", "sezlong-sol", "sezlong-sag", "puf"] as const;
export type ModuleType = (typeof MODULE_TYPES)[number];
export const MODULE_TYPE_LABELS: Record<ModuleType, string> = {
  "kol-sol": "Sol kol",
  "kol-sag": "Sağ kol",
  tekli: "Tekli oturum",
  kose: "Köşe",
  "sezlong-sol": "Sol şezlong",
  "sezlong-sag": "Sağ şezlong",
  puf: "Puf",
};

export interface ModuleMetres {
  zones?: Partial<Record<"govde" | "kol" | "oturak" | "sirt", number>>;
  extra?: { name: string; metres: number }[];
}

export interface Module {
  id: string;
  type: ModuleType;
  name: string;
  /** Along the run, cm (a corner: its side along the back wall). */
  widthCm: number;
  /** Front to back, cm (a corner: its side along the side wall; a chaise: its length). */
  depthCm: number;
  heightCm: number;
  /** The firm's metres for this module at the set's fabric width. */
  metres?: ModuleMetres;
  /** Uploaded module (job 4, second part); the sample set is drawn from code. */
  glbUrl?: string;
}

export interface ModuleSet {
  id: string;
  slug: string;
  name: string;
  /** The fabric width the modules' metres were measured at (ORMEN: 140 cm). */
  refWidthCm: number;
  modules: Module[];
  /** Only for the sample set: shown as such on the screen ("Örnek set"). */
  sample?: boolean;
}

export const MAX_MODULES = 12;

/** The set as built: module ids in order (puf modules stand apart in front), and the side. */
export interface Arrangement {
  ids: string[];
  mirrored: boolean;
}

/**
 * The modules in the order they are built (puf modules stand apart). This is
 * the set as drawn unmirrored; mirroring only swaps left and right in the
 * measures and the drawing, never the order.
 */
export function placed(set: ModuleSet, a: Arrangement): { module: Module; type: ModuleType }[] {
  const byId = new Map(set.modules.map((m) => [m.id, m]));
  return a.ids
    .flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []))
    .filter((m) => m.type !== "puf")
    .map((module) => ({ module, type: module.type }));
}

export interface Problem {
  /** "hata": the set cannot be built this way (it is refused); "uyari": it can, but says what is odd. */
  level: "hata" | "uyari";
  text: string;
}

/** What is wrong with the set as it stands. */
export function problems(set: ModuleSet, a: Arrangement): Problem[] {
  const seq = placed(set, a);
  const out: Problem[] = [];
  if (!seq.length) return [{ level: "uyari", text: "Henüz modül yok. Alttaki şeritten modül ekleyin." }];
  if (seq.length > MAX_MODULES) out.push({ level: "hata", text: `En çok ${MAX_MODULES} modül.` });
  const corners = seq.flatMap((x, i) => (x.type === "kose" ? [i] : []));
  if (corners.length > 2) out.push({ level: "hata", text: "En çok iki köşe olur (U takım)." });
  seq.forEach((x, i) => {
    const first = i === 0;
    const last = i === seq.length - 1;
    if ((x.type === "kol-sol" || x.type === "sezlong-sol") && !first) out.push({ level: "hata", text: `${MODULE_TYPE_LABELS[x.type]} yalnızca dizinin sol ucuna gelir.` });
    if ((x.type === "kol-sag" || x.type === "sezlong-sag") && !last) out.push({ level: "hata", text: `${MODULE_TYPE_LABELS[x.type]} yalnızca dizinin sağ ucuna gelir.` });
    // while the set is being built a corner stands at an end for a moment (the next module comes after it): a warning, not a refusal
    if (x.type === "kose" && first) out.push({ level: "uyari", text: "Köşenin soluna modül ekleyin." });
    if (x.type === "kose" && last) out.push({ level: "uyari", text: "Köşenin sağına modül ekleyin." });
    if (x.type === "kose" && seq[i + 1]?.type === "kose") out.push({ level: "hata", text: "İki köşe yan yana gelemez; arada en az bir modül olmalı." });
  });
  // With a corner the left side is a return (two corners: both sides are), and
  // a chaise cannot stand at the front of a return.
  if (corners.length >= 1 && seq[0].type === "sezlong-sol") out.push({ level: "hata", text: "Şezlong köşeli kolun ucuna gelemez; şezlongu köşesiz uca koyun." });
  if (corners.length === 2 && seq.at(-1)!.type === "sezlong-sag") out.push({ level: "hata", text: "Şezlong köşeli kolun ucuna gelemez; şezlongu köşesiz uca koyun." });
  const startsOpen = !["kol-sol", "sezlong-sol"].includes(seq[0].type);
  const endsOpen = !["kol-sag", "sezlong-sag"].includes(seq.at(-1)!.type);
  if (startsOpen) out.push({ level: "uyari", text: "Sol uç açıkta: bir sol kol ya da sol şezlong ekleyin." });
  if (endsOpen) out.push({ level: "uyari", text: "Sağ uç açıkta: bir sağ kol ya da sağ şezlong ekleyin." });
  if (!out.some((p) => p.level === "hata") && seq.filter((x) => x.type === "tekli").length === 0) out.push({ level: "uyari", text: "Hiç oturum modülü yok." });
  return out;
}

export interface Measures {
  /** Back run, cm (along the back wall). */
  backCm: number;
  /** Left and right returns from the back wall forward, cm; 0 when that side has none. */
  leftCm: number;
  rightCm: number;
  /** The floor the set takes, cm. */
  widthCm: number;
  depthCm: number;
  /** The seat depth of the run (the deepest straight module). */
  seatDepthCm: number;
  heightCm: number;
}

/** Sums of the modules' own sizes, nothing estimated. */
export function measures(set: ModuleSet, a: Arrangement): Measures {
  const seq = placed(set, a);
  const corners = seq.flatMap((x, i) => (x.type === "kose" ? [i] : []));
  const run = (from: number, to: number) => seq.slice(from, to).reduce((s, x) => s + x.module.widthCm, 0);
  const straight = seq.filter((x) => x.type !== "kose" && !x.type.startsWith("sezlong"));
  const seatDepthCm = Math.max(0, ...straight.map((x) => x.module.depthCm), ...seq.filter((x) => x.type === "kose").map((x) => x.module.widthCm));
  const chaise = (x: { type: ModuleType; module: Module } | undefined) => (x && x.type.startsWith("sezlong") ? x.module.depthCm : 0);
  let backCm: number;
  let leftCm = 0;
  let rightCm = 0;
  if (corners.length === 0) {
    backCm = run(0, seq.length);
    leftCm = chaise(seq[0]);
    rightCm = chaise(seq.at(-1));
  } else {
    const c0 = corners[0];
    const c1 = corners.at(-1)!;
    // a corner is square: its width along the back wall, its depth along the side wall
    leftCm = seq[c0].module.depthCm + run(0, c0);
    if (corners.length === 2) {
      backCm = seq[c0].module.widthCm + run(c0 + 1, c1) + seq[c1].module.widthCm;
      rightCm = seq[c1].module.depthCm + run(c1 + 1, seq.length);
    } else {
      backCm = seq[c0].module.widthCm + run(c0 + 1, seq.length);
      rightCm = chaise(seq.at(-1));
    }
  }
  // mirrored: the same set with its sides swapped
  if (a.mirrored) [leftCm, rightCm] = [rightCm, leftCm];
  return {
    backCm,
    leftCm,
    rightCm,
    widthCm: backCm,
    depthCm: Math.max(seatDepthCm, leftCm, rightCm),
    seatDepthCm,
    heightCm: Math.max(0, ...seq.map((x) => x.module.heightCm)),
  };
}

/** Whether the set fits the two walls given (back wall, side wall), and by how much it does not. */
export function wallFit(m: Measures, walls: { backCm: number | null; sideCm: number | null }): { fits: boolean | null; overBackCm: number; overSideCm: number } {
  if (!walls.backCm && !walls.sideCm) return { fits: null, overBackCm: 0, overSideCm: 0 };
  const overBackCm = walls.backCm ? Math.max(0, m.backCm - walls.backCm) : 0;
  const overSideCm = walls.sideCm ? Math.max(0, Math.max(m.leftCm, m.rightCm) - walls.sideCm) : 0;
  return { fits: overBackCm === 0 && overSideCm === 0, overBackCm, overSideCm };
}

/** The set's metres: the sum of its modules' figures, part by part. */
export function setMetres(set: ModuleSet, a: Arrangement): { metres: number; refWidthCm: number; zones?: Partial<Record<"govde" | "kol" | "oturak" | "sirt", number>>; extra?: { name: string; metres: number }[] } | undefined {
  const byId = new Map(set.modules.map((m) => [m.id, m]));
  const mods = a.ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
  if (!mods.length || mods.some((m) => !m.metres)) return undefined;
  const zones: Partial<Record<"govde" | "kol" | "oturak" | "sirt", number>> = {};
  const extra = new Map<string, number>();
  const r = (x: number) => Math.round(x * 1000) / 1000;
  for (const m of mods) {
    for (const [z, v] of Object.entries(m.metres!.zones ?? {})) zones[z as keyof typeof zones] = r((zones[z as keyof typeof zones] ?? 0) + (v ?? 0));
    for (const e of m.metres!.extra ?? []) extra.set(e.name, r((extra.get(e.name) ?? 0) + e.metres));
  }
  const total = r(Object.values(zones).reduce((s, v) => s + (v ?? 0), 0) + [...extra.values()].reduce((s, v) => s + v, 0));
  return { metres: total, refWidthCm: set.refWidthCm, ...(Object.keys(zones).length ? { zones } : {}), ...(extra.size ? { extra: [...extra].map(([name, metres]) => ({ name, metres })) } : {}) };
}

/**
 * The parametric corner sofa that draws the set, or why it cannot be drawn.
 * Its overall sizes are exactly the set's (the drawing's own rules never move them).
 */
export function toParametric(set: ModuleSet, a: Arrangement, style: Pick<ParametricParams, "kol" | "sirt" | "ayak">): { ok: true; params: ParametricParams } | { ok: false; error: string } {
  const bad = problems(set, a).find((p) => p.level === "hata");
  if (bad) return { ok: false, error: bad.text };
  const seq = placed(set, a);
  if (!seq.length) return { ok: false, error: "Henüz modül yok." };
  // a corner at an end has nothing to turn to: the set is drawn once the next module is there
  if (seq[0].type === "kose" || seq.at(-1)!.type === "kose") return { ok: false, error: "Köşe modülünün iki yanında da modül olmalı." };
  const m = measures(set, a);
  const corners = seq.filter((x) => x.type === "kose").length;
  const end = (x: { type: ModuleType } | undefined, side: "sol" | "sag"): Uc => (x?.type === `sezlong-${side}` ? "sezlong" : "kol");
  let solUc: Uc;
  let sagUc: Uc;
  if (corners === 2) [solUc, sagUc] = ["kose", "kose"];
  else if (corners === 1) [solUc, sagUc] = ["kose", end(seq.at(-1), "sag")];
  else [solUc, sagUc] = [end(seq[0], "sol"), end(seq.at(-1), "sag")];
  // measures() has already swapped the lengths for a mirrored set; the ends follow them
  if (a.mirrored) [solUc, sagUc] = [sagUc, solUc];
  const base = { ...style, derinlikCm: m.seatDepthCm, yukseklikCm: m.heightCm || undefined };
  if (solUc === "kol" && sagUc === "kol") {
    // a straight set: the plain sofa of its length
    const tip = (["ikili", "uclu", "dortlu"] as const).find((t) => m.backCm >= LIMITS[t].w[0] && m.backCm <= LIMITS[t].w[1] && seq.filter((x) => x.type === "tekli").length === { ikili: 2, uclu: 3, dortlu: 4 }[t]);
    if (!tip) return { ok: false, error: "Düz takım için 2–4 oturum kullanın ya da bir köşe veya şezlong ekleyin." };
    return { ok: true, params: { ...base, tip, genislikCm: m.backCm } };
  }
  const params: ParametricParams = {
    ...base,
    tip: "kose",
    genislikCm: m.backCm,
    solUc,
    sagUc,
    ...(solUc !== "kol" ? { solBoyCm: m.leftCm } : {}),
    ...(sagUc !== "kol" ? { sagBoyCm: m.rightCm } : {}),
  };
  const errs = validateParams(params);
  const first = Object.values(errs)[0];
  return first ? { ok: false, error: first } : { ok: true, params };
}

/** The set in a link: "set-slug:id.id.id" plus "~a" when mirrored. */
export function encodeArrangement(setSlug: string, a: Arrangement): string {
  return `${setSlug}:${a.ids.join(".")}${a.mirrored ? "~a" : ""}`;
}

export function decodeArrangement(raw: string | null | undefined): { setSlug: string; arrangement: Arrangement } | null {
  const m = /^([a-z0-9-]{2,60}):([a-z0-9-]{1,40}(?:\.[a-z0-9-]{1,40}){0,15})(~a)?$/.exec(raw ?? "");
  if (!m) return null;
  return { setSlug: m[1], arrangement: { ids: m[2].split("."), mirrored: !!m[3] } };
}

/** One module on the floor seen from above, cm; x grows to the right, z towards the front, the back wall at z = 0. */
export interface ModuleRect {
  index: number;
  type: ModuleType;
  x: number;
  z: number;
  w: number;
  d: number;
}

/** Where each module stands, for the top-view diagram. */
export function layoutRects(set: ModuleSet, a: Arrangement): ModuleRect[] {
  const seq = placed(set, a);
  const corners = seq.flatMap((x, i) => (x.type === "kose" ? [i] : []));
  const out: ModuleRect[] = [];
  const back = (from: number, to: number, x0: number) => {
    let x = x0;
    for (let i = from; i < to; i++) {
      const m = seq[i].module;
      out.push({ index: i, type: seq[i].type, x, z: 0, w: m.widthCm, d: m.depthCm });
      x += m.widthCm;
    }
    return x;
  };
  if (!corners.length) back(0, seq.length, 0);
  else {
    const c0 = corners[0];
    const corner0 = seq[c0].module;
    // left return: from the corner forward, the module nearest the corner first
    let z = corner0.depthCm;
    for (let i = c0 - 1; i >= 0; i--) {
      const m = seq[i].module;
      out.push({ index: i, type: seq[i].type, x: 0, z, w: m.depthCm, d: m.widthCm });
      z += m.widthCm;
    }
    out.push({ index: c0, type: "kose", x: 0, z: 0, w: corner0.widthCm, d: corner0.depthCm });
    if (corners.length === 2) {
      const c1 = corners[1];
      const x1 = back(c0 + 1, c1, corner0.widthCm);
      const corner1 = seq[c1].module;
      out.push({ index: c1, type: "kose", x: x1, z: 0, w: corner1.widthCm, d: corner1.depthCm });
      let zr = corner1.depthCm;
      for (let i = c1 + 1; i < seq.length; i++) {
        const m = seq[i].module;
        out.push({ index: i, type: seq[i].type, x: x1 + corner1.widthCm - m.depthCm, z: zr, w: m.depthCm, d: m.widthCm });
        zr += m.widthCm;
      }
    } else back(c0 + 1, seq.length, corner0.widthCm);
  }
  if (!a.mirrored) return out;
  const width = measures(set, a).backCm;
  return out.map((r) => ({ ...r, x: width - r.x - r.w }));
}
