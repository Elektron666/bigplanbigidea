import { describe, expect, it } from "vitest";
import { undoPermission, undoStep } from "@/lib/central/undo";
import { MemoryCentral } from "@/lib/central/memory";
import type { AuditEntry } from "@/lib/central/types";

const entry = (over: Partial<AuditEntry>): AuditEntry => ({ id: "1", at: "2026-11-18T10:00:00Z", undoneAt: null, actor: "a@ornek.com", actorRole: "admin", entity: "magaza", action: "x", summary: "s", firmId: "firm-a", entityId: "e", ...over });

describe("undo from the change log", () => {
  it("turns each undoable change back", () => {
    expect(undoStep(entry({ action: "askiya-alindi", before: { status: "aktif" } }))).toEqual({ kind: "durum", firmId: "firm-a", status: "aktif" });
    expect(undoStep(entry({ action: "toplu-eklendi", before: { mode: "ekle", productIds: ["p1"], shopIds: ["s1", "s2"] } }))).toEqual({ kind: "atama", mode: "cikar", productIds: ["p1"], shopIds: ["s1", "s2"] });
    expect(undoStep(entry({ action: "toplu-cikarildi", before: { productIds: ["p1"], shopIds: ["s1"] } }))).toMatchObject({ kind: "atama", mode: "ekle" });
    expect(undoStep(entry({ action: "gosterim-degisti", entityId: "m1", before: { displayName: "Eski ad", productCode: null, description: null, featured: true, hidden: false } }))).toEqual({
      kind: "gosterim",
      firmId: "firm-a",
      modelId: "m1",
      patch: { displayName: "Eski ad", productCode: null, description: null, featured: true, hidden: false },
    });
    expect(undoStep(entry({ action: "ozellik-kapandi", before: { teklif: true, uydurma: 1 } }))).toEqual({ kind: "ozellik", firmId: "firm-a", features: { teklif: true } });
    expect(undoStep(entry({ action: "fire-degisti", before: { duz: null, donuk: null, raporlu: 25, roundStep: 0.5 } }))).toEqual({ kind: "fire", waste: { duz: null, donuk: null, raporlu: 25, roundStep: 0.5 } });
    expect(undoStep(entry({ action: "kalite-degisti", entityId: "d1", before: { quality: "oto" } }))).toEqual({ kind: "kalite", deviceId: "d1", quality: "oto" });
    const record = { city: "Ankara", region: null, package: null, tags: [], contact: null, installedOn: null, updateMode: "otomatik", vitrinSn: null, aiQuota: null, gecisCm: null };
    expect(undoStep(entry({ action: "kayit-degisti", before: record }))).toEqual({ kind: "kayit", firmId: "firm-a", record });
    expect(undoStep(entry({ action: "sablon-uygulandi", before: { record, features: { kose: false }, fabricSeries: ["MISSO"] } }))).toEqual({ kind: "sablon", firmId: "firm-a", record, features: { kose: false }, fabricSeries: ["MISSO"] });
    expect(undoStep(entry({ action: "odendi", entityId: "s1", before: { paidOn: null } }))).toEqual({ kind: "odeme", subscriptionId: "s1", paidOn: null });
    expect(undoStep(entry({ action: "odenmedi", entityId: "s1", before: { paidOn: "2026-11-02" } }))).toEqual({ kind: "odeme", subscriptionId: "s1", paidOn: "2026-11-02" });
  });

  it("leaves a fee's undo to the yönetici and refuses a broken record", () => {
    expect(undoPermission({ kind: "odeme", subscriptionId: "s1", paidOn: null })).toBe("abonelik");
    expect(undoStep(entry({ action: "kayit-degisti", before: { installedOn: "dün" } }))).toBeNull();
    expect(undoStep(entry({ action: "sablon-uygulandi", before: { record: {}, features: {} } }))).toBeNull();
    expect(undoStep(entry({ action: "odendi", entityId: "s1", before: { paidOn: "bugün" } }))).toBeNull();
  });

  it("does not undo what cannot be, nor anything twice", () => {
    for (const action of ["pin-degisti", "kaldirildi", "reddedildi", "kod-uretildi", "geri-alindi"]) expect(undoStep(entry({ action })), action).toBeNull();
    expect(undoStep(entry({ action: "askiya-alindi", before: { status: "silindi" } }))).toBeNull();
    expect(undoStep(entry({ action: "askiya-alindi", before: { status: "aktif" }, undoneAt: "2026-11-18T11:00:00Z" }))).toBeNull();
  });

  it("leaves the waste figures to the yönetici", () => {
    expect(undoPermission({ kind: "fire", waste: { duz: 1, donuk: 1, raporlu: 1, roundStep: 0.5 } })).toBe("fiyat");
    expect(undoPermission({ kind: "durum", firmId: "f", status: "aktif" })).toBe("geri-al");
  });

  it("marks an entry undone once", async () => {
    const c = new MemoryCentral();
    await c.writeAudit({ actor: "a", actorRole: "admin", entity: "magaza", action: "askiya-alindi", summary: "s", before: { status: "aktif" } });
    const [e] = (await c.listAudit({})).rows;
    expect(await c.markUndone(e.id)).toBe(true);
    expect(await c.markUndone(e.id)).toBe(false);
    expect((await c.getAudit(e.id))?.undoneAt).not.toBeNull();
  });
});
