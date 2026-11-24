import "server-only";
import { tallyQuotedFabrics } from "@/lib/rapor/kullanim";
import { supabaseEnabled } from "@/lib/supabase/config";
import { serviceClient } from "@/lib/supabase/server";
import { EMPTY_WASTE, type WasteSettings } from "./metraj";
import type { QuoteContent } from "./request";

// Quotes, fabric order requests and ORMEN's waste settings (Showroom package,
// job 3): memory when Supabase is not set up, Supabase otherwise. Only the
// server calls this, after it has checked who is asking.

import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "./sabitler";
export { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus };

export interface QuoteInput {
  firmId: string | null;
  deviceId: string | null;
  clientId: string;
  number: string;
  token: string;
  content: QuoteContent;
  totals: { code: string; metres: number }[];
  wasteMissing: boolean;
  price: number | null;
  customerName: string | null;
  note: string | null;
}

export interface StoredQuote extends QuoteInput {
  id: string;
  createdAt: string;
}

export interface OrderRow {
  id: string;
  quoteId: string;
  quoteNumber: string;
  firmId: string | null;
  firmName: string | null;
  items: { code: string; metres: number }[];
  status: OrderStatus;
  createdAt: string;
}

export interface QuoteStore {
  getWaste(): Promise<WasteSettings>;
  setWaste(w: WasteSettings): Promise<void>;
  /** Stores the quote, or finds the one already stored with the same device-made id. */
  saveQuote(q: QuoteInput): Promise<{ quote: StoredQuote; created: boolean }>;
  /** For the customer's phone page: the link is the only key. */
  quoteByToken(token: string): Promise<StoredQuote | null>;
  /** One order request per quote: false when it was already there. */
  createOrder(quote: StoredQuote): Promise<{ created: boolean }>;
  listOrders(limit?: number): Promise<OrderRow[]>;
  setOrderStatus(id: string, status: OrderStatus): Promise<boolean>;
  /** How many quotes and order requests since `from` (the overview's month). Counts only. */
  countSince(from: Date): Promise<{ quotes: number; orders: number }>;
  /** Per shop and fabric: in how many quotes of the period the fabric was (job 11, ORMEN's panel). */
  quotedFabrics(from: Date, to: Date): Promise<{ firmId: string | null; code: string; quotes: number }[]>;
}

// ------------------------------------------------------------------ memory

export class MemoryQuotes implements QuoteStore {
  private waste: WasteSettings = { ...EMPTY_WASTE };
  private quotes: StoredQuote[] = [];
  private orders: (Omit<OrderRow, "quoteNumber" | "firmName">)[] = [];
  constructor(private firmName: (id: string) => Promise<string | null> = async () => null) {}

  async getWaste() {
    return { ...this.waste };
  }
  async setWaste(w: WasteSettings) {
    this.waste = { ...w };
  }
  async saveQuote(q: QuoteInput) {
    const found = this.quotes.find((x) => x.clientId === q.clientId);
    if (found) return { quote: found, created: false };
    if (this.quotes.some((x) => x.number === q.number || x.token === q.token)) throw new Error("Teklif numarası çakıştı; yeniden deneyin.");
    const quote: StoredQuote = { ...q, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    this.quotes.unshift(quote);
    return { quote, created: true };
  }
  async quoteByToken(token: string) {
    return this.quotes.find((x) => x.token === token) ?? null;
  }
  async createOrder(quote: StoredQuote) {
    if (this.orders.some((o) => o.quoteId === quote.id)) return { created: false };
    this.orders.unshift({ id: crypto.randomUUID(), quoteId: quote.id, firmId: quote.firmId, items: quote.totals, status: "yeni", createdAt: new Date().toISOString() });
    return { created: true };
  }
  async listOrders(limit = 200) {
    return Promise.all(
      this.orders.slice(0, limit).map(async (o) => ({
        ...o,
        quoteNumber: this.quotes.find((q) => q.id === o.quoteId)?.number ?? "",
        firmName: o.firmId ? await this.firmName(o.firmId) : null,
      })),
    );
  }
  async setOrderStatus(id: string, status: OrderStatus) {
    const o = this.orders.find((x) => x.id === id);
    if (o) o.status = status;
    return !!o;
  }

  /** The shop panel's list (memory only; with Supabase the panel reads with the owner's own session). */
  forShop(firmId: string): (StoredQuote & { orderStatus: OrderStatus | null })[] {
    return this.quotes.filter((q) => q.firmId === firmId).map((q) => ({ ...q, orderStatus: this.orders.find((o) => o.quoteId === q.id)?.status ?? null }));
  }

  async countSince(from: Date) {
    const t = from.toISOString();
    return { quotes: this.quotes.filter((q) => q.createdAt >= t).length, orders: this.orders.filter((o) => o.createdAt >= t).length };
  }

  async quotedFabrics(from: Date, to: Date) {
    const [f, t] = [from.toISOString(), to.toISOString()];
    return tallyQuotedFabrics(this.quotes.filter((q) => q.createdAt >= f && q.createdAt <= t).map((q) => ({ firmId: q.firmId, codes: q.content.totals.map((x) => x.code) })));
  }
}

// ------------------------------------------------------------------ Supabase

type QuoteRow = {
  id: string; firm_id: string | null; device_id: string | null; number: string; view_token: string; client_id: string; content: QuoteContent;
  totals: { code: string; metres: number }[]; waste_missing: boolean; price: number | null; created_at: string;
};

function check<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

class SupabaseQuotes implements QuoteStore {
  private get db() {
    return serviceClient();
  }

