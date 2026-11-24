import { readFile } from "node:fs/promises";
import path from "node:path";
import { getShopUser } from "@/lib/auth/shop";
import { PDF_FONT_FILES } from "@/lib/teklif/sabitler";
import type { PdfFonts } from "@/lib/teklif/pdf";
import { buildUsagePdf } from "@/lib/rapor/pdf";
import { pickMonth, shopReport } from "@/lib/rapor/veri";
import { siteUrl } from "@/lib/site";

// The shop's monthly usage report as a one-page PDF (job 11), for its signed-in
// owner (or ORMEN's support view). Made on the server from the same numbers
// as the report page.

export const dynamic = "force-dynamic";

async function fonts(): Promise<PdfFonts> {
  const read = (u: string) => readFile(path.join(process.cwd(), "public", u)).then((b) => new Uint8Array(b));
  const [r1, r2, b1, b2] = await Promise.all([...PDF_FONT_FILES.regular, ...PDF_FONT_FILES.bold].map(read));
  return { regular: [r1, r2], bold: [b1, b2] };
}

export async function GET(request: Request) {
  const user = await getShopUser();
  if (!user) return new Response("Giriş gerekli.", { status: 401 });
  const ym = pickMonth(new URL(request.url).searchParams.get("ay"));
  const data = await shopReport(user, ym, siteUrl());
  const pdf = await buildUsagePdf(data, await fonts());
  return new Response(new Blob([pdf as BlobPart], { type: "application/pdf" }), {
    headers: {
      "Content-Disposition": `attachment; filename="kullanim-raporu-${user.firmSlug}-${ym}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
