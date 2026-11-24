import { expect, test } from "./fixtures";
import { login, sceneFabrics } from "./helpers";

// Job 8: fabric properties, the customer's filters, stock from the panel
// (by hand and from a CSV) and alternatives. Stock shows only on the screen
// of a shop that has "Stok ve termin" on; the public page never gets it.

test.describe("kumaş özellikleri ve stok", () => {
  test.skip(({ isMobile }) => isMobile, "showroom ekranı geniş ekran içindir");

  test("CSV ile stok, hatalı satır raporu; stokta olmayan kumaşta termin ve muadil; filtre yalnız girilmiş özellikle", async ({ page, browser }) => {
    test.setTimeout(240_000);
    page.setDefaultTimeout(30_000);
    await login(page);

    // ---- stock from a CSV: the good rows go in at once, the bad ones are listed by line
    await page.goto("/panel/kumaslar/stok");
    await page.getByLabel("Stok CSV dosyası").setInputFiles({
      name: "stok.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("kod;stok;termin_gun\nLUMA-02;yok;15\nLUMA-04;var;\nYOK-99;var;\nSIENA-04;belki;\n"),
    });
    await expect(page.getByText("stok.csv: 2 satır uygulanacak, 2 satır hatalı.")).toBeVisible();
    const bad = page.getByRole("list", { name: "Hatalı satırlar" });
    await expect(bad.getByRole("listitem")).toHaveText(["4. satır (YOK-99): Bu kodda kumaş yok.", "5. satır (SIENA-04): Stok durumu var, az ya da yok olmalı."]);
    await page.getByRole("button", { name: "2 satırı uygula" }).click();
    await expect(page.getByText("2 kumaşın stoğu güncellendi. 2 satır uygulanmadı:")).toBeVisible();
    await expect(page.getByLabel("LUMA-02 stok durumu")).toHaveValue("yok");
    await expect(page.getByLabel("LUMA-02 termin günü")).toHaveValue("15");
    // and by hand
    await page.getByLabel("SIENA-04 stok durumu").selectOption("az");
    await page.getByRole("button", { name: "Değişiklikleri kaydet (1)" }).click();
    await expect(page.getByRole("status").filter({ hasText: "1 kumaşın stoğu kaydedildi." })).toBeVisible();

    // ---- ORMEN's muadil list and one property, on the fabric's page
    await page.goto("/panel/kumaslar");
    await page.getByRole("link", { name: /LUMA-02/ }).first().click();
    const muadil = page.getByRole("group", { name: "Muadil kumaşlar" });
    await muadil.getByRole("textbox").fill("LUMA-99");
    await muadil.getByRole("button", { name: "Kaydet" }).click();
    await expect(muadil.getByRole("status")).toHaveText("Bu kodlarda kumaş yok: LUMA-99.");
    await muadil.getByRole("textbox").fill("luma-03");
    await muadil.getByRole("button", { name: "Kaydet" }).click();
    await expect(muadil.getByRole("status")).toHaveText("Kaydedildi.");
    await expect(muadil.getByRole("textbox")).toHaveValue("LUMA-03");
    await page.getByRole("combobox", { name: "Leke tutmaz" }).selectOption("evet");
    await page.getByRole("button", { name: "Kaydet", exact: true }).first().click();
    await expect(page).toHaveURL(/kaydedildi=LUMA-02/);

    // ---- a shop with stock on, and its screen
    const tag = Date.now().toString(36);
    await page.goto("/panel/firmalar/yeni");
    await page.getByLabel("Firma adı").fill(`Stok ${tag}`);
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page.getByText(`Stok ${tag} kaydedildi.`)).toBeVisible();
    const slug = (await page.getByText(/\/f\/stok-/).first().innerText()).match(/\/f\/(stok-[a-z0-9-]+)/)![1];
    await page.getByRole("switch", { name: "Stok ve termin açık" }).click();
    await expect(page.getByRole("switch", { name: "Stok ve termin açık" })).toHaveAttribute("aria-checked", "true");
    await page.getByLabel("Ekranın adı").fill("Stok ekranı");
    await page.getByRole("button", { name: "Cihaz ekle" }).click();
    const pairing = (await page.getByTestId("eslestirme-kodu").innerText()).trim();

    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const screen = await ctx.newPage();
    screen.setDefaultTimeout(30_000);
    await screen.goto("/showroom");
    for (const d of pairing) await screen.getByRole("button", { name: d, exact: true }).click();
    await expect(screen.getByRole("button", { name: "Başlamak için dokunun" })).toBeVisible();
    await screen.goto("/showroom?k=LUMA-02");
    await screen.getByRole("button", { name: "Başlamak için dokunun" }).click();

    const stock = screen.getByTestId("stok");
    await expect(stock).toContainText("Stokta yok · Termin 15 gün");
    await expect(stock).toContainText("Muadil kumaşlar");
    // the swatch carries the lead time too
    await expect(screen.getByRole("radio", { name: "LUMA-02, Kum, Termin 15 gün" })).toBeVisible();
    // the property ORMEN marked, and only that
    await expect(screen.getByText("Leke tutmaz", { exact: true })).toBeVisible();

    // the filter: only fabrics with the mark entered
    await screen.getByRole("button", { name: "Çocuklu ev" }).click();
    const list = screen.getByRole("radiogroup", { name: "Kumaşlar" });
    await expect(list.getByRole("radio")).toHaveCount(1);
    await expect(list.getByRole("radio")).toHaveAccessibleName(/^LUMA-02,/);
    await expect(screen.getByText("Çocuklu ev: leke tutmaz ya da kolay temizlenir olarak girilmiş kumaşlar.")).toBeVisible();
    await screen.getByRole("button", { name: "Çocuklu ev" }).click();

    // the muadil opens on the sofa
    await screen.getByRole("button", { name: "Muadil: LUMA-03, Vizon" }).click();
    await expect.poll(() => sceneFabrics(screen), { timeout: 60_000 }).toEqual(["LUMA-03"]);
    await ctx.close();

    // ---- the shop's public page: no stock, no lead time, nowhere
    const pub = await browser.newPage();
    const res = await pub.goto(`/f/${slug}?k=LUMA-02`);
    const html = (await res!.text()) + (await pub.content());
    await expect(pub.getByTestId("stok")).toHaveCount(0);
    expect(html).not.toContain("Termin 15");
    expect(html).not.toContain("Stokta yok");
    await pub.close();
  });
});
