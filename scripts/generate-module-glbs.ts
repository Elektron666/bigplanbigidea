// Generates the sample GLB module set (Showroom package, job 4): one .glb per
// module, built from the same cushion pieces as the code-built sofas, so the
// upload path (panel → GLB → joints → 3D) can be developed and tested without
// any third-party asset. Code-generated, no licences involved.
//
//   npx tsx scripts/generate-module-glbs.ts
//
// Each model is deliberately centred on its own origin (not at a corner), as
// files from a modeller often are: the joints must line them up anyway.
// Mesh names follow the zone names (govde, kol, oturum, sirt-minder…), so a
// set built from them takes separate fabrics on the cushions like the
// code-built sofas. Units: metres; the model faces +z.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { buildParts, materials, WELT, type Part } from "../lib/three/procedural/furniture";
import { ORNEK_GLB_SIZES as S } from "../lib/modul/ornek-glb-set";

// GLTFExporter reads Blobs through FileReader, which Node does not have.
class NodeFileReader {
  result: ArrayBuffer | string | null = null;
  onloadend: (() => void) | null = null;
  readAsArrayBuffer(b: Blob) {
    void b.arrayBuffer().then((buf) => {
      this.result = buf;
      this.onloadend?.();
    });
  }
  readAsDataURL(b: Blob) {
    void b.arrayBuffer().then((buf) => {
      this.result = `data:${b.type};base64,${Buffer.from(buf).toString("base64")}`;
      this.onloadend?.();
    });
  }
}
(globalThis as unknown as { FileReader: unknown }).FileReader = NodeFileReader;

const LEG = 0.06;
const BASE = 0.22;
const SEAT = 0.15;
const BACK = 0.16;
const H = S.heightCm / 100;
const top = LEG + BASE;

/** A part from its box: x0..x1 across, y0..y1 up, z0..z1 back to front (metres, back-left corner at 0). */
function box(name: string, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, r: number, extra: Partial<Part> = {}): Part {
  // flat frame parts need far fewer points than a stuffed cushion (8 modules must turn smoothly on the light profile)
  const frame = !extra.bulge && !extra.welt && name !== "kol";
  return { name, w: x1 - x0, h: y1 - y0, d: z1 - z0, r, at: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], step: frame ? 0.12 : 0.06, arcSegments: frame ? 3 : 5, ...extra };
}

function legs(w: number, d: number, wood: THREE.Material) {
  const out: THREE.Mesh[] = [];
  for (const [x, z] of [
    [0.05, 0.05],
    [w - 0.05, 0.05],
    [0.05, d - 0.05],
    [w - 0.05, d - 0.05],
  ]) {
    const g = new THREE.CylinderGeometry(0.018, 0.014, LEG, 16);
    const m = new THREE.Mesh(g, wood);
    m.name = "ayak";
    m.position.set(x, LEG / 2, z);
    out.push(m);
  }
  return out;
}

const cushion = { bulge: { y: 0.012 } };
const back = { bulge: { z: 0.015 } };

// the declared height is the true height: the back cushion's top is the module's top (its bulge goes forward, not up)
const BACK_TOP = H;
const FRAME_TOP = H - 0.08;

function seat(w: number, d: number): Part[] {
  return [
    box("govde", 0, w, LEG, top, 0, d, 0.015),
    box("sirt-govde", 0, w, top, FRAME_TOP, 0, BACK, 0.03),
    box("oturum", 0.005, w - 0.005, top, top + SEAT, BACK, d - 0.005, 0.045, { ...cushion, welt: WELT.seat }),
    box("sirt-minder", 0.015, w - 0.015, top + SEAT, BACK_TOP, BACK, BACK + 0.17, 0.06, { ...back, welt: WELT.back }),
  ];
}

function arm(w: number, d: number): Part[] {
  // no outward bulge: the arm's width is the module's width
  return [box("kol", 0, w, LEG, S.kolHeightCm / 100, 0, d, 0.05)];
}

function corner(w: number): Part[] {
  return [
    box("govde", 0, w, LEG, top, 0, w, 0.015),
    box("sirt-govde", 0, w, top, FRAME_TOP, 0, BACK, 0.03),
    box("sirt-govde-yan", 0, BACK, top, FRAME_TOP, BACK, w, 0.03),
    box("oturum", BACK + 0.005, w - 0.005, top, top + SEAT, BACK + 0.005, w - 0.005, 0.045, { ...cushion, welt: WELT.seat }),
    box("sirt-minder", BACK + 0.015, w - 0.015, top + SEAT, BACK_TOP, BACK, BACK + 0.17, 0.06, { ...back, welt: WELT.back }),
    box("sirt-minder-yan", BACK, BACK + 0.17, top + SEAT, BACK_TOP, BACK + 0.17, w - 0.015, 0.06, { bulge: { x: 0.015 } }),
  ];
}

function chaise(w: number, d: number, side: "sol" | "sag"): Part[] {
  const a = 0.18;
  const [x0, x1] = side === "sol" ? [0, a] : [w - a, w];
  const [s0, s1] = side === "sol" ? [a, w - 0.005] : [0.005, w - a];
  return [
    box("govde", 0, w, LEG, top, 0, d, 0.015),
    box("sirt-govde", 0, w, top, FRAME_TOP, 0, BACK, 0.03),
    box("kol", x0, x1, top, top + 0.24, BACK, d, 0.05),
    box("oturum", s0, s1, top, top + SEAT, BACK, d - 0.005, 0.045, { ...cushion, welt: WELT.seat }),
    box("sirt-minder", s0 + 0.01, s1 - 0.01, top + SEAT, BACK_TOP, BACK, BACK + 0.17, 0.06, { ...back, welt: WELT.back }),
  ];
}

async function write(file: string, parts: Part[], w: number, d: number) {
  const { fabric, wood } = materials();
  const group = buildParts(parts, fabric);
  for (const l of legs(w, d, wood)) group.add(l);
  // centred on its own origin, as a modeller's file often is
  group.position.set(-w / 2, 0, -d / 2);
  const root = new THREE.Group();
  root.name = path.basename(file, ".glb");
  root.add(group);
  root.updateMatrixWorld(true);
  const glb = (await new GLTFExporter().parseAsync(root, { binary: true })) as ArrayBuffer;
  writeFileSync(file, Buffer.from(glb));
  console.log(file, `${(glb.byteLength / 1024).toFixed(0)} kB`);
}

async function main() {
  const dir = path.join(process.cwd(), "public/seed/moduller");
  mkdirSync(dir, { recursive: true });
  const m = (cm: number) => cm / 100;
  const D = m(S.depthCm);
  await write(path.join(dir, "kol-sol.glb"), arm(m(S.kolCm), D), m(S.kolCm), D);
  await write(path.join(dir, "kol-sag.glb"), arm(m(S.kolCm), D), m(S.kolCm), D);
  await write(path.join(dir, "tekli.glb"), seat(m(S.tekliCm), D), m(S.tekliCm), D);
  await write(path.join(dir, "kose.glb"), corner(m(S.koseCm)), m(S.koseCm), m(S.koseCm));
  await write(path.join(dir, "sezlong-sol.glb"), chaise(m(S.sezlongCm), m(S.sezlongDepthCm), "sol"), m(S.sezlongCm), m(S.sezlongDepthCm));
  await write(path.join(dir, "sezlong-sag.glb"), chaise(m(S.sezlongCm), m(S.sezlongDepthCm), "sag"), m(S.sezlongCm), m(S.sezlongDepthCm));
}

void main();
