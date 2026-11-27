import { NextResponse } from "next/server";
import { getVideos, VIDEO_TOKEN } from "@/lib/video/store";
import { getLeads } from "@/lib/musteri/store";
import { validateLead } from "@/lib/musteri/kayit";
import { allow, callerKey } from "@/lib/rate-limit";

// A customer leaves their name and phone for the shop (job 13), from the
// video page on their phone. Only with the consent box ticked; only for a shop
// that set how long it keeps them.

export async function POST(request: Request) {
  if (!allow("musteri", callerKey(request.headers), 10, 60 * 60_000)) return NextResponse.json({ error: "Çok fazla deneme. Biraz sonra yeniden deneyin." }, { status: 429 });
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const v = validateLead(body);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 422 });
  const token = typeof body.video === "string" && VIDEO_TOKEN.test(body.video) ? body.video : null;
  const meta = token ? await getVideos().meta(token) : null;
  if (!meta) return NextResponse.json({ error: "Bağlantı geçersiz." }, { status: 404 });
  const leads = getLeads();
  if (!(await leads.retention(meta.firmId))) return NextResponse.json({ error: "Bu mağaza şu an bilgi toplamıyor." }, { status: 409 });
  await leads.add(meta.firmId, v.value, meta.product || null);
  return NextResponse.json({ ok: true }, { status: 201 });
}
