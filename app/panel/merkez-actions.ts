"use server";

import { revalidatePath } from "next/cache";
import { getPanelUser } from "@/lib/auth/panel";
import { can, DENIED } from "@/lib/auth/roles";
import { getCentral } from "@/lib/central/store";
import { getRepository } from "@/lib/data";
import { validateShopProduct } from "@/lib/catalogue/shop-products";
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
