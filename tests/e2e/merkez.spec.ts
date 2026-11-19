import { expect, test } from "./fixtures";
import { login } from "./helpers";

// The central panel (Showroom package, job 0): the shop list.

test.describe("merkez panel", () => {
  test.skip(({ isMobile }) => isMobile, "panel masaüstü için");

  test("giriş olmadan mağaza listesi kapalı", async ({ page, request }) => {
    await page.goto("/panel/magazalar");
    await expect(page).toHaveURL(/\/panel\/giris/);
    const r = await request.get("/panel/magazalar", { maxRedirects: 0 });
    expect(r.status()).toBe(307);
    expect(await r.text()).not.toContain("Örnek Mobilya");
  });

  test("mağaza listesi: arama, süzme, askıya alma ve geri açma", async ({ page }) => {
    await login(page);
    await page.goto("/panel/magazalar");
    await expect(page.getByRole("heading", { name: "Mağazalar" })).toBeVisible();
    const row = page.getByRole("listitem").filter({ hasText: "Örnek Mobilya" });
    await expect(row).toBeVisible();

    // a search that matches nothing says so instead of showing an empty page
    await page.getByLabel("Ara").fill("böyle bir mağaza yok");
    await page.getByRole("button", { name: "Göster" }).click();
    await expect(page.getByText("Bu aramaya uyan mağaza yok.")).toBeVisible();
    await page.getByRole("link", { name: "Temizle" }).click();
    await expect(row).toBeVisible();

    // suspend with one tap; it survives a reload and shows in the status filter
    await row.getByRole("button", { name: "Askıya al" }).click();
    await expect(row.getByRole("button", { name: "Geri aç" })).toBeVisible();
    await page.goto("/panel/magazalar?durum=askida");
    await expect(row).toBeVisible();
    // other tests may have opened active shops; this one is not among them
    await page.goto("/panel/magazalar?durum=aktif");
    await expect(page.getByRole("heading", { name: "Mağazalar" })).toBeVisible();
    await expect(row).toHaveCount(0);

    // bring it back: nothing was lost, it is active again
    await page.goto("/panel/magazalar");
    await row.getByRole("button", { name: "Geri aç" }).click();
    await expect(row.getByRole("button", { name: "Askıya al" })).toBeVisible();
    await page.goto("/panel/magazalar?durum=aktif");
    await expect(row).toBeVisible();
  });
});

test.describe("merkez panel: mağaza bazında gösterim", () => {
  test.skip(({ isMobile }) => isMobile, "panel masaüstü için");

  test("ortak ürün mağazada kendi adıyla görünür; merkezdeki adı değişmez", async ({ page }) => {
    await login(page);
    await page.goto("/panel/firmalar");
    await page.getByRole("link", { name: "Örnek Mobilya" }).click();
    // give the shop the first two shared products
    const picks = page.locator("label", { hasText: "ORMEN vitrini" });
    for (const i of [0, 1]) {
      const box = picks.nth(i).getByRole("checkbox");
      if (!(await box.isChecked())) await box.check();
    }
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page.getByText("Örnek Mobilya kaydedildi.")).toBeVisible();

    const section = page.getByRole("region", { name: "Bu mağazada nasıl görünsün" });
    const row = section.getByRole("listitem").first();
    const central = (await row.locator("p").first().innerText()).trim();
    const shopName = `Lara ${Date.now().toString(36)}`;
    await row.getByLabel("Mağazadaki adı").fill(shopName);
    await row.getByLabel("Ürün kodu").fill("LR-300");
    await row.getByRole("button", { name: /kaydet/ }).click();
    await expect(row.getByText("Kaydedildi.")).toBeVisible();

    // the shop's page shows the shop's name; ORMEN's own page still shows the centre's
    await page.goto("/f/ornek-mobilya");
    await expect(page.getByText(shopName).first()).toBeVisible();
    await page.goto("/panel/modeller");
    await expect(page.getByText(central).first()).toBeVisible();
    await expect(page.getByText(shopName)).toHaveCount(0);

    // saving the shop again keeps the name (the product list is not wiped and rebuilt)
    await page.goto("/panel/firmalar");
    await page.getByRole("link", { name: "Örnek Mobilya" }).click();
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page.getByText("Örnek Mobilya kaydedildi.")).toBeVisible();
    await expect(page.getByRole("region", { name: "Bu mağazada nasıl görünsün" }).getByRole("listitem").first().getByLabel("Mağazadaki adı")).toHaveValue(shopName);
  });
});

