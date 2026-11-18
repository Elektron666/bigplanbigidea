import { describe, expect, it } from "vitest";
import { codeFromScan, kartelaPath, parseKartelaPath } from "@/lib/kartela/qr";

describe("swatch card QR", () => {
  it("makes a short address, with or without the shop", () => {
    expect(kartelaPath("siena-04")).toBe("/k/SIENA-04");
    expect(kartelaPath("SIENA-04", "ornek-mobilya")).toBe("/k/ornek-mobilya/SIENA-04");
    // codes are upper-cased with a plain I ("SIENA", not "SİENA"), as everywhere else
    expect(kartelaPath("şönil-01")).toBe(`/k/${encodeURIComponent("ŞÖNIL-01")}`);
  });

  it("reads the short address back and refuses anything else", () => {
    expect(parseKartelaPath(["SIENA-04"])).toEqual({ code: "SIENA-04", firmSlug: null });
    expect(parseKartelaPath(["ornek-mobilya", "siena-04"])).toEqual({ code: "SIENA-04", firmSlug: "ornek-mobilya" });
    expect(parseKartelaPath([encodeURIComponent("ŞÖNİL-01")])).toEqual({ code: "ŞÖNİL-01", firmSlug: null });
    for (const bad of [[], ["a", "b", "c"], ["<script>"], ["Firma Adı", "SIENA-04"], ["%E0%A4%A"]]) expect(parseKartelaPath(bad), bad.join("/")).toBeNull();
  });

  it("finds the fabric code in whatever a screen scans", () => {
    expect(codeFromScan("https://atelier.ormentekstil.com.tr/k/ornek-mobilya/SIENA-04")).toBe("SIENA-04");
    expect(codeFromScan("https://eski-adres.vercel.app/k/MISSO-05")).toBe("MISSO-05");
    // the older hanger labels
    expect(codeFromScan("https://atelier.ormentekstil.com.tr/f/ornek-mobilya?q&k=LUMA-02&e=aski")).toBe("LUMA-02");
    // a bare code typed into a QR
    expect(codeFromScan(" siena-04 ")).toBe("SIENA-04");
    for (const bad of ["", "https://example.com/", "https://example.com/k/a/b/c", "merhaba dünya", "x".repeat(600)]) expect(codeFromScan(bad), bad.slice(0, 30)).toBeNull();
  });
});
