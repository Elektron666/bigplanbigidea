import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import QRCode from "qrcode";
import sharp from "sharp";
import { chromium } from "@playwright/test";
import { expect, test } from "./fixtures";
import { login, sceneFabrics } from "./helpers";

// The demo of the brief (section 1), its six steps one after the other on ONE
// paired showroom screen, without reloading between them:
//   1. a photo of the shop owner's own sofa, in an ORMEN fabric (photo try-on)
//   2. the physical swatch card held to the screen: the 3D sofa takes it (kartela)
//   3. the same fabric on the 3D sofa, part by part, at real scale
//   4. a corner set built to measure (corner builder)
//   5. metres, the quote PDF, the quote to the phone, the order request to ORMEN
//   6. left alone, the screen goes into its showroom loop by itself
// The camera is Chromium's fake one, showing the swatch card's label (the same
// picture serves as the "sofa photo" for step 1); the photo try-on runs on the
// local stand-in provider (nobody is called, nothing is spent).

const BASE = process.env.E2E_BASE_URL || "http://localhost:3100";

async function cameraClip(qrText: string): Promise<string> {
  const dir = path.join(__dirname, "../../test-results/demo-kamera");
  mkdirSync(dir, { recursive: true });
  const qr = await QRCode.toBuffer(qrText, { errorCorrectionLevel: "H", margin: 2, width: 230 });
  const frame = await sharp({ create: { width: 1280, height: 720, channels: 3, background: { r: 128, g: 124, b: 118 } } })
    .composite([
      { input: await sharp({ create: { width: 330, height: 400, channels: 3, background: { r: 246, g: 244, b: 240 } } }).png().toBuffer(), left: 520, top: 150 },
      { input: qr, left: 570, top: 190 },
    ])
    .jpeg({ quality: 85 })
    .toBuffer();
  const file = path.join(dir, "misso-05.mjpeg");
  writeFileSync(file, Buffer.concat(Array.from({ length: 5 }, () => frame)));
  return file;
}

