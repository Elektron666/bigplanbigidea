"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { openSupportView, SUPPORT_MINUTES } from "@/lib/auth/shop";
import { getPanelUser } from "@/lib/auth/panel";
import { can, DENIED } from "@/lib/auth/roles";
import { getCentral } from "@/lib/central/store";
import { getRepository } from "@/lib/data";
import { validateShopProduct } from "@/lib/catalogue/shop-products";
import { DEVICE_QUALITIES, DEVICE_QUALITY_LABELS, validateDeviceName, type DeviceQuality } from "@/lib/devices/pairing";
import { cleanPin, weakPin } from "@/lib/devices/pin";
import { checkBulkAssign } from "@/lib/catalogue/products";
import { validateWaste } from "@/lib/teklif/metraj";
import { cleanFeatures, FEATURE_LABELS, FEATURES, featureOn, type Feature } from "@/lib/central/features";
import { undoPermission, undoStep } from "@/lib/central/undo";
import { getQuotes, ORDER_STATUSES, type OrderStatus } from "@/lib/teklif/store";
import { SHOP_STATUSES, SHOP_STATUS_LABELS, type ShopStatus } from "@/lib/central/shops";
import { validateShopRecord, validateSubscription, validateTemplate, type ShopRecord } from "@/lib/central/record";
import { cleanSeries, seriesOf } from "@/lib/fabric/allowed";
import { describeOp, MAX_BULK, parseBulkOp, parseBulkTarget, recordAfter, seriesAfter } from "@/lib/central/bulk";
import { validateModuleSet } from "@/lib/modul/set-input";
import { cleanTags, STYLE_LABELS, STYLE_TAGS, USE_LABELS, USE_TAGS } from "@/lib/asistan/etiketler";
import { getModuleSets } from "@/lib/modul/store";
import { STORAGE_BUCKET, SUPABASE_URL } from "@/lib/supabase/config";

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

// ------------------------------------------------------------------ features (task section 3)

export async function setFeatureAction(firmId: string, feature: string, on: boolean): Promise<Result> {
  const user = await getPanelUser();
  if (!user) return { ok: false, error: "Oturum süresi doldu. Yeniden giriş yapın." };
  if (!can(user.role, "kurulum")) return { ok: false, error: DENIED };
  if (!(FEATURES as readonly string[]).includes(feature) || typeof on !== "boolean") return { ok: false, error: "Bilinmeyen özellik." };
  const repo = getRepository();
  const firm = await repo.getFirmById(String(firmId).slice(0, 40));
  if (!firm) return { ok: false, error: "Mağaza bulunamadı." };
  const before = cleanFeatures(firm.features);
  await repo.setFirmFeatures(firm.id, { ...before, [feature]: on });
  await getCentral().writeAudit({
    actor: user.email,
    actorRole: user.role,
    firmId: firm.id,
    entity: "magaza",
    entityId: firm.id,
    action: on ? "ozellik-acildi" : "ozellik-kapandi",
    summary: `${firm.name}: ${FEATURE_LABELS[feature as Feature].name} ${on ? "açıldı" : "kapandı"}`,
    before,
    after: { ...before, [feature]: on },
  });
  revalidatePath(`/panel/firmalar/${firm.id}`);
  revalidatePath(`/f/${firm.slug}`);
  return { ok: true };
}

// ------------------------------------------------------------------ the shop's record, fees, templates (job 0)

async function firmFor(id: string) {
  return getRepository().getFirmById(String(id).slice(0, 40));
}

function refreshShop(firm: { id: string; slug: string }) {
  revalidatePath(`/panel/firmalar/${firm.id}`);
  revalidatePath("/panel/magazalar");
  revalidatePath(`/f/${firm.slug}`);
}

