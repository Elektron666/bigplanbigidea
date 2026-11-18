import { execFileSync } from "node:child_process";
import { expect, test } from "./fixtures";
import { login, sceneFabrics } from "./helpers";

// Showroom package, job 3: metres and quote. Every figure the test expects is
// worked out by hand in the comment beside it.

/** Opens a collapsible panel section unless it is already open (a click would close it). */
async function openSection(page: import("@playwright/test").Page, summary: string) {
  const details = page.locator("details", { has: page.locator("summary", { hasText: summary }) });
  if (!(await details.evaluate((d) => (d as HTMLDetailsElement).open))) await details.locator("summary").click();
}

const hasPoppler = (() => {
  try {
    execFileSync("which", ["pdftotext"]);
    return true;
  } catch {
    return false;
  }
})();

test.describe("metraj ve teklif", () => {
  test.skip(({ isMobile }) => isMobile, "panel ve showroom ekranı geniş ekran içindir");

  test("ekranda teklif: toplam elle hesapla tutar, PDF tek sayfa, sipariş talebi bir kez ORMEN'e düşer", async ({ page, browser, request }) => {
    test.setTimeout(240_000);
    await login(page);

    // ORMEN's waste figures (yönetici): plain 10 %, patterned 25 %; rounding 0,5 m
    await page.goto("/panel/siparisler");
    await page.getByLabel("Fire, düz kumaş (%)").fill("10");
    await page.getByLabel("Fire, raporlu kumaş (%)").fill("25");
    await page.getByLabel("Yuvarlama adımı (m)").fill("0,5");
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page.getByText(/^Kaydedildi\./)).toBeVisible();

    // the fabric's sheet: 140 cm, plain, two-way
    await page.goto("/panel/kumaslar");
    await page.getByRole("link", { name: /MISSO-05/ }).first().click();
    await page.getByLabel("En (cm)").fill("140");
    await page.getByRole("combobox", { name: /^Desen/ }).selectOption("duz");
    await page.getByRole("combobox", { name: /^Kesim yönü/ }).selectOption("cift");
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page).toHaveURL(/kaydedildi=MISSO-05/);

    // the corner set's metres at 140 cm: Kasa 9, Oturak 2,5, Sırt 2, and a Kırlent 0,5
    await page.goto("/panel/modeller");
    await page.getByRole("link", { name: "Köşe Takımı", exact: true }).click();
    await page.getByLabel("Bir adet için kumaş (m)").fill("14");
    await page.getByLabel("Hangi kumaş eninde (cm)").fill("140");
    // these sections open by themselves when the model already has figures (another test may have set them)
    await openSection(page, "Bölge başına metraj");
    await page.getByLabel("Kasa metrajı").fill("9");
    await page.getByLabel("Kollar metrajı").fill("");
    await page.getByLabel("Oturak metrajı").fill("2,5");
    await page.getByLabel("Sırt metrajı").fill("2");
    await openSection(page, "Ek parçalar (kırlent, biye…)");
    if ((await page.getByLabel("1. ek parçanın adı").count()) === 0) await page.getByRole("button", { name: "+ Ek parça" }).click();
    await page.getByLabel("1. ek parçanın adı").fill("Kırlent");
    await page.getByLabel("1. ek parçanın metrajı").fill("0,5");
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page).toHaveURL(/kaydedildi=/);

    // a shop of its own (it shows ORMEN's whole showcase) and its screen
    const tag = Date.now().toString(36);
    await page.goto("/panel/firmalar/yeni");
    await page.getByLabel("Firma adı").fill(`Teklif ${tag}`);
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page.getByText(`Teklif ${tag} kaydedildi.`)).toBeVisible();
    const slug = (await page.getByText(/\/f\/teklif-/).first().innerText()).match(/\/f\/(teklif-[a-z0-9-]+)/)![1];
    await page.getByLabel("Ekranın adı").fill("Teklif ekranı");
    await page.getByRole("button", { name: "Cihaz ekle" }).click();
    const code = (await page.getByTestId("eslestirme-kodu").innerText()).trim();

    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true });
    const screen = await ctx.newPage();
    await screen.goto("/showroom");
    for (const d of code) await screen.getByRole("button", { name: d, exact: true }).click();
    // paired: the screen reloads itself into the showroom; then the corner set in MISSO-05
    await expect(screen.getByRole("button", { name: "Başlamak için dokunun" })).toBeVisible();
    await screen.goto("/showroom?m=kose-takimi&k=MISSO-05");
    await screen.getByRole("button", { name: "Başlamak için dokunun" }).click();
    await expect.poll(() => sceneFabrics(screen), { timeout: 60_000 }).toEqual(["MISSO-05"]);

    await screen.getByRole("button", { name: "Metraj ve teklif" }).click();
    const quote = screen.getByTestId("teklif");
    const total = quote.getByTestId("teklif-toplam");
    // 9 + 2,5 + 2 + 0,5 = 14 m; × 1,10 (plain 10 %) = 15,4 m; up to 0,5 m → 15,5 m
    await expect(total).toContainText("MISSO-05");
    await expect(total).toContainText("15,5 m");
    await expect(total).toContainText("Kasa 9 m + Oturak 2,5 m + Sırt 2 m + Kırlent 0,5 m = 14 m");
    await expect(total).toContainText("Fireyle 15,4 m, 0,5 m adımla yukarı yuvarlandı: 15,5 m");
    await expect(quote.getByText("Fire dahil değildir.")).toHaveCount(0);

    await quote.getByLabel("Müşteri adı (isteğe bağlı)").fill("Ayşe Öztürk");
    await quote.getByLabel("Fiyat, TL (isteğe bağlı)").fill("42500");
    await quote.getByRole("button", { name: "Teklifi oluştur" }).click();
    await expect(quote.getByText(/Teklif T-[0-9A-Z]{6} hazır\./)).toBeVisible();
    const number = (await quote.getByText(/Teklif T-[0-9A-Z]{6} hazır\./).innerText()).match(/T-[0-9A-Z]{6}/)![0];
    const phoneUrl = await quote.getByRole("img", { name: "Teklifi telefona almak için QR kod" }).getAttribute("data-href");
    await expect(quote.getByRole("img", { name: /WhatsApp/ })).toBeVisible();

    // the PDF: one page, the shop's, the hand-worked total
    const [download] = await Promise.all([screen.waitForEvent("download"), quote.getByRole("button", { name: "PDF indir" }).click()]);
    expect(download.suggestedFilename()).toBe(`teklif-${number}.pdf`);
    if (hasPoppler) {
      const file = await download.path();
      const text = execFileSync("pdftotext", ["-layout", file, "-"]).toString("utf8");
      expect(Number(/Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [file]).toString())![1])).toBe(1);
      for (const want of [`Teklif ${tag}`, number, "Ayşe Öztürk", "MISSO-05 (ORMEN)", "15,5 m", "42.500 TL", "Ekran renkleri bağlayıcı değildir"]) expect(text, want).toContain(want);
    }

    // the order request: pressed twice, one request
    const order = quote.getByRole("button", { name: "ORMEN'e sipariş talebi gönder" });
    await order.click();
    await expect(quote.getByRole("button", { name: "Sipariş talebi gönderildi" })).toBeDisabled({ timeout: 30_000 });
    // the very same quote and order sent twice from the screen (the outbox retrying, a double tap that got through):
    // the first opens the request, the second finds it already there
    const twice = await screen.evaluate(async (t) => {
      const body = JSON.stringify({ clientId: `cift${t}0001`, number: "T-CFT234", token: `cift-${t}-0123456789abcdef`, pieces: [{ modelSlug: "kose-takimi", fabricCode: "MISSO-05" }], order: true });
      const send = async () => {
        const r = await fetch("/api/teklif", { method: "POST", headers: { "content-type": "application/json" }, body });
        return { status: r.status, order: ((await r.json()) as { order: { created: boolean } }).order };
      };
      return [await send(), await send()];
    }, tag);
    expect(twice[0]).toEqual({ status: 201, order: { created: true } });
    expect(twice[1]).toEqual({ status: 200, order: { created: false } });

    // ORMEN's panel: the shop, the code and the metres; not the customer
    await page.goto("/panel/siparisler");
    const row = page.getByTestId("siparis").filter({ hasText: `Teklif ${tag}` });
    await expect(row).toHaveCount(2);
    await expect(row.filter({ hasText: number })).toHaveCount(1);
    await expect(row.filter({ hasText: "T-CFT234" })).toHaveCount(1);
    await expect(row.filter({ hasText: number })).toContainText("MISSO-05 15,5 m");
    await expect(page.locator("main")).not.toContainText("Ayşe Öztürk");
    await page.goto("/panel");
    await expect(page.getByRole("alert").filter({ hasText: "yeni kumaş sipariş talebi" })).toContainText(`Teklif ${tag}`);

    // the customer's phone: the quote by its link, without signing in
    const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    await phone.goto(new URL(phoneUrl!).pathname);
    await expect(phone.getByRole("heading", { name: "Teklif" })).toBeVisible();
    await expect(phone.getByText(`No ${number}`)).toBeVisible();
    await expect(phone.getByText("15,5 m").first()).toBeVisible();
    await expect(phone.getByText("Müşteri: Ayşe Öztürk")).toBeVisible();
    // an unknown link says so calmly
    await phone.goto("/t/bilinmeyen-bir-teklif-baglantisi");
    await expect(phone.getByRole("heading", { name: "Teklif henüz burada değil" })).toBeVisible();

    // a web page (no paired screen) can make a quote but cannot send an order to ORMEN
    const body = { clientId: `web${tag}0001`, number: "T-WEB234", token: `web-${tag}-0123456789abcdef`, pieces: [{ modelSlug: "kose-takimi", fabricCode: "MISSO-05" }], firmSlug: slug, order: true };
    expect((await request.post("/api/teklif", { data: body })).status()).toBe(403);
    expect((await request.post("/api/teklif", { data: { ...body, order: false } })).status()).toBe(201);
    // the same quote again is the same quote, not a second one
    expect((await request.post("/api/teklif", { data: { ...body, order: false } })).status()).toBe(200);
    await ctx.close();
  });
});
