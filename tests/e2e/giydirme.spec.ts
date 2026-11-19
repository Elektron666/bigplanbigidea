import sharp from "sharp";
import { expect, test } from "./fixtures";
import { login, sceneFabrics } from "./helpers";

// Showroom package, job 5: "Fotoğraftan dene", with the local stand-in
// provider (GIYDIRME_SAGLAYICI=sahte: nobody is called, nothing is spent).

/** A photo-like JPEG a phone could send. */
async function sofaPhoto(): Promise<Buffer> {
  const w = 1600;
  const h = 1200;
  const raw = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw.fill(y > h * 0.4 && y < h * 0.8 && x > w * 0.2 && x < w * 0.8 ? 120 : 200, (y * w + x) * 3, (y * w + x) * 3 + 3);
  return sharp(raw, { raw: { width: w, height: h, channels: 3 } }).withExif({ IFD3: { GPSLatitudeRef: "N", GPSLatitude: "40/1 11/1 0/1" } }).jpeg().toBuffer();
}

/** Screenshots of the steps when EKRAN_GORUNTUSU names a folder (for a look by eye; off in normal runs). */
const shot = async (p: import("@playwright/test").Page, name: string) => {
  if (process.env.EKRAN_GORUNTUSU) await p.screenshot({ path: `${process.env.EKRAN_GORUNTUSU}/${name}.png` });
};

