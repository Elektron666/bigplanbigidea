import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import { currentDevice } from "@/lib/devices/session";

// The showroom as an installable app (Showroom package, job 1): on the
// device's home screen it carries the shop's own name, colour and icon, so
// neither ORMEN nor a browser shows when it opens. Built per screen, from the
// shop the screen is paired with.

export const dynamic = "force-dynamic";

export async function GET() {
  const who = await currentDevice();
  const firm = who ? await getRepository().getFirmById(who.device.firmId) : null;
  const name = firm?.name ?? "Showroom";
  return NextResponse.json(
    {
      name,
      short_name: name.slice(0, 12),
      start_url: "/showroom",
      scope: "/",
      display: "fullscreen",
      display_override: ["fullscreen", "standalone"],
      orientation: "landscape",
      background_color: "#f5f1ea",
      theme_color: "#f5f1ea",
      icons: [192, 512].map((size) => ({ src: `/showroom/simge/${size}`, sizes: `${size}x${size}`, type: "image/png", purpose: "any" })),
    },
    { headers: { "content-type": "application/manifest+json", "cache-control": "no-store" } },
  );
}
