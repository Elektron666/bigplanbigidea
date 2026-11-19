import * as THREE from "three";
import type { ModulePart } from "@/lib/types";
import { boxJoints, placeOnJoints } from "./glb";

/**
 * A corner set from its module GLBs (job 4): each file is turned and moved so
 * its left and right joints sit on the set's joints; a mirrored set is drawn
 * mirrored as a whole. Shared by the 3D scene and the AR file, so both show
 * the same set. `scenes` holds each file's scene by its URL (not changed).
 */
export function assembleModules(parts: ModulePart[], mirrored: boolean, scenes: Map<string, THREE.Object3D>): THREE.Group {
  const set = new THREE.Group();
  set.name = "takim";
  for (const p of parts) {
    const scene = scenes.get(p.url);
    if (!scene) continue;
    const piece = scene.clone(true);
    piece.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(piece);
    // the model's own joints in cm (from the panel, or from its box)
    const own = p.joints ?? boxJoints({ minX: b.min.x * 100, maxX: b.max.x * 100, minZ: b.min.z * 100, maxZ: b.max.z * 100 }, p.corner);
    const t = placeOnJoints(own, p.target);
    const holder = new THREE.Group();
    holder.add(piece);
    holder.rotation.y = t.yaw;
    holder.position.set(t.x / 100, 0, t.z / 100);
    set.add(holder);
  }
  if (mirrored) set.scale.x = -1;
  return set;
}
