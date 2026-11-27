// Layout suggestions (Showroom package, job 14, "Otomatik yerleşim önerisi"):
// one tap in the room plan, up to three layouts of the pieces on the screen.
// Rule based and pure: the main (widest) piece goes against a different wall
// in each, facing the TV unit or the window where there is one; the others
// gather round, facing it. Every suggestion keeps door and window fronts
// open, puts nothing on anything, and keeps the clearance between things. A
// piece that fits nowhere is named, with a smaller one of the shop's own.

import type { RoomSpec } from "@/lib/room/spec";
import { constrain, footprintParts, roomRect, type Dims, type Footprint, type Placement } from "@/lib/room/layout";
import { blocksWay, decorRect, doorZone, fixtureRect, gapCm, type Decor, type Fixture, type Wall } from "./plan";

export interface PieceIn {
  id: string;
  modelSlug: string;
  fabricCode: string;
  name: string;
  dims: Dims;
  zones?: Placement["zones"];
}

export interface Suggestion {
  title: string;
  placements: Placement[];
  /** Pieces that fit nowhere in this layout. */
  missing: string[];
}

const ROT_OF: Record<Wall, number> = { arka: 0, sol: 90, sag: -90, on: 180 };
const OPPOSITE: Record<Wall, Wall> = { arka: "on", on: "arka", sol: "sag", sag: "sol" };
const WALL_WORD: Record<Wall, string> = { arka: "Arka duvarda", sol: "Sol duvarda", sag: "Sağ duvarda", on: "Ön duvarda" };
const STEP = 0.1;

const overlap = (a: Footprint, b: Footprint) => a.minX < b.maxX - 0.005 && a.maxX > b.minX + 0.005 && a.minZ < b.maxZ - 0.005 && a.maxZ > b.minZ + 0.005;
const inside = (r: Footprint, room: Footprint) => r.minX >= room.minX - 1e-6 && r.maxX <= room.maxX + 1e-6 && r.minZ >= room.minZ - 1e-6 && r.maxZ <= room.maxZ + 1e-6;

/** The wall a thing on the floor is nearest to. */
function nearestWall(spec: RoomSpec, r: Footprint): Wall {
  const room = roomRect(spec);
  const cx = (r.minX + r.maxX) / 2;
  const cz = (r.minZ + r.maxZ) / 2;
  const d: [Wall, number][] = [["arka", cz - room.minZ], ["on", room.maxZ - cz], ["sol", cx - room.minX], ["sag", room.maxX - cx]];
  return d.sort((a, b) => a[1] - b[1])[0][0];
}

function wallsOf(spec: RoomSpec): Wall[] {
  return spec.shape === "dikdortgen" || spec.shape === "l" ? ["arka", "sol", "sag", "on"] : ["arka", "sol"];
}

/** The floor that must stay free: in front of doors and windows, as deep as the clearance (doors: their swing). */
function keepFree(spec: RoomSpec, fixtures: Fixture[], clearanceCm: number): Footprint[] {
  return fixtures.flatMap((f) => (f.kind === "kapi" ? [doorZone(spec, f, clearanceCm)] : f.kind === "pencere" ? [doorZone(spec, { ...f, widthCm: Math.min(f.widthCm, clearanceCm) }, clearanceCm)] : []));
}

