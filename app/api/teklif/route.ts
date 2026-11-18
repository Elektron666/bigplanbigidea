import { NextResponse } from "next/server";
import { getRepository, loadCatalogue } from "@/lib/data";
import { currentDevice } from "@/lib/devices/session";
import { allow, callerKey } from "@/lib/rate-limit";
import { buildQuote, parseQuoteRequest } from "@/lib/teklif/request";
import { getQuotes } from "@/lib/teklif/store";
import { withBuiltSet } from "@/lib/modul/model";
import { featureOn } from "@/lib/central/features";

// A quote from the configurator (Showroom package, job 3), and with
// order: true, "ORMEN'e sipariş talebi gönder". The metres are worked out
// here again from the centre's catalogue; the screen's own figures are not
// taken. The same quote (same device-made id) sent twice is stored once, and
// one quote makes one order request, however many times it is sent.

export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > 8000) return NextResponse.json({ error: "İstek çok büyük." }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const parsed = parseQuoteRequest(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 422 });
  const q = parsed.value;

  // a paired showroom screen: its shop comes from its secret, never from the request
  const screen = await currentDevice().catch(() => null);
  if (!screen && !allow("teklif", callerKey(request.headers), 20, 10 * 60_000)) return NextResponse.json({ error: "Çok sık gönderildi; biraz sonra tekrar deneyin." }, { status: 429 });
  if (q.order && !screen) return NextResponse.json({ error: "Sipariş talebi yalnızca mağazadaki showroom ekranından gönderilir." }, { status: 403 });
  if (screen && (screen.shop.status === "askida" || screen.shop.status === "ayrildi")) return NextResponse.json({ error: "Mağaza şu an kapalı." }, { status: 409 });

  const repo = getRepository();
  const firm = screen ? await repo.getFirmById(screen.shop.id) : q.firmSlug ? await repo.getFirmBySlug(q.firmSlug) : null;
  // a feature switched off for the shop is off here too, not only hidden on the screen
  if (firm && !featureOn(firm.features, "teklif")) return NextResponse.json({ error: "Teklif bu mağazada kapalı." }, { status: 403 });
  if (q.order && firm && !featureOn(firm.features, "siparis")) return NextResponse.json({ error: "Sipariş talebi bu mağazada kapalı." }, { status: 403 });
  const catalogue = await loadCatalogue(firm?.slug ?? null);
  if (!catalogue) return NextResponse.json({ error: "Sayfa bulunamadı." }, { status: 404 });
  const quotes = getQuotes();
  // a corner set built on the screen is built again here, from the module set's own sizes and metres
  const withSet = { ...catalogue, models: withBuiltSet(catalogue.models, q.pieces.find((p) => p.kurulum)?.kurulum) };
  const built = buildQuote(q.pieces, withSet, await quotes.getWaste());
  if (!built.ok) return NextResponse.json({ error: built.error }, { status: 422 });
  if (q.order && built.totals.length === 0) return NextResponse.json({ error: "Sipariş için en az bir kumaşın metrajı hesaplanmış olmalı." }, { status: 422 });

  const { quote, created } = await quotes.saveQuote({
    firmId: firm?.id ?? null,
    deviceId: screen?.device.id ?? null,
    clientId: q.clientId,
    number: q.number,
    token: q.token,
    content: built.content,
    totals: built.totals,
    wasteMissing: built.wasteMissing,
    price: q.price,
    customerName: q.customerName,
    note: q.note,
  });
  const order = q.order ? await quotes.createOrder(quote) : null;
  return NextResponse.json(
    { number: quote.number, path: `/t/${quote.token}`, created, order: order ? { created: order.created } : null },
    { status: created || order?.created ? 201 : 200, headers: { "cache-control": "no-store" } },
  );
}
