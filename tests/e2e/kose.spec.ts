import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { login, sceneFabrics } from "./helpers";

// Showroom package, job 4: the corner set builder, on the sample set
// (kol 25 cm · tekli 65 cm · köşe 95 × 95 cm · depth 95 cm).

/** The furniture's real size on the 3D scene, in cm (x across, z front to back). */
function sceneSize(page: Page): Promise<{ x: number; z: number }> {
  return page.evaluate(() => {
    type V = { x: number; y: number; z: number };
    type O = { isMesh?: boolean; material?: { name?: string }; geometry?: { computeBoundingBox(): void; boundingBox: { min: V; max: V } }; matrixWorld: unknown };
    const w = window as unknown as { __ormenStage?: { get(): { scene: { updateMatrixWorld(): void; traverse(cb: (o: O) => void): void } } } };
    // the scene may not be up yet (a page just opened): no size yet, the poll asks again
    if (!w.__ormenStage) return { x: 0, z: 0 };
    const state = w.__ormenStage.get();
    state.scene.updateMatrixWorld();
    const min = { x: Infinity, z: Infinity };
    const max = { x: -Infinity, z: -Infinity };
    state.scene.traverse((o) => {
      if (!o.isMesh || !o.material?.name?.startsWith("kumas:") || !o.geometry) return;
      o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox;
      const e = (o.matrixWorld as { elements: number[] }).elements;
      for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
        const wx = e[0] * x + e[4] * y + e[8] * z + e[12];
        const wz = e[2] * x + e[6] * y + e[10] * z + e[14];
        min.x = Math.min(min.x, wx);
        max.x = Math.max(max.x, wx);
        min.z = Math.min(min.z, wz);
        max.z = Math.max(max.z, wz);
      }
    });
    return { x: Math.round((max.x - min.x) * 100), z: Math.round((max.z - min.z) * 100) };
  });
}