test.describe("demo akışı", () => {
  test.skip(({ isMobile }) => isMobile, "showroom ekranı geniş ekran içindir");

  test("altı adım tek ekranda, kesintisiz", async ({ page }) => {
    test.setTimeout(420_000);
    page.setDefaultTimeout(45_000);
    const times: [string, number][] = [];
    let t0 = Date.now();
    const lap = (name: string) => {
      times.push([name, (Date.now() - t0) / 1000]);
      t0 = Date.now();
    };

    // ---- the shop, set up in the panel (not part of the demo's clock)
    await login(page);
    await page.goto("/panel/kumaslar");
    await page.getByRole("link", { name: /MISSO-05/ }).first().click();
    await page.getByLabel("En (cm)").fill("140");
    await page.getByRole("combobox", { name: /^Desen/ }).selectOption("duz");
    await page.getByRole("combobox", { name: /^Kesim yönü/ }).selectOption("cift");
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page).toHaveURL(/kaydedildi=MISSO-05/);
    const tag = Date.now().toString(36);
    await page.goto("/panel/firmalar/yeni");
    await page.getByLabel("Firma adı").fill(`Demo ${tag}`);
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page.getByText(`Demo ${tag} kaydedildi.`)).toBeVisible();
    const slug = (await page.getByText(/\/f\/demo-/).first().innerText()).match(/\/f\/(demo-[a-z0-9-]+)/)![1];
    await page.getByRole("switch", { name: "Fotoğraftan dene açık" }).click();
    const rec = page.getByRole("region", { name: "Mağaza kaydı" });
    await rec.getByLabel("Aylık fotoğraf denemesi kotası").fill("20");
    // the shortest loop time: holding the card to the camera, untouched, must not restart the screen
    await rec.getByLabel("Vitrin süresi (sn)").fill("30");
    await rec.getByRole("button", { name: "Kaydı kaydet" }).click();
    await expect(rec.getByRole("status")).toHaveText("Mağaza kaydı kaydedildi.");
    await page.getByLabel("Ekranın adı").fill("Demo ekranı");
    await page.getByRole("button", { name: "Cihaz ekle" }).click();
    const pairing = (await page.getByTestId("eslestirme-kodu").innerText()).trim();

    // ---- one screen: a browser whose camera sees the MISSO-05 swatch card
    const browser = await chromium.launch({
      executablePath: process.env.PW_CHROMIUM_PATH || undefined,
      args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-video-capture=${await cameraClip(`${BASE}/k/${slug}/MISSO-05`)}`],
    });
    try {
      const ctx = await browser.newContext({ baseURL: BASE, viewport: { width: 1920, height: 1080 }, permissions: ["camera"], acceptDownloads: true });
      ctx.setDefaultTimeout(45_000);
      const screen = await ctx.newPage();
      await screen.goto("/showroom");
      for (const d of pairing) await screen.getByRole("button", { name: d, exact: true }).click();
      await expect(screen.getByRole("button", { name: "Başlamak için dokunun" })).toBeVisible();
      await screen.goto("/showroom?m=kose-takimi&k=LUMA-02");
      await screen.getByRole("button", { name: "Başlamak için dokunun" }).click();
      await expect.poll(() => sceneFabrics(screen), { timeout: 60_000 }).toEqual(["LUMA-02"]);
      const url = screen.url();
      t0 = Date.now();

      // 1. photo try-on: the screen's camera, one fabric, the labelled picture
      await screen.getByRole("button", { name: "Fotoğraftan dene" }).click();
      const tryOn = screen.getByRole("dialog", { name: "Fotoğraftan dene" });
      await tryOn.getByRole("button", { name: "Kamerayı aç" }).click();
      await tryOn.getByRole("checkbox").check();
      await tryOn.getByRole("button", { name: "Çek", exact: true }).click();
      await expect(tryOn.getByRole("img", { name: "Çekilen fotoğraf" })).toBeVisible({ timeout: 15_000 });
      await tryOn.getByRole("button", { name: "Üret (1 kumaş)" }).click();
      await expect(tryOn.getByTestId("once-sonra")).toHaveCount(1, { timeout: 60_000 });
      await tryOn.getByRole("button", { name: "Kapat" }).click();
      lap("1. Fotoğraftan dene");

      // 2. the swatch card to the camera: the 3D sofa takes MISSO-05
      await screen.getByRole("button", { name: "Kartela okut" }).click();
      await expect(screen.getByRole("dialog", { name: "Kartelanın QR etiketini kameraya tutun" })).toHaveCount(0, { timeout: 15_000 });
      await expect.poll(() => sceneFabrics(screen), { timeout: 30_000 }).toEqual(["MISSO-05"]);
      lap("2. Sihirli kartela");

      // 3. part by part: the arms in another fabric, the rest stays
      await screen.getByRole("radio", { name: "Kollar" }).click();
      await screen.getByRole("radio", { name: /^LUMA-02,/ }).first().click();
      await expect.poll(() => sceneFabrics(screen), { timeout: 30_000 }).toEqual(["LUMA-02", "MISSO-05"]);
      await screen.getByRole("radiogroup", { name: "Kumaşın gideceği yer" }).getByRole("radio", { name: "Tümü" }).click();
      await screen.getByRole("radio", { name: /^MISSO-05,/ }).first().click();
      await expect.poll(() => sceneFabrics(screen), { timeout: 30_000 }).toEqual(["MISSO-05"]);
      lap("3. Parça parça inceleme");

      // 4. a corner set to measure, on the sample set
      await screen.getByRole("tab", { name: "Köşe kur" }).click();
      const b = screen.getByTestId("kose-kurucu");
      for (const m of ["Sol kol", "Tekli oturum", "Köşe", "Tekli oturum", "Tekli oturum", "Tekli oturum", "Sağ kol"]) await b.getByRole("button", { name: new RegExp(`^${m} ekle`) }).click();
      await expect(b.getByTestId("kose-olculer")).toContainText("Kapladığı alan315 cm × 185 cm");
      await expect.poll(() => sceneFabrics(screen), { timeout: 60_000 }).toEqual(["MISSO-05"]);
      lap("4. Köşe kurucu");

      // 5. metres, the quote, its PDF and phone link, the order request
      await screen.getByRole("button", { name: "Metraj ve teklif" }).click();
      const quote = screen.getByTestId("teklif");
      await expect(quote.getByTestId("teklif-toplam")).toContainText("MISSO-05");
      await quote.getByRole("button", { name: "Teklifi oluştur" }).click();
      await expect(quote.getByText(/Teklif T-[0-9A-Z]{6} hazır\./)).toBeVisible({ timeout: 30_000 });
      await expect(quote.getByRole("img", { name: "Teklifi telefona almak için QR kod" })).toBeVisible();
      const [pdf] = await Promise.all([screen.waitForEvent("download"), quote.getByRole("button", { name: "PDF indir" }).click()]);
      expect(pdf.suggestedFilename()).toMatch(/^teklif-T-[0-9A-Z]{6}\.pdf$/);
      await quote.getByRole("button", { name: "ORMEN'e sipariş talebi gönder" }).click();
      await expect(quote.getByRole("button", { name: "Sipariş talebi gönderildi" })).toBeDisabled({ timeout: 30_000 });
      lap("5. Metraj, teklif, PDF, sipariş talebi");

      // 6. left alone (30 s): back to the showroom loop by itself
      await quote.getByRole("button", { name: "Kapat" }).click().catch(() => undefined);
      await expect(screen.getByRole("button", { name: "Başlamak için dokunun" })).toBeVisible({ timeout: 70_000 });
      lap("6. Vitrin döngüsü (30 sn bekleme dahil)");
      expect(new URL(screen.url()).pathname).toBe(new URL(url).pathname);

      // the order request is with ORMEN
      await page.goto("/panel/siparisler");
      await expect(page.getByTestId("siparis").filter({ hasText: `Demo ${tag}` })).toHaveCount(1);
    } finally {
      await browser.close();
      console.log(`DEMO\n${times.map(([n, s]) => `  ${n}: ${s.toFixed(1)} sn`).join("\n")}\n  Toplam: ${times.reduce((a, [, s]) => a + s, 0).toFixed(1)} sn`);
    }
  });
});
