import "server-only";
import { supabaseEnabled } from "@/lib/supabase/config";
import { sessionClient } from "@/lib/supabase/server";
import { getRepository } from "@/lib/data";
import { getCentral } from "@/lib/central/store";
import { getQuotes, MemoryQuotes, type OrderStatus } from "@/lib/teklif/store";
import type { QuoteContent } from "@/lib/teklif/request";
import type { ShopUser } from "@/lib/auth/shop";
import { usageFromJson, usageOf, type Usage } from "@/lib/rapor/kullanim";
import { getPrices, type MemoryPrices } from "@/lib/satici/store";

// What the shop panel reads and writes (Showroom package, job 0). With
// Supabase every call runs with the signed-in person's own session, so the
// database's row rules decide what comes back: an owner gets their shop's
// rows only, and the yönetici's support view gets no customer names (the
// quote_private table has no ORMEN rule at all). Writes go through the two
// functions in 20261119000000_magaza_paneli.sql, which check the shop and
// write the log. In memory the same is done here, by firm.

export const QUOTE_PAGE = 30;

export interface ShopQuoteRow {
  id: string;
  number: string;
  token: string;
  createdAt: string;
  pieces: string[];
  totals: { code: string; metres: number }[];
  price: number | null;
  /** Null in the support view, and when none was written. */
  customerName: string | null;
  note: string | null;
  orderStatus: OrderStatus | null;
}

export interface ShopProductRow {
  modelId: string;
  centralName: string;
  size: string;
  displayName: string | null;
  productCode: string | null;
  description: string | null;
  featured: boolean;
  hidden: boolean;
  price: number | null;
  /** The price per fabric group where it differs from `price` (job 7). */
  groupPrices: Record<string, number>;
}

type ProductPatch = { displayName: string | null; productCode: string | null; description: string | null; featured: boolean; hidden: boolean };

export interface ShopPanelStore {
  quotes(u: ShopUser, page: number): Promise<{ total: number; rows: ShopQuoteRow[] }>;
  products(u: ShopUser): Promise<ShopProductRow[]>;
  saveProduct(u: ShopUser, modelId: string, patch: ProductPatch): Promise<boolean>;
  setPrice(u: ShopUser, modelId: string, price: number | null): Promise<boolean>;
  /** One fabric group's price of a product (null takes it off). */
  setGroupPrice(u: ShopUser, modelId: string, group: string, price: number | null): Promise<boolean>;
  /** The shop's monthly usage report (job 11): its own events only; "kullanım yok" when none. */
  usage(u: ShopUser, from: Date, to: Date): Promise<Usage>;
}

const READ_ONLY = "Destek görünümünde değişiklik yapılmaz.";
const pieceNames = (c: QuoteContent | null) => (c?.pieces ?? []).map((p) => p.modelName);

/** The products the shop was given, with ORMEN's names and sizes (from the catalogue store). */
async function catalogueRows(firmId: string) {
  const repo = getRepository();
  const [rows, models] = await Promise.all([repo.getFirmProducts(firmId), repo.listAllModels()]);
  return rows.flatMap((p) => {
    const m = models.find((x) => x.id === p.modelId);
    return m ? [{ p, m }] : [];
  });
}

function productRow(p: Awaited<ReturnType<typeof catalogueRows>>[number], price: number | null, groupPrices: Record<string, number> = {}): ShopProductRow {
  const { p: sp, m } = p;
  return {
    modelId: m.id,
    centralName: m.name,
    size: `${m.dimensionsCm.w} × ${m.dimensionsCm.d} × ${m.dimensionsCm.h} cm`,
    displayName: sp.displayName ?? null,
    productCode: sp.productCode ?? null,
    description: sp.description ?? null,
    featured: sp.featured,
    hidden: sp.hidden,
    price,
    groupPrices,
  };
}

// ------------------------------------------------------------------ memory

class MemoryShopPanel implements ShopPanelStore {
  private get prices() {
    return getPrices() as MemoryPrices;
  }

