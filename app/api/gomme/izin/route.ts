import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import { frameAncestors } from "@/lib/marka";

// The sites a shop's web embed may open on (job 16), as a CSP frame-ancestors
// value, for proxy.ts. Host names only; nothing private.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  const firm = /^[a-z0-9-]{1,60}$/.test(slug) ? await getRepository().getFirmBySlug(slug) : null;
  return NextResponse.json({ ancestors: frameAncestors(firm?.embedDomains ?? []) }, { headers: { "cache-control": "no-store" } });
}
