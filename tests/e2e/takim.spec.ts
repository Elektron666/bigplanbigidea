import { expect, test } from "./fixtures";
import { login, sceneFabrics } from "./helpers";

// Job 6: the set scene. A set entered in the panel goes up on the shop's
// screen in one tap, each piece with its own fabric; "Kombin" puts the main
// fabric's "uyumlu" one on the berjer; the quote lists the pieces one by one.

test.describe("takım sahnesi", () => {
  test.skip(({ isMobile }) => isMobile, "showroom ekranı geniş ekran içindir");

  test("panelde takım, ekranda tek dokunuşla kurulum, uyumlu kumaşla kombin, teklifte parça parça", async ({ page, browser }) => {
    test.setTimeout(240_000);
    page.setDefaultTimeout(30_000);
    const tag = Date.now().toString(36);
    await login(page);

    // ORMEN: LUMA-04 goes with LUMA-02
    await page.goto("/panel/kumaslar");
    await page.getByRole("link", { name: /LUMA-02/ }).first().click();
    const uyumlu = page.getByRole("group", { name: "Uyumlu kumaşlar" });
    await uyumlu.getByRole("textbox").fill("LUMA-04");
    await uyumlu.getByRole("button", { name: /kaydet/i }).click();
    await expect(uyumlu.getByRole("status")).toHaveText("Kaydedildi.");

    // a shop, and its set: the sofa and the berjer
    await page.goto("/panel/firmalar/yeni");
    await page.getByLabel("Firma adı").fill(`Takım ${tag}`);
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page.getByText(`Takım ${tag} kaydedildi.`)).toBeVisible();
    const sets = page.getByRole("region", { name: "Takımlar" });
    await sets.getByRole("button", { name: "Yeni takım" }).click();
    const form = sets.getByRole("group", { name: "Takım" });
    await form.getByLabel("Takımın adı").fill("Salon takımı");
    await form.getByRole("checkbox", { name: /Modüler Kanepe/ }).check();
    await form.getByRole("checkbox", { name: /^Berjer/ }).check();
    await form.getByRole("button", { name: "Yerleşimi öner" }).click();
    // the berjer goes in front of the sofa, facing it
    await expect(form.getByLabel("Berjer yön")).toHaveValue("180");
    await form.getByRole("button", { name: "Takımı kaydet" }).click();
    await expect(sets.getByRole("status")).toHaveText("“Salon takımı” kaydedildi.");
    await expect(sets.getByRole("list", { name: "Kayıtlı takımlar" })).toContainText("Modüler Kanepe, Berjer");
    await page.getByLabel("Ekranın adı").fill("Takım ekranı");
    await page.getByRole("button", { name: "Cihaz ekle" }).click();
    const pairing = (await page.getByTestId("eslestirme-kodu").innerText()).trim();

    // ---- the screen
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const screen = await ctx.newPage();
    screen.setDefaultTimeout(30_000);
    await screen.goto("/showroom");
    for (const d of pairing) await screen.getByRole("button", { name: d, exact: true }).click();
    await expect(screen.getByRole("button", { name: "Başlamak için dokunun" })).toBeVisible();
    await screen.goto("/showroom?k=LUMA-02");
    await screen.getByRole("button", { name: "Başlamak için dokunun" }).click();

    await screen.getByRole("button", { name: "Takımı kur: Salon takımı" }).click();
    await expect(screen.getByText(/^Seçili:/)).toBeVisible();
    await expect.poll(() => sceneFabrics(screen), { timeout: 60_000 }).toEqual(["LUMA-02"]);

    // Kombin: the uyumlu fabric is offered first; it goes on the berjer only
    await screen.getByRole("button", { name: "Kombin: berjer ve puf farklı kumaş" }).click();
    await screen.getByRole("button", { name: /^Uyumlu: LUMA-04,/ }).click();
    await expect.poll(() => sceneFabrics(screen), { timeout: 60_000 }).toEqual(["LUMA-02", "LUMA-04"]);

    // the quote, piece by piece
    await screen.getByRole("button", { name: "Metraj ve teklif" }).click();
    const quote = screen.getByRole("dialog", { name: /Metraj ve teklif/ });
    const rows = quote.getByRole("row");
    await expect(rows.filter({ hasText: "Berjer" }).first()).toContainText("LUMA-04");
    await expect(rows.filter({ hasText: "Modüler Kanepe" }).first()).toContainText("LUMA-02");
    await expect(rows.filter({ hasText: "Modüler Kanepe" }).filter({ hasText: "LUMA-04" })).toHaveCount(0);
    await ctx.close();
  });
});
