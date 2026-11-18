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

test.describe("merkez panel: katalog ve toplu atama", () => {
  test.skip(({ isMobile }) => isMobile, "panel masaüstü için");

  test("ürünler mağazalara tek işlemde eklenir ve çıkarılır", async ({ page }) => {
    await login(page);
    // a second shop, and a product of its own
    const tag = Date.now().toString(36);
    await page.goto("/panel/firmalar/yeni");
    await page.getByLabel("Firma adı").fill(`Toplu ${tag}`);
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page.getByText(`Toplu ${tag} kaydedildi.`)).toBeVisible();

    await page.goto("/panel/katalog?sahip=ortak");
    await expect(page.getByRole("heading", { name: "Katalog" })).toBeVisible();
    const products = page.locator("main ul").first().getByRole("listitem");
    const first = products.nth(0);
    const second = products.nth(1);
    const firstName = (await first.getByRole("link").innerText()).trim();
    await first.getByRole("checkbox").check();
    await second.getByRole("checkbox").check();

    const panel = page.getByRole("complementary", { name: "Toplu atama" });
    await panel.getByLabel("Mağaza ara").fill(`Toplu ${tag}`);
    await panel.getByRole("button", { name: "Listedekilerin hepsini seç" }).click();
    await expect(panel.getByText("2 ürün, 1 mağaza seçili.")).toBeVisible();
    await panel.getByRole("button", { name: "Mağazalara ekle" }).click();
    await expect(panel.getByText("2 atama eklendi.")).toBeVisible();

    // the same again adds nothing: what the shop already has is left as it is
    await products.nth(0).getByRole("checkbox").check();
    await panel.getByRole("button", { name: "Mağazalara ekle" }).click();
    await expect(panel.getByText("0 atama eklendi.")).toBeVisible();

    // the shop filter shows exactly what that shop has
    const shopOption = await page.locator("select[name=magaza] option", { hasText: `Toplu ${tag}` }).getAttribute("value");
    await page.goto(`/panel/katalog?magaza=${shopOption}`);
    await expect(page.locator("main ul").first().getByRole("listitem")).toHaveCount(2);
    await expect(page.getByRole("link", { name: firstName, exact: true })).toBeVisible();

    // take one away
    const mine = page.locator("main ul").first().getByRole("listitem");
    await mine.nth(0).getByRole("checkbox").check();
    const panel2 = page.getByRole("complementary", { name: "Toplu atama" });
    await panel2.getByLabel("Mağaza ara").fill(`Toplu ${tag}`);
    await panel2.getByRole("button", { name: "Listedekilerin hepsini seç" }).click();
    await panel2.getByRole("button", { name: "Çıkar" }).click();
    await expect(panel2.getByText("1 atama çıkarıldı.")).toBeVisible();
    await expect(page.locator("main ul").first().getByRole("listitem")).toHaveCount(1);
  });
});

test.describe("merkez panel: mağaza bazında özellikler", () => {
  test.skip(({ isMobile }) => isMobile, "panel masaüstü için");

  test("kapatılan özellik mağaza sayfasından kalkar ve uç da reddeder; açınca geri gelir", async ({ page, request }) => {
    test.setTimeout(150_000);
    await login(page);
    const tag = Date.now().toString(36);
    await page.goto("/panel/firmalar/yeni");
    await page.getByLabel("Firma adı").fill(`Özellik ${tag}`);
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page.getByText(`Özellik ${tag} kaydedildi.`)).toBeVisible();
    const slug = (await page.getByText(/\/f\/ozellik-/).first().innerText()).match(/\/f\/(ozellik-[a-z0-9-]+)/)![1];
    const panelUrl = page.url();

    const site = await page.context().browser()!.newPage();
    await site.goto(`/f/${slug}`);
    await expect(site.getByRole("button", { name: "Metraj ve teklif" })).toBeVisible({ timeout: 60_000 });
    await expect(site.getByRole("tab", { name: "Köşe kur" })).toBeVisible();

    // off
    const teklif = page.getByRole("switch", { name: "Metraj ve teklif açık" });
    await expect(teklif).toHaveAttribute("aria-checked", "true");
    await teklif.click();
    await expect(teklif).toHaveAttribute("aria-checked", "false");
    await page.getByRole("switch", { name: "Köşe kurucu açık" }).click();
    await expect(page.getByRole("switch", { name: "Köşe kurucu açık" })).toHaveAttribute("aria-checked", "false");
    await site.reload();
    await expect(site.getByRole("button", { name: "Numune iste" })).toBeVisible({ timeout: 60_000 });
    await expect(site.getByRole("button", { name: "Metraj ve teklif" })).toHaveCount(0);
    await expect(site.getByRole("tab", { name: "Köşe kur" })).toHaveCount(0);
    // not only hidden: the endpoint refuses it too
    const body = { clientId: `ozl${tag}0001`, number: "T-XZL234", token: `ozl-${tag}-0123456789abcdef`, pieces: [{ modelSlug: "berjer", fabricCode: "MISSO-05" }], firmSlug: slug };
    expect((await request.post("/api/teklif", { data: body })).status()).toBe(403);

    // the switch survives a reload of the panel, and the firm form's save does not reset it
    await page.goto(panelUrl);
    await expect(page.getByRole("switch", { name: "Metraj ve teklif açık" })).toHaveAttribute("aria-checked", "false");
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page.getByText(`Özellik ${tag} kaydedildi.`)).toBeVisible();
    await expect(page.getByRole("switch", { name: "Metraj ve teklif açık" })).toHaveAttribute("aria-checked", "false");

    // on again
    await page.getByRole("switch", { name: "Metraj ve teklif açık" }).click();
    await expect(page.getByRole("switch", { name: "Metraj ve teklif açık" })).toHaveAttribute("aria-checked", "true");
    await site.reload();
    await expect(site.getByRole("button", { name: "Metraj ve teklif" })).toBeVisible({ timeout: 60_000 });
    await site.close();
  });
});

