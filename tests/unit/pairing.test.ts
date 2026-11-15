import { describe, expect, it } from "vitest";
import { cleanPairingCode, deviceState, pairingCodeFrom, validateDeviceName } from "@/lib/devices/pairing";

describe("pairing a showroom screen", () => {
  it("accepts a 6-digit code however it is typed, and nothing else", () => {
    expect(cleanPairingCode("482913")).toBe("482913");
    expect(cleanPairingCode(" 482 913 ")).toBe("482913");
    expect(cleanPairingCode("482-913")).toBe("482913");
    for (const bad of ["48291", "4829134", "48291a", "", null, 482913]) expect(cleanPairingCode(bad)).toBeNull();
  });

  it("makes a 6-digit code from random bytes and skips the bytes that would bias it", () => {
    expect(pairingCodeFrom(new Uint8Array([0, 11, 22, 33, 44, 55]))).toBe("012345");
    expect(pairingCodeFrom(new Uint8Array([250, 255, 9, 251, 18, 27, 36, 45, 54]))).toBe("987654");
    expect(() => pairingCodeFrom(new Uint8Array([255, 254, 253]))).toThrow();
  });

  it("wants a name for the screen", () => {
    expect(validateDeviceName({ name: "  Giriş   ekranı ", branch: "" })).toEqual({ ok: true, name: "Giriş ekranı", branch: null });
    expect(validateDeviceName({ name: "Vitrin", branch: "Siteler şube" })).toEqual({ ok: true, name: "Vitrin", branch: "Siteler şube" });
    expect(validateDeviceName({ name: " " }).ok).toBe(false);
    expect(validateDeviceName({ name: "x".repeat(61) }).ok).toBe(false);
  });

  it("says in one word where a screen stands", () => {
    const now = Date.parse("2026-11-15T12:00:00Z");
    const seen = "2026-11-15T11:58:00Z";
    expect(deviceState({ lastSeenAt: null, syncStatus: "bekliyor", contentVersion: null }, 7, now).label).toBe("Henüz açılmadı");
    expect(deviceState({ lastSeenAt: "2026-11-15T11:00:00Z", syncStatus: "guncel", contentVersion: 7 }, 7, now)).toMatchObject({ online: false, label: "Kapalı" });
    expect(deviceState({ lastSeenAt: seen, syncStatus: "guncel", contentVersion: 7 }, 7, now)).toMatchObject({ online: true, label: "Güncel" });
    expect(deviceState({ lastSeenAt: seen, syncStatus: "guncel", contentVersion: 6 }, 7, now).label).toBe("Güncelleme bekliyor");
    expect(deviceState({ lastSeenAt: seen, syncStatus: "indiriyor", contentVersion: 6 }, 7, now).label).toBe("İndiriyor");
    expect(deviceState({ lastSeenAt: seen, syncStatus: "hata", contentVersion: 6 }, 7, now).label).toBe("Eşitleme hatası");
  });
});
