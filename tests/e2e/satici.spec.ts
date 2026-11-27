import { expect, test } from "./fixtures";
import { login, sceneFabrics } from "./helpers";

// Job 7: seller mode. Without the shop PIN no price is anywhere on the
// screen (not in the page either); the PIN opens prices (per model and fabric
// group), the quote's total as worked out by hand, and the last 30 days'
// quotes, which open again on the screen. Three fabrics compared at once.

const ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const quoteNumber = () => `T-${Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("")}`;

test.describe("satıcı modu ve karşılaştırma", () => {
  test.skip(({ isMobile }) => isMobile, "showroom ekranı geniş ekran içindir");

  test("PIN'siz fiyat yok; PIN ile grup fiyatı, elle hesapla tutan teklif toplamı, teklif geçmişi; üç kumaş karşılaştırma", async ({ page, browser, request }) => {
    test.setTimeout(300_000);
    page.setDefaultTimeout(30_000);
    const tag = Date.now().toString(36);
    await login(page);

    // ORMEN: MISSO-05 in price group B; the corner sofa given to the shop; the shop's PIN and a screen
    await page.goto("/panel/kumaslar");
    await page.getByRole("link", { name: /MISSO-05/ }).first().click();
    await page.getByLabel("Fiyat grubu").fill("b");
    // the seed's patterned sample has no repeat entered: saved as plain, as the demo test does
    await page.getByRole("combobox", { name: /^Desen/ }).selectOption("duz");
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page).toHaveURL(/kaydedildi=MISSO-05/);
    await page.goto(`/panel/katalog?ara=${encodeURIComponent("Köşe Takımı")}`);
    await page.locator("main ul").first().getByRole("listitem").filter({ hasText: "Köşe Takımı" }).first().getByRole("checkbox").check();
    const bulk = page.getByRole("complementary", { name: "Toplu atama" });
    await bulk.getByLabel("Mağaza ara").fill("Örnek Mobilya");
    await bulk.getByRole("button", { name: "Listedekilerin hepsini seç" }).click();
    await bulk.getByRole("button", { name: "Mağazalara ekle" }).click();
    await expect(bulk.getByText(/atama|zaten/)).toBeVisible();
    await page.goto("/panel/firmalar/seed-firm-ornek");
    await page.getByLabel("Mağaza PIN’i").fill("4821");
    await page.getByRole("button", { name: "PIN’i kaydet" }).click();
    await expect(page.getByText("PIN kaydedildi.")).toBeVisible();
    await page.getByLabel("Ekranın adı").fill(`Satıcı ${tag}`);
    await page.getByRole("button", { name: "Cihaz ekle" }).click();
    const pairing = (await page.getByTestId("eslestirme-kodu").innerText()).trim();

    // a quote of the shop, for the history
    const number = quoteNumber();
    const made = await request.post("/api/teklif", { data: { clientId: `sat${tag}0001`, number, token: `sat-${tag}-0123456789abcdef`, pieces: [{ modelSlug: "kose-takimi", fabricCode: "LUMA-02" }], firmSlug: "ornek-mobilya", customerName: null, note: null, price: null } });
    expect(made.status()).toBe(201);

    // the shop owner's prices: 48.500 for every group, 52.000 in group B
    const owner = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const shop = await owner.newPage();
    await shop.goto("/magaza/giris");
    await shop.getByLabel("E-posta").fill("magaza@ormen.local");
    await shop.getByLabel("Şifre").fill("ormen-magaza");
    await shop.getByRole("button", { name: "Giriş yap" }).click();
    await shop.getByRole("link", { name: "Ürünler" }).click();
    const item = shop.getByRole("listitem", { name: /Köşe Takımı|Köşe Lüks/ }).first();
    await item.getByLabel("Satış fiyatı (TL)").fill("48.500");
    await item.getByLabel("B grubu").fill("52.000");
    await item.getByRole("button", { name: "Kaydet" }).click();
    await expect(item.getByRole("status")).toHaveText("Kaydedildi.");
    await owner.close();

    // ---- the screen, without the PIN: no price anywhere
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const screen = await ctx.newPage();
    screen.setDefaultTimeout(30_000);
    await screen.goto("/showroom");
    for (const d of pairing) await screen.getByRole("button", { name: d, exact: true }).click();
    await expect(screen.getByRole("button", { name: "Başlamak için dokunun" })).toBeVisible();
    const res = await screen.goto("/showroom?m=kose-takimi&k=MISSO-05");
    const html = await res!.text();
    for (const p of ["52000", "52.000", "48500", "48.500"]) expect(html).not.toContain(p);
    await screen.getByRole("button", { name: "Başlamak için dokunun" }).click();
    await expect(screen.getByTestId("fiyat")).toHaveCount(0);
    // a wrong PIN gets nothing
    const wrong = await screen.request.post("/api/showroom/satici", { data: { pin: "9999" } });
    expect(wrong.status()).toBe(403);
    expect(await wrong.text()).not.toContain("52000");

    // ---- seller mode
    await screen.getByRole("button", { name: "Satıcı", exact: true }).click();
    const pad = screen.getByRole("dialog", { name: "Satıcı modu" });
    for (const d of "4821") await pad.getByRole("button", { name: d, exact: true }).click();
    await pad.getByRole("button", { name: "Aç", exact: true }).click();
    await expect(pad).toHaveCount(0);
    await expect(screen.getByTestId("fiyat")).toHaveText(/: 52\.000 TL · B grubu$/);
    // LUMA-02 has no group: the model's price for every group
    await screen.getByRole("radio", { name: /^LUMA-02,/ }).click();
    await expect(screen.getByTestId("fiyat")).toHaveText(/: 48\.500 TL$/);
    await screen.getByRole("radio", { name: /^MISSO-05,/ }).click();

    // the quote's total, as by hand: one corner sofa in group B = 52.000
    await screen.getByRole("button", { name: "Metraj ve teklif" }).click();
    const quote = screen.getByRole("dialog", { name: /Metraj ve teklif/ });
    await expect(quote.getByTestId("teklif-fiyat")).toContainText("Toplam: 52.000 TL");
    await expect(quote.getByLabel("Fiyat, TL (isteğe bağlı)")).toHaveValue("52.000");
    await quote.getByRole("button", { name: "Vazgeç" }).click();

    // the history: the quote made earlier opens on the screen
    await screen.getByRole("button", { name: "Teklif geçmişi" }).click();
    const history = screen.getByRole("dialog", { name: "Teklif geçmişi" });
    await history.getByRole("button", { name: `${number} yeniden aç` }).click();
    await expect(history).toHaveCount(0);
    await expect.poll(() => sceneFabrics(screen), { timeout: 60_000 }).toEqual(["LUMA-02"]);

    // closing seller mode takes the prices away
    await screen.getByRole("button", { name: "Satıcı modunu kapat" }).click();
    await expect(screen.getByTestId("fiyat")).toHaveCount(0);

    // ---- three fabrics side by side, one camera
    await screen.getByRole("button", { name: "Karşılaştır" }).click();
    await screen.getByRole("button", { name: "Üçüncü kumaş ekle" }).click();
    await expect(screen.getByTestId("karsilastirma-3")).toBeVisible();
    await expect.poll(async () => (await sceneFabrics(screen)).length, { timeout: 60_000 }).toBe(3);
    await ctx.close();
  });
});
