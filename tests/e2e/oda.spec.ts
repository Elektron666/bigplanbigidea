import { expect, test } from "./fixtures";
import { PDFDocument } from "pdf-lib";

// Job 9: the room plan by touch. A 4 × 5 m room, a door, a window and the
// corner sofa, only tapping (the time is printed); a door the sofa stands in
// front of is warned about; plan ⇄ 3D in one tap; the layout PDF has at most
// two pages.

test.describe("oda planı", () => {
  test.skip(({ isMobile }) => isMobile, "geniş ekran için");

  test("4 × 5 m oda, kapı, pencere ve köşe yalnızca dokunarak; kapı önü uyarısı; plan ve 3D; en çok iki sayfa PDF", async ({ page }) => {
    test.setTimeout(240_000);
    page.setDefaultTimeout(30_000);
    // ORMEN's own page: a shop's products are renamed and changed by other tests
    await page.goto("/?m=kose-takimi&k=LUMA-02");
    const t0 = Date.now();
    await page.getByRole("tab", { name: "Oda" }).click();
    await page.getByRole("radio", { name: /Dikdörtgen/ }).click();
    // the measures with the screen keyboard: tapping digits
    for (const [label, v] of [["Genişlik", "400"], ["Derinlik", "500"]] as const) {
      const box = page.getByRole("region", { name: "Ölçüler" }).getByLabel(label);
      await box.click();
      await box.press("Control+A");
      await box.pressSequentially(v);
      await box.press("Enter");
    }
    await page.getByRole("button", { name: "+ Pencere" }).click();
    await page.getByRole("button", { name: "+ Kapı" }).click();
    const door = page.getByRole("listitem", { name: "Kapı 2" });
    // the door in the middle of the back wall: the sofa stands in front of it
    await expect(door.getByRole("radio", { name: "Arka duvar" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByTestId("gecis-uyari")).toContainText("Kapının önü kapalı: Köşe Takımı.");
    // moved to the left wall, near the front: the way is free
    await door.getByRole("radio", { name: "Sol duvar" }).click();
    // from the back wall's middle (160 cm) to the far end of the left wall (500 − 90 = 410 cm): 25 taps, the last stops at the end
    for (let i = 0; i < 25; i++) await door.getByRole("button", { name: "Duvar başından artır" }).click();
    await expect(door.getByRole("group", { name: "Duvar başından" })).toContainText("410 cm");
    await expect(page.getByText("Kapının önü kapalı")).toHaveCount(0);
    const seconds = (Date.now() - t0) / 1000;
    console.log(`ODA kurulum: ${seconds.toFixed(1)} sn`);
    expect(seconds).toBeLessThan(300);
    // the link keeps the plan
    await expect(page).toHaveURL(/sb=p\.arka\.130\.150\.0(~|%7E)k\.sol\.410\.90\.0/);

    // a coffee table too close to the sofa
    await page.getByRole("button", { name: "+ Sehpa" }).click();
    // the corner set is 220 cm deep: the table, 60 deep, from 250 to 310 cm leaves 25 cm
    const table = page.getByRole("listitem", { name: "Sehpa 1" });
    for (let i = 0; i < 3; i++) await table.getByRole("button", { name: "Duvardan uzaklık artır" }).click();
    await expect(page.getByTestId("gecis-uyari")).toContainText("geçiş için en az 60 cm önerilir");
    await page.getByRole("listitem", { name: "Sehpa 1" }).getByRole("button", { name: "Kaldır" }).click();

    // three layouts by rule (job 14), told apart at a glance; one tap uses one
    await page.getByRole("button", { name: "Yerleşim öner" }).click();
    await expect(page.getByTestId("yerlesim-onerisi")).toHaveCount(3);
    await page.getByTestId("yerlesim-onerisi").first().click();
    await expect(page.getByTestId("yerlesim-onerisi")).toHaveCount(0);
    await expect(page.getByText("Kapının önü kapalı")).toHaveCount(0);

    // plan ⇄ 3D in one tap
    const view = page.getByRole("group", { name: "Görünüm" });
    await view.getByRole("button", { name: "Plan" }).click();
    await expect(page).toHaveURL(/g=plan/);
    await view.getByRole("button", { name: "3B" }).click();
    await expect(page).toHaveURL(/g=3b/);

    // the layout PDF
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Salon Yerleşim Projesi (PDF)" }).click()]);
    expect(download.suggestedFilename()).toBe("salon-yerlesim-projesi.pdf");
    const pdf = await PDFDocument.load(await (await import("node:fs/promises")).readFile((await download.path())!));
    expect(pdf.getPageCount()).toBeLessThanOrEqual(2);
    expect(pdf.getTitle()).toBe("ORMEN Atelier · Salon Yerleşim Projesi");
  });
});
