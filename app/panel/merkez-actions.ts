"use server";

import { revalidatePath } from "next/cache";
import { getPanelUser } from "@/lib/auth/panel";
import { can, DENIED } from "@/lib/auth/roles";
import { getCentral } from "@/lib/central/store";
import { getRepository } from "@/lib/data";
import { validateShopProduct } from "@/lib/catalogue/shop-products";
import { DEVICE_QUALITIES, DEVICE_QUALITY_LABELS, validateDeviceName, type DeviceQuality } from "@/lib/devices/pairing";
import { cleanPin, weakPin } from "@/lib/devices/pin";
import { checkBulkAssign } from "@/lib/catalogue/products";
import { validateWaste } from "@/lib/teklif/metraj";
import { getQuotes, ORDER_STATUSES, type OrderStatus } from "@/lib/teklif/store";
import { SHOP_STATUSES, SHOP_STATUS_LABELS, type ShopStatus } from "@/lib/central/shops";

// Server actions of the central panel (Showroom package, job 0). Each one
// checks the session and the role itself, then writes the change log.

type Result = { ok: true } | { ok: false; error: string };

/**
 * Suspend a shop, bring it back, or move it between pilot / active / left.
 * Nothing is deleted: a suspended shop's screens show a calm notice at their
 * next check and carry on from where they were when it is switched back.
 */
export async function setShopStatusAction(id: string, status: string): Promise<Result> {
  const user = await getPanelUser();
  if (!user) return { ok: false, error: "Oturum süresi doldu. Yeniden giriş yapın." };
  if (!can(user.role, "kurulum")) return { ok: false, error: DENIED };
  if (!(SHOP_STATUSES as readonly string[]).includes(status)) return { ok: false, error: "Bilinmeyen durum." };
  const central = getCentral();
  const shop = await central.getShop(String(id).slice(0, 40));
  if (!shop) return { ok: false, error: "Mağaza bulunamadı." };
  if (shop.status === status) return { ok: true };
  await central.setShopStatus(shop.id, status as ShopStatus);
  await central.writeAudit({
    actor: user.email,
    actorRole: user.role,
    firmId: shop.id,
    entity: "magaza",
    entityId: shop.id,
    action: status === "askida" ? "askiya-alindi" : shop.status === "askida" ? "geri-acildi" : "durum-degisti",
    summary: `${shop.name}: ${SHOP_STATUS_LABELS[shop.status]} → ${SHOP_STATUS_LABELS[status as ShopStatus]}`,
    before: { status: shop.status },
    after: { status },
  });
  revalidatePath("/panel/magazalar");
  return { ok: true };
}

/**
 * How one shop shows a shared product: its own name and code, a note, brought
 * forward or hidden. The product itself is not touched (that is the centre's).
 */
export async function saveShopProductAction(firmId: string, modelId: string, raw: unknown): Promise<Result> {
  const user = await getPanelUser();
  if (!user) return { ok: false, error: "Oturum süresi doldu. Yeniden giriş yapın." };
  if (!can(user.role, "icerik")) return { ok: false, error: DENIED };
  const v = validateShopProduct(raw);
  if (!v.ok) return { ok: false, error: v.error };
  const repo = getRepository();
  const firm = await repo.getFirmById(String(firmId).slice(0, 40));
  if (!firm) return { ok: false, error: "Mağaza bulunamadı." };
  const before = (await repo.getFirmProducts(firm.id)).find((p) => p.modelId === modelId);
  if (!before) return { ok: false, error: "Bu ürün mağazaya verilmemiş." };
  await repo.saveFirmProduct(firm.id, before.modelId, v.value);
  const model = (await repo.listAllModels()).find((m) => m.id === before.modelId);
  await getCentral().writeAudit({
    actor: user.email,
    actorRole: user.role,
    firmId: firm.id,
    entity: "atama",
    entityId: before.modelId,
    action: "gosterim-degisti",
    summary: `${firm.name}: ${model?.name ?? "ürün"} artık “${v.value.displayName ?? model?.name ?? ""}” adıyla${v.value.hidden ? ", gizli" : ""}${v.value.featured ? ", öne çıkarılmış" : ""}`,
    before: { displayName: before.displayName ?? null, productCode: before.productCode ?? null, description: before.description ?? null, featured: before.featured, hidden: before.hidden },
    after: v.value,
  });
  revalidatePath(`/panel/firmalar/${firm.id}`);
  revalidatePath(`/f/${firm.slug}`);
  return { ok: true };
}

// ------------------------------------------------------------------ screens

