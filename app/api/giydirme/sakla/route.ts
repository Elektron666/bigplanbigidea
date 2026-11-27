import { getGiydirme } from "@/lib/giydirme/store";
import { json, ownSession, screen } from "@/lib/giydirme/ekran";

// "Ürün fotoğrafı olarak sakla": the session's photo is kept for the shop when the session ends.
export async function POST(request: Request) {
  const url = new URL(request.url);
  const g = await screen();
  if (!g.ok) return g.res;
  const o = await ownSession(g.s, url.searchParams.get("kod"));
  if (!o.ok) return o.res;
  // a photo of the customer's room is never kept (job 15)
  if (o.session.purpose === "salon") return json({ error: "Salon fotoğrafı saklanmaz." }, 409);
  const keep = url.searchParams.get("sakla") !== "0";
  await getGiydirme().setKeep(o.session.code, keep);
  return json({ keep });
}
