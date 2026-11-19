import { describe, expect, it } from "vitest";
import { can, PERMISSIONS, staffRole } from "@/lib/auth/roles";
import { decideAccess } from "@/lib/auth/access";

describe("panel roles", () => {
  it("gives the yönetici everything", () => {
    for (const p of PERMISSIONS) expect(can("admin", p), p).toBe(true);
  });

  it("gives ORMEN elemanı setup and content, but no price, subscription or delete", () => {
    expect(can("staff", "icerik")).toBe(true);
    expect(can("staff", "kurulum")).toBe(true);
    for (const p of ["fiyat", "abonelik", "sil", "ortak-yap", "magaza-gibi", "uye", "maliyet"] as const) expect(can("staff", p), p).toBe(false);
  });

  it("gives a shop owner nothing of the centre's", () => {
    for (const p of ["icerik", "kurulum", "abonelik", "sil", "ortak-yap", "magaza-gibi", "uye", "geri-al"] as const) expect(can("sahip", p), p).toBe(false);
    expect(can("sahip", "fiyat")).toBe(true);
  });

  it("gives no one without a role anything", () => {
    for (const p of PERMISSIONS) expect(can(null, p)).toBe(false);
  });

  it("reads an unknown profile role as the narrower one", () => {
    expect(staffRole("admin")).toBe("admin");
    expect(staffRole("staff")).toBe("staff");
    expect(staffRole("superuser")).toBe("staff");
    expect(staffRole(null)).toBe("staff");
  });

  it("carries the profile's role into the session", () => {
    const base = { email: "a@ornek.com", isPanelUser: true, currentLevel: "aal1", nextLevel: "aal1" };
    const admin = decideAccess({ ...base, role: "admin" });
    expect(admin.state === "tamam" && admin.user.role).toBe("admin");
    const staff = decideAccess({ ...base, role: "staff" });
    expect(staff.state === "tamam" && staff.user.role).toBe("staff");
  });
});