test.describe("merkez panel: değişiklik günlüğü", () => {
  test.skip(({ isMobile }) => isMobile, "panel masaüstü için");

  test("askıya alma ve toplu atama günlükte görünür ve oradan geri alınır", async ({ page }) => {
    test.setTimeout(150_000);
    await login(page);
    const tag = Date.now().toString(36);
    await page.goto("/panel/firmalar/yeni");
    await page.getByLabel("Firma adı").fill(`Günlük ${tag}`);
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page.getByText(`Günlük ${tag} kaydedildi.`)).toBeVisible();

    // suspend it
    await page.goto(`/panel/magazalar?ara=${encodeURIComponent(`Günlük ${tag}`)}`);
    const shop = page.getByRole("listitem").filter({ hasText: `Günlük ${tag}` });
    await shop.getByRole("button", { name: "Askıya al" }).click();
    await expect(shop.getByRole("button", { name: "Geri aç" })).toBeVisible();

    // give it one product in bulk
    await page.goto("/panel/katalog?sahip=ortak");
    await page.locator("main ul").first().getByRole("listitem").first().getByRole("checkbox").check();
    const panel = page.getByRole("complementary", { name: "Toplu atama" });
    await panel.getByLabel("Mağaza ara").fill(`Günlük ${tag}`);
    await panel.getByRole("button", { name: "Listedekilerin hepsini seç" }).click();
    await panel.getByRole("button", { name: "Mağazalara ekle" }).click();
    await expect(panel.getByText("1 atama eklendi.")).toBeVisible();

    // both are in the log, newest first; undo them from there
    await page.goto("/panel/gunluk");
    const assign = page.getByTestId("gunluk-kaydi").filter({ hasText: "1 mağazaya eklendi" }).first();
    await expect(assign).toContainText("toplu işlem");
    await assign.getByRole("button", { name: /^Geri al/ }).click();
    await assign.getByRole("button", { name: "Evet, geri al" }).click();
    await expect(page.getByTestId("gunluk-kaydi").filter({ hasText: "Geri alındı:" }).first()).toBeVisible();

    // the original entry only (the undo writes its own "Geri alındı: …" entry with the same words)
    const suspend = page.getByTestId("gunluk-kaydi").filter({ hasText: new RegExp(`^Günlük ${tag}: Aktif → Askıda`) });
    await suspend.getByRole("button", { name: /^Geri al/ }).click();
    await suspend.getByRole("button", { name: "Evet, geri al" }).click();
    await expect(suspend.getByText("geri alındı")).toBeVisible();
    // an entry undone has no second undo
    await expect(suspend.getByRole("button", { name: /^Geri al/ })).toHaveCount(0);

    // the shop is active again and has no products
    await page.goto(`/panel/magazalar?ara=${encodeURIComponent(`Günlük ${tag}`)}`);
    await expect(page.getByRole("listitem").filter({ hasText: `Günlük ${tag}` }).getByRole("button", { name: "Askıya al" })).toBeVisible();
    const shopId = await page.getByRole("link", { name: `Günlük ${tag}` }).getAttribute("href");
    await page.goto(`/panel/katalog?magaza=${shopId!.split("/").pop()}`);
    await expect(page.getByText("Bu aramaya uyan ürün yok.")).toBeVisible();
  });
});
