import { NextResponse } from "next/server";
import { currentDevice } from "@/lib/devices/session";
import { featureOn } from "@/lib/central/features";
import { getRepository } from "@/lib/data";
import { siteUrl, siteUrlIsFinal } from "@/lib/site";
import { getVideos, MAX_VIDEO_BYTES, type VideoType } from "@/lib/video/store";
import { allow, callerKey } from "@/lib/rate-limit";

// A configuration video from a paired showroom screen (job 13): stored under a
// long random link for the customer's phone. At most 10 MB, MP4 or WebM.

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const who = await currentDevice();
  if (!who) return NextResponse.json({ error: "Bu ekran eşleşmemiş." }, { status: 401 });
  const firm = await getRepository().getFirmById(who.shop.id);
  if (!firm || !featureOn(firm.features, "video")) return NextResponse.json({ error: "Telefona video bu mağazada kapalı." }, { status: 403 });
  if (!allow("video", callerKey(request.headers), 30, 60 * 60_000)) return NextResponse.json({ error: "Çok fazla video. Biraz sonra yeniden deneyin." }, { status: 429 });
  const url = new URL(request.url);
  const type = (request.headers.get("content-type") ?? "").split(";")[0] as VideoType;
  if (type !== "video/mp4" && type !== "video/webm") return NextResponse.json({ error: "Video biçimi desteklenmiyor." }, { status: 415 });
  const data = new Uint8Array(await request.arrayBuffer());
  if (data.length > MAX_VIDEO_BYTES) return NextResponse.json({ error: "Video 10 MB'ı geçiyor." }, { status: 413 });
  if (data.length < 1000) return NextResponse.json({ error: "Video boş." }, { status: 422 });
  const product = (url.searchParams.get("urun") ?? "").slice(0, 300);
  const quote = url.searchParams.get("teklif");
  const token = Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString("base64url");
  await getVideos().put(token, data, { firmId: firm.id, firmSlug: firm.slug, product, type, quoteToken: quote && /^[A-Za-z0-9_-]{22,64}$/.test(quote) ? quote : null, createdAt: new Date().toISOString() });
  const base = (siteUrlIsFinal() ? siteUrl() : url.origin).replace(/\/$/, "");
  return NextResponse.json({ token, url: `${base}/v/${token}` }, { status: 201, headers: { "cache-control": "no-store" } });
}
