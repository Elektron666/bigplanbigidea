import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import QRCode from "qrcode";
import sharp from "sharp";
import { chromium, type Browser, type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { login, sceneFabrics } from "./helpers";

// Showroom package, job 2: "sihirli kartela". The panel prints swatch labels;
// a phone that scans one opens the page with the fabric; a showroom screen
// that sees one through its camera dresses the sofa in it, offline too.
//
// The screen's camera is Chromium's fake camera, playing a picture of the
// printed label: the very QR the label page prints, about the size a
// 26 mm label shows at 30 cm on a 720p screen camera.

const BASE = process.env.E2E_BASE_URL || "http://localhost:3100";
const DIR = path.join(__dirname, "../../test-results/kartela-kamera");

/** A short MJPEG clip (a few identical frames) of a label held up to the camera. */
async function cameraClip(name: string, qrText: string): Promise<string> {
  mkdirSync(DIR, { recursive: true });
  const qr = await QRCode.toBuffer(qrText, { errorCorrectionLevel: "H", margin: 2, width: 230 });
  // a hand-held card on a grey shop background, slightly off-centre
  const frame = await sharp({ create: { width: 1280, height: 720, channels: 3, background: { r: 128, g: 124, b: 118 } } })
    .composite([
      { input: await sharp({ create: { width: 330, height: 400, channels: 3, background: { r: 246, g: 244, b: 240 } } }).png().toBuffer(), left: 520, top: 150 },
      { input: qr, left: 570, top: 190 },
    ])
    .jpeg({ quality: 85 })
    .toBuffer();
  const file = path.join(DIR, `${name}.mjpeg`);
  writeFileSync(file, Buffer.concat(Array.from({ length: 5 }, () => frame)));
  return file;
}

/** A browser whose camera shows the clip, with the camera already allowed. */
async function screenBrowser(clip: string): Promise<Browser> {
  return chromium.launch({
    executablePath: process.env.PW_CHROMIUM_PATH || undefined,
    args: [
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist",
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      `--use-file-for-fake-video-capture=${clip}`,
    ],
  });
}

async function pairCode(panel: Page, name: string): Promise<string> {
  await panel.goto("/panel/firmalar");
  await panel.getByRole("link", { name: "Örnek Mobilya" }).click();
  await panel.getByLabel("Ekranın adı").fill(name);
  await panel.getByRole("button", { name: "Cihaz ekle" }).click();
  return (await panel.getByTestId("eslestirme-kodu").innerText()).trim();
}

async function openShowroom(browser: Browser, code: string): Promise<Page> {
  const context = await browser.newContext({ baseURL: BASE, viewport: { width: 1920, height: 1080 }, permissions: ["camera"] });
  const screen = await context.newPage();
  await screen.goto("/showroom");
  for (const d of code) await screen.getByRole("button", { name: d, exact: true }).click();
  await screen.getByRole("button", { name: "Başlamak için dokunun" }).click();
  return screen;
}

test.describe("sihirli kartela", () => {
  test.skip(({ isMobile }) => isMobile, "panel ve showroom ekranı geniş ekran içindir");

  test("panelde seçilen kumaşların etiketi basılır; telefonla okutulan kısa adres mağaza sayfasını o kumaşla açar", async ({ page, request }) => {
    await login(page);
    await page.goto("/panel/kumaslar");
    await page.getByLabel("MISSO-05: kartela etiketi").check();
    await page.getByLabel("MISSO-01: kartela etiketi").check();
    await page.getByLabel("Telefonla okutulunca açılacak sayfa").selectOption({ label: "Örnek Mobilya" });
    const [labels] = await Promise.all([page.context().waitForEvent("page"), page.getByRole("button", { name: "Seçilenlerin etiketini aç" }).click()]);
    await expect(labels.getByTestId("kartela-etiketi")).toHaveCount(2);
    await expect(labels.getByTestId("kartela-etiketi").first()).toContainText("MISSO-");
    const href = await labels.getByRole("img", { name: "MISSO-05 QR" }).getAttribute("data-href");
    expect(new URL(href!).pathname).toBe("/k/ornek-mobilya/MISSO-05");

    // a phone scanning it: the shop's page, with the fabric, counted as a printed QR
    const r = await request.get("/k/ornek-mobilya/MISSO-05", { maxRedirects: 0 });
    expect(r.status()).toBe(307);
    expect(r.headers().location).toMatch(/\/f\/ornek-mobilya\?q&k=MISSO-05&e=kartela$/);
    await page.goto("/k/ornek-mobilya/MISSO-05");
    await expect.poll(() => sceneFabrics(page), { timeout: 60_000 }).toEqual(["MISSO-05"]);
    // an unknown code still opens the page, without a fabric forced on it
    const unknown = await request.get("/k/ornek-mobilya/YOK-99", { maxRedirects: 0 });
    expect(unknown.headers().location).toMatch(/\/f\/ornek-mobilya\?q&e=kartela$/);
  });

  test("ekran kamerası etiketi okur, kumaş giyer; internet yokken de", async ({ page }) => {
    test.setTimeout(240_000);
    await login(page);
    const code = await pairCode(page, `Kartela ${Date.now().toString(36)}`);
    // the label's own address (the label page prints exactly this)
    const browser = await screenBrowser(await cameraClip("misso-05", `${BASE}/k/ornek-mobilya/MISSO-05`));
    try {
      const screen = await openShowroom(browser, code);
      await expect(screen.locator("html")).toHaveAttribute("data-onbellek", "hazir", { timeout: 120_000 });
      expect(await sceneFabrics(screen)).not.toContain("MISSO-05");

      // no internet, screen restarted: reading happens on the device
      await screen.context().setOffline(true);
      await screen.reload();
      await screen.getByRole("button", { name: "Başlamak için dokunun" }).click();
      await expect(screen.getByTestId("cevrimdisi")).toBeVisible();
      // the reading is timed on a screen that has finished opening (the scene is up),
      // as in the shop: a label is held up to a screen that is already showing a sofa
      await expect(screen.getByRole("button", { name: "Telefona al" })).toBeVisible({ timeout: 60_000 });
      await expect.poll(async () => (await sceneFabrics(screen)).length, { timeout: 60_000 }).toBeGreaterThan(0);
      await screen.waitForTimeout(2000);

      // every 100 ms from here on: how many fabric-dressed meshes are on the sofa (never zero: no grey, no empty sofa)
      await screen.evaluate(() => {
        type O = { isMesh?: boolean; material?: { name?: string } };
        const w = window as unknown as { __ormenStage?: { get(): { scene: { traverse(cb: (o: O) => void): void } } }; __kumasliParca?: { n: number; codes: string[] }[] };
        w.__kumasliParca = [];
        const sample = () => {
          let n = 0;
          const codes = new Set<string>();
          w.__ormenStage?.get().scene.traverse((o) => {
            if (o.isMesh && o.material?.name?.startsWith("kumas:")) {
              n++;
              codes.add(o.material.name.slice(6));
            }
          });
          w.__kumasliParca!.push({ n, codes: [...codes] });
        };
        sample();
        window.setInterval(sample, 100);
      });
      await screen.getByRole("button", { name: "Kartela okut" }).click();
      await expect(screen.getByRole("dialog", { name: "Kartelanın QR etiketini kameraya tutun" })).toBeVisible();
      // read, closed by itself, and the fabric goes on
      await expect(screen.getByRole("dialog", { name: "Kartelanın QR etiketini kameraya tutun" })).toHaveCount(0, { timeout: 15_000 });
      await expect.poll(() => sceneFabrics(screen), { timeout: 60_000 }).toContain("MISSO-05");
      // the change was a cross-fade: at no sample was the sofa without fabric
      await screen.waitForTimeout(1500);
      // (on a loaded machine the 100 ms timer fires less often; what matters is that the samples span the change)
      const samples = await screen.evaluate(() => (window as unknown as { __kumasliParca: { n: number; codes: string[] }[] }).__kumasliParca);
      expect(samples[0].codes, "a sample before the change").not.toContain("MISSO-05");
      expect(samples.at(-1)!.codes, "a sample after the change").toContain("MISSO-05");
      expect(Math.min(...samples.map((x) => x.n))).toBeGreaterThan(0);
      // measured by the page itself, from the button to the fabric chosen (task: within 2 s)
      const readMs = Number(await screen.locator("html").getAttribute("data-kartela-ms"));
      console.log(`KARTELA okuma süresi: ${readMs} ms`);
      test.info().annotations.push({ type: "okuma süresi", description: `${readMs} ms` });
      expect(readMs).toBeGreaterThan(0);
      expect(readMs).toBeLessThan(2000);
      // the camera is off again
      expect(await screen.evaluate(() => document.querySelectorAll("video").length)).toBe(0);
    } finally {
      await browser.close();
    }
  });

  test("mağazada olmayan kumaşın etiketi kısa bir uyarı verir, ekran takılmaz", async ({ page }) => {
    test.setTimeout(180_000);
    await login(page);
    const code = await pairCode(page, `Kartela yok ${Date.now().toString(36)}`);
    const browser = await screenBrowser(await cameraClip("yok-99", `${BASE}/k/YOK-99`));
    try {
      const screen = await openShowroom(browser, code);
      await screen.getByRole("button", { name: "Kartela okut" }).click();
      await expect(screen.getByText("YOK-99 bu mağazada yok. Başka bir kartela deneyin.")).toBeVisible({ timeout: 15_000 });
      await expect(screen.getByRole("dialog", { name: "Kartelanın QR etiketini kameraya tutun" })).toHaveCount(0);
      // the code box still works
      await screen.getByLabel("Elinizdeki kartelanın kodu").fill("MISSO-05");
      await expect.poll(() => sceneFabrics(screen), { timeout: 60_000 }).toContain("MISSO-05");
    } finally {
      await browser.close();
    }
  });
});
