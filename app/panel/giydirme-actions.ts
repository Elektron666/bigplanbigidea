"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getPanelUser } from "@/lib/auth/panel";
import { can, DENIED } from "@/lib/auth/roles";
import { getRepository } from "@/lib/data";
import { privateFiles } from "@/lib/giydirme/dosyalar";
import { MAX_FABRICS } from "@/lib/giydirme/kota";
import { getProvider } from "@/lib/giydirme/saglayici";
import { getGiydirme } from "@/lib/giydirme/store";
import { makeOne } from "@/lib/giydirme/uret";
import { codeUpper } from "@/lib/i18n/tr";

// The try-on test bench's server actions (job 5, "Giydirme testi"). A run
// calls the provider for every photo × fabric, so it is the yönetici's only
// ("maliyet"), and it runs a few pictures per call: the page calls again
// until none is left, showing how far it is.

type Result = { ok: true } | { ok: false; error: string };
const BATCH = 4;

async function guard() {
  const user = await getPanelUser();
  if (!user) return { ok: false as const, error: "Oturum süresi doldu. Yeniden giriş yapın." };
  if (!can(user.role, "maliyet")) return { ok: false as const, error: DENIED };
  return { ok: true as const, user };
}

export async function createTestRunAction(name: string, codes: string[]): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const g = await guard();
  if (!g.ok) return g;
  const provider = await getProvider();
  if (!provider) return { ok: false, error: "Sağlayıcı bağlı değil; test çalıştırılamaz." };
  const n = String(name ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  if (!n) return { ok: false, error: "Koşuya bir ad verin." };
  const known = new Set((await getRepository().listFabrics()).map((f) => f.code));
  const fabricCodes = [...new Set((Array.isArray(codes) ? codes : []).map((c) => codeUpper(String(c))))].filter((c) => known.has(c));
  if (!fabricCodes.length || fabricCodes.length > MAX_FABRICS) return { ok: false, error: `1–${MAX_FABRICS} kumaş seçin.` };
  const run = await getGiydirme().createRun(n, provider.id, fabricCodes);
  revalidatePath("/panel/giydirme/test");
  return { ok: true, id: run.id };
}

/** Makes the next few pictures of the run; returns how many are still waiting. */
export async function runTestBatchAction(runId: string): Promise<{ ok: true; left: number } | { ok: false; error: string }> {
  const g = await guard();
  if (!g.ok) return g;
  const provider = await getProvider();
  if (!provider) return { ok: false, error: "Sağlayıcı bağlı değil." };
  const store = getGiydirme();
  const run = await store.getRun(String(runId).slice(0, 40));
  if (!run) return { ok: false, error: "Koşu bulunamadı." };
  const waiting = run.items.filter((i) => i.status === "bekliyor");
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const byCode = new Map((await getRepository().listFabrics({ includeInactive: true })).map((f) => [f.code, f]));
  const files = privateFiles();
  await Promise.all(
    waiting.slice(0, BATCH).map(async (item) => {
      const fabric = byCode.get(item.fabricCode);
      const photo = await files.get(item.photoPath);
      if (!fabric || !photo) return store.updateItem(item.id, { status: "basarisiz", error: !fabric ? "Kumaş artık yok." : "Fotoğraf okunamadı." });
      const one = await makeOne({ provider, photo, fabric, origin });
      const resultPath = one.jpeg ? `test/${run.id}/sonuc-${item.id}.jpg` : null;
      if (one.jpeg && resultPath) await files.put(resultPath, one.jpeg);
      await store.logCall({ kind: "test", firmId: null, deviceId: null, provider: provider.id, fabricCode: item.fabricCode, ms: one.ms, costUsd: one.costUsd, status: one.status, error: one.detail });
      await store.updateItem(item.id, { status: one.status, resultPath, ms: one.ms, costUsd: one.costUsd, error: one.status === "basarili" ? null : (one.detail ?? one.error ?? null) });
    }),
  );
  return { ok: true, left: Math.max(0, waiting.length - BATCH) };
}

export async function setVerdictAction(itemId: string, verdict: string | null, note: string): Promise<Result> {
  const g = await guard();
  if (!g.ok) return g;
  const v = verdict === "gosterilebilir" || verdict === "gosterilemez" ? verdict : null;
  const ok = await getGiydirme().setVerdict(String(itemId).slice(0, 40), v, String(note ?? "").trim().slice(0, 300) || null);
  return ok ? { ok: true } : { ok: false, error: "Sonuç bulunamadı." };
}
