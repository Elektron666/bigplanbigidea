import { describe, expect, it } from "vitest";
import { nextSyncStep, type SyncAnswer } from "@/lib/devices/sync";
import { MemoryCentral } from "@/lib/central/memory";

const answer = (over: Partial<SyncAnswer> = {}): SyncAnswer => ({ status: "aktif", contentVersion: 12, updateMode: "otomatik", appVersion: "abc", syncRequested: false, ...over });
const mine = { contentVersion: 12, appVersion: "abc" };

describe("what a screen does at its check", () => {
  it("does nothing when it already has the shop's content and the server's build", () => {
    expect(nextSyncStep(answer(), mine, { idle: true })).toEqual({ do: "bekle" });
  });

  it("applies new content at once when nobody is at the screen", () => {
    expect(nextSyncStep(answer({ contentVersion: 13 }), mine, { idle: true })).toEqual({ do: "uygula" });
  });

  it("never changes the screen under a customer's hands; it waits for the screen to go idle", () => {
    expect(nextSyncStep(answer({ contentVersion: 13 }), mine, { idle: false })).toEqual({ do: "bosta-uygula" });
  });

  it("in approved mode waits for the salesperson, even when idle", () => {
    const a = answer({ contentVersion: 13, updateMode: "onayli" });
    expect(nextSyncStep(a, mine, { idle: true })).toEqual({ do: "onay-bekle" });
    expect(nextSyncStep(a, mine, { idle: true, approved: true })).toEqual({ do: "uygula" });
    expect(nextSyncStep(a, mine, { idle: false, approved: true })).toEqual({ do: "bosta-uygula" });
  });

  it("takes everything it missed in one step after a week offline", () => {
    // a week of changes: the screen holds 12, the shop is at 57; one step, no versions in between
    expect(nextSyncStep(answer({ contentVersion: 57 }), mine, { idle: true })).toEqual({ do: "uygula" });
    expect(nextSyncStep(answer({ contentVersion: 57 }), { contentVersion: 57, appVersion: "abc" }, { idle: true })).toEqual({ do: "bekle" });
  });

  it("renews itself for a new app build the same way", () => {
    expect(nextSyncStep(answer({ appVersion: "def" }), mine, { idle: false })).toEqual({ do: "bosta-uygula" });
    expect(nextSyncStep(answer({ appVersion: "def" }), mine, { idle: true })).toEqual({ do: "uygula" });
  });

  it("obeys “şimdi eşitle” from the panel, in approved mode too", () => {
    expect(nextSyncStep(answer({ syncRequested: true }), mine, { idle: true })).toEqual({ do: "uygula" });
    expect(nextSyncStep(answer({ syncRequested: true, updateMode: "onayli", contentVersion: 13 }), mine, { idle: true })).toEqual({ do: "uygula" });
  });
});

describe("pairing in the store", () => {
  it("ties a screen to the shop with a code that works once", async () => {
    const c = new MemoryCentral();
    const { code } = await c.createPairing("firm-a", "Giriş ekranı", "Siteler");
    expect(code).toMatch(/^[0-9]{6}$/);
    const claimed = await c.claimPairing(code);
    expect(claimed?.device).toMatchObject({ firmId: "firm-a", name: "Giriş ekranı", branch: "Siteler", syncStatus: "bekliyor" });
    expect(claimed!.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    // the same code again, and a made-up one
    expect(await c.claimPairing(code)).toBeNull();
    expect(await c.claimPairing("000000")).toBeNull();
    // the screen is found by its secret, not by anything it could guess
    expect((await c.deviceByToken(claimed!.token))?.id).toBe(claimed!.device.id);
    expect(await c.deviceByToken("x".repeat(43))).toBeNull();
  });

  it("records the check-in and hands “şimdi eşitle” over exactly once", async () => {
    const c = new MemoryCentral();
    const { device } = (await c.claimPairing((await c.createPairing("firm-a", "Ekran", null)).code))!;
    expect(await c.checkIn(device.id, { appVersion: "abc", contentVersion: 3, syncStatus: "guncel" })).toEqual({ syncRequested: false });
    const seen = (await c.getDevice(device.id))!;
    expect(seen).toMatchObject({ appVersion: "abc", contentVersion: 3, syncStatus: "guncel" });
    expect(seen.lastSeenAt).not.toBeNull();
    expect(seen.lastSyncAt).not.toBeNull();
    await c.requestSync([device.id]);
    expect(await c.checkIn(device.id, {})).toEqual({ syncRequested: true });
    expect(await c.checkIn(device.id, {})).toEqual({ syncRequested: false });
  });

  it("locks a removed screen out and lists only the shop's own screens", async () => {
    const c = new MemoryCentral();
    const a = (await c.claimPairing((await c.createPairing("firm-a", "A ekranı", null)).code))!;
    const b = (await c.claimPairing((await c.createPairing("firm-b", "B ekranı", null)).code))!;
    expect((await c.listDevices("firm-a")).map((d) => d.name)).toEqual(["A ekranı"]);
    expect((await c.listDevices("firm-b")).map((d) => d.name)).toEqual(["B ekranı"]);
    await c.removeDevice(a.device.id);
    expect(await c.deviceByToken(a.token)).toBeNull();
    expect((await c.deviceByToken(b.token))?.firmId).toBe("firm-b");
  });
});
