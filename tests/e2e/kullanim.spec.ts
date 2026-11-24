import { expect, test } from "./fixtures";
import { login } from "./helpers";
import type { Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

// Job 11: the monthly usage report. Known events go into the log; the shop's
// report grows by exactly those (another shop's events do not count), a month
// without use says "kullanım yok", the PDF comes, the summary appears in the
// shop panel until opened, and ORMEN sees every shop side by side.

const SHOP = "ornek-mobilya";

async function shopLogin(page: Page) {
  await page.goto("/magaza/giris");
  await page.getByLabel("E-posta").fill("magaza@ormen.local");
  await page.getByLabel("Şifre").fill("ormen-magaza");
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page).toHaveURL(/\/magaza$/);
}

/** The report's tiles as numbers ("kullanım yok": all zero). */
async function tiles(page: Page): Promise<Record<string, string>> {
  if (await page.getByTestId("kullanim-yok").isVisible()) return {};
  const out: Record<string, string> = {};
  for (const box of await page.getByTestId("kullanim-kutulari").locator("div").all()) out[(await box.locator("dt").innerText()).trim()] = (await box.locator("dd").innerText()).trim();
  return out;
}
const num = (t: Record<string, string>, k: string) => Number((t[k] ?? "0").replace(/\D/g, "") || 0);

test.describe("aylık kullanım raporu", () => {
  test.skip(({ isMobile }) => isMobile, "panel masaüstü");

  test("rapor olay kaydıyla birebir; başka mağaza sayılmaz; boş ay; PDF; özet bildirimi; ORMEN yan yana", async ({ page, playwright, baseURL }) => {
    test.setTimeout(180_000);
    await shopLogin(page);
    await page.goto("/magaza/rapor");
    const months = page.getByRole("navigation", { name: "Ay" }).getByRole("link");
    await months.first().click();
    await expect(months.first()).toHaveAttribute("aria-current", "page");
    const current = new URL(page.url()).searchParams.get("ay")!;
    expect(current).toMatch(/^\d{4}-\d{2}$/);
    const before = await tiles(page);

    // the log: a visitor's anonymous events, as the screen and the page send them
    const api = await playwright.request.newContext({ baseURL });
    const send = async (firmSlug: string, type: string, extra: Record<string, unknown> = {}) => {
      const r = await api.post("/api/olay", { data: { type, sessionId: `rapor-${Math.random().toString(36).slice(2, 12)}`, firmSlug, ...extra } });
      expect(r.status()).toBe(204);
    };
    for (let i = 0; i < 3; i++) await send(SHOP, "oturum_basladi");
    for (let i = 0; i < 25; i++) await send(SHOP, "kumas_denendi", { fabricCode: "VERSO-03" });
    await send(SHOP, "kumas_denendi", { fabricCode: "LUMA-02" });
    await send(SHOP, "teklif_olusturuldu", { n: 1 });
    await send(SHOP, "teklif_olusturuldu", { n: 2 });
    await send(SHOP, "kartela_okutuldu", { fabricCode: "LUMA-02" });
    await send(SHOP, "asistan_soru");
    // another shop's: never in this report
    for (let i = 0; i < 4; i++) await send("baska-magaza", "teklif_olusturuldu", { n: 1 });
    await send("baska-magaza", "oturum_basladi");
    await api.dispose();

    await page.reload();
    const after = await tiles(page);
    expect(num(after, "Showroom oturumu") - num(before, "Showroom oturumu")).toBe(3);
    expect(num(after, "Kumaş denemesi") - num(before, "Kumaş denemesi")).toBe(26);
    expect(num(after, "Teklif") - num(before, "Teklif")).toBe(2);
    expect(num(after, "Kartela okutma") - num(before, "Kartela okutma")).toBe(1);
    expect(num(after, "Asistan sorusu") - num(before, "Asistan sorusu")).toBe(1);
    await expect(page.getByRole("region", { name: "En çok denenen 5 kumaş" }).getByRole("listitem").first()).toContainText("VERSO-03");

    // the PDF, one page, with the shop's name
    const pdf = await page.request.get(`/magaza/rapor-pdf?ay=${current}`);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toBe("application/pdf");
    const bytes = await pdf.body();
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);

    // a month long ago: said in words, not an empty page
    await months.last().click();
    await expect(months.last()).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("kullanim-yok")).toContainText("Bu ay kullanım yok.");

    // ---- ORMEN: every shop side by side; opening it also hands out last month's summaries
    const panel = await page.context().browser()!.newContext({ baseURL });
    const admin = await panel.newPage();
    await login(admin);
    await admin.goto(`/panel/rapor/magazalar?ay=${current}`);
    const row = admin.getByTestId("magaza-kullanim").filter({ has: admin.getByRole("rowheader", { name: "Örnek Mobilya" }) });
    await expect(row.getByRole("cell").first()).toHaveText(String(num(after, "Showroom oturumu")));
    await expect(admin.getByRole("heading", { name: "30 gündür kullanılmayan ekranlar" })).toBeVisible();
    await admin.goto("/panel/rapor/magazalar");
    await expect(admin.getByTestId("magaza-kullanim").filter({ hasText: "Örnek Mobilya" })).toContainText("Açılmadı");

    // ---- the shop sees "raporunuz hazır" until it opens it
    await page.goto("/magaza");
    const notice = page.getByRole("status").filter({ hasText: "kullanım raporunuz hazır." });
    await expect(notice).toBeVisible();
    await notice.getByRole("link", { name: "Raporu aç" }).click();
    await expect(page).toHaveURL(/\/magaza\/rapor\?ay=\d{4}-\d{2}$/);
    await page.goto("/magaza");
    await expect(page.getByRole("status").filter({ hasText: "kullanım raporunuz hazır." })).toHaveCount(0);
    await admin.reload();
    await expect(admin.getByTestId("magaza-kullanim").filter({ hasText: "Örnek Mobilya" })).toContainText("Açıldı");
    await panel.close();
  });
});