/** "Cihaz ekle": a short-lived 6-digit code to type on the new screen. */
export async function createPairingAction(firmId: string, raw: unknown): Promise<{ ok: true; code: string; expiresAt: string } | { ok: false; error: string }> {
  const user = await getPanelUser();
  if (!user) return { ok: false, error: "Oturum süresi doldu. Yeniden giriş yapın." };
  if (!can(user.role, "kurulum")) return { ok: false, error: DENIED };
  const v = validateDeviceName(raw);
  if (!v.ok) return { ok: false, error: v.error };
  const firm = await getRepository().getFirmById(String(firmId).slice(0, 40));
  if (!firm) return { ok: false, error: "Mağaza bulunamadı." };
  const central = getCentral();
  const pairing = await central.createPairing(firm.id, v.name, v.branch);
  await central.writeAudit({ actor: user.email, actorRole: user.role, firmId: firm.id, entity: "cihaz", action: "kod-uretildi", summary: `${firm.name}: “${v.name}” için eşleştirme kodu üretildi` });
  return { ok: true, ...pairing };
}

/** "Şimdi eşitle" for one screen or all of a shop's screens. */
export async function requestSyncAction(firmId: string, deviceId?: string): Promise<Result> {
  const user = await getPanelUser();
  if (!user) return { ok: false, error: "Oturum süresi doldu. Yeniden giriş yapın." };
  if (!can(user.role, "kurulum")) return { ok: false, error: DENIED };
  const central = getCentral();
  // only screens of the shop named: an id from another shop is ignored
  const devices = (await central.listDevices(String(firmId).slice(0, 40))).filter((d) => !deviceId || d.id === deviceId);
  if (!devices.length) return { ok: false, error: "Ekran bulunamadı." };
  await central.requestSync(devices.map((d) => d.id));
  await central.writeAudit({ actor: user.email, actorRole: user.role, firmId, entity: "cihaz", entityId: deviceId ?? null, action: "esitleme-istendi", summary: devices.length === 1 ? `“${devices[0].name}” ekranına “şimdi eşitle” gönderildi` : `${devices.length} ekrana “şimdi eşitle” gönderildi` });
  revalidatePath(`/panel/firmalar/${firmId}`);
  return { ok: true };
}

/** Removes a screen: its secret stops working and it asks for a code again. Yönetici only. */
export async function removeDeviceAction(deviceId: string): Promise<Result> {
  const user = await getPanelUser();
  if (!user) return { ok: false, error: "Oturum süresi doldu. Yeniden giriş yapın." };
  if (!can(user.role, "sil")) return { ok: false, error: DENIED };
  const central = getCentral();
  const device = await central.getDevice(String(deviceId).slice(0, 40));
  if (!device) return { ok: false, error: "Ekran bulunamadı." };
  await central.removeDevice(device.id);
  await central.writeAudit({ actor: user.email, actorRole: user.role, firmId: device.firmId, entity: "cihaz", entityId: device.id, action: "kaldirildi", summary: `“${device.name}” ekranı kaldırıldı`, before: { name: device.name, branch: device.branch } });
  revalidatePath(`/panel/firmalar/${device.firmId}`);
  return { ok: true };
}

// ------------------------------------------------------------------ central catalogue

/**
 * Bulk assignment: the chosen shared products are given to (or taken from)
 * the chosen shops in one step. A shop's own product in the selection
 * refuses the whole action, and the attempt is written to the change log.
 */
export async function bulkAssignAction(mode: "ekle" | "cikar", productIds: string[], shopIds: string[]): Promise<{ ok: true; changed: number } | { ok: false; error: string }> {
  const user = await getPanelUser();
  if (!user) return { ok: false, error: "Oturum süresi doldu. Yeniden giriş yapın." };
  if (!can(user.role, "icerik")) return { ok: false, error: DENIED };
  if (mode !== "ekle" && mode !== "cikar") return { ok: false, error: "Bilinmeyen işlem." };
  if (!Array.isArray(productIds) || !Array.isArray(shopIds)) return { ok: false, error: "Geçersiz istek." };
  const repo = getRepository();
  const central = getCentral();
  const [models, firms] = await Promise.all([repo.listAllModels(), repo.listFirms()]);
  const checked = checkBulkAssign(
    productIds.map(String),
    shopIds.map(String),
    new Map(models.map((m) => [m.id, { name: m.name, firmId: m.firmId }])),
    new Set(firms.map((f) => f.id)),
  );
  const batchId = crypto.randomUUID();
  if (!checked.ok) {
    if (checked.private) {
      await central.writeAudit({ actor: user.email, actorRole: user.role, entity: "atama", action: "reddedildi", summary: `Toplu atama reddedildi: ${checked.error}`.slice(0, 300), before: { productIds: checked.private, shopIds: shopIds.slice(0, 200) }, batchId });
    }
    return { ok: false, error: checked.error };
  }
  const changed = mode === "ekle" ? await repo.assignModels(checked.shopIds, checked.productIds) : await repo.unassignModels(checked.shopIds, checked.productIds);
  const names = checked.productIds.map((id) => models.find((m) => m.id === id)!.name);
  await central.writeAudit({
    actor: user.email,
    actorRole: user.role,
    entity: "atama",
    action: mode === "ekle" ? "toplu-eklendi" : "toplu-cikarildi",
    summary: `${names.slice(0, 3).join(", ")}${names.length > 3 ? ` ve ${names.length - 3} ürün daha` : ""}: ${checked.shopIds.length} mağaza${mode === "ekle" ? "ya eklendi" : "dan çıkarıldı"} (${changed} atama değişti)`.slice(0, 300),
    // enough to undo it from the log: the same products and shops, the other way round
    before: { mode, productIds: checked.productIds, shopIds: checked.shopIds },
    after: { changed },
    batchId,
  });
  revalidatePath("/panel/katalog");
  revalidatePath("/panel/magazalar");
  return { ok: true, changed };
}