  async getWaste() {
    const r = check(await this.db.from("meterage_settings").select("*").eq("id", 1).maybeSingle()) as { waste_duz: number | null; waste_donuk: number | null; waste_raporlu: number | null; round_step: number } | null;
    if (!r) return { ...EMPTY_WASTE };
    const n = (v: number | null) => (v === null ? null : Number(v));
    return { duz: n(r.waste_duz), donuk: n(r.waste_donuk), raporlu: n(r.waste_raporlu), roundStep: Number(r.round_step) };
  }

  async setWaste(w: WasteSettings) {
    check(await this.db.from("meterage_settings").upsert({ id: 1, waste_duz: w.duz, waste_donuk: w.donuk, waste_raporlu: w.raporlu, round_step: w.roundStep }));
  }

  private async withPrivate(r: QuoteRow): Promise<StoredQuote> {
    const p = check(await this.db.from("quote_private").select("customer_name, note").eq("quote_id", r.id).maybeSingle()) as { customer_name: string | null; note: string | null } | null;
    return {
      id: r.id, firmId: r.firm_id, deviceId: r.device_id, clientId: r.client_id, number: r.number, token: r.view_token, content: r.content, totals: r.totals,
      wasteMissing: r.waste_missing, price: r.price === null ? null : Number(r.price), customerName: p?.customer_name ?? null, note: p?.note ?? null, createdAt: r.created_at,
    };
  }

  async saveQuote(q: QuoteInput) {
    const existing = check(await this.db.from("quotes").select("*").eq("client_id", q.clientId).maybeSingle()) as QuoteRow | null;
    if (existing) return { quote: await this.withPrivate(existing), created: false };
    const res = await this.db
      .from("quotes")
      .insert({ firm_id: q.firmId, device_id: q.deviceId, number: q.number, view_token: q.token, client_id: q.clientId, content: q.content, totals: q.totals, waste_missing: q.wasteMissing, price: q.price })
      .select("*")
      .single();
    if (res.error?.code === "23505") {
      // a second copy arrived at the same moment: the first one stands
      const again = check(await this.db.from("quotes").select("*").eq("client_id", q.clientId).maybeSingle()) as QuoteRow | null;
      if (again) return { quote: await this.withPrivate(again), created: false };
      throw new Error("Teklif numarası çakıştı; yeniden deneyin.");
    }
    const row = check(res) as QuoteRow;
    if (q.customerName || q.note) check(await this.db.from("quote_private").insert({ quote_id: row.id, firm_id: q.firmId, customer_name: q.customerName, note: q.note }));
    return { quote: await this.withPrivate(row), created: true };
  }

  async quoteByToken(token: string) {
    const r = check(await this.db.from("quotes").select("*").eq("view_token", token).maybeSingle()) as QuoteRow | null;
    return r ? this.withPrivate(r) : null;
  }

  async createOrder(quote: StoredQuote) {
    const res = await this.db.from("order_requests").insert({ quote_id: quote.id, firm_id: quote.firmId, items: quote.totals });
    if (res.error?.code === "23505") return { created: false };
    check(res);
    return { created: true };
  }

  async listOrders(limit = 200) {
    type Row = { id: string; quote_id: string; firm_id: string | null; items: { code: string; metres: number }[]; status: OrderStatus; created_at: string; quotes: { number: string } | null; firms: { name: string } | null };
    const rows = check(await this.db.from("order_requests").select("*, quotes(number), firms(name)").order("created_at", { ascending: false }).limit(limit)) as Row[];
    return rows.map((r) => ({ id: r.id, quoteId: r.quote_id, quoteNumber: r.quotes?.number ?? "", firmId: r.firm_id, firmName: r.firms?.name ?? null, items: r.items, status: r.status, createdAt: r.created_at }));
  }

  async setOrderStatus(id: string, status: OrderStatus) {
    const rows = check(await this.db.from("order_requests").update({ status, status_at: new Date().toISOString() }).eq("id", id).select("id")) as unknown[];
    return rows.length > 0;
  }

  async countSince(from: Date) {
    // counts only (head: no rows travel), on the created_at indexes
    const [q, o] = await Promise.all([
      this.db.from("quotes").select("id", { count: "exact", head: true }).gte("created_at", from.toISOString()),
      this.db.from("order_requests").select("id", { count: "exact", head: true }).gte("created_at", from.toISOString()),
    ]);
    if (q.error) throw new Error(q.error.message);
    if (o.error) throw new Error(o.error.message);
    return { quotes: q.count ?? 0, orders: o.count ?? 0 };
  }

  async quotedFabrics(from: Date, to: Date) {
    // only the fabric list of each quote travels, not the quote
    const res = await this.db.from("quotes").select("firm_id, fabrics:content->totals").gte("created_at", from.toISOString()).lte("created_at", to.toISOString()).limit(20_000);
    if (res.error) throw new Error(res.error.message);
    const rows = (res.data ?? []) as unknown as { firm_id: string | null; fabrics: { code?: unknown }[] | null }[];
    return tallyQuotedFabrics(rows.map((r) => ({ firmId: r.firm_id, codes: (r.fabrics ?? []).map((x) => x.code).filter((c): c is string => typeof c === "string") })));
  }
}

const holder = globalThis as unknown as { __ormenQuotes?: QuoteStore };

export function getQuotes(): QuoteStore {
  if (!holder.__ormenQuotes) {
    if (supabaseEnabled()) holder.__ormenQuotes = new SupabaseQuotes();
    else {
      // the firm names come from the catalogue store (loaded lazily: it is server-only too)
      holder.__ormenQuotes = new MemoryQuotes(async (id) => (await (await import("@/lib/data")).getRepository().getFirmById(id))?.name ?? null);
    }
  }
  return holder.__ormenQuotes;
}