/** City, region, package, tags, contact, install date, loop time, update mode, try-on quota. */
export async function saveShopRecordAction(firmId: string, raw: unknown): Promise<Result> {
  const user = await getPanelUser();
  if (!user) return { ok: false, error: "Oturum süresi doldu. Yeniden giriş yapın." };
  if (!can(user.role, "kurulum")) return { ok: false, error: DENIED };
  const v = validateShopRecord(raw);
  if (!v.ok) return v;
  const firm = await firmFor(firmId);
  if (!firm) return { ok: false, error: "Mağaza bulunamadı." };
  const central = getCentral();
  const before = await central.getShopRecord(firm.id);
  if (!before) return { ok: false, error: "Mağaza bulunamadı." };
  if (JSON.stringify(before) === JSON.stringify(v.value)) return { ok: true };
  await central.saveShopRecord(firm.id, v.value);
  await central.writeAudit({ actor: user.email, actorRole: user.role, firmId: firm.id, entity: "magaza", entityId: firm.id, action: "kayit-degisti", summary: `${firm.name}: mağaza kaydı güncellendi (${changedFields(before, v.value).join(", ")})`, before, after: v.value });
  refreshShop(firm);
  return { ok: true };
}

const RECORD_LABELS: Record<keyof ShopRecord, string> = { city: "şehir", region: "bölge", package: "paket", tags: "etiketler", contact: "yetkili", installedOn: "kurulum tarihi", updateMode: "güncelleme", vitrinSn: "vitrin süresi", aiQuota: "deneme kotası" };
function changedFields(a: ShopRecord, b: ShopRecord): string[] {
  return (Object.keys(RECORD_LABELS) as (keyof ShopRecord)[]).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k])).map((k) => RECORD_LABELS[k]);
}

export async function addSubscriptionAction(firmId: string, raw: unknown): Promise<Result> {
  const user = await getPanelUser();
  if (!user) return { ok: false, error: "Oturum süresi doldu. Yeniden giriş yapın." };
  if (!can(user.role, "abonelik")) return { ok: false, error: DENIED };
  const v = validateSubscription(raw);
  if (!v.ok) return v;
  const firm = await firmFor(firmId);
  if (!firm) return { ok: false, error: "Mağaza bulunamadı." };
  const central = getCentral();
  const sub = await central.addSubscription(firm.id, v.value);
  // the amount stays out of the log: the log is read by ORMEN elemanı too
  await central.writeAudit({ actor: user.email, actorRole: user.role, firmId: firm.id, entity: "abonelik", entityId: sub.id, action: "vade-eklendi", summary: `${firm.name}: bakım bedeli vadesi eklendi (${v.value.dueOn})` });
  refreshShop(firm);
  return { ok: true };
}

export async function setPaidAction(id: string, paid: boolean): Promise<Result> {
  const user = await getPanelUser();
  if (!user) return { ok: false, error: "Oturum süresi doldu. Yeniden giriş yapın." };
  if (!can(user.role, "abonelik")) return { ok: false, error: DENIED };
  const central = getCentral();
  const today = new Date().toISOString().slice(0, 10);
  const r = await central.setPaid(String(id).slice(0, 40), paid ? today : null);
  if (!r) return { ok: false, error: "Kayıt bulunamadı." };
  const firm = await firmFor(r.firmId);
  await central.writeAudit({
    actor: user.email,
    actorRole: user.role,
    firmId: r.firmId,
    entity: "abonelik",
    entityId: r.before.id,
    action: paid ? "odendi" : "odenmedi",
    summary: `${firm?.name ?? "Mağaza"}: ${r.before.dueOn} vadeli bakım bedeli ${paid ? "ödendi" : "ödenmedi olarak düzeltildi"}`,
    before: { paidOn: r.before.paidOn },
    after: { paidOn: paid ? today : null },
  });
  if (firm) refreshShop(firm);
  return { ok: true };
}

