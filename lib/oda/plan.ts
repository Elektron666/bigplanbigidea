// The room plan (Showroom package, job 9, "Oda planı ve Salon Yerleşim
// Projesi"): the fixed things on the walls (door, window, column, radiator),
// simple decor (rug, coffee table, TV unit, curtain) and the clearance check.
// Decor are plain shapes, never shown as products. Sizes are what the seller
// enters by touch; the starting sizes below are only where the steppers start.
// Pure; all measures in cm, positions in the room's metres as lib/room/layout.

import type { RoomSpec } from "@/lib/room/spec";
import { roomRect, type Footprint } from "@/lib/room/layout";

/** The clearance the shop set in the panel (shop record, "Geçiş payı"), else the default 60 cm (task text). */
export const DEFAULT_CLEARANCE_CM = 60;
export function clearanceOf(settings: Record<string, unknown> | null | undefined): number {
  const n = Number(settings?.gecisCm);
  return Number.isInteger(n) && n >= 30 && n <= 200 ? n : DEFAULT_CLEARANCE_CM;
}

export const WALLS = ["arka", "sol", "sag", "on"] as const;
export type Wall = (typeof WALLS)[number];
export const WALL_LABELS: Record<Wall, string> = { arka: "Arka duvar", sol: "Sol duvar", sag: "Sağ duvar", on: "Ön duvar" };

export const FIXTURES = ["kapi", "pencere", "kolon", "radyator"] as const;
export type FixtureKind = (typeof FIXTURES)[number];
export const FIXTURE_LABELS: Record<FixtureKind, string> = { kapi: "Kapı", pencere: "Pencere", kolon: "Kolon", radyator: "Radyatör" };
/** Where the steppers start (the seller sets the real size). */
export const FIXTURE_START: Record<FixtureKind, { w: number; d: number }> = { kapi: { w: 90, d: 0 }, pencere: { w: 150, d: 0 }, kolon: { w: 40, d: 40 }, radyator: { w: 100, d: 12 } };

export interface Fixture {
  id: string;
  kind: FixtureKind;
  wall: Wall;
  /** From the wall's start (left end for back/front, back end for the side walls) to the fixture's start, cm. */
  offsetCm: number;
  widthCm: number;
  /** How far it stands into the room (column, radiator), cm; 0 for a door or window. */
  depthCm: number;
}

export const DECOR = ["hali", "sehpa", "tv", "perde"] as const;
export type DecorKind = (typeof DECOR)[number];
export const DECOR_LABELS: Record<DecorKind, string> = { hali: "Halı", sehpa: "Sehpa", tv: "TV ünitesi", perde: "Perde" };
export const DECOR_START: Record<DecorKind, { w: number; d: number; h: number }> = { hali: { w: 200, d: 300, h: 1 }, sehpa: { w: 100, d: 60, h: 40 }, tv: { w: 180, d: 40, h: 50 }, perde: { w: 200, d: 8, h: 250 } };

export interface Decor {
  id: string;
  kind: DecorKind;
  /** Centre, m (room coordinates). */
  x: number;
  z: number;
  rot: 0 | 90;
  widthCm: number;
  depthCm: number;
}

/** A thing on the floor others must keep clear of (rugs and curtains are not). */
export const blocksWay = (k: DecorKind) => k === "sehpa" || k === "tv";

/** Length of a wall, cm. */
export function wallLength(spec: RoomSpec, wall: Wall): number {
  return wall === "arka" || wall === "on" ? spec.widthCm : spec.depthCm;
}

/** The fixture's place on the floor plan, m: a strip along its wall (depth 0 → 10 cm for drawing). */
export function fixtureRect(spec: RoomSpec, f: Fixture): Footprint {
  const r = roomRect(spec);
  const a = f.offsetCm / 100;
  const w = f.widthCm / 100;
  const d = Math.max(f.depthCm, 0) / 100;
  switch (f.wall) {
    case "arka":
      return { minX: r.minX + a, maxX: r.minX + a + w, minZ: r.minZ, maxZ: r.minZ + d };
    case "on":
      return { minX: r.minX + a, maxX: r.minX + a + w, minZ: r.maxZ - d, maxZ: r.maxZ };
    case "sol":
      return { minX: r.minX, maxX: r.minX + d, minZ: r.minZ + a, maxZ: r.minZ + a + w };
    case "sag":
      return { minX: r.maxX - d, maxX: r.maxX, minZ: r.minZ + a, maxZ: r.minZ + a + w };
  }
}

/** The floor in front of a door that must stay free: the door's width, and as deep as the door is wide (its swing), at least the clearance. */
export function doorZone(spec: RoomSpec, f: Fixture, clearanceCm: number): Footprint {
  const r = fixtureRect(spec, f);
  const deep = Math.max(f.widthCm, clearanceCm) / 100;
  switch (f.wall) {
    case "arka":
      return { ...r, maxZ: r.minZ + deep };
    case "on":
      return { ...r, minZ: r.maxZ - deep };
    case "sol":
      return { ...r, maxX: r.minX + deep };
    case "sag":
      return { ...r, minX: r.maxX - deep };
  }
}

export function decorRect(d: Decor): Footprint {
  const [w, dd] = d.rot === 90 ? [d.depthCm / 100, d.widthCm / 100] : [d.widthCm / 100, d.depthCm / 100];
  return { minX: d.x - w / 2, maxX: d.x + w / 2, minZ: d.z - dd / 2, maxZ: d.z + dd / 2 };
}