test.describe("merkez panel: katalog ve toplu atama", () => {
  test.skip(({ isMobile }) => isMobile, "panel masaüstü için");

  test("ürünler mağazalara tek işlemde eklenir ve çıkarılır", async ({ page }) => {
    await login(page);
    // a second shop, and a product of its own
    const tag = Date.now().toString(36);
    await page.goto("/panel/firmalar/yeni");
    await page.getByLabel("Firma adı").fill(`Toplu ${tag}`);
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page.getByText(`Toplu ${tag} kaydedildi.`)).toBeVisible();

    await page.goto("/panel/katalog?sahip=ortak");
    await expect(page.getByRole("heading", { name: "Katalog" })).toBeVisible();
    const products = page.locator("main ul").first().getByRole("listitem");
    const first = products.nth(0);
    const second = products.nth(1);
    const firstName = (await first.getByRole("link").innerText()).trim();
    await first.getByRole("checkbox").check();
    await second.getByRole("checkbox").check();

    const panel = page.getByRole("complementary", { name: "Toplu atama" });
    await panel.getByLabel("Mağaza ara").fill(`Toplu ${tag}`);
    await panel.getByRole("button", { name: "Listedekilerin hepsini seç" }).click();
    await expect(panel.getByText("2 ürün, 1 mağaza seçili.")).toBeVisible();
    await panel.getByRole("button", { name: "Mağazalara ekle" }).click();
    await expect(panel.getByText("2 atama eklendi.")).toBeVisible();

    // the same again adds nothing: what the shop already has is left as it is
    await products.nth(0).getByRole("checkbox").check();
    await panel.getByRole("button", { name: "Mağazalara ekle" }).click();
    await expect(panel.getByText("0 atama eklendi.")).toBeVisible();

    // the shop filter shows exactly what that shop has
    const shopOption = await page.locator("select[name=magaza] option", { hasText: `Toplu ${tag}` }).getAttribute("value");
    await page.goto(`/panel/katalog?magaza=${shopOption}`);
    await expect(page.locator("main ul").first().getByRole("listitem")).toHaveCount(2);
    await expect(page.getByRole("link", { name: firstName, exact: true })).toBeVisible();

    // take one away
    const mine = page.locator("main ul").first().getByRole("listitem");
    await mine.nth(0).getByRole("checkbox").check();
    const panel2 = page.getByRole("complementary", { name: "Toplu atama" });
    await panel2.getByLabel("Mağaza ara").fill(`Toplu ${tag}`);
    await panel2.getByRole("button", { name: "Listedekilerin hepsini seç" }).click();
    await panel2.getByRole("button", { name: "Çıkar" }).click();
    await expect(panel2.getByText("1 atama çıkarıldı.")).toBeVisible();
    await expect(page.locator("main ul").first().getByRole("listitem")).toHaveCount(1);
  });
});

