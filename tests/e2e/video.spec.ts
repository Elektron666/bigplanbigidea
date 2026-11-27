import { expect, test } from "./fixtures";
import { login, sceneFabrics } from "./helpers";

// Job 13: the turning video to the phone, and the customer's contact for the
// shop. The video is made on the screen (no service), at most 10 MB; the
// phone opens it by its link; a name and phone are kept only with the box
// ticked, only by a shop that set a keeping period; the shop deletes them for
// good; ORMEN sees counts only.

test.describe("telefona video ve müşteri kaydı", () => {
  test.skip(({ isMobile }) => isMobile, "showroom ekranı geniş ekran içindir");

  test("ekranda dönen video, telefonda açılır; rıza kutusuyla kayıt, mağaza siler, ORMEN yalnız sayı görür", async ({ page, browser }) => {
    test.setTimeout(240_000);
    page.setDefaultTimeout(30_000);
    const name = `Zeynep ${Date.now().toString(36)}`;

    // the shop sets how long it keeps contacts
    const owner = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const shop = await owner.newPage();
    await shop.goto("/magaza/giris");
    await shop.getByLabel("E-posta").fill("magaza@ormen.local");
    await shop.getByLabel("Şifre").fill("ormen-magaza");
    await shop.getByRole("button", { name: "Giriş yap" }).click();
    await shop.getByRole("link", { name: "Müşteriler" }).click();
    await shop.getByLabel("Saklama süresi (gün)").fill("30");
    await shop.getByRole("button", { name: "Kaydet" }).click();
    await expect(shop.getByRole("status")).toHaveText("Saklama süresi 30 gün.");

    // a screen of the shop
    await login(page);
    await page.goto("/panel/firmalar/seed-firm-ornek");
    await page.getByLabel("Ekranın adı").fill(`Video ${Date.now().toString(36)}`);
    await page.getByRole("button", { name: "Cihaz ekle" }).click();
    const pairing = (await page.getByTestId("eslestirme-kodu").innerText()).trim();
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const screen = await ctx.newPage();
    screen.setDefaultTimeout(30_000);
    await screen.goto("/showroom");
    for (const d of pairing) await screen.getByRole("button", { name: d, exact: true }).click();
    await expect(screen.getByRole("button", { name: "Başlamak için dokunun" })).toBeVisible();
    await screen.goto("/showroom?m=berjer&k=LUMA-02");
    await screen.getByRole("button", { name: "Başlamak için dokunun" }).click();
    await expect.poll(() => sceneFabrics(screen), { timeout: 60_000 }).toEqual(["LUMA-02"]);

    await screen.getByRole("button", { name: "Telefona video" }).click();
    const dialog = screen.getByRole("dialog", { name: "Telefona video" });
    await expect(dialog.getByTestId("video-qr")).toBeVisible({ timeout: 90_000 });
    const mb = Number((await dialog.getByTestId("video-bilgi").innerText()).split(" MB")[0].replace(",", "."));
    expect(mb).toBeLessThanOrEqual(10);
    const url = new URL(await dialog.getByTestId("video-adres").innerText());
    await ctx.close();

    // the phone
    const phoneCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const phone = await phoneCtx.newPage();
    await phone.goto(url.pathname);
    const video = phone.getByTestId("video");
    await expect(video).toBeVisible();
    const file = await phone.request.get((await video.getAttribute("src"))!);
    expect(file.status()).toBe(200);
    expect(file.headers()["content-type"]).toMatch(/^video\/(mp4|webm)$/);
    expect((await file.body()).length).toBeLessThanOrEqual(10 * 1024 * 1024);
    // it plays: the browser reads its length (about 9 s)
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState), { timeout: 20_000 }).toBeGreaterThan(0);

    // without the box: no record (the button waits, and the server refuses anyway)
    await phone.getByLabel("Adınız").fill(name);
    await phone.getByLabel("Telefonunuz").fill("0532 123 45 67");
    await expect(phone.getByRole("button", { name: "Gönder" })).toBeDisabled();
    const sneaky = await phone.request.post("/api/musteri", { data: { video: url.pathname.split("/")[2], name, phone: "05321234567" } });
    expect(sneaky.status()).toBe(422);
    await phone.getByRole("checkbox").check();
    await phone.getByRole("button", { name: "Gönder" }).click();
    await expect(phone.getByRole("status")).toContainText("Teşekkürler.");
    await phoneCtx.close();

    // ORMEN: a number, never the name
    await page.goto("/panel/rapor/magazalar");
    await expect(page.getByTestId("musteri-sayilari")).toContainText("Örnek Mobilya: 1");
    expect(await page.content()).not.toContain(name);

    // the shop: the record (once), then deleted for good
    await shop.reload();
    const row = shop.getByTestId("musteri").filter({ hasText: name });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText("0532 123 45 67");
    await row.getByRole("button", { name: `${name} sil` }).click();
    await expect(shop.getByTestId("musteri").filter({ hasText: name })).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId("musteri-sayilari")).toHaveCount(0);
    await owner.close();
  });
});
