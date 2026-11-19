import { NextResponse } from "next/server";
import { getPanelUser } from "@/lib/auth/panel";
import { can } from "@/lib/auth/roles";
import { privateFiles } from "@/lib/giydirme/dosyalar";
import { cleanPhoto } from "@/lib/giydirme/etiket";
import { getGiydirme } from "@/lib/giydirme/store";

// One photo of the test bench's set (job 5, "Giydirme testi"): kept privately,
// one test item per fabric of the run. Yönetici only (a run spends money).
export async function POST(request: Request) {
  const user = await getPanelUser();
  if (!user) return NextResponse.json({ error: "Oturum süresi doldu." }, { status: 401 });
  if (!can(user.role, "maliyet")) return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 });
  const runId = new URL(request.url).searchParams.get("kosu") ?? "";
  const store = getGiydirme();
  const run = await store.getRun(runId);
  if (!run) return NextResponse.json({ error: "Koşu bulunamadı." }, { status: 404 });
  if (new Set(run.items.map((i) => i.photoPath)).size >= 60) return NextResponse.json({ error: "Bir koşuda en çok 60 fotoğraf." }, { status: 422 });
  const data = new Uint8Array(await request.arrayBuffer());
  if (!data.length || data.length > 15 * 1024 * 1024) return NextResponse.json({ error: "Fotoğraf okunamadı ya da 15 MB'tan büyük." }, { status: 413 });
  let clean;
  try {
    clean = await cleanPhoto(data);
  } catch {
    return NextResponse.json({ error: "Bu dosya bir fotoğraf olarak açılamadı." }, { status: 415 });
  }
  const path = `test/${run.id}/foto-${crypto.randomUUID()}.jpg`;
  await privateFiles().put(path, clean.jpeg);
  await store.addItems(run.id, run.fabricCodes.map((fabricCode) => ({ photoPath: path, fabricCode })));
  return NextResponse.json({ ok: true }, { status: 201 });
}
