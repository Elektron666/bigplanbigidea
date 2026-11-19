import { describe, expect, it } from "vitest";
import { buildOverview, monthEnd } from "@/lib/central/overview";

const now = Date.parse("2026-11-18T12:00:00Z");
const ago = (ms: number) => new Date(now - ms).toISOString();
const DAY = 86_400_000;
const shops = [
  { id: "a", name: "Akasya Mobilya", status: "aktif" },
  { id: "b", name: "Bora Koltuk", status: "aktif" },
  { id: "c", name: "Ceviz Ev", status: "ayrildi" },
];

describe("overview", () => {
  it("counts screens on, off and never opened", () => {
    const o = buildOverview(
      {
        devices: [
          { firmId: "a", lastSeenAt: ago(60_000), syncStatus: "guncel", createdAt: ago(40 * DAY) },
          { firmId: "a", lastSeenAt: ago(2 * 3_600_000), syncStatus: "guncel", createdAt: ago(40 * DAY) },
          { firmId: "b", lastSeenAt: null, syncStatus: "bekliyor", createdAt: ago(DAY) },
        ],
        fees: null,
        shops,
      },
      "2026-11-18",
      now,
    );
    expect(o.devices).toEqual({ total: 3, online: 1, offline: 1, neverOpened: 1 });
    expect(o.fees).toBeNull();
    expect(o.attention).toEqual([]);
  });

  it("lists sync errors first, then unused screens and late fees; a departed shop is not news", () => {
    const o = buildOverview(
      {
        devices: [
          { firmId: "a", lastSeenAt: ago(31 * DAY), syncStatus: "guncel", createdAt: ago(90 * DAY) },
          { firmId: "a", lastSeenAt: null, syncStatus: "bekliyor", createdAt: ago(45 * DAY) },
          { firmId: "b", lastSeenAt: ago(60_000), syncStatus: "hata", createdAt: ago(10 * DAY) },
          { firmId: "c", lastSeenAt: ago(200 * DAY), syncStatus: "guncel", createdAt: ago(300 * DAY) },
          { firmId: "silinmis", lastSeenAt: ago(200 * DAY), syncStatus: "hata", createdAt: ago(300 * DAY) },
        ],
        fees: [
          { firmId: "a", amount: 2500, dueOn: "2026-11-01" },
          { firmId: "b", amount: null, dueOn: "2026-11-30" },
          { firmId: "b", amount: 1000, dueOn: "2026-12-01" },
        ],
        shops,
      },
      "2026-11-18",
      now,
    );
    expect(o.attention).toEqual([
      { firmId: "b", name: "Bora Koltuk", reasons: ["1 ekranda eşitleme hatası"] },
      { firmId: "a", name: "Akasya Mobilya", reasons: ["2 ekran 30 gündür kullanılmıyor", "Bakım vadesi geçti"] },
    ]);
    // this month: 1 November (late) and 30 November (no amount); December waits
    expect(o.fees).toEqual({ dueThisMonth: 2, amount: 2500, withoutAmount: 1, overdue: 1 });
  });

  it("lists a shop whose photo try-on quota ran out this month", () => {
    const o = buildOverview({ devices: [], fees: null, shops, quotaFull: ["b", "bilinmeyen"] }, "2026-11-18", now);
    expect(o.attention).toEqual([{ firmId: "b", name: "Bora Koltuk", reasons: ["Fotoğraf denemesi kotası doldu"] }]);
  });

  it("knows the month's last day", () => {
    expect(monthEnd("2026-11-18")).toBe("2026-11-30");
    expect(monthEnd("2028-02-03")).toBe("2028-02-29");
    expect(monthEnd("2026-12-31")).toBe("2026-12-31");
  });
});
