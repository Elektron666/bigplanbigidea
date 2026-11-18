import Link from "next/link";
import { requirePanelUser } from "@/lib/auth/panel";
import { can, ROLE_LABELS } from "@/lib/auth/roles";
import { getCentral } from "@/lib/central/store";
import { getRepository } from "@/lib/data";
import { undoPermission, undoStep } from "@/lib/central/undo";
import { UndoButton } from "@/components/panel/UndoButton";
import { Badge, PageHeader, buttonClass, inputClass } from "@/components/panel/ui";

export const metadata = { title: "Değişiklik günlüğü" };

const PAGE = 50;
const when = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
const ROLE: Record<string, string> = { ...ROLE_LABELS, sistem: "Sistem" };

// Who changed what, when, for which shop or product (job 0). Settings and
// assignments are undone from here; the undo is written to the log too.
export default async function LogPage({ searchParams }: PageProps<"/panel/gunluk">) {
  // checked here, not only in the layout: a layout check does not stop the page from rendering
  const user = await requirePanelUser();
  const sp = await searchParams;
  const firmId = typeof sp.magaza === "string" && /^[0-9a-zA-Z-]{1,40}$/.test(sp.magaza) ? sp.magaza : undefined;
  const page = Math.max(1, Math.min(10_000, Number(sp.sayfa) || 1));
  const [{ total, rows }, firms] = await Promise.all([getCentral().listAudit({ firmId, limit: PAGE, offset: (page - 1) * PAGE, withFees: can(user.role, "abonelik") }), getRepository().listFirms()]);
  const firmName = new Map(firms.map((f) => [f.id, f.name]));
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const href = (p: number) => `/panel/gunluk?${new URLSearchParams({ ...(firmId ? { magaza: firmId } : {}), ...(p > 1 ? { sayfa: String(p) } : {}) })}`;
  return (
    <>
      <PageHeader title="Değişiklik günlüğü" eyebrow={`${total} kayıt`} />
      <form method="get" action="/panel/gunluk" className="mb-5 flex flex-wrap items-end gap-3">
        <label className="flex min-w-64 flex-col gap-1.5 text-[13px] text-antrasit-70">
          Mağaza
          <select name="magaza" defaultValue={firmId ?? ""} className={inputClass}>
            <option value="">Hepsi</option>
            {firms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={buttonClass.primary}>
          Göster
        </button>
      </form>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-cizgi-koyu p-10 text-center text-[15px] text-antrasit-50">Henüz kayıt yok.</p>
      ) : (
        <ul className="divide-y divide-cizgi rounded-2xl border border-cizgi bg-kagit">
          {rows.map((e) => {
            const step = undoStep(e);
            return (
              <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3" data-testid="gunluk-kaydi">
                <div className="min-w-0 flex-1 basis-72">
                  <p className="text-[14px]">{e.summary}</p>
                  <p className="text-[12px] text-antrasit-50">
                    {when.format(new Date(e.at))} · {e.actor} ({ROLE[e.actorRole] ?? e.actorRole}){e.firmId && firmName.get(e.firmId) ? ` · ${firmName.get(e.firmId)}` : ""}
                    {e.batchId ? " · toplu işlem" : ""}
                  </p>
                </div>
                {e.undoneAt ? <Badge tone="off">geri alındı</Badge> : step && can(user.role, undoPermission(step)) ? <UndoButton id={e.id} summary={e.summary} /> : null}
              </li>
            );
          })}
        </ul>
      )}
      {pages > 1 && (
        <nav aria-label="Sayfalar" className="mt-5 flex items-center justify-between text-[14px]">
          {page > 1 ? <Link href={href(page - 1)} className={buttonClass.secondary}>Önceki</Link> : <span />}
          <span className="text-antrasit-50">
            Sayfa {page} / {pages}
          </span>
          {page < pages ? <Link href={href(page + 1)} className={buttonClass.secondary}>Sonraki</Link> : <span />}
        </nav>
      )}
    </>
  );
}