test.describe("köşe kurucu", () => {
  test.skip(({ isMobile }) => isMobile, "showroom ekranı geniş ekran içindir");

  test("3,15 × 2,40 m L köşe yalnızca dokunarak kurulur; ölçüler, ayna, şema, teklif ve bağlantı tutar", async ({ page, browser }) => {
    test.setTimeout(240_000);
    // the fabric's sheet (140 cm, plain) so the quote can give metres
    await login(page);
    await page.goto("/panel/kumaslar");
    await page.getByRole("link", { name: /MISSO-05/ }).first().click();
    await page.getByLabel("En (cm)").fill("140");
    await page.getByRole("combobox", { name: /^Desen/ }).selectOption("duz");
    await page.getByRole("combobox", { name: /^Kesim yönü/ }).selectOption("cift");
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page).toHaveURL(/kaydedildi=MISSO-05/);

    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const screen = await ctx.newPage();
    await screen.goto("/f/ornek-mobilya?kiosk&k=MISSO-05");
    await screen.getByRole("button", { name: "Başlamak için dokunun" }).click();
    await expect.poll(() => sceneFabrics(screen), { timeout: 60_000 }).toContain("MISSO-05");

    // from here on only taps (and two wall figures on the screen keypad); counted and timed
    const started = Date.now();
    let taps = 0;
    await screen.getByRole("tab", { name: "Köşe kur" }).click();
    taps++;
    const b = screen.getByTestId("kose-kurucu");
    // each module button carries its size in its name: "Sol kol ekle (25 × 95 cm)"
    for (const m of ["Sol kol", "Tekli oturum", "Köşe", "Tekli oturum", "Tekli oturum", "Tekli oturum", "Sağ kol"]) {
      await b.getByRole("button", { name: new RegExp(`^${m} ekle`) }).click();
      taps++;
    }
    await b.getByLabel("Arka duvar (cm)").fill("315");
    await b.getByLabel("Yan duvar (cm)").fill("240");
    const seconds = (Date.now() - started) / 1000;
    test.info().annotations.push({ type: "kurulum", description: `${taps} dokunuş, ${seconds.toFixed(1)} sn` });
    console.log(`KOSE kurulum: ${taps} dokunuş + 2 duvar ölçüsü, ${seconds.toFixed(1)} sn`);
    expect(seconds).toBeLessThan(180);

    // the measures are the modules' sums: back 95 + 3 × 65 + 25 = 315; left 95 + 65 + 25 = 185
    const sizes = b.getByTestId("kose-olculer");
    await expect(sizes).toContainText("Arka315 cm");
    await expect(sizes).toContainText("Sol kol185 cm");
    await expect(sizes).toContainText("Kapladığı alan315 cm × 185 cm");
    await expect(b.getByTestId("duvar")).toHaveText("Duvarlara sığıyor.");
    await expect(b.getByRole("img", { name: "Üstten şema: 315 cm × 185 cm" })).toBeVisible();
    // and the sofa on the 3D scene is that size (within 2 cm of drawing detail)
    // dressed in the fabric, never a bare grey sofa
    await expect.poll(() => sceneFabrics(screen), { timeout: 60_000 }).toEqual(["MISSO-05"]);
    await expect.poll(async () => (await sceneSize(screen)).x, { timeout: 60_000 }).toBeGreaterThan(300);
    const size = await sceneSize(screen);
    expect(Math.abs(size.x - 315)).toBeLessThanOrEqual(2);
    expect(Math.abs(size.z - 185)).toBeLessThanOrEqual(2);

    // a second left arm is refused, with the reason
    await b.getByRole("button", { name: /^Sol kol ekle/ }).click();
    await expect(b.getByRole("alert")).toHaveText("Sol uçta zaten bir kol ya da şezlong var.");

    // mirrored: the return moves to the right, nothing else changes
    await b.getByRole("button", { name: "Sağ ↔ sol çevir" }).click();
    await expect(sizes).toContainText("Sağ kol185 cm");
    await expect(sizes).not.toContainText("Sol kol");
    await expect(sizes).toContainText("Arka315 cm");
    await expect.poll(async () => sceneSize(screen), { timeout: 30_000 }).toEqual(size);
    await b.getByRole("button", { name: "Sağ ↔ sol çevir" }).click();
    await expect(sizes).toContainText("Sol kol185 cm");

    // one seat too many: it says by how much
    await b.getByRole("button", { name: /^Tekli oturum ekle/ }).click();
    await expect(b.getByTestId("duvar")).toHaveText("Arka duvardan 65 cm taşıyor.");
    // the extra seat on the back run (the last one) comes out again
    await b.getByRole("button", { name: /modülü \(Tekli oturum\) çıkar/ }).last().click();
    await expect(b.getByTestId("duvar")).toHaveText("Duvarlara sığıyor.");

    // the quote: the set's parts are the sums of its modules' metres
    await screen.getByRole("button", { name: "Metraj ve teklif" }).click();
    const quote = screen.getByTestId("teklif");
    // Kasa: 4 tekli × 1 + köşe 1,5 = 5,5 · Kollar: 0,9 + 0,9 = 1,8 · Oturak: 4 × 0,7 + 1 = 3,8 · Sırt: 4 × 0,6 + 1,1 = 3,5
    for (const [part, m] of [["Kasa", "5,5 m"], ["Kollar", "1,8 m"], ["Oturak", "3,8 m"], ["Sırt", "3,5 m"]]) {
      await expect(quote.getByRole("row", { name: new RegExp(`Köşe takımı \\(örnek set\\) · ${part} MISSO-05 ${m}`) })).toBeVisible();
    }
    await quote.getByRole("button", { name: "Vazgeç" }).click();

    // the set is in the link: opened again, it is the same set
    expect(new URL(screen.url()).searchParams.get("mk")).toBe("ornek-set:kol-sol.tekli.kose.tekli.tekli.tekli.kol-sag");
    const again = await ctx.newPage();
    await again.goto(screen.url());
    await again.getByRole("button", { name: "Başlamak için dokunun" }).click();
    await expect.poll(async () => (await sceneSize(again)).x, { timeout: 60_000 }).toBeGreaterThan(300);
    expect(await sceneSize(again)).toEqual(size);
    await again.getByRole("tab", { name: "Köşe kur" }).click();
    await expect(again.getByTestId("kose-olculer")).toContainText("Kapladığı alan315 cm × 185 cm");
    await ctx.close();
  });
});