  async usage(u: ShopUser, from: Date, to: Date) {
    return usageOf(await getRepository().usageReport(from, to, u.firmSlug), u.firmSlug);
  }

  async quotes(u: ShopUser, page: number) {
    const q = getQuotes();
    const all = q instanceof MemoryQuotes ? q.forShop(u.firmId) : [];
    const rows = all.slice((page - 1) * QUOTE_PAGE, page * QUOTE_PAGE).map((x) => ({
      id: x.id,
      number: x.number,
      token: x.token,
      createdAt: x.createdAt,
      pieces: pieceNames(x.content),
      totals: x.totals,
      price: x.price,
      // as in the database: the support view never gets the shop's customers
      customerName: u.support ? null : x.customerName,
      note: u.support ? null : x.note,
      orderStatus: x.orderStatus,
    }));
    return { total: all.length, rows };
  }

  async products(u: ShopUser) {
    const rows = await this.prices.rows(u.firmId);
    return (await catalogueRows(u.firmId)).map((r) => productRow(r, rows[r.m.id]?.base ?? null, rows[r.m.id]?.groups ?? {}));
  }

  async saveProduct(u: ShopUser, modelId: string, patch: ProductPatch) {
    if (u.support) throw new Error(READ_ONLY);
    const before = (await this.products(u)).find((r) => r.modelId === modelId);
    if (!before) return false;
    await getRepository().saveFirmProduct(u.firmId, modelId, patch);
    const was = { displayName: before.displayName, productCode: before.productCode, description: before.description, featured: before.featured, hidden: before.hidden };
    if (JSON.stringify(was) !== JSON.stringify(patch))
      await getCentral().writeAudit({
        actor: u.email,
        actorRole: "sahip",
        firmId: u.firmId,
        entity: "urun",
        entityId: modelId,
        action: "gosterim-degisti",
        summary: `${u.firmName}: ${patch.displayName ?? before.centralName} mağazada değişti (mağaza)`,
        before: was,
        after: patch,
      });
    return true;
  }

  async setPrice(u: ShopUser, modelId: string, price: number | null) {
    if (u.support) throw new Error(READ_ONLY);
    if (!(await this.products(u)).some((r) => r.modelId === modelId)) return false;
    this.prices.setBase(u.firmId, modelId, price);
    // that a price changed, never the price: ORMEN elemanı reads the log
    await getCentral().writeAudit({ actor: u.email, actorRole: "sahip", firmId: u.firmId, entity: "urun", entityId: modelId, action: "fiyat-degisti", summary: `${u.firmName}: bir ürünün satış fiyatı değişti (mağaza)` });
    return true;
  }

  async setGroupPrice(u: ShopUser, modelId: string, group: string, price: number | null) {
    if (u.support) throw new Error(READ_ONLY);
    if (!(await this.products(u)).some((r) => r.modelId === modelId)) return false;
    this.prices.setGroup(u.firmId, modelId, group, price);
    await getCentral().writeAudit({ actor: u.email, actorRole: "sahip", firmId: u.firmId, entity: "urun", entityId: modelId, action: "fiyat-degisti", summary: `${u.firmName}: bir ürünün ${group} grubu satış fiyatı değişti (mağaza)` });
    return true;
  }
}

// ------------------------------------------------------------------ Supabase (the person's own session)

class SupabaseShopPanel implements ShopPanelStore {
  async usage(u: ShopUser, from: Date, to: Date) {
    // with the owner's own session: the events table's row rules give their shop's events only
    const res = await (await sessionClient()).rpc("usage_report", { p_from: from.toISOString(), p_to: to.toISOString(), p_firm: u.firmSlug });
    if (res.error) throw new Error(res.error.message);
    return usageOf(usageFromJson(res.data), u.firmSlug);
  }

