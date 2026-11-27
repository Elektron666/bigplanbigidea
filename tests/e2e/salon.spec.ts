import sharp from "sharp";
import { expect, test } from "./fixtures";
import { login, sceneFabrics } from "./helpers";

// Job 15: the customer's room. The photo comes from the phone (QR code, consent),
// the screen's 3D product goes into it on the local stand-in provider (nobody is
// called, nothing is spent); the picture carries its label in itself; closing
// the window deletes the photo and the picture from the server.

const room = () => sharp({ create: { width: 1600, height: 1200, channels: 3, background: "#e6e0d6" } }).jpeg().toBuffer();

test.describe("müşterinin salonu", () => {
  test.skip(({ isMobile }) => isMobile, "showroom ekranı geniş ekran içindir");

  test("telefondan salon fotoğrafı, ürün yerleştirilmiş etiketli ön izleme; kapatınca fotoğraf silinir", async ({ page, browser }) => {
    test.setTimeout(240_000);
    page.setDefaultTimeout(30_000);
    const tag = Date.now().toString(36);
    await login(page);
    await page.goto("/panel/firmalar/yeni");
    await page.getByLabel("Firma adı").fill(`Salon ${tag}`);
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page.getByText(`Salon ${tag} kaydedildi.`)).toBeVisible();
    await page.getByRole("switch", { name: "Müşterinin salonunda açık" }).click();
    await expect(page.getByRole("switch", { name: "Müşterinin salonunda açık" })).toHaveAttribute("aria-checked", "true");
    const rec = page.getByRole("region", { name: "Mağaza kaydı" });
    await rec.getByLabel("Aylık fotoğraf denemesi kotası").fill("5");
    await rec.getByRole("button", { name: "Kaydı kaydet" }).click();
    await expect(rec.getByRole("status")).toHaveText("Mağaza kaydı kaydedildi.");
    await page.getByLabel("Ekranın adı").fill("Salon ekranı");
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
    // the sofa try-on is off in this shop: only the room preview is offered
    await expect(screen.getByRole("button", { name: "Fotoğraftan dene" })).toHaveCount(0);
    await screen.getByRole("button", { name: "Salonunuzda görün" }).click();
    const dialog = screen.getByRole("dialog", { name: "Salonunuzda görün" });
    const code = (await dialog.getByTestId("salon-kod").innerText()).replace("Kod:", "").trim();

    // the phone: the room, consent, one photo
    const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    await phone.goto(`/y/${code}`);
    await expect(phone.getByRole("heading", { name: "Salonunuzun fotoğrafını gönderin" })).toBeVisible();
    await phone.locator('input[type="file"]').setInputFiles({ name: "salon.jpg", mimeType: "image/jpeg", buffer: await room() });
    await phone.getByRole("checkbox").check();
    await phone.getByRole("button", { name: "Ekrana gönder" }).click();
    await expect(phone.getByRole("status")).toContainText("Fotoğraf ekrana gönderildi.");

    // the screen: the preview
    await expect(dialog.getByText("Fotoğraf geldi.")).toBeVisible({ timeout: 15_000 });
    await dialog.getByRole("button", { name: "Ön izlemeyi hazırla" }).click();
    const img = dialog.getByTestId("salon-sonuc");
    await expect(img).toBeVisible({ timeout: 60_000 });
    const src = (await img.getAttribute("src"))!;
    // the label is in the picture itself: the strip at the bottom left is dark on a light room
    const file = await (await screen.request.get(src)).body();
    const meta = await sharp(file).metadata();
    const px = await sharp(file).extract({ left: Math.round(meta.width! * 0.03) + 6, top: meta.height! - Math.round(meta.width! * 0.03) - 12, width: 4, height: 4 }).raw().toBuffer();
    expect(px[0]).toBeLessThan(120);
    // a room photo cannot be kept for the shop
    expect((await screen.request.post(`/api/giydirme/sakla?kod=${code}&sakla=1`)).status()).toBe(409);

    // closing the window deletes the photo and the picture
    await dialog.getByRole("button", { name: "Kapat" }).click();
    await expect.poll(async () => (await screen.request.get(src)).status(), { timeout: 15_000 }).not.toBe(200);
    await ctx.close();
  });
});
