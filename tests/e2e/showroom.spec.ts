import { expect, test } from "./fixtures";
import { login, sceneFabrics } from "./helpers";
import type { Page } from "@playwright/test";

// Showroom package, job 1: a screen is tied to a shop with a code from the
// panel, opens that shop's showroom without asking again, follows a
// suspension, and is locked out when removed.

async function typeCode(screen: Page, code: string) {
  for (const digit of code) await screen.getByRole("button", { name: digit, exact: true }).click();
}

async function newCode(panel: Page, name: string): Promise<string> {
  await panel.getByLabel("Ekranın adı").fill(name);
  await panel.getByRole("button", { name: "Cihaz ekle" }).click();
  const code = (await panel.getByTestId("eslestirme-kodu").innerText()).trim();
  expect(code).toMatch(/^[0-9]{6}$/);
  return code;
}

test.describe("showroom ekranı", () => {
  test.skip(({ isMobile }) => isMobile, "showroom ekranı geniş ekran içindir");

  test("eşleşme, yeniden açılış, askıya alma ve kaldırma", async ({ page, browser }) => {
    await login(page);
    await page.goto("/panel/firmalar");
    await page.getByRole("link", { name: "Örnek Mobilya" }).click();
    const name = `Giriş ekranı ${Date.now().toString(36)}`;
    const code = await newCode(page, name);

    // the screen is another browser: it has no panel session
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const screen = await context.newPage();
    await screen.goto("/showroom");
    await expect(screen.getByRole("heading", { name: "Eşleştirme kodunu yazın" })).toBeVisible();

    // a wrong code says so and ties nothing
    await typeCode(screen, code === "111111" ? "222222" : "111111");
    await expect(screen.getByText("Kod hatalı ya da süresi geçti.")).toBeVisible();

    // the right code opens the shop's showroom, in the shop's own words
    await typeCode(screen, code);
    await expect(screen.getByRole("button", { name: "Başlamak için dokunun" })).toBeVisible();
    await expect(screen.getByText("Dokunun, kumaşı siz seçin")).toBeVisible();
    await expect(screen.getByText(/ORMEN kumaşlarını/)).toHaveCount(0);
    await expect(screen.getByRole("heading", { name: /Örnek Mobilya/ })).toBeAttached();

    // the code worked once: a second screen cannot reuse it
    const other = await (await browser.newContext()).newPage();
    await other.goto("/showroom");
    await typeCode(other, code);
    await expect(other.getByText("Kod hatalı ya da süresi geçti.")).toBeVisible();
    await other.context().close();

    // restart: a new tab in the same browser opens the showroom without asking for a code
    await screen.close();
    const again = await context.newPage();
    await again.goto("/showroom");
    await expect(again.getByRole("button", { name: "Başlamak için dokunun" })).toBeVisible();
    await expect(again.getByRole("heading", { name: "Eşleştirme kodunu yazın" })).toHaveCount(0);

    // the panel sees the screen and that it has checked in
    await page.reload();
    const row = page.getByRole("listitem").filter({ hasText: name });
    await expect(row).toBeVisible();
    await expect(row.getByText("Güncel", { exact: true })).toBeVisible();

    // suspend the shop: at its next check the screen shows the calm notice
    await page.goto("/panel/magazalar");
    const shop = page.getByRole("listitem").filter({ hasText: "Örnek Mobilya" });
    await shop.getByRole("button", { name: "Askıya al" }).click();
    await expect(shop.getByRole("button", { name: "Geri aç" })).toBeVisible();
    await again.evaluate(() => (window as unknown as { __ormenSync: () => Promise<void> }).__ormenSync());
    await expect(again.getByRole("heading", { name: "Ekran kısa bir süre için kapalı" })).toBeVisible();

    // switched back on: the screen returns by itself, nothing lost
    await shop.getByRole("button", { name: "Geri aç" }).click();
    await expect(shop.getByRole("button", { name: "Askıya al" })).toBeVisible();
    await again.evaluate(() => (window as unknown as { __ormenSync: () => Promise<void> }).__ormenSync());
    await expect(again.getByRole("button", { name: "Başlamak için dokunun" })).toBeVisible();

    // removed in the panel: the screen is locked out and asks for a code again
    await page.goto("/panel/firmalar");
    await page.getByRole("link", { name: "Örnek Mobilya" }).click();
    const device = page.getByRole("listitem").filter({ hasText: name });
    await device.getByRole("button", { name: /kaldır/ }).click();
    await device.getByRole("button", { name: "Evet, kaldır" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: name })).toHaveCount(0);
    await again.goto("/showroom");
    await expect(again.getByRole("heading", { name: "Eşleştirme kodunu yazın" })).toBeVisible();
    await context.close();
  });

  test("kilit: dışarı çıkan bağlantı yok; logoya 5 dokunuş ve PIN ayar ekranını açar", async ({ page, browser }) => {
    await login(page);
    await page.goto("/panel/firmalar");
    await page.getByRole("link", { name: "Örnek Mobilya" }).click();
    // an easy PIN is refused, a proper one is stored
    await page.getByLabel("Mağaza PIN’i").fill("1234");
    await page.getByRole("button", { name: "PIN’i kaydet" }).click();
    await expect(page.getByText(/çok kolay tahmin edilir/)).toBeVisible();
    await page.getByLabel("Mağaza PIN’i").fill("4821");
    await page.getByRole("button", { name: "PIN’i kaydet" }).click();
    await expect(page.getByText("PIN kaydedildi.")).toBeVisible();
    const code = await newCode(page, `Kilit ekranı ${Date.now().toString(36)}`);

    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const screen = await context.newPage();
    await screen.goto("/showroom");
    await typeCode(screen, code);
    await screen.getByRole("button", { name: "Başlamak için dokunun" }).click();

    // the installed app carries the shop's name, not ORMEN's or a browser's
    await expect(screen).toHaveTitle("Örnek Mobilya");
    const manifest = await (await context.request.get("/showroom/manifest.webmanifest")).json();
    expect(manifest).toMatchObject({ name: "Örnek Mobilya", start_url: "/showroom", display: "fullscreen" });
    expect((await context.request.get("/showroom/simge/192")).headers()["content-type"]).toContain("image/png");

    // no link on the screen leads out: every anchor is clicked, the address never changes, no window opens
    const popups: unknown[] = [];
    context.on("page", (p) => popups.push(p));
    const hrefs = await screen.evaluate(() => {
      const out: string[] = [];
      for (const a of Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))) {
        out.push(a.getAttribute("href") ?? "");
        a.click();
      }
      // a link a later dialog might add is stopped the same way
      for (const href of ["/panel", "https://example.com/", "/"]) {
        const a = document.createElement("a");
        a.href = href;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      window.open("https://example.com/");
      return out;
    });
    await screen.waitForTimeout(500);
    expect(new URL(screen.url()).pathname, `links tried: ${hrefs.join(", ")}`).toBe("/showroom");
    expect(popups).toHaveLength(0);

    // four taps on the logo do nothing; the fifth asks for the PIN
    const logo = screen.locator("[data-marka]").first();
    for (let i = 0; i < 4; i++) await logo.dispatchEvent("pointerdown");
    await expect(screen.getByRole("dialog", { name: "Mağaza PIN’i" })).toHaveCount(0);
    await logo.dispatchEvent("pointerdown");
    const pad = screen.getByRole("dialog", { name: "Mağaza PIN’i" });
    await expect(pad).toBeVisible();

    // a wrong PIN stays locked
    for (const d of "1357") await pad.getByRole("button", { name: d, exact: true }).click();
    await pad.getByRole("button", { name: "Tamam" }).click();
    await expect(pad.getByText("PIN hatalı.")).toBeVisible();
    await expect(screen.getByRole("dialog", { name: "Ekran ayarları" })).toHaveCount(0);

    // the right PIN opens the settings sheet, with "check for updates"
    for (const d of "4821") await pad.getByRole("button", { name: d, exact: true }).click();
    await pad.getByRole("button", { name: "Tamam" }).click();
    const sheet = screen.getByRole("dialog", { name: "Ekran ayarları" });
    await expect(sheet).toBeVisible();
    await sheet.getByRole("button", { name: "Güncellemeleri denetle" }).click();
    await expect(sheet.getByText("Ekran güncel.")).toBeVisible();
    await sheet.getByRole("button", { name: "Showroom’a dön" }).click();
    await expect(sheet).toHaveCount(0);
    await context.close();
  });

  test("çevrimdışı: ekran açılır, kumaş değişir, kayıtlar bağlantı gelince bir kez gider", async ({ page, browser }) => {
    test.setTimeout(240_000);
    await login(page);
    await page.goto("/panel/firmalar");
    await page.getByRole("link", { name: "Örnek Mobilya" }).click();
    const code = await newCode(page, `Çevrimdışı ${Date.now().toString(36)}`);

    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    // the test browser is automated; let the usage log record anyway
    await context.addInitScript(() => ((window as unknown as { __ormenTrack: boolean }).__ormenTrack = true));
    const screen = await context.newPage();
    await screen.goto("/showroom");
    await typeCode(screen, code);
    await expect(screen.getByRole("button", { name: "Başlamak için dokunun" })).toBeVisible();
    // the helper is in charge and every fabric of the shop is on the device
    await screen.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 60_000 });
    await expect(screen.locator("html")).toHaveAttribute("data-onbellek", "hazir", { timeout: 120_000 });

    const delivered = () => screen.evaluate(() => (window as unknown as { __ormenGiden?: { id: string; type: string }[] }).__ormenGiden ?? []);
    const queued = () =>
      screen.evaluate(
        () =>
          new Promise<number>((resolve) => {
            const open = indexedDB.open("ormen-showroom", 1);
            open.onsuccess = () => {
              const req = open.result.transaction("kuyruk").objectStore("kuyruk").count();
              req.onsuccess = () => {
                resolve(req.result);
                open.result.close();
              };
            };
            open.onerror = () => resolve(-1);
          }),
      );

    // no internet, and the screen is restarted
    await context.setOffline(true);
    const reopened = await screen.reload();
    // it opened from the copy on the device, and the network really is gone
    expect(reopened?.headers()["x-ormen-kaynak"]).toBe("cihaz");
    expect(await screen.evaluate(() => fetch("/api/showroom/esitle", { method: "POST" }).then(() => "ag", () => "yok"))).toBe("yok");
    await screen.getByRole("button", { name: "Başlamak için dokunun" }).click();
    await expect(screen.getByTestId("cevrimdisi")).toBeVisible();
    // what needs the internet says so instead of failing
    await expect(screen.getByRole("button", { name: /Numune iste/ })).toBeDisabled();

    // a fabric is tried from the swatch code: it goes on the sofa from the device copy
    const before = await sceneFabrics(screen);
    await screen.getByLabel("Elinizdeki kartelanın kodu").fill("MISSO-05");
    await expect.poll(() => sceneFabrics(screen), { timeout: 60_000 }).toContain("MISSO-05");
    expect(before).not.toContain("MISSO-05");

    // "Telefona al" still gives the QR (the visitor's phone has its own internet)
    await screen.getByRole("button", { name: "Telefona al" }).click();
    await expect(screen.getByRole("dialog")).toBeVisible();
    await screen.keyboard.press("Escape");

    // the records wait on the device
    await expect.poll(queued, { timeout: 30_000 }).toBeGreaterThan(0);
    // nothing got through while offline
    expect(await delivered()).toHaveLength(0);

    // the connection is back: everything goes, each record once
    await context.setOffline(false);
    await expect.poll(queued, { timeout: 90_000 }).toBe(0);
    await expect(screen.getByTestId("cevrimdisi")).toHaveCount(0);
    const sent = await delivered();
    expect(sent.map((e) => e.type)).toContain("kumas_denendi");
    expect(sent.map((e) => e.type)).toContain("oturum_basladi");
    const ids = sent.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    await context.close();
  });

  test("kalite profili: hafif profilde detay azalır, kumaşın rengi ve ölçeği aynı kalır", async ({ page, browser }) => {
    test.setTimeout(180_000);
    await login(page);
    await page.goto("/panel/firmalar");
    await page.getByRole("link", { name: "Örnek Mobilya" }).click();
    const name = `Profil ${Date.now().toString(36)}`;
    const code = await newCode(page, name);
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const screen = await context.newPage();
    await screen.goto("/showroom");
    await typeCode(screen, code);
    await expect(screen.getByRole("button", { name: "Başlamak için dokunun" })).toBeVisible();

    // what the profile may and may not change, read from the scene itself
    type Look = { fabrics: { name: string; color: string; repeat: [number, number]; mapWidth: number }[]; shadows: boolean };
    const look = () =>
      screen.evaluate((): Look => {
        type Tex = { image?: { width?: number }; repeat?: { x: number; y: number } };
        type O = { isMesh?: boolean; isDirectionalLight?: boolean; castShadow?: boolean; material?: { name?: string; color?: { getHexString(): string }; map?: Tex } };
        const s = (window as unknown as { __ormenStage?: { get(): { scene: { traverse(cb: (o: O) => void): void } } } }).__ormenStage;
        const fabrics: Look["fabrics"] = [];
        let shadows = false;
        s?.get().scene.traverse((o) => {
          if (o.isDirectionalLight && o.castShadow) shadows = true;
          const m = o.material;
          if (!o.isMesh || !m?.name?.startsWith("kumas:") || !m.map?.repeat) return;
          fabrics.push({ name: m.name, color: m.color?.getHexString() ?? "", repeat: [Math.round(m.map.repeat.x * 1e4) / 1e4, Math.round(m.map.repeat.y * 1e4) / 1e4], mapWidth: m.map.image?.width ?? 0 });
        });
        const seen = new Set<string>();
        return { fabrics: fabrics.filter((f) => (seen.has(f.name + f.repeat.join()) ? false : (seen.add(f.name + f.repeat.join()), true))), shadows };
      });
    const settle = async (profil: string) => {
      await expect(screen.locator("html")).toHaveAttribute("data-profil", profil, { timeout: 60_000 });
      await expect.poll(async () => (await look()).fabrics.length, { timeout: 60_000 }).toBeGreaterThan(0);
      await screen.waitForTimeout(1500);
      return look();
    };

    // the panel sets "tam", the screen restarts with it
    const row = page.getByRole("listitem").filter({ hasText: name });
    await page.reload();
    await row.getByLabel(`${name}: kalite profili`).selectOption("tam");
    await expect(page.getByText(/Kalite profili kaydedildi \(Tam\)/)).toBeVisible();
    await screen.evaluate(() => (window as unknown as { __ormenSync: () => Promise<void> }).__ormenSync());
    const tam = await settle("tam");
    expect(tam.shadows).toBe(true);

    // then "hafif"
    await row.getByLabel(`${name}: kalite profili`).selectOption("hafif");
    await expect(page.getByText(/Kalite profili kaydedildi \(Hafif\)/)).toBeVisible();
    await screen.evaluate(() => (window as unknown as { __ormenSync: () => Promise<void> }).__ormenSync());
    const hafif = await settle("hafif");

    // detail goes down: no cast shadows, textures at most 1K
    expect(hafif.shadows).toBe(false);
    for (const f of hafif.fabrics) expect(f.mapWidth, f.name).toBeLessThanOrEqual(1024);
    // the fabric's colour and its real-world scale are exactly the same
    const key = (l: Look) => l.fabrics.map((f) => `${f.name} ${f.color} ${f.repeat.join("x")}`).sort();
    expect(key(hafif)).toEqual(key(tam));
    await context.close();
  });

  test("PIN ucu eşleşmemiş ekrana kapalı", async ({ request }) => {
    expect((await request.post("/api/showroom/pin", { data: { pin: "4821" } })).status()).toBe(401);
  });

  test("eşleşmemiş ekran eşitleme uç noktasından hiçbir şey öğrenemez", async ({ request }) => {
    const r = await request.post("/api/showroom/esitle", { data: {} });
    expect(r.status()).toBe(401);
    expect(await r.text()).not.toContain("Örnek");
    const forged = await request.post("/api/showroom/esitle", { data: {}, headers: { cookie: `ormen_cihaz=${"A".repeat(43)}` } });
    expect(forged.status()).toBe(401);
  });
});
