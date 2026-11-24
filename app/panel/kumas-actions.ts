"use server";

import { revalidatePath } from "next/cache";
import { getPanelUser } from "@/lib/auth/panel";
import { can, DENIED } from "@/lib/auth/roles";
import { getCentral } from "@/lib/central/store";
import { getRepository } from "@/lib/data";
import { normaliseCode } from "@/lib/panel/fabric-form";
import { getFabricExtras, type LinkKind } from "@/lib/kumas/store";
import { MAX_STOCK_ROWS, parseLeadDays, parseStatus, parseStockCsv, STOCK_LABELS, validateStock, type StockCsvResult, type StockStatus } from "@/lib/kumas/stok";
import type { Fabric } from "@/lib/types";

// Fabric stock and the muadil / uyumlu lists (Showroom package, job 8). ORMEN's
// content: the yönetici and ORMEN elemanı ("icerik"). Every change goes to the
// change log with what it was before, so it can be undone from there.

type Fail = { ok: false; error: string };

async function editor() {
  const user = await getPanelUser();
  if (!user) return { error: "Oturum süresi doldu. Yeniden giriş yapın." } as const;
  if (!can(user.role, "icerik")) return { error: DENIED } as const;
  return { user } as const;
}

async function fabricsByCode(): Promise<Map<string, Fabric>> {
  return new Map((await getRepository().listFabrics({ includeInactive: true })).map((f) => [f.code, f]));
}

type Row = { fabricId: string; code: string; status: StockStatus | null; leadDays?: number };

/** Applies stock rows (status null clears), logs one entry with the previous stock for undo. */
async function applyStock(user: { email: string; role: "admin" | "staff" | "sahip" }, rows: Row[], how: string): Promise<void> {
  if (!rows.length) return;
  const extras = getFabricExtras();
  const was = await extras.listStock();
  await extras.setStock(rows.filter((r) => r.status).map((r) => ({ fabricId: r.fabricId, status: r.status!, leadDays: r.leadDays })));
  await extras.clearStock(rows.filter((r) => !r.status).map((r) => r.fabricId));
  const one = rows.length === 1 ? rows[0] : null;
  await getCentral().writeAudit({
    actor: user.email,
    actorRole: user.role,
    entity: "kumas",
    entityId: one?.fabricId ?? null,
    action: "stok-degisti",
    summary: (one ? `${one.code}: ${one.status ? STOCK_LABELS[one.status] : "stok bilgisi kaldırıldı"}${one.leadDays ? `, termin ${one.leadDays} gün` : ""}` : `${rows.length} kumaşın stoğu güncellendi (${how})`).slice(0, 300),
    before: { rows: rows.map((r) => ({ fabricId: r.fabricId, status: was[r.fabricId]?.status ?? null, leadDays: was[r.fabricId]?.leadDays })) },
    after: { rows: rows.map((r) => ({ fabricId: r.fabricId, status: r.status, leadDays: r.leadDays })) },
  });
  revalidatePath("/panel/kumaslar/stok");
  revalidatePath("/showroom");
}

/** Stock entered by hand in the table: status "" takes the entry off. */
export async function saveStockAction(input: { code: string; status: string; leadDays: string }[]): Promise<{ ok: true; saved: number } | (Fail & { line?: number })> {
  const who = await editor();
  if ("error" in who) return { ok: false, error: who.error! };
  if (!Array.isArray(input) || input.length > MAX_STOCK_ROWS) return { ok: false, error: "Geçersiz istek." };
  const byCode = await fabricsByCode();
  const rows: Row[] = [];
  for (const [i, r] of input.entries()) {
    const f = byCode.get(normaliseCode(String(r?.code ?? "")));
    if (!f) return { ok: false, error: `${String(r?.code ?? "").slice(0, 30)}: bu kodda kumaş yok.`, line: i };
    if (!String(r.status ?? "")) {
      rows.push({ fabricId: f.id, code: f.code, status: null });
      continue;
    }
    const status = parseStatus(String(r.status));
    const leadDays = parseLeadDays(String(r.leadDays ?? ""));
    const bad = validateStock(status, leadDays);
    if (bad) return { ok: false, error: `${f.code}: ${bad}`, line: i };
    rows.push({ fabricId: f.id, code: f.code, status, leadDays });
  }
  await applyStock(who.user, rows, "elle");
  return { ok: true, saved: rows.length };
}

/** A stock CSV: the good rows are applied in one go, the bad ones come back with their line numbers. */
export async function importStockCsvAction(text: string): Promise<{ ok: true; applied: number; errors: StockCsvResult["errors"] } | Fail> {
  const who = await editor();
  if ("error" in who) return { ok: false, error: who.error! };
  if (typeof text !== "string" || text.length > 400_000) return { ok: false, error: "Dosya çok büyük." };
  const byCode = await fabricsByCode();
  const parsed = parseStockCsv(text, (w) => (byCode.has(normaliseCode(w)) ? normaliseCode(w) : null));
  const rows = parsed.rows.map((r) => ({ fabricId: byCode.get(r.code)!.id, code: r.code, status: r.status, leadDays: r.leadDays }));
  await applyStock(who.user, rows, "CSV");
  return { ok: true, applied: rows.length, errors: parsed.errors };
}

/** A fabric's muadil or uyumlu list, as codes in order ("" empties it). */
export async function saveFabricLinksAction(fabricId: string, kind: LinkKind, codes: string): Promise<{ ok: true; codes: string[] } | Fail> {
  const who = await editor();
  if ("error" in who) return { ok: false, error: who.error! };
  if (kind !== "muadil" && kind !== "uyumlu") return { ok: false, error: "Geçersiz istek." };
  const byCode = await fabricsByCode();
  const fabric = [...byCode.values()].find((f) => f.id === String(fabricId).slice(0, 60));
  if (!fabric) return { ok: false, error: "Kumaş bulunamadı." };
  const written = String(codes ?? "")
    .split(/[\s,;]+/)
    .map(normaliseCode)
    .filter(Boolean);
  if (written.length > 12) return { ok: false, error: "Bir listede en çok 12 kumaş olabilir." };
  const unknown = written.filter((c) => !byCode.has(c));
  if (unknown.length) return { ok: false, error: `Bu kodlarda kumaş yok: ${unknown.join(", ")}.` };
  const list = [...new Set(written)].filter((c) => c !== fabric.code);
  const extras = getFabricExtras();
  const was = (await extras.listLinks(kind))[fabric.id] ?? [];
  const ids = list.map((c) => byCode.get(c)!.id);
  await extras.setLinks(kind, fabric.id, ids);
  const label = kind === "muadil" ? "muadil" : "uyumlu";
  await getCentral().writeAudit({
    actor: who.user.email,
    actorRole: who.user.role,
    entity: "kumas",
    entityId: fabric.id,
    action: "liste-degisti",
    summary: `${fabric.code}: ${label} kumaşlar ${list.join(", ") || "boşaltıldı"}`.slice(0, 300),
    before: { list: kind, ids: was },
    after: { list: kind, ids },
  });
  revalidatePath(`/panel/kumaslar/${fabric.id}`);
  revalidatePath("/showroom");
  return { ok: true, codes: list };
}
