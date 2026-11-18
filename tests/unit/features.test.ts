import { describe, expect, it } from "vitest";
import { cleanFeatures, featureOn } from "@/lib/central/features";

describe("per-shop features", () => {
  it("are on by default, except the paid photo try-on", () => {
    for (const f of ["teklif", "siparis", "kose", "kartela"] as const) expect(featureOn(undefined, f), f).toBe(true);
    expect(featureOn({}, "giydirme")).toBe(false);
  });

  it("follow the panel's switch", () => {
    expect(featureOn({ teklif: false }, "teklif")).toBe(false);
    expect(featureOn({ giydirme: true }, "giydirme")).toBe(true);
    // anything but a real true/false is the default
    expect(featureOn({ teklif: "hayır" }, "teklif")).toBe(true);
  });

  it("keeps only known features with real values", () => {
    expect(cleanFeatures({ teklif: false, kose: true, uydurma: true, kartela: "evet" })).toEqual({ teklif: false, kose: true });
    expect(cleanFeatures(null)).toEqual({});
  });
});
