import { NextResponse } from "next/server";
import { currentDevice } from "@/lib/devices/session";
import { checkScreenPin } from "@/lib/devices/pin-guard";
import { featureOn } from "@/lib/central/features";
import { loadCatalogue } from "@/lib/data";
import { getFabricExtras, linksByCode, stockByCode } from "@/lib/kumas/store";
import { getQuotes } from "@/lib/teklif/store";
import { priceTableFor } from "@/lib/satici/ekran";

// Seller mode on a paired showroom screen (Showroom package, job 7). The shop
// PIN opens it; only then does the screen get the shop's prices, its fabric
// stock and lead times, and its quotes of the last 30 days. Nothing of it is
// in the page itself, so without the PIN no price is anywhere on the screen.

export const dynamic = "force-dynamic";
const DAYS = 30;

export async function POST(request: Request) {
  const who = await currentDevice();
  if (!who) return NextResponse.json({ error: "eslesmemis" }, { status: 401 });
  const cat = await loadCatalogue(who.shop.slug);
  if (!cat?.firm || !featureOn(cat.firm.features, "satici")) return NextResponse.json({ error: "Satıcı modu bu mağazada kapalı." }, { status: 403 });
  const pin = await checkScreenPin(who.device.id, who.device.firmId, await request.text());
  if (!pin.ok) return NextResponse.json({ error: pin.error }, { status: pin.status });
  const extras = getFabricExtras();
  const [prices, stock, links, quotes] = await Promise.all([
    priceTableFor(cat.firm.id, cat.models),
    extras.listStock(),
    extras.listLinks("muadil"),
    getQuotes().recentForFirm(cat.firm.id, new Date(Date.now() - DAYS * 86_400_000)),
  ]);
  return NextResponse.json(
    { prices, stock: stockByCode(stock, cat.fabrics), alternatives: linksByCode(links, cat.fabrics), quotes },
    { headers: { "cache-control": "no-store" } },
  );
}
