import { getVideos, VIDEO_TOKEN } from "@/lib/video/store";

// The video itself, by its link only.
export async function GET(_request: Request, { params }: RouteContext<"/api/video/[token]">) {
  const { token } = await params;
  if (!VIDEO_TOKEN.test(token)) return new Response(null, { status: 404 });
  const store = getVideos();
  const [meta, data] = await Promise.all([store.meta(token), store.get(token)]);
  if (!meta || !data) return new Response(null, { status: 404 });
  return new Response(data as BodyInit, { headers: { "content-type": meta.type, "content-length": String(data.length), "cache-control": "private, max-age=86400" } });
}
