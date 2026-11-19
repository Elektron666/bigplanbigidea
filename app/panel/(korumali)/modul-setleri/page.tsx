import Link from "next/link";
import { requirePanelUser } from "@/lib/auth/panel";
import { getModuleSets } from "@/lib/modul/store";
import { Badge, PageHeader, buttonClass } from "@/components/panel/ui";

export const metadata = { title: "Modül setleri" };

// The corner set builder's module sets (job 4): one per sofa series, given to shops.
export default async function ModuleSetsPage() {
  await requirePanelUser();
  const sets = await getModuleSets().listSets();
  return (
    <>
      <PageHeader title="Modül setleri" eyebrow={`${sets.length} set`}>
        <Link href="/panel/modul-setleri/yeni" className={buttonClass.primary}>
          Yeni set
        </Link>
      </PageHeader>
      <p className="mb-5 text-[14px] text-antrasit-70">
        Her set bir koltuk serisidir: kol, oturum, köşe, şezlong modülleri; her birinin GLB dosyası, ölçüsü ve metrajı. Set, verildiği mağazaların “Köşe kur” sekmesinde çıkar. Örnek set (koddan çizilen) her
        mağazada ayrıca durur.
      </p>
      {sets.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-cizgi-koyu p-10 text-center text-[15px] text-antrasit-50">Henüz set yok.</p>
      ) : (
        <ul className="divide-y divide-cizgi rounded-2xl border border-cizgi bg-kagit" aria-label="Setler">
          {sets.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <Link href={`/panel/modul-setleri/${x.id}`} className="font-medium hover:underline">
                  {x.name}
                </Link>
                <p className="text-[13px] text-antrasit-50">
                  {x.modules} modül · {x.shops} mağaza · /{x.slug}
                </p>
              </div>
              {!x.isActive && <Badge tone="off">yayında değil</Badge>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
