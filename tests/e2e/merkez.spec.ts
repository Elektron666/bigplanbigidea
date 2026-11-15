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
    // other tests may have opened active shops; this one is not among them
    await page.goto("/panel/magazalar?durum=aktif");
    await expect(page.getByRole("heading", { name: "Mağazalar" })).toBeVisible();
    await expect(row).toHaveCount(0);

    // bring it back: nothing was lost, it is active again
    await page.goto("/panel/magazalar");
    await row.getByRole("button", { name: "Geri aç" }).click();
    await expect(row.getByRole("button", { name: "Askıya al" })).toBeVisible();
    await page.goto("/panel/magazalar?durum=aktif");
    await expect(row).toBeVisible();
  });
});

test.describe("merkez panel: mağaza bazında gösterim", () => {
  test.skip(({ isMobile }) => isMobile, "panel masaüstü için");

  test("ortak ürün mağazada kendi adıyla görünür; merkezdeki adı değişmez", async ({ page }) => {
    await login(page);
    await page.goto("/panel/firmalar");
    await page.getByRole("link", { name: "Örnek Mobilya" }).click();
    // give the shop the first two shared products
    const picks = page.locator("label", { hasText: "ORMEN vitrini" });
    for (const i of [0, 1]) {
      const box = picks.nth(i).getByRole("checkbox");
      if (!(await box.isChecked())) await box.check();
    }
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page.getByText("Örnek Mobilya kaydedildi.")).toBeVisible();

    const section = page.getByRole("region", { name: "Bu mağazada nasıl görünsün" });
    const row = section.getByRole("listitem").first();
    const central = (await row.locator("p").first().innerText()).trim();
    const shopName = `Lara ${Date.now().toString(36)}`;
    await row.getByLabel("Mağazadaki adı").fill(shopName);
    await row.getByLabel("Ürün kodu").fill("LR-300");
    await row.getByRole("button", { name: /kaydet/ }).click();
    await expect(row.getByText("Kaydedildi.")).toBeVisible();

    // the shop's page shows the shop's name; ORMEN's own page still shows the centre's
    await page.goto("/f/ornek-mobilya");
    await expect(page.getByText(shopName).first()).toBeVisible();
    await page.goto("/panel/modeller");
    await expect(page.getByText(central).first()).toBeVisible();
    await expect(page.getByText(shopName)).toHaveCount(0);

    // saving the shop again keeps the name (the product list is not wiped and rebuilt)
    await page.goto("/panel/firmalar");
    await page.getByRole("link", { name: "Örnek Mobilya" }).click();
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page.getByText("Örnek Mobilya kaydedildi.")).toBeVisible();
    await expect(page.getByRole("region", { name: "Bu mağazada nasıl görünsün" }).getByRole("listitem").first().getByLabel("Mağazadaki adı")).toHaveValue(shopName);
  });
});