/** The checks a fixture must pass: inside its wall, sizes in range. */
export function validateFixture(spec: RoomSpec, f: Fixture): string | null {
  if (!(f.widthCm >= 20 && f.widthCm <= 600)) return "Genişlik 20–600 cm olmalı.";
  if (!(f.depthCm >= 0 && f.depthCm <= 200)) return "Derinlik 0–200 cm olmalı.";
  if (f.offsetCm < 0 || f.offsetCm + f.widthCm > wallLength(spec, f.wall)) return `${FIXTURE_LABELS[f.kind]} duvarın dışına taşıyor.`;
  return null;
}

/** The gap between two rectangles on the floor, cm (0 when they touch or overlap). */
export function gapCm(a: Footprint, b: Footprint): number {
  const dx = Math.max(0, a.minX - b.maxX, b.minX - a.maxX);
  const dz = Math.max(0, a.minZ - b.maxZ, b.minZ - a.maxZ);
  return Math.round(Math.hypot(dx, dz) * 1000) / 10;
}

const overlap = (a: Footprint, b: Footprint) => a.minX < b.maxX - 0.005 && a.maxX > b.minX + 0.005 && a.minZ < b.maxZ - 0.005 && a.maxZ > b.minZ + 0.005;

export interface Thing {
  /** "Lara Üçlü", "Sehpa", "Kolon"… */
  name: string;
  rects: Footprint[];
  /** A piece of furniture (the clearance is checked from these). */
  furniture: boolean;
}

export interface Warning {
  kind: "gecis" | "kapi";
  text: string;
  names: string[];
}

/**
 * Clearance warnings (job 9): between two things where at least one is a
 * piece of furniture, a gap above 0 and below the clearance ("geçiş payı");
 * and any piece of furniture or blocking decor standing in front of a door.
 * Overlaps are not repeated here (the layout already warns about them).
 */
export function clearanceWarnings(spec: RoomSpec, things: Thing[], fixtures: Fixture[], clearanceCm: number): Warning[] {
  const out: Warning[] = [];
  for (let i = 0; i < things.length; i++)
    for (let j = i + 1; j < things.length; j++) {
      const a = things[i];
      const b = things[j];
      if (!a.furniture && !b.furniture) continue;
      const gaps = a.rects.flatMap((x) => b.rects.map((y) => (overlap(x, y) ? 0 : gapCm(x, y))));
      const gap = Math.min(...gaps);
      if (gap > 0 && gap < clearanceCm) out.push({ kind: "gecis", text: `${a.name} ile ${b.name} arası ${Math.round(gap)} cm; geçiş için en az ${clearanceCm} cm önerilir.`, names: [a.name, b.name] });
    }
  for (const f of fixtures.filter((x) => x.kind === "kapi")) {
    const zone = doorZone(spec, f, clearanceCm);
    const blocked = things.filter((t) => t.rects.some((r) => overlap(r, zone)));
    if (blocked.length) out.push({ kind: "kapi", text: `Kapının önü kapalı: ${blocked.map((t) => t.name).join(", ")}.`, names: blocked.map((t) => t.name) });
  }
  return out;
}

/** One letter per kind, for links. */
const F_CODE: Record<FixtureKind, string> = { kapi: "k", pencere: "p", kolon: "o", radyator: "r" };
const D_CODE: Record<DecorKind, string> = { hali: "h", sehpa: "s", tv: "t", perde: "c" };
const F_KIND = Object.fromEntries(Object.entries(F_CODE).map(([k, v]) => [v, k])) as Record<string, FixtureKind>;
const D_KIND = Object.fromEntries(Object.entries(D_CODE).map(([k, v]) => [v, k])) as Record<string, DecorKind>;

/** Fixtures and decor in a link: short and readable ("k.arka.40.90.0~o.sol.100.40.40_s.0.250.0.100.60"). */
export function encodePlan(fixtures: Fixture[], decor: Decor[]): string {
  const f = fixtures.map((x) => [F_CODE[x.kind], x.wall, x.offsetCm, x.widthCm, x.depthCm].join("."));
  const d = decor.map((x) => [D_CODE[x.kind], Math.round(x.x * 100), Math.round(x.z * 100), x.rot, x.widthCm, x.depthCm].join("."));
  return f.length || d.length ? [f.join("~"), d.join("~")].join("_") : "";
}

export function decodePlan(s: string | null | undefined, spec: RoomSpec): { fixtures: Fixture[]; decor: Decor[] } {
  const out = { fixtures: [] as Fixture[], decor: [] as Decor[] };
  if (!s || s.length > 2000) return out;
  const [fs = "", ds = ""] = s.split("_");
  let n = 0;
  for (const part of fs.split("~").filter(Boolean).slice(0, 20)) {
    const [k, wall, off, w, d] = part.split(".");
    const f = { id: `s${n++}`, kind: F_KIND[k], wall: wall as Wall, offsetCm: Number(off), widthCm: Number(w), depthCm: Number(d) };
    if (f.kind && WALLS.includes(f.wall) && [f.offsetCm, f.widthCm, f.depthCm].every(Number.isFinite) && !validateFixture(spec, f)) out.fixtures.push(f);
  }
  for (const part of ds.split("~").filter(Boolean).slice(0, 20)) {
    const [k, x, z, rot, w, d] = part.split(".");
    const dec = { id: `d${n++}`, kind: D_KIND[k], x: Number(x) / 100, z: Number(z) / 100, rot: (rot === "90" ? 90 : 0) as 0 | 90, widthCm: Number(w), depthCm: Number(d) };
    if (dec.kind && [dec.x, dec.z, dec.widthCm, dec.depthCm].every(Number.isFinite) && dec.widthCm > 0 && dec.depthCm > 0 && dec.widthCm <= 800 && dec.depthCm <= 800) out.decor.push(dec);
  }
  return out;
}
