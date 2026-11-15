import { expect, test } from "./fixtures";
import { login } from "./helpers";

// The central panel (Showroom package, job 0): the shop list.

test.describe("merkez panel", () => {
  test.skip(({ isMobile }) => isMobile, "panel masaüstü için");

  test("giriş olmadan mağaza listesi kapalı", async ({ page, request }) => {
    await page.goto("/panel/magazalar");
    await expect(page).toHaveURL(/\/panel\/giris/);
    const r = await request.get("/panel/magazalar", { maxRedirects: 0 });
    expect(r.status()).toBe(307);
    expect(await r.text()).not.toContain("Örnek Mobilya");
  });

  test("mağaza listesi: arama, süzme, askıya alma ve geri açma", async ({ page }) => {
    await login(page);
    await page.goto("/panel/magazalar");
    await expect(page.getByRole("heading", { name: "Mağazalar" })).toBeVisible();
    const row = page.getByRole("listitem").filter({ hasText: "Örnek Mobilya" });
    await expect(row).toBeVisible();

    // a search that matches nothing says so instead of showing an empty page
    await page.getByLabel("Ara").fill("böyle bir mağaza yok");
    await page.getByRole("button", { name: "Göster" }).click();
    await expect(page.getByText("Bu aramaya uyan mağaza yok.")).toBeVisible();
    await page.getByRole("link", { name: "Temizle" }).click();
    await expect(row).toBeVisible();

    // suspend with one tap; it survives a reload and shows in the status filter
    await row.getByRole("button", { name: "Askıya al" }).click();
    await expect(row.getByRole("button", { name: "Geri aç" })).toBeVisible();
    await page.goto("/panel/magazalar?durum=askida");
    await expect(row).toBeVisible();
    await page.goto("/panel/magazalar?durum=aktif");
    await expect(page.getByText("Bu aramaya uyan mağaza yok.")).toBeVisible();

    // bring it back: nothing was lost, it is active again
    await page.goto("/panel/magazalar");
    await row.getByRole("button", { name: "Geri aç" }).click();
    await expect(row.getByRole("button", { name: "Askıya al" })).toBeVisible();
    await page.goto("/panel/magazalar?durum=aktif");
    await expect(row).toBeVisible();
  });
});