  async quotes(u: ShopUser, page: number) {
    const db = await sessionClient();
    const res = await db
      .from("quotes")
      .select("id, number, view_token, created_at, content, totals, price, order_requests(status)", { count: "exact" })
      .eq("firm_id", u.firmId)
      .order("created_at", { ascending: false })
      .range((page - 1) * QUOTE_PAGE, page * QUOTE_PAGE - 1);
    if (res.error) throw new Error(res.error.message);
    type Row = {
      id: string; number: string; view_token: string; created_at: string; content: QuoteContent | null; totals: { code: string; metres: number }[]; price: number | string | null;
      order_requests: { status: OrderStatus }[] | { status: OrderStatus } | null;
    };
    const rows = (res.data ?? []) as Row[];
    // the customer's name: the row rule gives it to the shop's owner only (nothing for the support view)
    const priv = rows.length && !u.support ? await db.from("quote_private").select("quote_id, customer_name, note").in("quote_id", rows.map((r) => r.id)) : { data: [] };
    const byId = new Map(((priv.data ?? []) as { quote_id: string; customer_name: string | null; note: string | null }[]).map((p) => [p.quote_id, p]));
    return {
      total: res.count ?? 0,
      rows: rows.map((r) => {
        const o = Array.isArray(r.order_requests) ? r.order_requests[0] : r.order_requests;
        const p = byId.get(r.id);
        return {
          id: r.id, number: r.number, token: r.view_token, createdAt: r.created_at, pieces: pieceNames(r.content), totals: r.totals,
          price: r.price === null ? null : Number(r.price), customerName: p?.customer_name ?? null, note: p?.note ?? null, orderStatus: o?.status ?? null,
        };
      }),
    };
  }

  async products(u: ShopUser) {
    const db = await sessionClient();
    const [rows, prices, groups] = await Promise.all([
      catalogueRows(u.firmId),
      db.from("firm_prices").select("model_id, price").eq("firm_id", u.firmId),
      db.from("firm_group_prices").select("model_id, price_group, price").eq("firm_id", u.firmId),
    ]);
    const price = new Map(((prices.data ?? []) as { model_id: string; price: number | string }[]).map((p) => [p.model_id, Number(p.price)]));
    const byGroup = new Map<string, Record<string, number>>();
    for (const g of (groups.data ?? []) as { model_id: string; price_group: string; price: number | string }[]) byGroup.set(g.model_id, { ...byGroup.get(g.model_id), [g.price_group]: Number(g.price) });
    return rows.map((r) => productRow(r, price.get(r.m.id) ?? null, byGroup.get(r.m.id) ?? {}));
  }

  async saveProduct(u: ShopUser, modelId: string, patch: ProductPatch) {
    if (u.support) throw new Error(READ_ONLY);
    const res = await (await sessionClient()).rpc("shop_save_product", {
      p_firm_id: u.firmId,
      p_model_id: modelId,
      p_display_name: patch.displayName,
      p_product_code: patch.productCode,
      p_description: patch.description,
      p_featured: patch.featured,
      p_hidden: patch.hidden,
    });
    if (res.error) throw new Error(res.error.message);
    return res.data === true;
  }

  async setPrice(u: ShopUser, modelId: string, price: number | null) {
    if (u.support) throw new Error(READ_ONLY);
    const res = await (await sessionClient()).rpc("shop_set_price", { p_firm_id: u.firmId, p_model_id: modelId, p_price: price });
    if (res.error) throw new Error(res.error.message);
    return res.data === true;
  }

  async setGroupPrice(u: ShopUser, modelId: string, group: string, price: number | null) {
    if (u.support) throw new Error(READ_ONLY);
    const res = await (await sessionClient()).rpc("shop_set_group_price", { p_firm_id: u.firmId, p_model_id: modelId, p_group: group, p_price: price });
    if (res.error) throw new Error(res.error.message);
    return res.data === true;
  }
}

const holder = globalThis as unknown as { __ormenShopPanel?: ShopPanelStore };

export function getShopPanel(): ShopPanelStore {
  holder.__ormenShopPanel ??= supabaseEnabled() ? new SupabaseShopPanel() : new MemoryShopPanel();
  return holder.__ormenShopPanel;
}
