import { expect, test } from "./fixtures";
import { login, sceneFabrics } from "./helpers";

// The assistant and sofa advisor (job 10; Fatih Bey: "soru sorabileceği,
// fikir alacağı, metraj hesaplatacağı"). Free, on the device: it answers only
// from what the panel holds.

/** Opens a collapsible panel section unless it is already open. */
async function openSection(page: import("@playwright/test").Page, summary: string) {
  const details = page.locator("details", { has: page.locator("summary", { hasText: summary }) });
  if ((await details.count()) && !(await details.evaluate((d) => (d as HTMLDetailsElement).open))) await details.locator("summary").click();
}

test.describe("asistan", () => {
  test.skip(({ isMobile }) => isMobile, "geniş ekranda denenir; telefon düzeni ayrı");

  test("soruları girilen bilgiden cevaplar, girilmeyeni uydurmaz; danışman 60 sn içinde etiketli modeli önerir ve 3D'de açar", async ({ page }) => {
    test.setTimeout(240_000);
    await login(page);
    // the fabric's wear figure and the corner sofa's tags, entered in the panel
    await page.goto("/panel/kumaslar");
    await page.getByRole("link", { name: /MISSO-05/ }).first().click();
    await openSection(page, "Teknik");
    // the sheet as the other tests leave it (140 cm, plain, two-way), plus the wear figure
    await page.getByLabel("En (cm)").fill("140");
    await page.getByRole("combobox", { name: /^Desen/ }).selectOption("duz");
    await page.getByRole("combobox", { name: /^Kesim yönü/ }).selectOption("cift");
    await page.getByLabel("Martindale (tur)").fill("40000");
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page).toHaveURL(/kaydedildi=MISSO-05/);
    await page.goto("/panel/modeller");
    await page.getByRole("link", { name: "Köşe Takımı", exact: true }).click();
    const tags = page.getByRole("region", { name: "Danışman etiketleri" });
    for (const t of ["Modern", "Günlük yoğun kullanım"]) {
      const b = tags.getByRole("button", { name: t });
      if ((await b.getAttribute("aria-pressed")) !== "true") {
        await b.click();
        await expect(tags.getByRole("status")).toHaveText("Etiketler kaydedildi.");
      }
    }

    await page.goto("/f/ornek-mobilya?m=kose-takimi&k=LUMA-02");
    await expect.poll(() => sceneFabrics(page), { timeout: 60_000 }).toEqual(["LUMA-02"]);
    await page.getByRole("button", { name: "Asistan" }).click();
    const box = page.getByRole("dialog", { name: "Asistan" });
    const ask = async (q: string) => {
      await box.getByLabel("Sorunuz").fill(q);
      await box.getByRole("button", { name: "Sor", exact: true }).click();
      return box.getByTestId("asistan-cevap").last();
    };
    await expect(await ask("misso 5 dayanıklı mı, kedimiz var")).toContainText("MISSO-05: aşınma dayanımı 40.000 Martindale (panelde girilen değer).");
    await expect(await ask("Bu kumaş makinede yıkanır mı?")).toContainText("LUMA-02 için temizlik ve bakım bilgisi panelde girilmemiş.");
    await expect(await ask("Köşe Takımı için MISSO-05 kaç metre gider?")).toContainText(/Köşe Takımı için MISSO-05/);
    await expect(await ask("MISSO-05 ile LUMA-02 arasındaki fark ne?")).toContainText("Yalnızca panelde girilen bilgiler yazıldı.");
    await expect(await ask("hava nasıl")).toContainText("Bunu anlayamadım.");

    // the advisor: big buttons only, under a minute
    const started = Date.now();
    await box.getByRole("button", { name: "Bana koltuk öner" }).click();
    const advisor = box.getByRole("region", { name: "Koltuk danışmanı" });
    for (const choice of ["3–4 m", "Evet", "Her gün, kalabalık", "Modern", "Fark etmez"]) await advisor.getByRole("button", { name: choice, exact: true }).click();
    const first = box.getByTestId("oneri").first();
    await expect(first).toContainText("Köşe Takımı");
    await expect(first).toContainText("modern çizgide, günlük yoğun kullanım için işaretli");
    const seconds = (Date.now() - started) / 1000;
    console.log(`DANISMAN: ${seconds.toFixed(1)} sn`);
    expect(seconds).toBeLessThan(60);
    // the reason's fabric is the one with the entered wear figure, and 3D opens it
    const code = (await first.locator("h3").innerText()).split("·")[1].trim();
    await first.getByRole("button", { name: "3D'de aç" }).click();
    await expect(box).toHaveCount(0);
    await expect.poll(() => sceneFabrics(page), { timeout: 60_000 }).toEqual([code]);
  });
});