/** "Bu mağazayı şablon olarak kaydet": its features, fabric series and settings, under a name. */
export async function saveTemplateFromShopAction(firmId: string, name: string): Promise<Result> {
  const user = await getPanelUser();
  if (!user) return { ok: false, error: "Oturum süresi doldu. Yeniden giriş yapın." };
  if (!can(user.role, "kurulum")) return { ok: false, error: DENIED };
  const firm = await firmFor(firmId);
  if (!firm) return { ok: false, error: "Mağaza bulunamadı." };
  const central = getCentral();
  const rec = await central.getShopRecord(firm.id);
  // every feature as it stands, defaults included: applied, the new shop ends up exactly like this one
  const features = Object.fromEntries(FEATURES.map((f) => [f, featureOn(firm.features, f)]));
  const v = validateTemplate({ name, features, fabricSeries: firm.fabricSeries ?? [], vitrinSn: rec?.vitrinSn ?? null, aiQuota: rec?.aiQuota ?? null, updateMode: rec?.updateMode, package: rec?.package ?? null });
  if (!v.ok) return v;
  const t = await central.saveTemplate(v.value);
  await central.writeAudit({ actor: user.email, actorRole: user.role, firmId: firm.id, entity: "sablon", entityId: t.id, action: "sablon-kaydedildi", summary: `“${t.name}” şablonu ${firm.name} ayarlarından kaydedildi`, after: t });
  revalidatePath("/panel/firmalar", "layout");
  return { ok: true };
}

/**
 * A new shop set up from a template in one step: features, fabric series,
 * loop time, update mode, package, try-on quota. Its name, address and
 * contact stay its own. Undone from the change log.
 */
export async function applyTemplateAction(firmId: string, templateId: string): Promise<Result> {
  const user = await getPanelUser();
  if (!user) return { ok: false, error: "Oturum süresi doldu. Yeniden giriş yapın." };
  if (!can(user.role, "kurulum")) return { ok: false, error: DENIED };
  const firm = await firmFor(firmId);
  if (!firm) return { ok: false, error: "Mağaza bulunamadı." };
  const central = getCentral();
  const [t, rec] = await Promise.all([central.getTemplate(String(templateId).slice(0, 40)), central.getShopRecord(firm.id)]);
  if (!t) return { ok: false, error: "Şablon bulunamadı." };
  if (!rec) return { ok: false, error: "Mağaza bulunamadı." };
  const repo = getRepository();
  const before = { record: rec, features: cleanFeatures(firm.features), fabricSeries: firm.fabricSeries ?? [] };
  const series = cleanSeries(t.fabricSeries, seriesOf(await repo.listFabrics({ includeInactive: true })));
  const record: ShopRecord = { ...rec, vitrinSn: t.vitrinSn, aiQuota: t.aiQuota, updateMode: t.updateMode, package: t.package ?? rec.package };
  await repo.setFirmFeatures(firm.id, { ...before.features, ...t.features });
  await repo.saveFirm({ ...firm, fabricSeries: series });
  await central.saveShopRecord(firm.id, record);
  await central.writeAudit({
    actor: user.email,
    actorRole: user.role,
    firmId: firm.id,
    entity: "sablon",
    entityId: t.id,
    action: "sablon-uygulandi",
    summary: `${firm.name}: “${t.name}” şablonu uygulandı`,
    before,
    after: { record, features: { ...before.features, ...t.features }, fabricSeries: series },
  });
  refreshShop(firm);
  return { ok: true };
}

// ------------------------------------------------------------------ bulk work on shops (job 0)

/**
 * One step on many shops: a feature, a fabric series, the try-on quota, a tag,
 * or "send the update". Each shop gets its own log entry under one batch, so
 * each can be undone on its own; shops already in that state are left alone.
 * Staged roll-out is this same step run on a filtered group first.
 */
