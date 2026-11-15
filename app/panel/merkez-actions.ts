"use server";

import { revalidatePath } from "next/cache";
import { getPanelUser } from "@/lib/auth/panel";
import { can, DENIED } from "@/lib/auth/roles";
import { getCentral } from "@/lib/central/store";
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