test.describe("merkez panel: mağaza bazında özellikler", () => {
  test.skip(({ isMobile }) => isMobile, "panel masaüstü için");

  test("kapatılan özellik mağaza sayfasından kalkar ve uç da reddeder; açınca geri gelir", async ({ page, request }) => {
    test.setTimeout(150_000);
    await login(page);
    const tag = Date.now().toString(36);
    await page.goto("/panel/firmalar/yeni");
    await page.getByLabel("Firma adı").fill(`Özellik ${tag}`);
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page.getByText(`Özellik ${tag} kaydedildi.`)).toBeVisible();
    const slug = (await page.getByText(/\/f\/ozellik-/).first().innerText()).match(/\/f\/(ozellik-[a-z0-9-]+)/)![1];
    const panelUrl = page.url();

    const site = await page.context().browser()!.newPage();
    await site.goto(`/f/${slug}`);
    await expect(site.getByRole("button", { name: "Metraj ve teklif" })).toBeVisible({ timeout: 60_000 });
    await expect(site.getByRole("tab", { name: "Köşe kur" })).toBeVisible();

    // off
    const teklif = page.getByRole("switch", { name: "Metraj ve teklif açık" });
    await expect(teklif).toHaveAttribute("aria-checked", "true");
    await teklif.click();
    await expect(teklif).toHaveAttribute("aria-checked", "false");
    await page.getByRole("switch", { name: "Köşe kurucu açık" }).click();
    await expect(page.getByRole("switch", { name: "Köşe kurucu açık" })).toHaveAttribute("aria-checked", "false");
    await site.reload();
    await expect(site.getByRole("button", { name: "Numune iste" })).toBeVisible({ timeout: 60_000 });
    await expect(site.getByRole("button", { name: "Metraj ve teklif" })).toHaveCount(0);
    await expect(site.getByRole("tab", { name: "Köşe kur" })).toHaveCount(0);
    // not only hidden: the endpoint refuses it too
    const body = { clientId: `ozl${tag}0001`, number: "T-XZL234", token: `ozl-${tag}-0123456789abcdef`, pieces: [{ modelSlug: "berjer", fabricCode: "MISSO-05" }], firmSlug: slug };
    expect((await request.post("/api/teklif", { data: body })).status()).toBe(403);

    // the switch survives a reload of the panel, and the firm form's save does not reset it
    await page.goto(panelUrl);
    await expect(page.getByRole("switch", { name: "Metraj ve teklif açık" })).toHaveAttribute("aria-checked", "false");
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page.getByText(`Özellik ${tag} kaydedildi.`)).toBeVisible();
    await expect(page.getByRole("switch", { name: "Metraj ve teklif açık" })).toHaveAttribute("aria-checked", "false");

    // on again
    await page.getByRole("switch", { name: "Metraj ve teklif açık" }).click();
    await expect(page.getByRole("switch", { name: "Metraj ve teklif açık" })).toHaveAttribute("aria-checked", "true");
    await site.reload();
    await expect(site.getByRole("button", { name: "Metraj ve teklif" })).toBeVisible({ timeout: 60_000 });
    await site.close();
  });
});

test.describe("merkez panel: değişiklik günlüğü", () => {
  test.skip(({ isMobile }) => isMobile, "panel masaüstü için");

  test("askıya alma ve toplu atama günlükte görünür ve oradan geri alınır", async ({ page }) => {
    test.setTimeout(150_000);
    await login(page);
    const tag = Date.now().toString(36);
    await page.goto("/panel/firmalar/yeni");
    await page.getByLabel("Firma adı").fill(`Günlük ${tag}`);
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page.getByText(`Günlük ${tag} kaydedildi.`)).toBeVisible();

    // suspend it
    await page.goto(`/panel/magazalar?ara=${encodeURIComponent(`Günlük ${tag}`)}`);
    const shop = page.getByRole("listitem").filter({ hasText: `Günlük ${tag}` });
    await shop.getByRole("button", { name: "Askıya al" }).click();
    await expect(shop.getByRole("button", { name: "Geri aç" })).toBeVisible();

    // give it one product in bulk
    await page.goto("/panel/katalog?sahip=ortak");
    await page.locator("main ul").first().getByRole("listitem").first().getByRole("checkbox").check();
    const panel = page.getByRole("complementary", { name: "Toplu atama" });
    await panel.getByLabel("Mağaza ara").fill(`Günlük ${tag}`);
    await panel.getByRole("button", { name: "Listedekilerin hepsini seç" }).click();
    await panel.getByRole("button", { name: "Mağazalara ekle" }).click();
    await expect(panel.getByText("1 atama eklendi.")).toBeVisible();

    // both are in the log, newest first; undo them from there
    await page.goto("/panel/gunluk");
    const assign = page.getByTestId("gunluk-kaydi").filter({ hasText: "1 mağazaya eklendi" }).first();
    await expect(assign).toContainText("toplu işlem");
    await assign.getByRole("button", { name: /^Geri al/ }).click();
    await assign.getByRole("button", { name: "Evet, geri al" }).click();
    await expect(page.getByTestId("gunluk-kaydi").filter({ hasText: "Geri alındı:" }).first()).toBeVisible();

    // the original entry only (the undo writes its own "Geri alındı: …" entry with the same words)
    const suspend = page.getByTestId("gunluk-kaydi").filter({ hasText: new RegExp(`^Günlük ${tag}: Aktif → Askıda`) });
    await suspend.getByRole("button", { name: /^Geri al/ }).click();
    await suspend.getByRole("button", { name: "Evet, geri al" }).click();
    await expect(suspend.getByText("geri alındı")).toBeVisible();
    // an entry undone has no second undo
    await expect(suspend.getByRole("button", { name: /^Geri al/ })).toHaveCount(0);

    // the shop is active again and has no products
    await page.goto(`/panel/magazalar?ara=${encodeURIComponent(`Günlük ${tag}`)}`);
    await expect(page.getByRole("listitem").filter({ hasText: `Günlük ${tag}` }).getByRole("button", { name: "Askıya al" })).toBeVisible();
    const shopId = await page.getByRole("link", { name: `Günlük ${tag}` }).getAttribute("href");
    await page.goto(`/panel/katalog?magaza=${shopId!.split("/").pop()}`);
    await expect(page.getByText("Bu aramaya uyan ürün yok.")).toBeVisible();
  });
});