export async function bulkShopAction(opRaw: unknown, targetRaw: unknown): Promise<{ ok: true; changed: number; same: number; shops: number } | { ok: false; error: string }> {
  const user = await getPanelUser();
  if (!user) return { ok: false, error: "Oturum süresi doldu. Yeniden giriş yapın." };
  if (!can(user.role, "kurulum")) return { ok: false, error: DENIED };
  const op = parseBulkOp(opRaw);
  if (!op) return { ok: false, error: "İşlemi seçin." };
  const target = parseBulkTarget(targetRaw);
  if (!target) return { ok: false, error: "En az bir mağaza seçin." };
  const central = getCentral();
  const repo = getRepository();

  let ids: string[];
  if ("ids" in target) ids = target.ids;
  else {
    ids = [];
    for (let page = 1; ids.length < MAX_BULK; page++) {
      const res = await central.listShops({ ...target.query, sort: "ad", page }, { withFees: false });
      ids.push(...res.rows.map((r) => r.id));
      if (!res.rows.length || ids.length >= res.total) break;
    }
  }
  if (!ids.length) return { ok: false, error: "Süzgece uyan mağaza yok." };
  if (ids.length > MAX_BULK) return { ok: false, error: `Bir seferde en çok ${MAX_BULK} mağaza.` };

  const known = op.kind === "seri" ? seriesOf(await repo.listFabrics({ includeInactive: true })) : [];
  if (op.kind === "seri" && !known.includes(op.series)) return { ok: false, error: "Bu adda bir kumaş serisi yok." };
  const batchId = crypto.randomUUID();
  const words = describeOp(op);
  let changed = 0;
  let found = 0;
  for (const id of ids) {
    const firm = await repo.getFirmById(id);
    if (!firm) continue;
    found++;
    const log = (action: string, before?: unknown, after?: unknown) =>
      central.writeAudit({ actor: user.email, actorRole: user.role, firmId: firm.id, entity: "magaza", entityId: firm.id, action, summary: `${firm.name}: ${words}`, before, after, batchId });
    if (op.kind === "ozellik") {
      const before = cleanFeatures(firm.features);
      if (featureOn(before, op.feature) === op.on) continue;
      await repo.setFirmFeatures(firm.id, { ...before, [op.feature]: op.on });
      await log(op.on ? "ozellik-acildi" : "ozellik-kapandi", before, { ...before, [op.feature]: op.on });
    } else if (op.kind === "seri") {
      const now = firm.fabricSeries ?? [];
      const next = seriesAfter(now, op, known);
      if (JSON.stringify(next) === JSON.stringify(now)) continue;
      await repo.saveFirm({ ...firm, fabricSeries: next });
      await log("seri-degisti", { fabricSeries: now }, { fabricSeries: next });
    } else if (op.kind === "kota" || op.kind === "etiket") {
      const rec = await central.getShopRecord(firm.id);
      const next = rec && recordAfter(rec, op);
      if (!rec || !next) continue;
      await central.saveShopRecord(firm.id, next);
      await log("kayit-degisti", rec, next);
    } else {
      const devices = await central.listDevices(firm.id);
      if (!devices.length) continue;
      await central.requestSync(devices.map((d) => d.id));
      await log("guncelleme-gonderildi");
    }
    changed++;
  }
  revalidatePath("/panel/magazalar");
  revalidatePath("/panel/gunluk");
  revalidatePath("/f/[slug]", "page");
  return { ok: true, changed, same: found - changed, shops: found };
}

// ------------------------------------------------------------------ advisor tags (job 10)

export async function setModelTagsAction(modelId: string, styleTags: unknown, useTags: unknown): Promise<Result> {
  const user = await getPanelUser();
  if (!user) return { ok: false, error: "Oturum süresi doldu. Yeniden giriş yapın." };
  if (!can(user.role, "icerik")) return { ok: false, error: DENIED };
  const repo = getRepository();
  const model = (await repo.listAllModels()).find((m) => m.id === String(modelId).slice(0, 60));
  if (!model) return { ok: false, error: "Model bulunamadı." };
  const s = cleanTags(styleTags, STYLE_TAGS);
  const u = cleanTags(useTags, USE_TAGS);
  if (!(await repo.setModelTags(model.id, s, u))) return { ok: false, error: "Model bulunamadı." };
  await getCentral().writeAudit({
    actor: user.email,
    actorRole: user.role,
    firmId: model.firmId,
    entity: "urun",
    entityId: model.id,
    action: "etiket-degisti",
    summary: `${model.name}: danışman etiketleri ${[...s.map((t) => STYLE_LABELS[t]), ...u.map((t) => USE_LABELS[t])].join(", ") || "kaldırıldı"}`.slice(0, 300),
    before: { styleTags: model.styleTags ?? [], useTags: model.useTags ?? [] },
    after: { styleTags: s, useTags: u },
  });
  revalidatePath(`/panel/modeller/${model.id}`);
  revalidatePath("/f/[slug]", "page");
  return { ok: true };
}