/** Sets the shop PIN (leaving the locked screen). Only its hash is stored; the PIN is never written to the log. */
export async function setShopPinAction(firmId: string, pin: string): Promise<Result> {
  const user = await getPanelUser();
  if (!user) return { ok: false, error: "Oturum süresi doldu. Yeniden giriş yapın." };
  if (!can(user.role, "kurulum")) return { ok: false, error: DENIED };
  const clean = cleanPin(pin);
  if (!clean) return { ok: false, error: "PIN 4–6 rakam olmalı." };
  if (weakPin(clean)) return { ok: false, error: "Bu PIN çok kolay tahmin edilir (1234, 0000 gibi). Başka bir PIN seçin." };
  const firm = await getRepository().getFirmById(String(firmId).slice(0, 40));
  if (!firm) return { ok: false, error: "Mağaza bulunamadı." };
  const central = getCentral();
  await central.setShopPin(firm.id, clean);
  await central.writeAudit({ actor: user.email, actorRole: user.role, firmId: firm.id, entity: "magaza", entityId: firm.id, action: "pin-degisti", summary: `${firm.name}: mağaza PIN’i değiştirildi` });
  revalidatePath(`/panel/firmalar/${firm.id}`);
  return { ok: true };
}

/** A screen's quality profile: "oto" (measured on the device), "hafif" or "tam". Applied at the screen's next start. */
export async function setDeviceQualityAction(deviceId: string, quality: string): Promise<Result> {
  const user = await getPanelUser();
  if (!user) return { ok: false, error: "Oturum süresi doldu. Yeniden giriş yapın." };
  if (!can(user.role, "kurulum")) return { ok: false, error: DENIED };
  if (!(DEVICE_QUALITIES as readonly string[]).includes(quality)) return { ok: false, error: "Bilinmeyen kalite profili." };
  const central = getCentral();
  const device = await central.getDevice(String(deviceId).slice(0, 40));
  if (!device) return { ok: false, error: "Ekran bulunamadı." };
  if (device.quality === quality) return { ok: true };
  await central.updateDevice(device.id, { quality: quality as DeviceQuality });
  // the screen restarts at its next check, so it opens with the new profile
  await central.requestSync([device.id]);
  await central.writeAudit({ actor: user.email, actorRole: user.role, firmId: device.firmId, entity: "cihaz", entityId: device.id, action: "kalite-degisti", summary: `“${device.name}” ekranının kalite profili: ${DEVICE_QUALITY_LABELS[device.quality]} → ${DEVICE_QUALITY_LABELS[quality as DeviceQuality]}`, before: { quality: device.quality }, after: { quality } });
  revalidatePath(`/panel/firmalar/${device.firmId}`);
  return { ok: true };
}

// ------------------------------------------------------------------ quotes and orders (job 3)

/** ORMEN's waste figures and rounding step. Empty stays empty: nothing is added then. Yönetici only. */
export async function setWasteAction(raw: { duz?: string; donuk?: string; raporlu?: string; roundStep?: string }): Promise<Result> {
  const user = await getPanelUser();
  if (!user) return { ok: false, error: "Oturum süresi doldu. Yeniden giriş yapın." };
  // the waste figures are ORMEN's own decision (task section 6: "katsayıyı ben gireceğim")
  if (!can(user.role, "fiyat")) return { ok: false, error: DENIED };
  const v = validateWaste(raw);
  if (!v.ok) return { ok: false, error: v.error };
  const quotes = getQuotes();
  const before = await quotes.getWaste();
  await quotes.setWaste(v.value);
  await getCentral().writeAudit({ actor: user.email, actorRole: user.role, entity: "kumas", action: "fire-degisti", summary: `Fire: düz ${v.value.duz ?? "boş"}, dönük ${v.value.donuk ?? "boş"}, raporlu ${v.value.raporlu ?? "boş"}; yuvarlama ${v.value.roundStep} m`, before, after: v.value });
  revalidatePath("/panel/siparisler");
  return { ok: true };
}

export async function setOrderStatusAction(id: string, status: string): Promise<Result> {
  const user = await getPanelUser();
  if (!user) return { ok: false, error: "Oturum süresi doldu. Yeniden giriş yapın." };
  if (!can(user.role, "icerik")) return { ok: false, error: DENIED };
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) return { ok: false, error: "Bilinmeyen durum." };
  if (!(await getQuotes().setOrderStatus(String(id).slice(0, 40), status as OrderStatus))) return { ok: false, error: "Talep bulunamadı." };
  revalidatePath("/panel/siparisler");
  return { ok: true };
}
