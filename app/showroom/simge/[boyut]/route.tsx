import { ImageResponse } from "next/og";
import { getRepository } from "@/lib/data";
import { currentDevice } from "@/lib/devices/session";
import { inkFor } from "@/lib/firm";

// The home-screen icon of a paired screen: the shop's logo on paper white, or
// its initial on the shop's colour when it has no usable logo.
//
// The logo is fetched here first, from the same server the request came to,
// and handed to the image as data. Only PNG and JPEG are used: an SVG logo
// (the sample firm's) has no size of its own and would break the image, and
// a logo that cannot be fetched must not break the icon either.

export const dynamic = "force-dynamic";

const RASTER = /^image\/(png|jpe?g)$/;
const MAX_LOGO_BYTES = 2_000_000;

async function logoData(logoUrl: string | undefined, base: string): Promise<string | null> {
  if (!logoUrl) return null;
  try {
    const res = await fetch(new URL(logoUrl, base), { signal: AbortSignal.timeout(3000) });
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!res.ok || !RASTER.test(type)) return null;
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength > MAX_LOGO_BYTES) return null;
    return `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(request: Request, { params }: RouteContext<"/showroom/simge/[boyut]">) {
  const size = (await params).boyut === "512" ? 512 : 192;
  const who = await currentDevice();
  const firm = who ? await getRepository().getFirmById(who.device.firmId) : null;
  const accent = firm?.accentColor ?? "#B08D57";
  const logo = await logoData(firm?.logoUrl, request.url);
  return new ImageResponse(
    logo ? (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F1EA", padding: size * 0.14 }}>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={logo} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
      </div>
    ) : (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: accent, color: inkFor(accent), fontSize: size * 0.56 }}>
        {(firm?.name ?? "S").trim().charAt(0).toLocaleUpperCase("tr")}
      </div>
    ),
    { width: size, height: size, headers: { "cache-control": "no-store" } },
  );
}
