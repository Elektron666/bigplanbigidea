import "server-only";
import type { FurnitureModel } from "@/lib/types";
import type { PriceTable } from "./fiyat";
import { getPrices } from "./store";

/** The shop's prices keyed by the slugs its screen knows (only models it shows). */
export async function priceTableFor(firmId: string, models: FurnitureModel[]): Promise<PriceTable> {
  const rows = await getPrices().rows(firmId);
  const out: PriceTable = {};
  for (const m of models) {
    const r = rows[m.id];
    if (r && (r.base !== undefined || (r.groups && Object.keys(r.groups).length))) out[m.slug] = r;
  }
  return out;
}
