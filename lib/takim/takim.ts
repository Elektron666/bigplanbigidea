// Sofa sets (Showroom package, job 6, "Takım sahnesi"): which of a shop's
// models make up a set (üçlü, ikili, berjer, puf…) and where each stands,
// entered in the panel. On the screen the whole set is put in the room at
// once, each piece with its own fabric; "Kombin" gives the accent pieces
// (berjer, puf) another fabric, the main fabric's "uyumlu" ones first. Pure.

import type { FurnitureModel } from "@/lib/types";
import { constrain, findFreeSpot, modelDims, overlapping, type Placement } from "@/lib/room/layout";
import type { RoomSpec } from "@/lib/room/spec";

export const SET_SLUG = /^[a-z0-9](?:[a-z0-9-]{0,40}[a-z0-9])?$/;
export const MAX_SET_PIECES = 6;
export const ROTATIONS = [0, 90, 180, 270] as const;
export type Rot = (typeof ROTATIONS)[number];

/** A piece of the set: the model and its place relative to the main piece, cm, and its turn, degrees. */
export interface SetPiece {
  modelId: string;
  x: number;
  z: number;
  rot: Rot;
}

export interface SofaSet {
  id: string;
  firmId: string;
  slug: string;
  name: string;
  pieces: SetPiece[];
  isActive: boolean;
}

/** What a screen gets: models by slug. */
export interface ScreenSet {
  slug: string;
  name: string;
  pieces: { modelSlug: string; x: number; z: number; rot: Rot }[];
}

export type SetInput = { slug: string; name: string; pieces: SetPiece[]; isActive: boolean };

export function validateSet(raw: unknown, firmModelIds: Set<string>): { ok: true; value: SetInput } | { ok: false; error: string } {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const name = typeof r.name === "string" ? r.name.trim() : "";
  const slug = typeof r.slug === "string" ? r.slug.trim() : "";
  if (name.length < 2 || name.length > 60) return { ok: false, error: "Takımın adını yazın (2–60 harf)." };
  if (!SET_SLUG.test(slug)) return { ok: false, error: "Bağlantı adı küçük harf, rakam ve tire olmalı." };
  const list = Array.isArray(r.pieces) ? r.pieces : [];
  if (list.length < 2 || list.length > MAX_SET_PIECES) return { ok: false, error: `Takımda 2 ile ${MAX_SET_PIECES} parça olmalı.` };
  const pieces: SetPiece[] = [];
  for (const p of list as Record<string, unknown>[]) {
    const modelId = typeof p?.modelId === "string" ? p.modelId : "";
    if (!firmModelIds.has(modelId)) return { ok: false, error: "Takımdaki bir model bu mağazada yok." };
    const x = Number(p.x);
    const z = Number(p.z);
    const rot = Number(p.rot) as Rot;
    if (!Number.isFinite(x) || !Number.isFinite(z) || Math.abs(x) > 1500 || Math.abs(z) > 1500) return { ok: false, error: "Parça yeri −1500 ile 1500 cm arasında olmalı." };
    if (!ROTATIONS.includes(rot)) return { ok: false, error: "Parça yönü 0, 90, 180 ya da 270 derece olmalı." };
    pieces.push({ modelId, x: Math.round(x), z: Math.round(z), rot });
  }
  return { ok: true, value: { name, slug, pieces, isActive: r.isActive !== false } };
}

const ACCENT = new Set(["berjer", "puf"]);
/** The pieces that take the second fabric in "Kombin": berjer and puf. */
export const isAccent = (m: Pick<FurnitureModel, "category"> | undefined) => !!m?.category && ACCENT.has(m.category);

/**
 * A first arrangement for the panel to start from: the widest piece against
 * the back wall, the next two at its ends turned towards it (left, right),
 * berjers and pufs in front. 20 cm between pieces. Every place can be changed.
 */
export function autoArrange(models: Pick<FurnitureModel, "id" | "dimensionsCm" | "category">[]): SetPiece[] {
  const GAP = 20;
  const sorted = [...models].sort((a, b) => (isAccent(a) ? 1 : 0) - (isAccent(b) ? 1 : 0) || b.dimensionsCm.w - a.dimensionsCm.w);
  const main = sorted[0];
  if (!main) return [];
  const out: SetPiece[] = [{ modelId: main.id, x: 0, z: 0, rot: 0 }];
  const half = main.dimensionsCm.w / 2;
  let side = -1;
  let front = 0;
  for (const m of sorted.slice(1)) {
    const { w, d } = m.dimensionsCm;
    if (!isAccent(m) && side !== 0) {
      // at the main piece's end, turned to face the room's middle
      out.push({ modelId: m.id, x: Math.round(side * (half + GAP + d / 2)), z: Math.round(w / 2 + GAP), rot: side < 0 ? 90 : 270 });
      side = side < 0 ? 1 : 0;
    } else {
      // in front of the main piece, facing it
      out.push({ modelId: m.id, x: Math.round(front * (w + GAP)), z: Math.round(main.dimensionsCm.d / 2 + 90 + d / 2), rot: 180 });
      front = front <= 0 ? -front + 1 : -front;
    }
  }
  return out;
}

/**
 * The set's pieces in the room: the main piece where a single piece would go,
 * the others at their offsets from it (cm → m), kept inside the walls; a piece
 * that would overlap another goes to the nearest free spot instead.
 */
export function placeSet(set: ScreenSet, bySlug: Map<string, FurnitureModel>, room: RoomSpec, fabricCode: string, newId: () => string): Placement[] {
  const out: Placement[] = [];
  const dims = (slug: string) => modelDims(bySlug.get(slug)!);
  const pieces = set.pieces.filter((p) => bySlug.has(p.modelSlug));
  if (!pieces.length) return out;
  const anchor = findFreeSpot(dims(pieces[0].modelSlug), room, []);
  for (const [i, p] of pieces.entries()) {
    const base: Placement = { id: newId(), modelSlug: p.modelSlug, fabricCode, x: anchor.x + p.x / 100, z: anchor.z + p.z / 100, rot: (anchor.rot + p.rot) % 360 };
    let placed = i === 0 ? { ...base, x: anchor.x, z: anchor.z, rot: anchor.rot } : constrain(base, dims(p.modelSlug), room);
    const all = [...out.map((o) => ({ p: o, dims: dims(o.modelSlug) })), { p: placed, dims: dims(p.modelSlug) }];
    if (overlapping(all).has(placed.id)) placed = { ...placed, ...findFreeSpot(dims(p.modelSlug), room, out.map((o) => ({ p: o, dims: dims(o.modelSlug) }))) };
    out.push(placed);
  }
  return out;
}

/** The set's pieces by slug, for a screen (only models the screen shows). */
export function screenSet(s: SofaSet, models: Pick<FurnitureModel, "id" | "slug">[]): ScreenSet | null {
  const slug = new Map(models.map((m) => [m.id, m.slug]));
  const pieces = s.pieces.flatMap((p) => (slug.has(p.modelId) ? [{ modelSlug: slug.get(p.modelId)!, x: p.x, z: p.z, rot: p.rot }] : []));
  return pieces.length >= 2 ? { slug: s.slug, name: s.name, pieces } : null;
}
