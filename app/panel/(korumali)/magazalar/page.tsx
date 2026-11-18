import Link from "next/link";
import { requirePanelUser } from "@/lib/auth/panel";
import { can } from "@/lib/auth/roles";
import { getCentral } from "@/lib/central/store";
import { PAGE_SIZE, SHOP_SORTS, SHOP_SORT_LABELS, SHOP_STATUSES, SHOP_STATUS_LABELS, parseShopQuery, shopAlerts, shopQueryHref } from "@/lib/central/shops";
import { ShopStatusControl } from "@/components/panel/ShopStatusControl";
import { Badge, PageHeader, buttonClass, inputClass } from "@/components/panel/ui";
import { PickBox, PickPage, ShopBulkBar, ShopSelection } from "@/components/panel/ShopBulk";
import { getRepository } from "@/lib/data";
import { seriesOf } from "@/lib/fabric/allowed";

export const metadata = { title: "Mağazalar" };

const day = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Istanbul" });
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());

function seen(iso: string | null): string {
  if (!iso) return "hiç açılmadı";
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  return days <= 0 ? "bugün görüldü" : days === 1 ? "dün görüldü" : `${days} gün önce görüldü`;
}

// Every shop on one screen: search, filter, sort, 50 to a page. The numbers
// come from one database call (public.atelier_shops), so the page stays quick
// with a hundred shops.
export default async function ShopsPage({ searchParams }: PageProps<"/panel/magazalar">) {
  // checked here, not only in the layout: a layout check does not stop the page from rendering
  const user = await requirePanelUser();
  const q = parseShopQuery(await searchParams);
  // the maintenance fee is the yönetici's alone; ORMEN elemanı is not sent the date at all
  const fees = can(user.role, "abonelik");
  const bulk = can(user.role, "kurulum");
  const [{ total, rows }, fabrics] = await Promise.all([getCentral().listShops(q, { withFees: fees }), bulk ? getRepository().listFabrics({ includeInactive: true }) : []]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = !!(q.search || q.status || q.city || q.tag);
  const now = today();

  return (
    <>
      <PageHeader title="Mağazalar" eyebrow={`${total} mağaza`}>
        <Link href="/panel/firmalar/yeni" className={buttonClass.primary}>
          Yeni mağaza
        </Link>
      </PageHeader>

      <form method="get" action="/panel/magazalar" className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto]">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] text-antrasit-70">Ara</span>
          <input name="ara" defaultValue={q.search ?? ""} placeholder="Mağaza adı ya da yetkili" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] text-antrasit-70">Durum</span>
          <select name="durum" defaultValue={q.status ?? ""} className={inputClass}>
            <option value="">Hepsi</option>
            {SHOP_STATUSES.map((s) => (
              <option key={s} value={s}>
                {SHOP_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] text-antrasit-70">Şehir</span>
          <input name="sehir" defaultValue={q.city ?? ""} placeholder="Ankara" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] text-antrasit-70">Etiket</span>
          <input name="etiket" defaultValue={q.tag ?? ""} placeholder="siteler" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] text-antrasit-70">Sıra</span>
          <select name="sira" defaultValue={q.sort} className={inputClass}>
            {SHOP_SORTS.filter((s) => fees || s !== "vade").map((s) => (
              <option key={s} value={s}>
                {SHOP_SORT_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className={buttonClass.primary}>
            Göster
          </button>
          {filtered && (
            <Link href="/panel/magazalar" className={buttonClass.quiet}>
              Temizle
            </Link>
          )}
        </div>
      </form>

      <ShopSelection>
        {bulk && rows.length > 0 && (
          <div className="mb-2 px-4">
            <PickPage ids={rows.map((s) => s.id)} />
          </div>
        )}
        {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-cizgi-koyu p-10 text-center text-[15px] text-antrasit-50">
          {filtered ? "Bu aramaya uyan mağaza yok." : "Henüz mağaza yok."}
        </p>
      ) : (
        <ul className="divide-y divide-cizgi rounded-2xl border border-cizgi bg-kagit">
          {rows.map((s) => {
            const alerts = shopAlerts(s, now);
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                {bulk && <PickBox id={s.id} name={s.name} />}
                <div className="min-w-0 flex-1 basis-64">
                  <Link href={`/panel/firmalar/${s.id}`} className="font-medium hover:underline">
                    {s.name}
                  </Link>
                  <span className="block text-[13px] text-antrasit-50">
                    {[s.city, s.package, s.contact, s.installedOn ? `kurulum ${day.format(new Date(s.installedOn))}` : null].filter(Boolean).join(" · ") || `/f/${s.slug}`}
                  </span>
                  <span className="block text-[13px] text-antrasit-50">
                    {s.products ? `${s.products} ürün` : "vitrin modelleri"} · {s.devices ? `${s.devices} ekran, ${seen(s.lastSeen)}` : "ekran yok"}
                    {fees && s.nextDue ? ` · bakım vadesi ${day.format(new Date(s.nextDue))}` : ""}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {s.tags.map((t) => (
                    <Badge key={t}>{t}</Badge>
                  ))}
                  {alerts.map((a) => (
                    <Badge key={a} tone="warn">
                      {a}
                    </Badge>
                  ))}
                  {!s.isActive && <Badge tone="off">sayfası yayında değil</Badge>}
                </div>
                <ShopStatusControl id={s.id} name={s.name} status={s.status} />
              </li>
            );
          })}
        </ul>
      )}
        {bulk && total > 0 && <ShopBulkBar total={total} query={{ search: q.search, status: q.status, city: q.city, tag: q.tag }} series={seriesOf(fabrics)} />}
      </ShopSelection>

      {pages > 1 && (
        <nav aria-label="Sayfalar" className="mt-5 flex items-center justify-between text-[14px]">
          {q.page > 1 ? (
            <Link href={shopQueryHref(q, { page: q.page - 1 })} className={buttonClass.secondary}>
              Önceki
            </Link>
          ) : (
            <span />
          )}
          <span className="text-antrasit-50">
            Sayfa {q.page} / {pages}
          </span>
          {q.page < pages ? (
            <Link href={shopQueryHref(q, { page: q.page + 1 })} className={buttonClass.secondary}>
              Sonraki
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
