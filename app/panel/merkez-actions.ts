"use server";

import { revalidatePath } from "next/cache";
import { getPanelUser } from "@/lib/auth/panel";
import { can, DENIED } from "@/lib/auth/roles";
import { getCentral } from "@/lib/central/store";
import { getRepository } from "@/lib/data";
import { validateShopProduct } from "@/lib/catalogue/shop-products";
import { validateDeviceName } from "@/lib/devices/pairing";
import { checkBulkAssign } from "@/lib/catalogue/products";
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
