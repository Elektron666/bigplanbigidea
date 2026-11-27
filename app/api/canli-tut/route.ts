import { cronAllowed } from "@/lib/keepalive";
import { supabaseEnabled } from "@/lib/supabase/config";
import { serviceClient } from "@/lib/supabase/server";
import { sweepSessions } from "@/lib/giydirme/uret";
import { ensureMonthlyNotices } from "@/lib/rapor/bildirim";
import { getLeads } from "@/lib/musteri/store";

// Daily from Vercel (vercel.json → crons): one light read so Supabase does not pause.
export async function GET(request: Request) {
  if (!cronAllowed(request.headers.get("authorization"), process.env.CRON_SECRET)) return new Response(null, { status: 401 });
  // photo try-on sessions a screen left open: their customers' photos are deleted (job 5)
  const swept = await sweepSessions().catch(() => 0);
  // the monthly usage summary for every shop (job 11): once per shop and month, whichever day this runs first
  const notices = await ensureMonthlyNotices().catch(() => null);
  // interested customers past their shop's keeping period are deleted (job 13)
  const leads = await getLeads().purge().catch(() => null);
  if (!supabaseEnabled()) return Response.json({ ok: true, db: "yok", swept, notices, leads });
  const { error } = await serviceClient().from("fabrics").select("id").limit(1);
  return Response.json({ ok: !error, db: error ? "hata" : "uyanık", swept, notices }, { status: error ? 503 : 200 });
}