// ------------------------------------------------------------------ module sets (job 4, second part)

/** Only files we serve ourselves (uploaded in the panel, or the seed files). */
const ownFile = (u: string) => u.startsWith("/api/dosya/") || u.startsWith("/seed/") || (!!SUPABASE_URL && u.startsWith(`${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/`));

/** Creates (no id) or saves a module set: its modules, sizes, joints, metres and the shops it is given to. */
export async function saveModuleSetAction(id: string | null, raw: unknown): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await getPanelUser();
  if (!user) return { ok: false, error: "Oturum süresi doldu. Yeniden giriş yapın." };
  if (!can(user.role, "icerik")) return { ok: false, error: DENIED };
  const v = validateModuleSet(raw, ownFile);
  if (!v.ok) return v;
  const repo = getRepository();
  // only real shops
  const known = new Set((await repo.listFirms()).map((f) => f.id));
  const value = { ...v.value, firmIds: v.value.firmIds.filter((f) => known.has(f)) };
  const store = getModuleSets();
  const before = id ? await store.getSet(String(id).slice(0, 40)) : null;
  if (id && !before) return { ok: false, error: "Set bulunamadı." };
  const res = await store.saveSet(value, before?.id);
  if (!res.ok) return res;
  await getCentral().writeAudit({
    actor: user.email,
    actorRole: user.role,
    entity: "urun",
    entityId: res.id,
    action: before ? "modul-seti-degisti" : "modul-seti-eklendi",
    summary: `Modül seti “${value.name}” ${before ? "güncellendi" : "eklendi"} (${value.modules.length} modül, ${value.firmIds.length} mağaza)`,
  });
  revalidatePath("/panel/modul-setleri");
  revalidatePath("/f/[slug]", "page");
  return { ok: true, id: res.id };
}

// ------------------------------------------------------------------ shop panel accounts (job 0)

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

/** Gives an account the shop's own panel; a new account's first password comes back once. */
export async function addOwnerAction(firmId: string, rawEmail: string): Promise<{ ok: true; email: string; password: string | null } | { ok: false; error: string }> {
  const user = await getPanelUser();
  if (!user) return { ok: false, error: "Oturum süresi doldu. Yeniden giriş yapın." };
  if (!can(user.role, "uye")) return { ok: false, error: DENIED };
  const email = String(rawEmail ?? "").trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 200) return { ok: false, error: "Geçerli bir e-posta adresi yazın." };
  const firm = await firmFor(firmId);
  if (!firm) return { ok: false, error: "Mağaza bulunamadı." };
  const central = getCentral();
  const res = await central.addOwner(firm.id, email);
  if (!res.ok) return res;
  // never the password in the log
  await central.writeAudit({ actor: user.email, actorRole: user.role, firmId: firm.id, entity: "uye", entityId: res.owner.userId, action: "uye-eklendi", summary: `${firm.name}: ${email} mağaza paneline eklendi${res.password ? " (yeni hesap)" : ""}` });
  revalidatePath(`/panel/firmalar/${firm.id}`);
  return { ok: true, email, password: res.password };
}

/** Takes the shop's panel away from an account (the account itself stays; nothing of the shop is deleted). */
export async function removeOwnerAction(firmId: string, userId: string): Promise<Result> {
  const user = await getPanelUser();
  if (!user) return { ok: false, error: "Oturum süresi doldu. Yeniden giriş yapın." };
  if (!can(user.role, "uye")) return { ok: false, error: DENIED };
  const firm = await firmFor(firmId);
  if (!firm) return { ok: false, error: "Mağaza bulunamadı." };
  const central = getCentral();
  const gone = await central.removeOwner(firm.id, String(userId).slice(0, 40));
  if (!gone) return { ok: false, error: "Bu hesap bu mağazada değil." };
  await central.writeAudit({ actor: user.email, actorRole: user.role, firmId: firm.id, entity: "uye", entityId: gone.userId, action: "uye-cikarildi", summary: `${firm.name}: ${gone.email} mağaza panelinden çıkarıldı` });
  revalidatePath(`/panel/firmalar/${firm.id}`);
  return { ok: true };
}

