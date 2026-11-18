// Quality profile of a showroom screen (Showroom package, job 1).
//
//   "tam"   the full picture: the device's own tier (lib/three/quality.ts),
//           soft shadows, the textures the screen size calls for.
//   "hafif" for a slower screen: 1K textures, no cast shadows, a smaller
//           light probe, pixel ratio 1.
//   "oto"   decided at start: a short measure of the first frames that follow
//           each other (the intro turn); slower than ~30 fps goes "hafif".
//           The decision is kept on the device, so later starts begin right.
//
// What the profile may change is detail only. The fabric's colour, its scale
// (the real-world size of one texture tile) and the lighting's colour are
// the same in both: that is ORMEN's promise (task section 3) and it is
// tested on the rendered scene.

import { GAP, QUALITY, SLOW_FRAME, type Tier } from "./quality";
import type { TextureSize } from "@/lib/types";

export const PROFILES = ["oto", "hafif", "tam"] as const;
export type ProfileChoice = (typeof PROFILES)[number];
export type Profile = "hafif" | "tam";

export interface RenderSettings {
  profile: Profile;
  maxDpr: number;
  shadowMap: number;
  /** Cast shadows from the key light (the ground contact shadow stays in both). */
  shadows: boolean;
  /** Resolution of the light probe the fabric's sheen reflects. */
  envResolution: number;
  /** Null: the screen's own choice (lib/three/texture-size.ts). */
  textureSize: TextureSize | null;
}

export function renderSettings(profile: Profile, tier: Tier): RenderSettings {
  if (profile === "hafif") return { profile, maxDpr: 1, shadowMap: 512, shadows: false, envResolution: 128, textureSize: "1k" };
  const q = QUALITY[tier];
  return { profile, maxDpr: q.maxDpr, shadowMap: q.shadowMap, shadows: true, envResolution: 256, textureSize: null };
}

/** Frames measured before "oto" decides. */
export const PROFILE_SAMPLE = 45;

/**
 * "oto" after a sample of frame intervals (seconds): null while there are too
 * few frames that follow each other (idle gaps are not slowness).
 */
export function measuredProfile(intervals: number[]): Profile | null {
  const frames = intervals.filter((t) => t > 0 && t < GAP);
  if (frames.length < PROFILE_SAMPLE) return null;
  const sorted = [...frames].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] > SLOW_FRAME ? "hafif" : "tam";
}

export function cleanProfileChoice(raw: unknown): ProfileChoice {
  return (PROFILES as readonly unknown[]).includes(raw) ? (raw as ProfileChoice) : "oto";
}

/** The profile a screen starts with: the panel's choice, else what this device measured before, else "tam" until measured. */
export function startProfile(choice: ProfileChoice, remembered: string | null): { profile: Profile; measure: boolean } {
  if (choice !== "oto") return { profile: choice, measure: false };
  if (remembered === "hafif" || remembered === "tam") return { profile: remembered, measure: false };
  return { profile: "tam", measure: true };
}
