import "server-only";
import { supabaseEnabled } from "@/lib/supabase/config";
import { serviceClient, sessionClient } from "@/lib/supabase/server";

// The monthly summaries handed to shops (Showroom package, job 11): one row
// per shop and month, made by the daily job on the first days of a month.
// The shop panel shows "… raporunuz hazır" until the owner opens it; ORMEN's
// panel shows who has seen theirs. With Supabase the owner's reads and the
// "seen" mark run with the owner's own session (row rules: own shop only).

export interface Notice {
  firmId: string;
  month: string;
  seenAt: string | null;
}

export interface NoticeStore {
  /** Makes the month's notice for each shop that has none yet; returns how many were made. */
  ensure(firmIds: string[], month: string): Promise<number>;
  /** ORMEN's view: the month's notices of every shop. */
  forMonth(month: string): Promise<Notice[]>;
  /** The owner's view: their shop's notices, newest first. */
  forShop(firmId: string): Promise<Notice[]>;
  markSeen(firmId: string, month: string): Promise<void>;
}

class MemoryNotices implements NoticeStore {
  private rows: Notice[] = [];
  async ensure(firmIds: string[], month: string) {
    let n = 0;
    for (const firmId of firmIds)
      if (!this.rows.some((r) => r.firmId === firmId && r.month === month)) {
        this.rows.push({ firmId, month, seenAt: null });
        n++;
      }
    return n;
  }
  async forMonth(month: string) {
    return this.rows.filter((r) => r.month === month).map((r) => ({ ...r }));
  }
  async forShop(firmId: string) {
    return this.rows
      .filter((r) => r.firmId === firmId)
      .sort((a, b) => (a.month < b.month ? 1 : -1))
      .map((r) => ({ ...r }));
  }
  async markSeen(firmId: string, month: string) {
    const r = this.rows.find((x) => x.firmId === firmId && x.month === month);
    if (r && !r.seenAt) r.seenAt = new Date().toISOString();
  }
}

type Row = { firm_id: string; month: string; seen_at: string | null };
const fromRow = (r: Row): Notice => ({ firmId: r.firm_id, month: r.month, seenAt: r.seen_at });

class SupabaseNotices implements NoticeStore {
  async ensure(firmIds: string[], month: string) {
    if (!firmIds.length) return 0;
    const res = await serviceClient()
      .from("usage_notices")
      .upsert(firmIds.map((firm_id) => ({ firm_id, month })), { onConflict: "firm_id,month", ignoreDuplicates: true })
      .select("firm_id");
    if (res.error) throw new Error(res.error.message);
    return res.data?.length ?? 0;
  }
  async forMonth(month: string) {
    const res = await serviceClient().from("usage_notices").select("firm_id, month, seen_at").eq("month", month);
    if (res.error) throw new Error(res.error.message);
    return (res.data as Row[]).map(fromRow);
  }
  async forShop(firmId: string) {
    const res = await (await sessionClient()).from("usage_notices").select("firm_id, month, seen_at").eq("firm_id", firmId).order("month", { ascending: false }).limit(24);
    if (res.error) throw new Error(res.error.message);
    return (res.data as Row[]).map(fromRow);
  }
  async markSeen(firmId: string, month: string) {
    const res = await (await sessionClient()).from("usage_notices").update({ seen_at: new Date().toISOString() }).eq("firm_id", firmId).eq("month", month).is("seen_at", null);
    if (res.error) throw new Error(res.error.message);
  }
}

const holder = globalThis as unknown as { __ormenNotices?: NoticeStore };

export function getNotices(): NoticeStore {
  holder.__ormenNotices ??= supabaseEnabled() ? new SupabaseNotices() : new MemoryNotices();
  return holder.__ormenNotices;
}
