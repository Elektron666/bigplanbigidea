import { describe, expect, it } from "vitest";
import { cleanProfileChoice, measuredProfile, PROFILE_SAMPLE, renderSettings, startProfile } from "@/lib/three/profile";

describe("showroom quality profile", () => {
  it("“hafif” cuts detail only: 1K textures, no cast shadows, pixel ratio 1", () => {
    expect(renderSettings("hafif", "yuksek")).toEqual({ profile: "hafif", maxDpr: 1, shadowMap: 512, shadows: false, envResolution: 128, textureSize: "1k" });
  });

  it("“tam” is the device's own tier with shadows, and leaves the texture size to the screen", () => {
    expect(renderSettings("tam", "yuksek")).toMatchObject({ maxDpr: 2, shadowMap: 2048, shadows: true, textureSize: null });
    expect(renderSettings("tam", "dusuk")).toMatchObject({ maxDpr: 1.25, shadowMap: 1024, shadows: true });
  });

  it("“oto” waits for enough frames, then goes “hafif” below ~30 fps", () => {
    const at = (s: number, n = PROFILE_SAMPLE) => Array.from({ length: n }, () => s);
    expect(measuredProfile(at(1 / 60, PROFILE_SAMPLE - 1))).toBeNull();
    expect(measuredProfile(at(1 / 60))).toBe("tam");
    expect(measuredProfile(at(1 / 20))).toBe("hafif");
    // idle gaps between frames are not slowness
    expect(measuredProfile([...at(1 / 60), ...at(2, 100)])).toBe("tam");
    // one hitch does not decide
    expect(measuredProfile([...at(1 / 60), 0.15])).toBe("tam");
  });

  it("starts from the panel's choice, else what the device measured before", () => {
    expect(startProfile("hafif", "tam")).toEqual({ profile: "hafif", measure: false });
    expect(startProfile("tam", "hafif")).toEqual({ profile: "tam", measure: false });
    expect(startProfile("oto", "hafif")).toEqual({ profile: "hafif", measure: false });
    expect(startProfile("oto", null)).toEqual({ profile: "tam", measure: true });
    expect(startProfile("oto", "bozuk")).toEqual({ profile: "tam", measure: true });
    expect(cleanProfileChoice("tam")).toBe("tam");
    expect(cleanProfileChoice("ultra")).toBe("oto");
  });
});
