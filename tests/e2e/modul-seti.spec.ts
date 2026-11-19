import path from "node:path";
import { expect, test } from "./fixtures";
import { login } from "./helpers";

// Job 4, second part: ORMEN enters a module set in the panel (GLB files,
// sizes, metres), gives it to a shop, and the shop's "Köşe kur" offers it.

const glb = (key: string) => path.join(process.cwd(), "public/seed/moduller", `${key}.glb`);

test.describe("modül seti paneli", () => {
  test.skip(({ isMobile }) => isMobile, "panel masaüstü için");

  test("set GLB'leriyle girilir, kare olmayan köşe reddedilir, mağazaya verilir ve mağazanın köşe kurucusunda çıkar", async ({ page }) => {
    test.setTimeout(180_000);
    await login(page);
    const tag = Date.now().toString(36);
    // a shop to give it to
    await page.goto("/panel/firmalar/yeni");
    await page.getByLabel("Firma adı").fill(`Modül ${tag}`);
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page.getByText(`Modül ${tag} kaydedildi.`)).toBeVisible();
    const slug = (await page.getByText(/\/f\/modul-/).first().innerText()).match(/\/f\/(modul-[a-z0-9-]+)/)![1];

    await page.goto("/panel/modul-setleri");
    await expect(page.getByRole("list", { name: "Setler" })).toContainText("Deneme GLB seti");
    await page.getByRole("link", { name: "Yeni set" }).click();
    await page.getByLabel("Setin adı").fill(`Lina ${tag}`);
    await expect(page.getByLabel("Bağlantı adı")).toHaveValue(`lina-${tag}`);
    await expect(page.getByLabel("Metrajların kumaş eni (cm)")).toHaveValue("140");

    // the four rows the editor starts with: sol kol, tekli, köşe, sağ kol
    const sizes: Record<number, [string, string, string, string]> = { 1: ["25", "98", "84", "kol-sol"], 2: ["90", "98", "84", "tekli"], 3: ["98", "98", "84", "kose"], 4: ["25", "98", "84", "kol-sag"] };
    for (const [i, [w, d, h, file]] of Object.entries(sizes)) {
      const row = page.getByRole("listitem", { name: `${i}. modül` });
      await row.getByLabel("Genişlik").fill(w);
      await row.getByLabel("Derinlik").fill(d);
      await row.getByLabel("Yükseklik").fill(h);
      await row.getByLabel("GLB dosyası").setInputFiles(glb(file));
      await expect(row.getByTestId("modul-glb")).toContainText(/Dosya: moduller\/lina|Dosya: lina/);
    }
    // the file is measured in the browser: the arm file is 22 × 100 × 68 cm, not what was typed
    const arm = page.getByRole("listitem", { name: "1. modül" });
    await expect(arm.getByTestId("modul-olcu")).toContainText("Dosyadaki ölçü: 22 × 100 × 68 cm · girilen ölçüden farklı");
    await arm.getByRole("button", { name: "Ölçüleri dosyadan al" }).click();
    await expect(arm.getByLabel("Genişlik")).toHaveValue("22");
    await expect(arm.getByLabel("Yükseklik")).toHaveValue("68");
    await expect(arm.getByTestId("modul-olcu")).toContainText("girilen ölçüyle aynı");
    await page.getByRole("listitem", { name: "2. modül" }).getByLabel("Ekranda görünen adı").fill("Oturum 90");
    await page.getByRole("listitem", { name: "2. modül" }).getByLabel("Kasa (m)").fill("1,2");
    // what is still missing is said, without stopping the save
    await expect(page.getByRole("list", { name: "Eksikler" })).toContainText("3 modülün metrajı yok");

    // a corner that is not square is refused, with the reason
    await page.getByRole("listitem", { name: "3. modül" }).getByLabel("Genişlik").fill("95");
    await page.getByRole("button", { name: "Seti kaydet" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "köşe" })).toHaveText("3. modül: köşe modülü kare olmalı (genişlik = derinlik).");
    await page.getByRole("listitem", { name: "3. modül" }).getByLabel("Genişlik").fill("98");

    await page.getByLabel("Mağaza ara").fill(`Modül ${tag}`);
    await page.getByRole("checkbox", { name: `Modül ${tag}` }).check();
    await page.getByRole("button", { name: "Seti kaydet" }).click();
    await expect(page.getByText(`Lina ${tag} kaydedildi.`)).toBeVisible();
    await expect(page.getByRole("listitem", { name: "2. modül" }).getByLabel("Kasa (m)")).toHaveValue("1,2");

    // in the change log
    await page.goto("/panel/gunluk");
    await expect(page.getByTestId("gunluk-kaydi").filter({ hasText: `Modül seti “Lina ${tag}” eklendi (4 modül, 1 mağaza)` })).toHaveCount(1);

    // the shop's builder offers it, first, with its modules and sizes
    await page.goto(`/f/${slug}`);
    await page.getByRole("tab", { name: "Köşe kur" }).click();
    const b = page.getByTestId("kose-kurucu");
    await expect(b.getByRole("radio", { name: `Lina ${tag}` })).toHaveAttribute("aria-checked", "true");
    await expect(b.getByRole("radio", { name: "Örnek modül seti" })).toBeVisible();
    await expect(b.getByRole("button", { name: "Oturum 90 ekle (90 × 98 cm)" })).toBeVisible();
    for (const m of ["Sol kol", "Oturum 90", "Köşe", "Oturum 90", "Sağ kol"]) await b.getByRole("button", { name: new RegExp(`^${m} ekle`) }).click();
    // back 98 + 90 + 25 = 213; left 98 + 90 + 22 (the arm's size taken from its file) = 210
    await expect(b.getByTestId("kose-olculer")).toContainText("Kapladığı alan213 cm × 210 cm");
    // a shop the set was not given to does not see it
    await page.goto("/f/ornek-mobilya");
    await page.getByRole("tab", { name: "Köşe kur" }).click();
    await expect(page.getByTestId("kose-kurucu").getByRole("radio", { name: `Lina ${tag}` })).toHaveCount(0);
  });
});
