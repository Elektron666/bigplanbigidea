// The centre's overview screen (Showroom package, job 0: "Genel bakış").
// Pure: from the screens' last check-ins, the unpaid fees and the shops'
// names, the figures at the top and the list of what needs a look. No
// customer's data reaches here: only counts.

import { ONLINE_WINDOW_MS } from "@/lib/devices/pairing";
import { STALE_DAYS } from "./shops";

export interface DeviceBeat {
  firmId: string;
  lastSeenAt: string | null;
  syncStatus: string;
  createdAt: string;
}

export interface UnpaidFee {
  firmId: string;
  amount: number | null;
  /** YYYY-MM-DD */
  dueOn: string;
}

export interface Attention {
  firmId: string;
  name: string;
  reasons: string[];
}

export interface Overview {
  devices: { total: number; online: number; offline: number; neverOpened: number };
  /** Null for ORMEN elemanı: fees are the yönetici's. */
  fees: { dueThisMonth: number; amount: number; withoutAmount: number; overdue: number } | null;
  attention: Attention[];
}

const DAY = 86_400_000;

/** The last day of `today`'s month, YYYY-MM-DD. */
export function monthEnd(today: string): string {
  const [y, m] = today.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

export function buildOverview(
  input: { devices: DeviceBeat[]; fees: UnpaidFee[] | null; shops: { id: string; name: string; status: string }[]; quotaFull?: string[] },
  today: string,
  now = Date.now(),
): Overview {
  const name = new Map(input.shops.map((s) => [s.id, s]));
  const reasons = new Map<string, Map<string, number>>();
  const add = (firmId: string, reason: string) => {
    if (!name.has(firmId)) return;
    const r = reasons.get(firmId) ?? new Map<string, number>();
    r.set(reason, (r.get(reason) ?? 0) + 1);
    reasons.set(firmId, r);
  };

  let online = 0;
  let neverOpened = 0;
  for (const d of input.devices) {
    // a suspended or departed shop's screens are not "kapalı" news
    const shop = name.get(d.firmId);
    if (!d.lastSeenAt) {
      neverOpened++;
      if (now - Date.parse(d.createdAt) > STALE_DAYS * DAY && shop?.status !== "ayrildi") add(d.firmId, "stale");
      continue;
    }
    const seen = now - Date.parse(d.lastSeenAt);
    if (seen <= ONLINE_WINDOW_MS) online++;
    if (seen > STALE_DAYS * DAY && shop?.status !== "ayrildi") add(d.firmId, "stale");
    if (d.syncStatus === "hata") add(d.firmId, "hata");
  }

  let fees: Overview["fees"] = null;
  if (input.fees) {
    const end = monthEnd(today);
    const due = input.fees.filter((f) => f.dueOn <= end);
    fees = {
      dueThisMonth: due.length,
      amount: Math.round(due.reduce((s, f) => s + (f.amount ?? 0), 0) * 100) / 100,
      withoutAmount: due.filter((f) => f.amount === null).length,
      overdue: due.filter((f) => f.dueOn < today).length,
    };
    for (const f of input.fees) if (f.dueOn < today) add(f.firmId, "vade");
  }
  // photo try-ons refused this month because the quota was used (job 5)
  for (const id of input.quotaFull ?? []) add(id, "kota");

  const words = (r: Map<string, number>): string[] => {
    const out: string[] = [];
    if (r.has("hata")) out.push(`${r.get("hata")} ekranda eşitleme hatası`);
    if (r.has("stale")) out.push(`${r.get("stale")} ekran ${STALE_DAYS} gündür kullanılmıyor`);
    if (r.has("vade")) out.push("Bakım vadesi geçti");
    if (r.has("kota")) out.push("Fotoğraf denemesi kotası doldu");
    return out;
  };
  const attention = [...reasons]
    .map(([firmId, r]) => ({ firmId, name: name.get(firmId)!.name, reasons: words(r) }))
    // sync errors first (a shop that cannot get its content), then by name
    .sort((a, b) => Number(b.reasons[0]?.includes("hata")) - Number(a.reasons[0]?.includes("hata")) || a.name.localeCompare(b.name, "tr"));

  return { devices: { total: input.devices.length, online, offline: input.devices.length - online - neverOpened, neverOpened }, fees, attention };
}
