import "server-only";
import type { ShopUser } from "@/lib/auth/shop";
import { getRepository } from "@/lib/data";
import { modelsForFirm } from "@/lib/data/repository";
import { getCentral } from "@/lib/central/store";
import { featureOn } from "@/lib/central/features";
import { getGiydirme } from "@/lib/giydirme/store";
import { monthStartIso } from "@/lib/giydirme/kota";
import { getShopPanel } from "@/lib/magaza/store";
import { monthRange, recentMonths } from "@/lib/monthly";
import type { UsagePdfData } from "./pdf";

// What the shop's report page and its PDF show (job 11): the same numbers,
// from one place. The month is one of the last twelve; the photo quota is
// shown for the running month only (a past month's "left" means nothing).

export { pickMonth, REPORT_MONTHS, reportMonths } from "./aylar";

export async function shopReport(u: ShopUser, ym: string, origin: string): Promise<UsagePdfData & { month: string; running: boolean }> {
  const range = monthRange(ym)!;
  const repo = getRepository();
  const running = recentMonths(1)[0] === ym;
  const [usage, fabrics, models, firm] = await Promise.all([getShopPanel().usage(u, range.from, range.to), repo.listFabrics({ includeInactive: true }), modelsForFirm(repo, u.firmId), repo.getFirmById(u.firmId)]);
  let quota: UsagePdfData["quota"] = null;
  if (running && firm && featureOn(firm.features, "giydirme")) {
    const limit = (await getCentral().getShopRecord(u.firmId))?.aiQuota;
    if (limit !== null && limit !== undefined) {
      const used = await getGiydirme().countOk(u.firmId, monthStartIso(new Date()));
      quota = { used, left: Math.max(0, limit - used) };
    }
  }
  return {
    month: ym,
    running,
    shopName: u.firmName,
    monthLabel: running ? `${range.label} (ay sürüyor)` : range.label,
    usage,
    fabricNames: Object.fromEntries(fabrics.map((f) => [f.code, `${f.series} · ${f.colorName}`])),
    modelNames: Object.fromEntries(models.map((m) => [m.slug, m.name])),
    quota,
    link: `${origin}/magaza/rapor?ay=${ym}`,
  };
}
