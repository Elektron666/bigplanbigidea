import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import { parseKartelaPath } from "@/lib/kartela/qr";
import { markedPath } from "@/lib/source";

// The short address on a swatch card's QR (Showroom package, job 2). A phone
// that scans it lands on the shop's page (or ORMEN's) with that fabric on the
// sofa, counted in the report as a printed QR with the "kartela" label.
// A showroom screen never comes here: it reads the code from the QR itself.

export async function GET(request: Request, { params }: RouteContext<"/k/[...yol]">) {
  const parsed = parseKartelaPath((await params).yol);
  const repo = getRepository();
  const firm = parsed?.firmSlug ? await repo.getFirmBySlug(parsed.firmSlug) : null;
  const base = firm ? `/f/${firm.slug}` : "/";
  const fabric = parsed ? await repo.getFabricByCode(parsed.code) : null;
  // an unknown or hidden fabric still opens the page, just without it
  const target = markedPath(base, { qr: true, tag: "kartela", fabric: fabric?.isActive ? fabric.code : undefined });
  return NextResponse.redirect(new URL(target, request.url), 307);
}