// ------------------------------------------------------------------ "mağaza gibi görüntüle" (job 0)

/**
 * The yönetici opens the shop's own panel as the shop, for support: read-only,
 * without the shop's customers, for SUPPORT_MINUTES. Every opening is logged.
 */
export async function openSupportViewAction(firmId: string): Promise<Result> {
  const user = await getPanelUser();
  if (!user) return { ok: false, error: "Oturum süresi doldu. Yeniden giriş yapın." };
  if (!can(user.role, "magaza-gibi")) return { ok: false, error: DENIED };
  const firm = await firmFor(firmId);
  if (!firm) return { ok: false, error: "Mağaza bulunamadı." };
  await getCentral().writeAudit({
    actor: user.email,
    actorRole: user.role,
    firmId: firm.id,
    entity: "destek",
    entityId: firm.id,
    action: "magaza-gibi-acildi",
    summary: `${firm.name}: mağaza paneli destek için mağaza gibi açıldı (${SUPPORT_MINUTES} dk)`,
  });
  await openSupportView(firm.id, user.email);
  redirect("/magaza");
}

// ------------------------------------------------------------------ undo from the change log (job 0)

export async function undoAuditAction(id: string): Promise<Result> {
  const user = await getPanelUser();
  if (!user) return { ok: false, error: "Oturum süresi doldu. Yeniden giriş yapın." };
  const central = getCentral();
  const entry = await central.getAudit(String(id).slice(0, 20));
  if (!entry) return { ok: false, error: "Kayıt bulunamadı." };
  const step = undoStep(entry);
  if (!step) return { ok: false, error: "Bu değişiklik geri alınamaz." };
  if (!can(user.role, undoPermission(step))) return { ok: false, error: DENIED };
  // marked first: two clicks undo once
  if (!(await central.markUndone(entry.id))) return { ok: false, error: "Bu değişiklik zaten geri alındı." };
  const repo = getRepository();
  switch (step.kind) {
    case "durum":
      await central.setShopStatus(step.firmId, step.status);
      break;
    case "gosterim":
      await repo.saveFirmProduct(step.firmId, step.modelId, step.patch);
      break;
    case "atama":
      if (step.mode === "ekle") await repo.assignModels(step.shopIds, step.productIds);
      else await repo.unassignModels(step.shopIds, step.productIds);
      break;
    case "ozellik":
      await repo.setFirmFeatures(step.firmId, step.features);
      break;
    case "fire":
      await getQuotes().setWaste(step.waste);
      break;
    case "kalite":
      await central.updateDevice(step.deviceId, { quality: step.quality });
      await central.requestSync([step.deviceId]);
      break;
    case "kayit":
      await central.saveShopRecord(step.firmId, step.record);
      break;
    case "sablon": {
      const firm = await repo.getFirmById(step.firmId);
      if (firm) await repo.saveFirm({ ...firm, fabricSeries: step.fabricSeries });
      await repo.setFirmFeatures(step.firmId, step.features);
      await central.saveShopRecord(step.firmId, step.record);
      break;
    }
    case "odeme":
      await central.setPaid(step.subscriptionId, step.paidOn);
      break;
    case "seri": {
      const firm = await repo.getFirmById(step.firmId);
      if (firm) await repo.saveFirm({ ...firm, fabricSeries: step.fabricSeries });
      break;
    }
  }
  await central.writeAudit({ actor: user.email, actorRole: user.role, firmId: entry.firmId, entity: entry.entity, entityId: entry.entityId, action: "geri-alindi", summary: `Geri alındı: ${entry.summary}`.slice(0, 300), before: entry.after, after: entry.before });
  revalidatePath("/panel/gunluk");
  return { ok: true };
}
