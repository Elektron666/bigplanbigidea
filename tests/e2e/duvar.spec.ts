import { expect, test } from "./fixtures";
import { sceneFabrics } from "./helpers";

// Job 12: the fabric wall. Tiles are drawn by the stage's own 3D code, appear
// one by one (the page keeps answering), are kept for the visit; a tile opens
// its fabric in 3D, two tiles go to the comparison.

test.describe("kumaş duvarı", () => {
  test.skip(({ isMobile }) => isMobile, "geniş ekran için");

  test("ızgara 3D'den dolar, önbellekten anında açılır; kareye dokununca 3D, iki kare karşılaştırma", async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto("/f/ornek-mobilya?m=berjer&k=LUMA-02");
    await expect.poll(() => sceneFabrics(page), { timeout: 60_000 }).toEqual(["LUMA-02"]);
    await page.getByRole("button", { name: /^Kumaş duvarı:/ }).click();
    const wall = page.getByRole("dialog", { name: "Kumaş duvarı" });
    const tiles = wall.getByTestId("duvar-kare");
    const n = await tiles.count();
    expect(n).toBeGreaterThan(5);
    expect(n).toBeLessThanOrEqual(30);
    // the page answers while the tiles are made
    await expect(wall.getByTestId("duvar-durum")).toContainText("Hazırlanıyor");
    await wall.getByRole("button", { name: /^LUMA-03,/ }).click();
    await expect(wall.getByRole("button", { name: /^LUMA-03,/ })).toHaveAttribute("aria-pressed", "true");
    await wall.getByRole("button", { name: /^LUMA-03,/ }).click();
    await expect(wall.getByTestId("duvar-durum")).toContainText("Hazır (", { timeout: 180_000 });
    console.log(`DUVAR ${n} kare: ${await wall.getByTestId("duvar-durum").innerText()}`);
    await expect(wall.locator("img[data-hazir]")).toHaveCount(n);

    // a tile: its fabric on the 3D piece
    await wall.getByRole("button", { name: /^LUMA-04,/ }).click();
    await wall.getByRole("button", { name: "LUMA-04 3D'de aç" }).click();
    await expect(wall).toHaveCount(0);
    await expect.poll(() => sceneFabrics(page), { timeout: 60_000 }).toEqual(["LUMA-04"]);

    // again: from the visit's cache at once; two tiles compare
    await page.getByRole("button", { name: /^Kumaş duvarı:/ }).click();
    await expect(wall.getByTestId("duvar-durum")).toHaveText(/^Hazır( \(|$)/);
    await expect(wall.locator("img[data-hazir]")).toHaveCount(n);
    await wall.getByRole("button", { name: /^LUMA-02,/ }).click();
    await wall.getByRole("button", { name: /^LUMA-05,/ }).click();
    await expect(wall).toHaveCount(0);
    await expect(page.getByRole("slider", { name: "Karşılaştırma çizgisi" })).toBeVisible();
    await expect.poll(() => sceneFabrics(page), { timeout: 60_000 }).toEqual(["LUMA-02", "LUMA-05"]);
  });
});
