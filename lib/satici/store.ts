import "server-only";
import { supabaseEnabled } from "@/lib/supabase/config";
import { serviceClient } from "@/lib/supabase/server";

// A shop's sale prices as the server reads them for its screen (job 7): only
// after the shop PIN (seller mode) or when the shop shows prices to customers.
// Keyed by model id. In memory the shop panel writes here too.

export type PriceRows = Record<string, { base?: number; groups?: Record<string, number> }>;

export interface PriceStore {
  rows(firmId: string): Promise<PriceRows>;
}

export class MemoryPrices implements PriceStore {
  private data = new Map<string, PriceRows>();
  async rows(firmId: string) {
    return structuredClone(this.data.get(firmId) ?? {});
  }
  setBase(firmId: string, modelId: string, price: number | null) {
    const rows = this.data.get(firmId) ?? {};
    const r = (rows[modelId] ??= {});
    if (price === null) delete r.base;
    else r.base = price;
    this.data.set(firmId, rows);
  }
  setGroup(firmId: string, modelId: string, group: string, price: number | null) {
    const rows = this.data.get(firmId) ?? {};
    const r = (rows[modelId] ??= {});
    const g = (r.groups ??= {});
    if (price === null) delete g[group];
    else g[group] = price;
    this.data.set(firmId, rows);
  }
}

class SupabasePrices implements PriceStore {
  async rows(firmId: string) {
    const db = serviceClient();
    const [base, groups] = await Promise.all([
      db.from("firm_prices").select("model_id, price").eq("firm_id", firmId),
      db.from("firm_group_prices").select("model_id, price_group, price").eq("firm_id", firmId),
    ]);
    if (base.error) throw new Error(base.error.message);
    if (groups.error) throw new Error(groups.error.message);
    const out: PriceRows = {};
    for (const r of base.data as { model_id: string; price: number | string }[]) (out[r.model_id] ??= {}).base = Number(r.price);
    for (const r of groups.data as { model_id: string; price_group: string; price: number | string }[]) ((out[r.model_id] ??= {}).groups ??= {})[r.price_group] = Number(r.price);
    return out;
  }
}

const holder = globalThis as unknown as { __ormenPrices?: PriceStore };

export function getPrices(): PriceStore {
  holder.__ormenPrices ??= supabaseEnabled() ? new SupabasePrices() : new MemoryPrices();
  return holder.__ormenPrices;
}
