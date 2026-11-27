import { describe, expect, it } from "vitest";
import { brandOf, brandsOf, cleanDomains, embedCode, filterByBrands, frameAncestors } from "@/lib/marka";

// Job 16: brands and the web embed.

describe("brands", () => {
  const fabrics = [{ code: "A", brand: undefined }, { code: "B", brand: "Delta" }, { code: "C", brand: "ORMEN" }, { code: "D", brand: "Alfa" }];
  it("makes every fabric from before brands ORMEN's", () => {
    expect(brandOf({})).toBe("ORMEN");
    expect(brandsOf(fabrics)).toEqual(["ORMEN", "Alfa", "Delta"]);
  });
  it("hides a brand switched off, strictly, even when nothing is left", () => {
    expect(filterByBrands(fabrics, null).map((f) => f.code)).toEqual(["A", "B", "C", "D"]);
    expect(filterByBrands(fabrics, ["ORMEN"]).map((f) => f.code)).toEqual(["A", "C"]);
    expect(filterByBrands(fabrics, [])).toEqual([]);
  });
});

describe("web embed", () => {
  it("takes host names only, from URLs too", () => {
    expect(cleanDomains("https://www.ornek.com/koltuk, ornek.com.tr ; WWW.ORNEK.COM")).toEqual({ ok: true, value: ["www.ornek.com", "ornek.com.tr"] });
    expect(cleanDomains("javascript:alert(1)").ok).toBe(false);
    expect(cleanDomains("*.ornek.com").ok).toBe(false);
    expect(cleanDomains("")).toEqual({ ok: true, value: [] });
  });
  it("lets the embed open on this site and the allowed sites only", () => {
    expect(frameAncestors([])).toBe("'self'");
    expect(frameAncestors(["www.ornek.com"])).toBe("'self' www.ornek.com");
    expect(embedCode("https://atelier.example", "ornek-mobilya")).toContain('src="https://atelier.example/gomme/ornek-mobilya"');
  });
});
