import { cronAllowed } from "@/lib/keepalive";
import { supabaseEnabled } from "@/lib/supabase/config";
import { serviceClient } from "@/lib/supabase/server";
import { sweepSessions } from "@/lib/giydirme/uret";

// Daily from Vercel (vercel.json → crons): one light read so Supabase does not pause.
export async function GET(request: Request) {
  if (!cronAllowed(request.headers.get("authorization"), process.env.CRON_SECRET)) return new Response(null, { status: 401 });
  // photo try-on sessions a screen left open: their customers' photos are deleted (job 5)
  const swept = await sweepSessions().catch(() => 0);
  if (!supabaseEnabled()) return Response.json({ ok: true, db: "yok", swept });
  const { error } = await serviceClient().from("fabrics").select("id").limit(1);
  return Response.json({ ok: !error, db: error ? "hata" : "uyanık", swept }, { status: error ? 503 : 200 });
}