export function suggestLayouts(spec: RoomSpec, pieces: PieceIn[], fixtures: Fixture[], decor: Decor[], clearanceCm: number, smaller: (p: PieceIn) => string | null = () => null): { suggestions: Suggestion[]; note: string | null } {
  if (spec.shape === "yok" || !pieces.length) return { suggestions: [], note: "Önce odanın duvarlarını seçin." };
  const room = roomRect(spec);
  const free = keepFree(spec, fixtures, clearanceCm);
  const fixed = [
    ...fixtures.filter((f) => f.kind === "kolon" || f.kind === "radyator").map((f) => fixtureRect(spec, f)),
    ...decor.filter((d) => blocksWay(d.kind)).map(decorRect),
  ];
  const order = [...pieces].sort((a, b) => b.dims.w - a.dims.w);
  const main = order[0];
  const tv = decor.find((d) => d.kind === "tv");
  const win = fixtures.find((f) => f.kind === "pencere");
  // walls for the main piece, the most telling first: facing the TV, facing the window, then the rest
  const walls: [Wall, string][] = [];
  const add = (w: Wall, why: string) => wallsOf(spec).includes(w) && !walls.some(([x]) => x === w) && walls.push([w, why]);
  if (tv) add(OPPOSITE[nearestWall(spec, decorRect(tv))], "TV ünitesine dönük");
  if (win) add(OPPOSITE[win.wall], "pencereye dönük");
  for (const w of wallsOf(spec)) add(w, "");

  const ok = (rects: Footprint[], placed: Footprint[][]) =>
    rects.every((r) => inside(r, room) && !free.some((z) => overlap(r, z)) && fixed.every((f) => !overlap(r, f) && gapCm(r, f) >= clearanceCm)) &&
    placed.every((other) => rects.every((r) => other.every((o) => !overlap(r, o) && gapCm(r, o) >= clearanceCm)));

  const suggestions: Suggestion[] = [];
  const notes = new Set<string>();
  for (const [wall, why] of walls) {
    if (suggestions.length === 3) break;
    const rot = ROT_OF[wall];
    // the main piece: against its wall, as near the middle as it can
    const along = wall === "arka" || wall === "on";
    const mid = along ? (room.minX + room.maxX) / 2 : (room.minZ + room.maxZ) / 2;
    const span = along ? room.maxX - room.minX : room.maxZ - room.minZ;
    let mainPlaced: Placement | null = null;
    for (let k = 0; k <= Math.ceil(span / 2 / STEP); k++) {
      for (const s of k ? [-1, 1] : [1]) {
        const t = mid + s * k * STEP;
        const guess: Placement = { id: main.id, modelSlug: main.modelSlug, fabricCode: main.fabricCode, ...(main.zones ? { zones: main.zones } : {}), rot, x: along ? t : wall === "sol" ? room.minX : room.maxX, z: along ? (wall === "arka" ? room.minZ : room.maxZ) : t };
        const p = constrain(guess, main.dims, spec);
        if (ok(footprintParts(p, main.dims), [])) {
          mainPlaced = p;
          break;
        }
      }
      if (mainPlaced) break;
    }
    if (!mainPlaced) continue;
    const placed: Placement[] = [mainPlaced];
    const rects: Footprint[][] = [footprintParts(mainPlaced, main.dims)];
    // where the others look: in front of the main piece
    const face = { x: Math.sin((rot * Math.PI) / 180), z: Math.cos((rot * Math.PI) / 180) };
    const centre = { x: mainPlaced.x + face.x * 1.6, z: mainPlaced.z + face.z * 1.6 };
    const missing: string[] = [];
    for (const piece of order.slice(1)) {
      let best: { p: Placement; score: number } | null = null;
      for (let x = room.minX; x <= room.maxX + 1e-6; x += STEP)
        for (let z = room.minZ; z <= room.maxZ + 1e-6; z += STEP) {
          // the piece looks at the centre: the nearest of the four turns
          const ang = (Math.atan2(centre.x - x, centre.z - z) * 180) / Math.PI;
          const r = [0, 90, 180, -90].reduce((a, b) => (Math.abs(((ang - b + 540) % 360) - 180) < Math.abs(((ang - a + 540) % 360) - 180) ? b : a));
          const p: Placement = { id: piece.id, modelSlug: piece.modelSlug, fabricCode: piece.fabricCode, ...(piece.zones ? { zones: piece.zones } : {}), x, z, rot: r };
          const fr = footprintParts(p, piece.dims);
          if (!ok(fr, rects)) continue;
          const score = Math.hypot(x - centre.x, z - centre.z);
          if (!best || score < best.score) best = { p, score };
        }
      if (best) {
        placed.push(best.p);
        rects.push(footprintParts(best.p, piece.dims));
      } else {
        missing.push(piece.name);
        const s = smaller(piece);
        notes.add(`${piece.name} bu odada kapıları ve geçişi kapatmadan sığmıyor.${s ? ` Daha küçük: ${s}.` : ""}`);
      }
    }
    suggestions.push({ title: `${WALL_WORD[wall]}${why ? `, ${why}` : ""}`, placements: placed, missing });
  }
  if (!suggestions.length) {
    const s = smaller(main);
    return { suggestions, note: `${main.name} bu odada kapıları ve geçişi kapatmadan hiçbir duvara sığmıyor.${s ? ` Daha küçük: ${s}.` : ""}` };
  }
  return { suggestions, note: notes.size ? [...notes].join(" ") : null };
}
