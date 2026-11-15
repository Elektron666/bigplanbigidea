import Link from "next/link";
import { requirePanelUser } from "@/lib/auth/panel";
import { getRepository } from "@/lib/data";
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABELS, PRODUCT_PAGE_SIZE, parseProductQuery, productQueryHref } from "@/lib/catalogue/products";
import { CatalogueBulk } from "@/components/panel/CatalogueBulk";
import { PageHeader, buttonClass, inputClass } from "@/components/panel/ui";

export const metadata = { title: "Katalog" };

// The central product catalogue: every product once, with how many shops
// have it; search, filter, and the bulk assignment beside it.
export default async function CataloguePage({ searchParams }: PageProps<"/panel/katalog">) {
  // checked here, not only in the layout: a layout check does not stop the page from rendering
  await requirePanelUser();
  const q = parseProductQuery(await searchParams);
  const repo = getRepository();
  const [{ total, rows }, firms] = await Promise.all([repo.listProducts(q), repo.listFirms()]);
  const pages = Math.max(1, Math.ceil(total / PRODUCT_PAGE_SIZE));
  const filtered = !!(q.search || q.owner || q.category || q.manufacturer || q.shop || q.unassigned);

  return (
    <>
      <PageHeader title="Katalog" eyebrow={`${total} ürün`}>
        <Link href="/panel/modeller/yeni" className={buttonClass.primary}>
          Yeni ürün
        </Link>
      </PageHeader>
      <p className="mb-4 text-[14px] text-antrasit-70">
        Bir ürün burada bir kez tanımlanır, istenen mağazalara atanır. Model, ölçü ve metraj merkezde durur; mağaza yalnızca ürünün kendi sayfasında nasıl görüneceğini değiştirir.
      </p>

      <form method="get" action="/panel/katalog" className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto_auto]">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] text-antrasit-70">Ara</span>
          <input name="ara" defaultValue={q.search ?? ""} placeholder="Ürün adı ya da üretici" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] text-antrasit-70">Sahiplik</span>
          <select name="sahip" defaultValue={q.owner ?? ""} className={inputClass}>
            <option value="">Hepsi</option>
            <option value="ortak">Ortak</option>
            <option value="ozel">Mağazaya özel</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] text-antrasit-70">Kategori</span>
          <select name="kategori" defaultValue={q.category ?? ""} className={inputClass}>
            <option value="">Hepsi</option>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {PRODUCT_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] text-antrasit-70">Mağaza</span>
          <select name="magaza" defaultValue={q.shop ?? ""} className={inputClass}>
            <option value="">Hepsi</option>
            {firms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex h-11 items-center gap-2 self-end text-[14px]">
          <input type="checkbox" name="atanmamis" value="1" defaultChecked={q.unassigned} className="h-5 w-5 accent-[#2a2a28]" />
          Atanmamış
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className={buttonClass.primary}>
            Göster
          </button>
          {filtered && (
            <Link href="/panel/katalog" className={buttonClass.quiet}>
              Temizle
            </Link>
          )}
        </div>
      </form>

      <CatalogueBulk key={productQueryHref(q)} products={rows} shops={firms.map((f) => ({ id: f.id, name: f.name, city: null }))} />

      {pages > 1 && (
        <nav aria-label="Sayfalar" className="mt-5 flex items-center justify-between text-[14px] lg:mr-[344px]">
          {q.page > 1 ? (
            <Link href={productQueryHref(q, { page: q.page - 1 })} className={buttonClass.secondary}>
              Önceki
            </Link>
          ) : (
            <span />
          )}
          <span className="text-antrasit-50">
            Sayfa {q.page} / {pages}
          </span>
          {q.page < pages ? (
            <Link href={productQueryHref(q, { page: q.page + 1 })} className={buttonClass.secondary}>
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
