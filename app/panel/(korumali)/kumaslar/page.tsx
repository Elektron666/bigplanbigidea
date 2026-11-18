import { requirePanelUser } from "@/lib/auth/panel";
import Link from "next/link";
import { getRepository } from "@/lib/data";
import { FABRIC_TYPE_LABELS, codeUpper } from "@/lib/i18n/tr";
import { ActiveToggle } from "@/components/panel/ActiveToggle";
import { HidePlaceholders } from "@/components/panel/HidePlaceholders";
import { Badge, PageHeader, buttonClass } from "@/components/panel/ui";

export const metadata = { title: "Kumaşlar" };

export default async function FabricsPage({ searchParams }: PageProps<"/panel/kumaslar">) {
  // checked here, not only in the layout: a layout check does not stop the page from rendering
  await requirePanelUser();
  const sp = await searchParams;
  const saved = typeof sp.kaydedildi === "string" ? codeUpper(sp.kaydedildi) : null;
  const imported = typeof sp.aktarildi === "string" ? Number(sp.aktarildi) : null;
  const repo = getRepository();
  const [fabrics, firms] = await Promise.all([repo.listFabrics({ includeInactive: true }), repo.listFirms()]);
  const placeholders = fabrics.filter((f) => f.isPlaceholder).length;
  const livePlaceholders = fabrics.filter((f) => f.isPlaceholder && f.isActive).length;

  return (
    <>
      <PageHeader title="Kumaşlar" eyebrow={`${fabrics.length} kumaş · ${fabrics.filter((f) => f.isActive).length} yayında`}>
        <Link href="/panel/kumaslar/toplu" className={buttonClass.secondary}>
          Toplu ekle (CSV)
        </Link>
        <Link href="/panel/kumaslar/yeni" className={buttonClass.primary}>
          Yeni kumaş
        </Link>
      </PageHeader>

      {saved && (
        <p role="status" className="mb-4 rounded-xl bg-[#E8EFE6] px-4 py-3 text-[14px] text-[#35523a]">
          {saved} kaydedildi. Konfigüratörde hemen görünür.
        </p>
      )}
      {imported !== null && Number.isFinite(imported) && (
        <p role="status" className="mb-4 rounded-xl bg-[#E8EFE6] px-4 py-3 text-[14px] text-[#35523a]">
          {imported} kumaş aktarıldı.
        </p>
      )}
      {placeholders > 0 && (
        <div className="mb-4 rounded-xl bg-[#F4E9DD] px-4 py-3 text-[14px] text-ceviz">
          {placeholders} kumaş hâlâ <strong>yer tutucu</strong>: görselleri bilgisayarda üretilmiş örneklerdir. Gerçek kumaş fotoğrafını yükleyince bu
          işaret kalkar.
          {livePlaceholders > 0 && <HidePlaceholders count={livePlaceholders} />}
        </div>
      )}

      {/* Swatch card labels (job 2): tick fabrics, print their QR labels on a new page */}
      <form id="kartela" method="get" action="/panel/kartela" target="_blank" className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-cizgi bg-kagit px-4 py-3">
        <div className="min-w-0 flex-1 basis-64">
          <p className="font-medium">Kartela etiketi</p>
          <p className="text-[13px] text-antrasit-70">Aşağıdan kumaşları işaretleyin. Etiketteki QR showroom ekranına tutulunca koltuk o kumaşa geçer; telefonla okutulunca sayfa o kumaşla açılır.</p>
        </div>
        <label className="flex flex-col gap-1.5 text-[13px] text-antrasit-70">
          Telefonla okutulunca açılacak sayfa
          <select name="magaza" defaultValue="" className="h-11 rounded-lg border border-cizgi bg-white px-3 text-[15px] text-antrasit">
            <option value="">ORMEN sayfası</option>
            {firms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={buttonClass.secondary}>
          Seçilenlerin etiketini aç
        </button>
      </form>

      <ul className="divide-y divide-cizgi rounded-2xl border border-cizgi bg-kagit">
        {fabrics.map((f) => (
          <li key={f.id} className="flex items-center gap-4 px-4 py-3">
            <input type="checkbox" form="kartela" name="kod" value={f.code} aria-label={`${f.code}: kartela etiketi`} className="h-5 w-5 shrink-0 accent-[#2a2a28]" />
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny thumbnails from our own storage */}
            <img src={f.texture.thumbUrl} alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-lg border border-cizgi object-cover" />
            <Link href={`/panel/kumaslar/${f.id}`} className="min-w-0 flex-1 hover:underline">
              <span className="block font-medium tracking-wide">{f.code}</span>
              <span className="block truncate text-[13px] text-antrasit-50">
                {f.series} · {f.colorName} · {FABRIC_TYPE_LABELS[f.type]}
              </span>
            </Link>
            <span className="hidden gap-1.5 sm:flex">
              {f.isPlaceholder && <Badge tone="warn">yer tutucu</Badge>}
              {!f.isActive && <Badge tone="off">gizli</Badge>}
            </span>
            <ActiveToggle id={f.id} active={f.isActive} label={f.code} />
          </li>
        ))}
      </ul>
    </>
  );
}
