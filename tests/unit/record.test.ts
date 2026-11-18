import { describe, expect, it } from "vitest";
import { cleanTags, nextDue, validateShopRecord, validateSubscription, validateTemplate } from "@/lib/central/record";

describe("shop record", () => {
  it("tidies what the panel sends and keeps empty as empty", () => {
    expect(validateShopRecord({ city: "  Ankara ", tags: "Siteler, PİLOT , siteler", installedOn: "2026-11-02", updateMode: "onayli", vitrinSn: "90", aiQuota: "" })).toEqual({
      ok: true,
      value: { city: "Ankara", region: null, package: null, tags: ["siteler", "pilot"], contact: null, installedOn: "2026-11-02", updateMode: "onayli", vitrinSn: 90, aiQuota: null },
    });
  });

  it("refuses a date that does not exist, a loop time out of range, a broken quota", () => {
    expect(validateShopRecord({ installedOn: "2026-02-30" }).ok).toBe(false);
    expect(validateShopRecord({ vitrinSn: 10 }).ok).toBe(false);
    expect(validateShopRecord({ vitrinSn: "otuz" }).ok).toBe(false);
    expect(validateShopRecord({ aiQuota: -1 }).ok).toBe(false);
    expect(validateShopRecord({ aiQuota: 2.5 }).ok).toBe(false);
  });

  it("keeps at most eight short tags", () => {
    expect(cleanTags(Array.from({ length: 12 }, (_, i) => `e${i}`))).toHaveLength(8);
    expect(cleanTags(["x".repeat(50)])[0]).toHaveLength(30);
  });
});

describe("maintenance fee", () => {
  it("needs a due date; the amount may wait", () => {
    expect(validateSubscription({ dueOn: "2026-12-01", amount: "2.500", period: "aylik" })).toEqual({ ok: true, value: { amount: 2500, period: "aylik", dueOn: "2026-12-01", note: null } });
    expect(validateSubscription({ amount: 1 }).ok).toBe(false);
    expect(validateSubscription({ dueOn: "2026-12-01", amount: "bin" }).ok).toBe(false);
  });

  it("finds the earliest unpaid due date", () => {
    expect(nextDue([{ dueOn: "2026-12-01", paidOn: null }, { dueOn: "2026-11-01", paidOn: "2026-11-02" }, { dueOn: "2026-11-15", paidOn: null }])).toBe("2026-11-15");
    expect(nextDue([{ dueOn: "2026-11-01", paidOn: "2026-11-02" }])).toBeNull();
  });
});

describe("shop template", () => {
  it("keeps a name, known features, real series and the settings", () => {
    expect(validateTemplate({ name: "Pilot paketi", features: { teklif: true, giydirme: false, uydurma: true }, fabricSeries: ["MISSO", "kötü seri", "MISSO"], vitrinSn: 60, updateMode: "onayli", package: "Pilot" })).toEqual({
      ok: true,
      value: { name: "Pilot paketi", features: { teklif: true, giydirme: false }, fabricSeries: ["MISSO"], vitrinSn: 60, aiQuota: null, updateMode: "onayli", package: "Pilot" },
    });
    expect(validateTemplate({ name: " " }).ok).toBe(false);
  });
});

