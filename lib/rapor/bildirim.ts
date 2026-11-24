import "server-only";
import { getRepository } from "@/lib/data";
import { recentMonths } from "@/lib/monthly";
import { getNotices } from "./store";

// The monthly summary handed to every shop (job 11, "her ayın başında firma
// yetkilisine otomatik özet"). No e-mail service (no spending): the existing
// way is used, the shop panel's own notice and ORMEN's WhatsApp link. The
// daily job calls this; it is safe to call any number of times (one notice per
// shop and month).

/** The month the summary is about: the last full month (Istanbul). */
export function summaryMonth(now = new Date()): string {
  return recentMonths(2, now)[1];
}

export async function ensureMonthlyNotices(now = new Date()): Promise<{ month: string; made: number }> {
  const month = summaryMonth(now);
  const firms = (await getRepository().listFirms()).filter((f) => f.isActive);
  const made = await getNotices().ensure(
    firms.map((f) => f.id),
    month,
  );
  return { month, made };
}
