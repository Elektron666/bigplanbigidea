// Placing an uploaded module's GLB on its joints (Showroom package, job 4).
// Pure, so the arithmetic is tested without three.js. Coordinates are seen
// from above in cm: x across, z towards the front; turns are about the
// vertical axis the way three.js turns (rotation.y).

import type { Joints, Point } from "./dizilim";

/** The angle of a direction on the floor, in three.js's sense of a turn about y. */
const angle = (v: Point) => Math.atan2(-v.z, v.x);

/** The model's own joints when the panel gave none: from its box (back = the side away from +z). */
export function boxJoints(box: { minX: number; maxX: number; minZ: number; maxZ: number }, corner: boolean): Joints {
  return corner
    ? { sol: { x: box.minX, z: box.maxZ }, sag: { x: box.maxX, z: box.minZ } }
    : { sol: { x: box.minX, z: box.minZ }, sag: { x: box.maxX, z: box.minZ } };
}

/**
 * The turn and shift that put the model's left joint on the target's left
 * joint and its right joint on the line to the target's right joint. `gapCm`
 * is how far the model's joints are from the target's distance apart (a GLB
 * a little wider or narrower than the size given in the panel): the model is
 * never stretched, the panel shows the difference.
 */
export function placeOnJoints(own: Joints, target: Joints): { yaw: number; x: number; z: number; gapCm: number } {
  const d = { x: own.sag.x - own.sol.x, z: own.sag.z - own.sol.z };
  const D = { x: target.sag.x - target.sol.x, z: target.sag.z - target.sol.z };
  let yaw = angle(D) - angle(d);
  // keep it between -π and π, so equal turns compare equal
  yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  // three.js rotation.y: x' = x·cos + z·sin, z' = −x·sin + z·cos
  const rx = own.sol.x * c + own.sol.z * s;
  const rz = -own.sol.x * s + own.sol.z * c;
  const gapCm = Math.hypot(D.x, D.z) - Math.hypot(d.x, d.z);
  return { yaw, x: target.sol.x - rx, z: target.sol.z - rz, gapCm: Math.round(gapCm * 10) / 10 };
}