test.describe("merkez panel: mağaza kaydı, bakım bedeli, şablon", () => {
  test.skip(({ isMobile }) => isMobile, "panel masaüstü için");

  test("kayıt listeye yansır; şablon yeni mağazayı tek adımda kurar ve günlükten geri alınır; vade gecikince görünür", async ({ page }) => {
    test.setTimeout(180_000);
    await login(page);
    const tag = Date.now().toString(36);
    const newShop = async (name: string) => {
      await page.goto("/panel/firmalar/yeni");
      await page.getByLabel("Firma adı").fill(name);
      await page.getByRole("button", { name: "Kaydet", exact: true }).click();
      await expect(page.getByText(`${name} kaydedildi.`)).toBeVisible();
    };

    // the first shop, set up by hand
    await newShop(`Kaynak ${tag}`);
    const rec = page.getByRole("region", { name: "Mağaza kaydı" });
    await rec.getByLabel("Şehir").fill(`Şehir${tag}`);
    await rec.getByLabel("Paket").fill("Pilot");
    await rec.getByLabel("Etiketler").fill(`Pilot-${tag}, siteler`);
    await rec.getByLabel("Yetkili").fill("Ayşe Hanım");
    await rec.getByLabel("Vitrin süresi (sn)").fill("90");
    await rec.getByLabel("Güncellemeler").selectOption("onayli");
    await rec.getByRole("button", { name: "Kaydı kaydet" }).click();
    await expect(rec.getByRole("status")).toHaveText("Mağaza kaydı kaydedildi.");
    // a loop time out of range is refused with the reason
    await rec.getByLabel("Vitrin süresi (sn)").fill("5");
    await rec.getByRole("button", { name: "Kaydı kaydet" }).click();
    await expect(rec.getByRole("alert")).toHaveText("Vitrin süresi 30–600 saniye arasında bir sayı olmalı.");
    await page.reload();
    await expect(page.getByRole("region", { name: "Mağaza kaydı" }).getByLabel("Vitrin süresi (sn)")).toHaveValue("90");
    await page.getByRole("switch", { name: "Köşe kurucu açık" }).click();
    await expect(page.getByRole("switch", { name: "Köşe kurucu açık" })).toHaveAttribute("aria-checked", "false");
    const tpl = page.getByRole("region", { name: "Şablon" });
    await tpl.getByLabel("Bu mağazanın ayarlarını şablon olarak kaydet").fill(`Pilot ${tag}`);
    await tpl.getByRole("button", { name: "Şablon olarak kaydet" }).click();
    await expect(tpl.getByRole("status")).toHaveText("Şablon kaydedildi.");

    // the shop list filters by what was entered
    await page.goto(`/panel/magazalar?etiket=${encodeURIComponent(`pilot-${tag}`)}`);
    const row = page.getByRole("listitem").filter({ hasText: `Kaynak ${tag}` });
    await expect(row).toContainText(`Şehir${tag} · Pilot · Ayşe Hanım`);
    await page.goto(`/panel/magazalar?sehir=${encodeURIComponent(`Şehir${tag}`)}`);
    await expect(page.getByRole("listitem").filter({ hasText: `Kaynak ${tag}` })).toHaveCount(1);

    // a second shop from the template: one choice, one tap
    const started = Date.now();
    await newShop(`Yeni ${tag}`);
    const tpl2 = page.getByRole("region", { name: "Şablon" });
    await tpl2.getByLabel("Şablondan kur").selectOption({ label: `Pilot ${tag}` });
    await expect(tpl2).toContainText("kapalı: Köşe kurucu");
    await tpl2.getByRole("button", { name: "Şablonu uygula" }).click();
    await expect(tpl2.getByRole("status")).toContainText(`“Pilot ${tag}” uygulandı.`);
    const rec2 = page.getByRole("region", { name: "Mağaza kaydı" });
    await expect(rec2.getByLabel("Vitrin süresi (sn)")).toHaveValue("90");
    await expect(rec2.getByLabel("Güncellemeler")).toHaveValue("onayli");
    await expect(rec2.getByLabel("Paket")).toHaveValue("Pilot");
    // its own record stays its own
    await expect(rec2.getByLabel("Yetkili")).toHaveValue("");
    await expect(page.getByRole("switch", { name: "Köşe kurucu açık" })).toHaveAttribute("aria-checked", "false");
    console.log(`SABLON kurulum: ${((Date.now() - started) / 1000).toFixed(1)} sn`);
    expect(Date.now() - started).toBeLessThan(10 * 60_000);
    const shopUrl = page.url();

    // maintenance fee: a past due date shows as late, then paid
    const fees = page.getByRole("region", { name: "Bakım bedeli" });
    await fees.getByLabel("Son ödeme tarihi").fill("2026-11-01");
    await fees.getByLabel("Tutar (TL)").fill("2.500");
    await fees.getByRole("button", { name: "Vade ekle" }).click();
    const due = fees.getByRole("list", { name: "Vadeler" }).getByRole("listitem").first();
    await expect(due).toContainText("1 Kasım 2026");
    await expect(due).toContainText("2.500");
    await expect(due).toContainText("gecikti");
    await page.goto(`/panel/magazalar?ara=${encodeURIComponent(`Yeni ${tag}`)}`);
    await expect(page.getByRole("listitem").filter({ hasText: `Yeni ${tag}` })).toContainText("bakım vadesi 1 Kas");
    await page.goto(shopUrl);
    await page.getByRole("region", { name: "Bakım bedeli" }).getByRole("button", { name: "Ödendi" }).click();
    await expect(page.getByRole("region", { name: "Bakım bedeli" }).getByRole("listitem").first()).toContainText("ödendi");

    // the template is undone from the log: the feature comes back, the loop time goes
    await page.goto("/panel/gunluk");
    const applied = page.getByTestId("gunluk-kaydi").filter({ hasText: new RegExp(`^Yeni ${tag}: “Pilot ${tag}” şablonu uygulandı`) });
    await applied.getByRole("button", { name: /^Geri al/ }).click();
    await applied.getByRole("button", { name: "Evet, geri al" }).click();
    await expect(applied.getByText("geri alındı")).toBeVisible();
    // the amount never reaches the log
    await expect(page.getByTestId("gunluk-kaydi").filter({ hasText: "2.500" })).toHaveCount(0);
    await page.goto(shopUrl);
    await expect(page.getByRole("switch", { name: "Köşe kurucu açık" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("region", { name: "Mağaza kaydı" }).getByLabel("Vitrin süresi (sn)")).toHaveValue("");
  });
});

test.describe("merkez panel: toplu işlem, kademeli yayın, genel bakış", () => {
  test.skip(({ isMobile }) => isMobile, "panel masaüstü için");

  test("özellik önce pilot etiketli mağazada, sonra hepsinde açılır; her adım günlükte, tek tek geri alınır; genel bakış vadeyi gösterir", async ({ page }) => {
    test.setTimeout(180_000);
    await login(page);
    const tag = Date.now().toString(36);
    const ids: Record<string, string> = {};
    for (const n of ["A", "B"]) {
      await page.goto("/panel/firmalar/yeni");
      await page.getByLabel("Firma adı").fill(`Kademe ${n} ${tag}`);
      await page.getByRole("button", { name: "Kaydet", exact: true }).click();
      await expect(page.getByText(`Kademe ${n} ${tag} kaydedildi.`)).toBeVisible();
      ids[n] = new URL(page.url()).pathname.split("/").pop()!;
    }
    const tryOn = async (n: string) => {
      await page.goto(`/panel/firmalar/${ids[n]}`);
      return page.getByRole("switch", { name: "Fotoğraftan dene açık" }).getAttribute("aria-checked");
    };

    // the pilot group: a tag on shop A, given in bulk
    await page.goto(`/panel/magazalar?ara=${encodeURIComponent(`Kademe A ${tag}`)}`);
    await page.getByRole("checkbox", { name: `Kademe A ${tag} seç` }).check();
    const bar = page.getByRole("complementary", { name: "Toplu işlem" });
    await expect(bar.getByTestId("toplu-sayi")).toHaveText(/^1 mağaza seçili/);
    await bar.getByLabel("İşlem").selectOption("etiket-ekle");
    await bar.getByLabel("Etiket").fill(`pilot-${tag}`);
    await bar.getByRole("button", { name: "Uygula" }).click();
    await bar.getByRole("button", { name: "Evet, uygula" }).click();
    await expect(page.getByRole("status")).toContainText("1 mağazada yapıldı");

    // step 1: the feature in the pilot group only (every shop the filter finds)
    await page.goto(`/panel/magazalar?etiket=pilot-${tag}`);
    await page.getByRole("button", { name: "süzgeçteki 1 mağazanın hepsini seçin" }).click();
    await bar.getByLabel("İşlem").selectOption("ozellik-ac");
    await bar.getByLabel("Özellik").selectOption({ label: "Fotoğraftan dene" });
    await bar.getByRole("button", { name: "Uygula" }).click();
    await expect(bar).toContainText("1 mağazaya uygulansın mı?");
    await bar.getByRole("button", { name: "Evet, uygula" }).click();
    await expect(page.getByRole("status")).toContainText("1 mağazada yapıldı");
    expect(await tryOn("A")).toBe("true");
    expect(await tryOn("B")).toBe("false");

    // step 2: no trouble, so everyone (here: both test shops); A is already on
    await page.goto(`/panel/magazalar?ara=${encodeURIComponent(tag)}`);
    await page.getByRole("button", { name: "süzgeçteki 2 mağazanın hepsini seçin" }).click();
    await bar.getByLabel("İşlem").selectOption("ozellik-ac");
    await bar.getByLabel("Özellik").selectOption({ label: "Fotoğraftan dene" });
    await bar.getByRole("button", { name: "Uygula" }).click();
    await bar.getByRole("button", { name: "Evet, uygula" }).click();
    await expect(page.getByRole("status")).toContainText("1 mağazada yapıldı, 1 mağaza zaten öyleydi");
    expect(await tryOn("B")).toBe("true");

    // each shop's step is in the log as a bulk step, and is undone on its own
    await page.goto(`/panel/gunluk?magaza=${ids.B}`);
    const entry = page.getByTestId("gunluk-kaydi").filter({ hasText: new RegExp(`^Kademe B ${tag}: Fotoğraftan dene açıldı`) });
    await expect(entry).toContainText("toplu işlem");
    await entry.getByRole("button", { name: /^Geri al/ }).click();
    await entry.getByRole("button", { name: "Evet, geri al" }).click();
    await expect(entry.getByText("geri alındı")).toBeVisible();
    expect(await tryOn("B")).toBe("false");
    expect(await tryOn("A")).toBe("true");

    // the overview: a late fee puts the shop on the attention list
    await page.goto(`/panel/firmalar/${ids.A}`);
    const fees = page.getByRole("region", { name: "Bakım bedeli" });
    await fees.getByLabel("Son ödeme tarihi").fill("2026-11-01");
    await fees.getByLabel("Tutar (TL)").fill("1500");
    await fees.getByRole("button", { name: "Vade ekle" }).click();
    await expect(fees.getByText("Vade eklendi.")).toBeVisible();
    await page.goto("/panel");
    const overview = page.getByTestId("genel-bakis");
    await expect(overview).toContainText("Ekranlar");
    await expect(overview).toContainText("Bu ay teklif");
    await expect(overview).toContainText("Yapay zekâ gideri (bu ay)");
    await expect(overview).toContainText(/Sağlayıcı bağlı değil|Deneme sağlayıcısı: hiçbir hizmet çağrılmıyor/);
    await expect(overview).toContainText("Bu ay vadesi gelen bakım");
    const attention = page.getByRole("region", { name: "Dikkat isteyenler" });
    await expect(attention.getByRole("listitem").filter({ hasText: `Kademe A ${tag}` })).toContainText("Bakım vadesi geçti");
  });
});
