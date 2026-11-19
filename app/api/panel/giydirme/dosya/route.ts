import { getPanelUser } from "@/lib/auth/panel";
import { can } from "@/lib/auth/roles";
import { privateFiles } from "@/lib/giydirme/dosyalar";

// The test bench's photos and pictures (private), to the yönetici only.
export async function GET(request: Request) {
  const user = await getPanelUser();
  if (!user || !can(user.role, "maliyet")) return new Response(null, { status: 403 });
  const path = new URL(request.url).searchParams.get("yol") ?? "";
  if (!/^test\/[0-9a-f-]{36}\/(foto|sonuc)-[0-9a-f-]{36}\.jpg$/.test(path)) return new Response(null, { status: 400 });
  const data = await privateFiles().get(path);
  return data ? new Response(data as BodyInit, { headers: { "content-type": "image/jpeg", "cache-control": "private, no-store" } }) : new Response(null, { status: 404 });
}
