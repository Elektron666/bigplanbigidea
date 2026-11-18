import { expect, test } from "./fixtures";
import { login } from "./helpers";

// The shop panel (Showroom package, job 0): the owner sees their own quotes
// with their customers, changes how a product shows and its price; ORMEN's
// yönetici opens it as the shop for support, read-only and without the
// customers, and that is in the change log.

const ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const quoteNumber = () => `T-${Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("")}`;

test.describe("mağaza paneli", () => {
  test.skip(({ isMobile }) => isMobile, "panel masaüstü için");

  test("girişsiz açılmaz; ORMEN paneline de mağaza hesabıyla girilmez", async ({ page, request }) => {
    const r = await request.get("/magaza", { maxRedirects: 0 });
    expect(r.status()).toBe(307);
    expect(r.headers().location).toContain("/magaza/giris");
    await page.goto("/magaza/giris");
    await page.getByLabel("E-posta").fill("magaza@ormen.local");
    await page.getByLabel("Şifre").fill("yanlis-sifre");
    await page.getByRole("button", { name: "Giriş yap" }).click();
    await expect(page.getByText("E-posta ya da şifre hatalı.")).toBeVisible();
    await page.getByLabel("Şifre").fill("ormen-magaza");
    await page.getByRole("button", { name: "Giriş yap" }).click();
    await expect(page.getByRole("heading", { name: "Teklifler" })).toBeVisible();
    // the shop's session is not a panel session
    await page.goto("/panel");
    await expect(page).toHaveURL(/\/panel\/giris/);
  });

  test("sahip kendi tekliflerini müşterisiyle görür, ürünü kendi adı ve fiyatıyla kaydeder; destek görünümü salt okunur, müşteri adı gizli ve günlükte", async ({ page, browser, request }) => {
    test.setTimeout(180_000);
    const tag = Date.now().toString(36);
    // ORMEN gives the shop the corner sofa
    await login(page);
    await page.goto(`/panel/katalog?ara=${encodeURIComponent("Köşe Takımı")}`);
    await page.locator("main ul").first().getByRole("listitem").filter({ hasText: "Köşe Takımı" }).first().getByRole("checkbox").check();
    const bulk = page.getByRole("complementary", { name: "Toplu atama" });
    await bulk.getByLabel("Mağaza ara").fill("Örnek Mobilya");
    await bulk.getByRole("button", { name: "Listedekilerin hepsini seç" }).click();
    await bulk.getByRole("button", { name: "Mağazalara ekle" }).click();
    await expect(bulk.getByText(/atama eklendi\./)).toBeVisible();

    // a quote made on the shop's page, with the customer's name
    const number = quoteNumber();
    const body = { clientId: `mgz${tag}0001`, number, token: `mgz-${tag}-0123456789abcdef`, pieces: [{ modelSlug: "kose-takimi", fabricCode: "MISSO-05" }], firmSlug: "ornek-mobilya", customerName: "Zeynep Kaya", note: "Cuma arayacak", price: "52.000" };
    expect((await request.post("/api/teklif", { data: body })).status()).toBe(201);

    // the owner
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const shop = await ctx.newPage();
    await shop.goto("/magaza/giris");
    await shop.getByLabel("E-posta").fill("magaza@ormen.local");
    await shop.getByLabel("Şifre").fill("ormen-magaza");
    await shop.getByRole("button", { name: "Giriş yap" }).click();
    await expect(shop.getByText("Örnek Mobilya", { exact: true })).toBeVisible();
    const q = shop.getByTestId("magaza-teklif").filter({ hasText: number });
    await expect(q).toContainText("Köşe Takımı");
    await expect(q).toContainText("Zeynep Kaya · Cuma arayacak");
    await expect(q).toContainText("52.000");

    // their name and price for the product
    await shop.getByRole("link", { name: "Ürünler" }).click();
    const item = shop.getByRole("listitem", { name: /Köşe Takımı|Köşe Lüks/ }).first();
    await item.getByLabel("Mağazadaki adı").fill(`Köşe Lüks ${tag}`);
    await item.getByLabel("Satış fiyatı (TL)").fill("48.500");
    await item.getByLabel("Vitrinde öne çıkar").check();
    await item.getByRole("button", { name: "Kaydet" }).click();
    await expect(item.getByRole("status")).toHaveText("Kaydedildi.");
    await shop.reload();
    const saved = shop.getByRole("listitem", { name: `Köşe Lüks ${tag}` });
    await expect(saved.getByLabel("Satış fiyatı (TL)")).toHaveValue("48.500");
    await expect(saved).toContainText("ORMEN'deki adı: Köşe Takımı");

    // ORMEN sees in the log what the shop changed, but not the price
    await page.goto("/panel/gunluk");
    const renamed = page.getByTestId("gunluk-kaydi").filter({ hasText: `Örnek Mobilya: Köşe Lüks ${tag} mağazada değişti (mağaza)` });
    await expect(renamed).toContainText("Mağaza sahibi");
    await expect(page.getByTestId("gunluk-kaydi").filter({ hasText: "bir ürünün satış fiyatı değişti" }).first()).toBeVisible();
    await expect(page.locator("main")).not.toContainText("48.500");

    // the yönetici's support view
    await page.goto("/panel/magazalar?ara=%C3%96rnek%20Mobilya");
    await page.getByRole("link", { name: "Örnek Mobilya" }).click();
    await expect(page).toHaveURL(/\/panel\/firmalar\//);
    const firmUrl = page.url();
    await page.getByRole("button", { name: "Mağaza gibi görüntüle" }).click();
    await expect(page).toHaveURL(/\/magaza$/);
    await expect(page.getByRole("note", { name: "Destek görünümü" })).toContainText("Değişiklik yapılamaz; müşteri adları gizli.");
    const seen = page.getByTestId("magaza-teklif").filter({ hasText: number });
    await expect(seen).toContainText("Müşteri bilgisi destek görünümünde gizli.");
    await expect(page.locator("main")).not.toContainText("Zeynep Kaya");
    await expect(page.locator("main")).not.toContainText("Cuma arayacak");
    await page.getByRole("link", { name: "Ürünler" }).click();
    const ro = page.getByRole("listitem", { name: `Köşe Lüks ${tag}` });
    await expect(ro.getByLabel("Mağazadaki adı")).toBeDisabled();
    await expect(ro.getByRole("button", { name: "Kaydet" })).toHaveCount(0);
    await page.getByRole("button", { name: "Destek görünümünden çık" }).click();
    await expect(page).toHaveURL(firmUrl);
    // the support view is closed: the shop panel asks for a sign-in again
    await page.goto("/magaza");
    await expect(page).toHaveURL(/\/magaza\/giris/);
    await page.goto("/panel/gunluk");
    await expect(page.getByTestId("gunluk-kaydi").filter({ hasText: "Örnek Mobilya: mağaza paneli destek için mağaza gibi açıldı" }).first()).toBeVisible();
    await ctx.close();
  });
});

test.describe("mağaza paneli hesapları", () => {
  test.skip(({ isMobile }) => isMobile, "panel masaüstü için");

  test("yönetici mağazaya hesap ekler (ilk şifre bir kez görünür), ORMEN hesabını reddeder, erişimi kaldırır; hepsi günlükte, şifre günlükte yok", async ({ page }) => {
    await login(page);
    const tag = Date.now().toString(36);
    await page.goto("/panel/firmalar/yeni");
    await page.getByLabel("Firma adı").fill(`Hesap ${tag}`);
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page.getByText(`Hesap ${tag} kaydedildi.`)).toBeVisible();
    const box = page.getByRole("region", { name: "Mağaza paneli hesapları" });
    await box.getByLabel("Mağaza sahibinin e-postası").fill(`Sahip-${tag}@Ornek.com`);
    await box.getByRole("button", { name: "Hesap ekle" }).click();
    const password = await box.getByTestId("ilk-sifre").innerText();
    expect(password).toMatch(/^[A-Za-z0-9_-]{16}$/);
    await expect(box.getByRole("list", { name: "Hesaplar" })).toContainText(`sahip-${tag}@ornek.com`);
    // once only
    await page.reload();
    await expect(page.getByRole("region", { name: "Mağaza paneli hesapları" }).getByTestId("ilk-sifre")).toHaveCount(0);
    // an ORMEN account is not a shop account
    await box.getByLabel("Mağaza sahibinin e-postası").fill("demo@ormen.local");
    await box.getByRole("button", { name: "Hesap ekle" }).click();
    await expect(box.getByRole("alert")).toHaveText("Bu bir ORMEN hesabı; mağaza hesabı olarak eklenemez.");
    // access taken away, with a confirmation
    await box.getByRole("button", { name: "Erişimi kaldır" }).click();
    await box.getByRole("button", { name: "Evet, çıkar" }).click();
    await expect(box.getByRole("status")).toHaveText(`sahip-${tag}@ornek.com çıkarıldı.`);
    await expect(box.getByRole("list", { name: "Hesaplar" })).toHaveCount(0);
    await page.goto("/panel/gunluk");
    await expect(page.getByTestId("gunluk-kaydi").filter({ hasText: `Hesap ${tag}: sahip-${tag}@ornek.com mağaza paneline eklendi (yeni hesap)` })).toHaveCount(1);
    await expect(page.getByTestId("gunluk-kaydi").filter({ hasText: `Hesap ${tag}: sahip-${tag}@ornek.com mağaza panelinden çıkarıldı` })).toHaveCount(1);
    await expect(page.locator("main")).not.toContainText(password);
  });
});
