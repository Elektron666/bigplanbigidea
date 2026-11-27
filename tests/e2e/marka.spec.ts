import http from "node:http";
import { expect, test } from "./fixtures";
import { login, sceneFabrics } from "./helpers";

// Job 16: a brand switched off for a shop is on none of its screens; the web
// embed opens only on the sites the shop allows, without the showroom's own
// things, and fits a phone.

const BASE = process.env.E2E_BASE_URL || "http://localhost:3100";

// the shop's own website: a real local server (a page the browser made up would count as a
// public site, and browsers keep public sites from framing a local one, whatever the policy says)
let site: http.Server | null = null;
let slugForSite = "";
test.beforeAll(async () => {
  site = http.createServer((_q, r) => {
    r.setHeader("content-type", "text/html; charset=utf-8");
    r.end(`<!doctype html><title>Mağaza</title><iframe id="g" src="${BASE}/gomme/${slugForSite}" style="width:1200px;height:800px"></iframe>`);
  });
  await new Promise<void>((ok) => site!.listen(80, ok));
});
test.afterAll(() => site?.close());

test.describe("marka ve web gömme", () => {
  test.skip(({ isMobile }) => isMobile, "panel masaüstü");

  test("kapatılan marka görünmez; gömme yalnızca izinli sitede, telefonda düzgün", async ({ page, browser }) => {
    test.setTimeout(240_000);
    page.setDefaultTimeout(30_000);
    await login(page);
    // a fabric of another brand
    await page.goto("/panel/kumaslar");
    await page.getByRole("link", { name: /LUMA-05/ }).first().click();
    await page.getByLabel("Marka").fill("Delta");
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page).toHaveURL(/kaydedildi=LUMA-05/);

    // a shop with only ORMEN, embedded on one site
    const tag = Date.now().toString(36);
    await page.goto("/panel/firmalar/yeni");
    await page.getByLabel("Firma adı").fill(`Marka ${tag}`);
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page.getByText(`Marka ${tag} kaydedildi.`)).toBeVisible();
    const slug = (await page.getByText(/\/f\/marka-/).first().innerText()).match(/\/f\/(marka-[a-z0-9-]+)/)![1];
    const box = page.getByRole("region", { name: "Markalar ve web sitesine gömme" });
    await box.getByLabel("Bütün markalar (yeni eklenenler dahil)").uncheck();
    await box.getByRole("checkbox", { name: "Delta" }).uncheck();
    await box.getByLabel(/Gömmenin açılacağı alan adları/).fill("http://izinli.localhost/koltuk");
    await box.getByRole("button", { name: "Markaları ve gömmeyi kaydet" }).click();
    await expect(box.getByRole("status")).toHaveText("Kaydedildi.");
    await expect(box.getByLabel(/Gömme kodu/)).toHaveValue(new RegExp(`/gomme/${slug}`));

    // the shop's page: the Delta fabric nowhere, even asked for by its code
    await page.goto(`/f/${slug}?m=berjer&k=LUMA-05`);
    await expect.poll(() => sceneFabrics(page), { timeout: 60_000 }).not.toEqual([]);
    expect(await sceneFabrics(page)).not.toContain("LUMA-05");
    await expect(page.getByRole("radio", { name: /^LUMA-05,/ })).toHaveCount(0);
    await expect(page.getByRole("radio", { name: /^LUMA-04,/ })).toHaveCount(1);

    // the embed's own header names the allowed site only
    const head = await page.request.get(`/gomme/${slug}`);
    expect(head.headers()["content-security-policy"]).toMatch(/frame-ancestors 'self' izinli\.localhost$/);

    // the embed on the allowed site: opens, sample request on, no seller mode
    slugForSite = slug;
    const shopSite = await browser.newContext();
    const host = await shopSite.newPage();
    await host.goto("http://izinli.localhost/");
    const allowed = host.frameLocator("#g");
    await expect(allowed.getByRole("button", { name: "Numune iste" })).toBeVisible({ timeout: 60_000 });
    await expect(allowed.getByRole("button", { name: "Satıcı", exact: true })).toHaveCount(0);
    await expect(allowed.getByRole("radio", { name: /^LUMA-05,/ })).toHaveCount(0);

    // on another site: refused
    await host.goto("http://yasak.localhost/");
    await host.waitForTimeout(3000);
    await expect(host.frameLocator("#g").locator("[data-gomme]")).toHaveCount(0);
    await shopSite.close();

    // a phone: nothing wider than the screen
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const p = await phone.newPage();
    await p.goto(`/gomme/${slug}`);
    await expect(p.getByRole("button", { name: "Numune iste" })).toBeVisible({ timeout: 60_000 });
    expect(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await phone.close();
  });
});