test.describe("fotoğraftan dene", () => {
  test.skip(({ isMobile }) => isMobile, "showroom ekranı geniş ekran içindir");

  test("telefondan fotoğraf, iki kumaş, etiketli sonuç, kota ve hata; 3D'de aç; ziyaret bitince fotoğraf sunucudan silinir", async ({ page, browser }) => {
    test.setTimeout(240_000);
    await login(page);
    const tag = Date.now().toString(36);
    await page.goto("/panel/firmalar/yeni");
    await page.getByLabel("Firma adı").fill(`Foto ${tag}`);
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page.getByText(`Foto ${tag} kaydedildi.`)).toBeVisible();
    // ORMEN switches it on and gives a quota of 3; the shortest loop time, so the visit ends by itself in the test
    await page.getByRole("switch", { name: "Fotoğraftan dene açık" }).click();
    await expect(page.getByRole("switch", { name: "Fotoğraftan dene açık" })).toHaveAttribute("aria-checked", "true");
    const rec = page.getByRole("region", { name: "Mağaza kaydı" });
    await rec.getByLabel("Aylık fotoğraf denemesi kotası").fill("3");
    await rec.getByLabel("Vitrin süresi (sn)").fill("30");
    await rec.getByRole("button", { name: "Kaydı kaydet" }).click();
    await expect(rec.getByRole("status")).toHaveText("Mağaza kaydı kaydedildi.");
    await page.getByLabel("Ekranın adı").fill("Foto ekranı");
    await page.getByRole("button", { name: "Cihaz ekle" }).click();
    const pairing = (await page.getByTestId("eslestirme-kodu").innerText()).trim();

    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const screen = await ctx.newPage();
    await screen.goto("/showroom");
    for (const d of pairing) await screen.getByRole("button", { name: d, exact: true }).click();
    await expect(screen.getByRole("button", { name: "Başlamak için dokunun" })).toBeVisible();
    await screen.goto("/showroom?m=kose-takimi&k=MISSO-05");
    await screen.getByRole("button", { name: "Başlamak için dokunun" }).click();
    await expect.poll(() => sceneFabrics(screen), { timeout: 60_000 }).toEqual(["MISSO-05"]);

    await screen.getByRole("button", { name: "Fotoğraftan dene" }).click();
    const dialog = screen.getByRole("dialog", { name: "Fotoğraftan dene" });
    await expect(dialog.getByTestId("foto-qr")).toBeVisible();
    const code = (await dialog.getByTestId("foto-kod").innerText()).replace("Kod:", "").trim();
    await shot(screen, "1-foto");

    // the phone: no account, the code only, consent required, one photo
    const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    await phone.goto(`/y/${code}`);
    await expect(phone.getByRole("heading", { name: "Koltuğunuzun fotoğrafını gönderin" })).toBeVisible();
    await phone.locator('input[type="file"]').setInputFiles({ name: "koltuk.jpg", mimeType: "image/jpeg", buffer: await sofaPhoto() });
    await expect(phone.getByRole("button", { name: "Ekrana gönder" })).toBeDisabled();
    await shot(phone, "0-telefon");
    await phone.getByRole("checkbox").check();
    const sent = Date.now();
    await phone.getByRole("button", { name: "Ekrana gönder" }).click();
    await expect(phone.getByRole("status")).toHaveText("Fotoğraf ekrana gönderildi. Ekrandan kumaşları seçebilirsiniz.");
    await phone.reload();
    await expect(phone.getByRole("heading", { name: "Fotoğraf gönderildi" })).toBeVisible();
    // a second photo by the same code is refused at the server too
    const again = await phone.request.post(`/api/giydirme/foto?kod=${code}&onay=1`, { data: await sofaPhoto(), headers: { "content-type": "image/jpeg" } });
    expect(again.status()).toBe(409);

    // the screen moves on by itself; the current fabric is chosen, one more added
    await expect(dialog.getByRole("img", { name: "Çekilen fotoğraf" })).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByRole("button", { name: "MISSO-05" })).toHaveAttribute("aria-pressed", "true");
    await dialog.getByRole("button", { name: "LUMA-02" }).click();
    await shot(screen, "2-kumas");
    await dialog.getByRole("button", { name: "Üret (2 kumaş)" }).click();
    await expect(dialog.getByText(/Yaklaşık 30 sn/)).toBeVisible();
    await shot(screen, "3-uretiliyor");
    const results = dialog.getByTestId("once-sonra");
    await expect(results).toHaveCount(2, { timeout: 30_000 });
    const seconds = (Date.now() - sent) / 1000;
    console.log(`FOTO telefondan gönderimden sonuca: ${seconds.toFixed(1)} sn (sahte sağlayıcı 0,8 sn)`);
    expect(seconds).toBeLessThan(45);
    await expect(dialog.getByText("Kesin görünüm için 3D'de açın, renk onayı için numune isteyin.")).toBeVisible();
    await screen.waitForTimeout(500);
    await shot(screen, "4-sonuc");

    // the picture carries its label in its pixels (a download keeps it), and the photo lost its location
    const pic = await screen.request.get(`/api/giydirme/dosya?kod=${code}&ad=sonuc-MISSO-05`);
    expect(pic.headers()["content-type"]).toBe("image/jpeg");
    const img = await pic.body();
    const meta = await sharp(img).metadata();
    const w = Math.min(Math.round(meta.width! * 0.72), 2452);
    const h = Math.round((w / 1226) * 96);
    const m = Math.round(meta.width! * 0.03);
    const strip = await sharp(await sharp(img).extract({ left: m + 10, top: meta.height! - h - m + 4, width: w - 20, height: h - 8 }).toBuffer()).stats();
    expect(strip.channels[0].mean).toBeLessThan(110);
    expect(strip.channels[0].max).toBeGreaterThan(200);
    const original = await screen.request.get(`/api/giydirme/dosya?kod=${code}&ad=foto`);
    expect((await sharp(await original.body()).metadata()).exif).toBeUndefined();
    // another screen (or nobody) does not get it
    expect((await page.request.get(`/api/giydirme/dosya?kod=${code}&ad=foto`)).status()).toBe(401);

    // "3D'de aç": the same fabric on the piece on the screen; the window opens again on the same photo
    await dialog.getByRole("region", { name: "Sonuç: LUMA-02" }).getByRole("button", { name: "3D'de aç" }).click();
    await expect(dialog).toHaveCount(0);
    await expect.poll(() => sceneFabrics(screen), { timeout: 60_000 }).toEqual(["LUMA-02"]);
    await screen.getByRole("button", { name: "Fotoğraftan dene" }).click();
    await expect(dialog.getByRole("img", { name: "Çekilen fotoğraf" })).toBeVisible();
    // the fabric now on the piece is the one chosen
    await expect(dialog.getByRole("button", { name: "LUMA-02" })).toHaveAttribute("aria-pressed", "true");

    // quota 3, 2 used: two more are refused before anything is made
    await dialog.getByRole("button", { name: "MISSO-05" }).click();
    await dialog.getByRole("button", { name: "SIENA-04" }).click();
    await dialog.getByRole("button", { name: "Üret (3 kumaş)" }).click();
    await expect(dialog.getByRole("alert")).toHaveText("Bu ay 1 deneme hakkı kaldı; daha az kumaş seçin.");
    // a failing fabric: said plainly, can be retried, and it costs no try
    for (const c of ["MISSO-05", "LUMA-02", "SIENA-04"]) await dialog.getByRole("button", { name: c }).click();
    await dialog.getByRole("button", { name: "LUMA-03" }).click();
    await dialog.getByRole("button", { name: "Üret (1 kumaş)" }).click();
    await expect(dialog.getByText("Bu kumaşla fotoğraf hazırlanamadı. Yeniden deneyin; deneme hakkınızdan düşmedi.")).toBeVisible({ timeout: 30_000 });
    await expect(dialog.getByRole("button", { name: "Yeniden dene" })).toBeVisible();
    await dialog.getByRole("button", { name: "Başka kumaşlar dene" }).click();
    await dialog.getByRole("button", { name: "LUMA-03" }).click();
    await dialog.getByRole("button", { name: "SIENA-04" }).click();
    await dialog.getByRole("button", { name: "Üret (1 kumaş)" }).click();
    await expect(results).toHaveCount(1, { timeout: 30_000 });
    // now the month's three are used
    await dialog.getByRole("button", { name: "Başka kumaşlar dene" }).click();
    await dialog.getByRole("button", { name: "Üret (1 kumaş)" }).click();
    await expect(dialog.getByRole("alert")).toHaveText("Bu ayın fotoğraf denemesi hakkı doldu. Yeni ay başında yenilenir.");

    // the visit ends by itself (loop time 30 s): the photo and the pictures are deleted from the server
    await dialog.getByRole("button", { name: "Kapat" }).click();
    await expect(screen.getByRole("alertdialog")).toBeVisible({ timeout: 45_000 });
    await expect(screen.getByRole("button", { name: "Başlamak için dokunun" })).toBeVisible({ timeout: 30_000 });
    await expect.poll(async () => (await screen.request.get(`/api/giydirme/dosya?kod=${code}&ad=foto`)).status(), { timeout: 15_000 }).toBe(404);
    await ctx.close();
  });

  test("giydirme testi: 20 koltuk toplu çalışır; 16'sı gösterilebilir işaretlenince şart sağlanır; oran, süre ve maliyet üstte", async ({ page }) => {
    test.setTimeout(240_000);
    await login(page);
    await page.goto("/panel/giydirme");
    await expect(page.getByText("Sağlayıcı: Deneme sağlayıcı (gerçek değil)")).toBeVisible();
    await page.getByRole("link", { name: "Giydirme testi" }).click();
    const tag = Date.now().toString(36);
    await page.getByLabel("Koşunun adı").fill(`Pilot öncesi ${tag}`);
    await page.getByRole("checkbox", { name: /^MISSO-05 · / }).check();
    await page.getByRole("button", { name: "Koşuyu oluştur" }).click();
    await expect(page.getByRole("heading", { name: `Pilot öncesi ${tag}` })).toBeVisible();

    // twenty sofa photos at once
    const files = await Promise.all(Array.from({ length: 20 }, async (_, i) => ({ name: `koltuk-${i + 1}.jpg`, mimeType: "image/jpeg", buffer: await sofaPhoto() })));
    await page.getByLabel("Fotoğraf ekle").setInputFiles(files);
    await expect(page.getByText("Fotoğraf ekle (20 koltuk)")).toBeVisible({ timeout: 60_000 });
    const started = Date.now();
    await page.getByRole("button", { name: "Çalıştır (20 görsel)" }).click();
    await expect(page.getByRole("button", { name: "Hepsi yapıldı" })).toBeVisible({ timeout: 120_000 });
    console.log(`TEST 20 görsel: ${((Date.now() - started) / 1000).toFixed(1)} sn (sahte sağlayıcı, 4'er 4'er)`);
    const summary = page.getByTestId("test-ozet");
    await expect(summary).toContainText("20/20 görsel yapıldı");
    await expect(summary).toContainText("en az 20 koltuk işaretlenince karar çıkar");

    // ORMEN judges: 16 showable, 4 not; a note on one
    const results = page.getByTestId("test-sonuc");
    await expect(results).toHaveCount(20);
    for (let i = 0; i < 20; i++) {
      const r = results.nth(i);
      await r.getByRole("button", { name: i < 16 ? "Gösterilebilir" : "Gösterilemez" }).click();
      await expect(r.getByRole("button", { name: i < 16 ? "Gösterilebilir" : "Gösterilemez" })).toHaveAttribute("aria-pressed", "true");
    }
    await results.nth(19).getByLabel("MISSO-05 notu").fill("Desen ölçeği büyük kalmış");
    await results.nth(19).getByLabel("MISSO-05 notu").blur();
    await expect(summary).toContainText("%80");
    await expect(summary).toContainText("16 / 20");
    await expect(summary).toContainText("şart sağlandı (en az 16/20)");
    await expect(summary).toContainText("Toplam maliyet");
    await page.reload();
    await expect(page.getByTestId("test-sonuc").nth(19).getByLabel("MISSO-05 notu")).toHaveValue("Desen ölçeği büyük kalmış");
    // one less showable: the gate is not met
    await page.getByTestId("test-sonuc").nth(0).getByRole("button", { name: "Gösterilemez" }).click();
    await expect(page.getByTestId("test-ozet")).toContainText("şart sağlanmadı (en az 16/20)");
    // the run in the list
    await page.goto("/panel/giydirme/test");
    await expect(page.getByRole("list", { name: "Koşular" })).toContainText(`Pilot öncesi ${tag}`);
  });
});