describe("the record, fees and templates in the memory centre", () => {
  it("keeps a shop's record, shows it on the list and gives its loop time to the screens", async () => {
    const { MemoryRepository } = await import("@/lib/data/memory-repo");
    const { MemoryCentral } = await import("@/lib/central/memory");
    const repo = new MemoryRepository();
    const c = new MemoryCentral(() => repo);
    const firm = (await repo.listFirms())[0];
    const rec = validateShopRecord({ city: "Ankara", tags: "siteler", vitrinSn: 90, updateMode: "onayli" });
    if (!rec.ok) throw new Error(rec.error);
    await c.saveShopRecord(firm.id, rec.value);
    expect(await c.getShopRecord(firm.id)).toEqual(rec.value);
    const row = (await c.listShops({ city: "Ankara", sort: "ad", page: 1 }, { withFees: true })).rows[0];
    expect(row).toMatchObject({ id: firm.id, city: "Ankara", tags: ["siteler"], updateMode: "onayli" });
    expect((await c.getShopState(firm.id))?.settings).toEqual({ vitrinSn: 90 });
    expect(await c.getShopRecord("yok")).toBeNull();

    // fees: the earliest unpaid one is the list's due date; never for ORMEN elemanı
    const a = await c.addSubscription(firm.id, { amount: 2500, period: "aylik", dueOn: "2026-12-01", note: null });
    await c.addSubscription(firm.id, { amount: null, period: "aylik", dueOn: "2027-01-01", note: null });
    expect((await c.getShop(firm.id))?.nextDue).toBe("2026-12-01");
    expect((await c.listShops({ sort: "ad", page: 1 }, { withFees: false })).rows.every((s) => s.nextDue === null)).toBe(true);
    expect(await c.setPaid(a.id, "2026-11-30")).toMatchObject({ firmId: firm.id, before: { paidOn: null } });
    expect((await c.getShop(firm.id))?.nextDue).toBe("2027-01-01");
    expect((await c.listSubscriptions(firm.id)).map((s) => s.dueOn)).toEqual(["2027-01-01", "2026-12-01"]);
    expect(await c.setPaid("yok", null)).toBeNull();

    // the fee entries stay out of the log for ORMEN elemanı
    await c.writeAudit({ actor: "y", actorRole: "admin", entity: "abonelik", action: "odendi", summary: "ödendi" });
    await c.writeAudit({ actor: "y", actorRole: "admin", entity: "magaza", action: "kayit-degisti", summary: "kayıt" });
    expect((await c.listAudit({ withFees: false })).rows.map((r) => r.entity)).toEqual(["magaza"]);
    expect((await c.listAudit({})).total).toBe(2);
  });

  it("replaces a template of the same name", async () => {
    const { MemoryCentral } = await import("@/lib/central/memory");
    const c = new MemoryCentral();
    const t = validateTemplate({ name: "Pilot", features: { teklif: true } });
    if (!t.ok) throw new Error(t.error);
    const first = await c.saveTemplate(t.value);
    const again = await c.saveTemplate({ ...t.value, name: "pilot", vitrinSn: 45 });
    expect(again.id).toBe(first.id);
    expect(await c.listTemplates()).toHaveLength(1);
    expect((await c.getTemplate(first.id))?.vitrinSn).toBe(45);
  });
});

describe("shop panel accounts in the memory centre", () => {
  it("opens a new account with a first password once, refuses ORMEN's and a repeat, and takes access away", async () => {
    const { MemoryCentral } = await import("@/lib/central/memory");
    const c = new MemoryCentral();
    const a = await c.addOwner("f1", "sahip@ornek.com");
    expect(a).toMatchObject({ ok: true, owner: { email: "sahip@ornek.com" } });
    expect(a.ok && a.password).toMatch(/^[A-Za-z0-9_-]{16}$/);
    // the same person for a second shop: no new password
    expect(await c.addOwner("f2", "sahip@ornek.com")).toMatchObject({ ok: true, password: null });
    expect(await c.addOwner("f1", "sahip@ornek.com")).toEqual({ ok: false, error: "Bu hesap zaten bu mağazanın." });
    expect(await c.addOwner("f1", "demo@ormen.local")).toMatchObject({ ok: false });
    const [o] = await c.listOwners("f1");
    expect(await c.removeOwner("f1", o.userId)).toMatchObject({ email: "sahip@ornek.com" });
    expect(await c.listOwners("f1")).toEqual([]);
    expect(await c.listOwners("f2")).toHaveLength(1);
    expect(await c.removeOwner("f1", o.userId)).toBeNull();
  });
});
