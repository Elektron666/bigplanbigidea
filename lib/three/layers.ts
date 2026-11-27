import type * as THREE from "three";
import { LAYER_COMPARE, LAYER_COMPARE2, LAYER_PRIMARY } from "./constants";

/** Moves an object and all its descendants to a single layer. */
export function setObjectLayer(root: THREE.Object3D, layer: number): void {
  root.traverse((o) => o.layers.set(layer));
}

/** Layer 0 plus the primary furniture layer: the normal view. */
export function showPrimary(camera: THREE.Camera): void {
  camera.layers.set(0);
  camera.layers.enable(LAYER_PRIMARY);
}

export function enableAllLayers(camera: THREE.Camera): void {
  camera.layers.enableAll();
}

/**
 * Draws the scene once per fabric through ONE camera, each in its own strip:
 * primary furniture left of the first split, the compare copy after it, the
 * third copy after the second split (three fabrics, job 7). One camera, so
 * turning and zooming move every strip together.
 */
export function renderSplit(
  gl: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  size: { width: number; height: number },
  split: number | number[],
): void {
  const cuts = [0, ...(Array.isArray(split) ? split : [split]).slice(0, 2).map((s) => Math.round(size.width * s)), size.width];
  const layers = [LAYER_PRIMARY, LAYER_COMPARE, LAYER_COMPARE2];
  gl.setScissorTest(true);
  for (let i = 0; i < cuts.length - 1; i++) {
    camera.layers.set(0);
    camera.layers.enable(layers[i]);
    gl.setScissor(cuts[i], 0, cuts[i + 1] - cuts[i], size.height);
    gl.render(scene, camera);
  }
  gl.setScissorTest(false);
  showPrimary(camera);
}
