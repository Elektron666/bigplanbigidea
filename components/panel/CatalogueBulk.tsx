"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { bulkAssignAction } from "@/app/panel/merkez-actions";
import { PRODUCT_CATEGORY_LABELS, type ProductRow } from "@/lib/catalogue/products";
import { Badge, buttonClass, inputClass } from "./ui";

// The catalogue page's list and the bulk action: tick products, tick shops,
// add or take away in one step.
export function CatalogueBulk({ products, shops }: { products: ProductRow[]; shops: { id: string; name: string; city: string | null }[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [targets, setTargets] = useState<Set<string>>(new Set());
  const [shopFilter, setShopFilter] = useState("");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };
  const needle = shopFilter.trim().toLocaleLowerCase("tr");
  const shownShops = needle ? shops.filter((s) => s.name.toLocaleLowerCase("tr").includes(needle) || (s.city ?? "").toLocaleLowerCase("tr").includes(needle)) : shops;
  const allPicked = products.length > 0 && products.every((p) => picked.has(p.id));

  const run = (mode: "ekle" | "cikar") =>
    start(async () => {
      setMessage(null);
      const res = await bulkAssignAction(mode, [...picked], [...targets]);
      if (!res.ok) return setMessage({ ok: false, text: res.error });
      setMessage({ ok: true, text: mode === "ekle" ? `${res.changed} atama eklendi.` : `${res.changed} atama çıkarıldı.` });
      setPicked(new Set());
      router.refresh();
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        {products.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-cizgi-koyu p-10 text-center text-[15px] text-antrasit-50">Bu aramaya uyan ürün yok.</p>
        ) : (
          <>
            <label className="mb-2 flex h-11 w-fit cursor-pointer items-center gap-3 px-4 text-[14px] text-antrasit-70">
              <input type="checkbox" checked={allPicked} onChange={() => setPicked(allPicked ? new Set() : new Set(products.map((p) => p.id)))} className="h-5 w-5 accent-[#2a2a28]" />
              Bu sayfadakilerin hepsini seç
            </label>
            <ul className="divide-y divide-cizgi rounded-2xl border border-cizgi bg-kagit">
              {products.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                  <input type="checkbox" checked={picked.has(p.id)} onChange={() => setPicked(toggle(picked, p.id))} aria-label={`${p.name}: seç`} className="h-5 w-5 shrink-0 accent-[#2a2a28]" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/panel/modeller/${p.id}`} className="font-medium hover:underline">
                      {p.name}
                    </Link>
                    <span className="block text-[13px] text-antrasit-50">
                      {[p.manufacturer, p.category ? PRODUCT_CATEGORY_LABELS[p.category] : null, `${p.widthCm} × ${p.depthCm} × ${p.heightCm} cm`].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  {!p.isActive && <Badge tone="off">yayında değil</Badge>}
                  {p.firmId ? <Badge tone="warn">mağazaya özel · {p.ownerName ?? "?"}</Badge> : p.shops ? <Badge>{p.shops} mağazada</Badge> : <Badge tone="off">atanmamış</Badge>}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <aside aria-labelledby="toplu-atama" className="h-fit rounded-2xl border border-cizgi bg-kagit p-5 lg:sticky lg:top-24">
        <h2 id="toplu-atama" className="font-display text-[20px]">
          Toplu atama
        </h2>
        <p className="mt-1 text-[13px] text-antrasit-70">
          Soldan ürünleri, buradan mağazaları işaretleyin. Mağazanın ürüne verdiği ad değişmez. Mağazaya özel ürün başka mağazaya atanamaz.
        </p>
        <input value={shopFilter} onChange={(e) => setShopFilter(e.target.value)} placeholder="Mağaza ara" aria-label="Mağaza ara" className={`${inputClass} mt-3`} />
        <ul className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-cizgi bg-white">
          {shownShops.map((s) => (
            <li key={s.id}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 text-[14px]">
                <input type="checkbox" checked={targets.has(s.id)} onChange={() => setTargets(toggle(targets, s.id))} className="h-5 w-5 shrink-0 accent-[#2a2a28]" />
                <span className="min-w-0 flex-1 truncate">{s.name}</span>
                {s.city && <span className="text-[12px] text-antrasit-50">{s.city}</span>}
              </label>
            </li>
          ))}
          {shownShops.length === 0 && <li className="px-3 py-3 text-[13px] text-antrasit-50">Mağaza bulunamadı.</li>}
        </ul>
        <button type="button" onClick={() => setTargets(targets.size === shownShops.length && shownShops.length > 0 ? new Set() : new Set(shownShops.map((s) => s.id)))} className={`${buttonClass.quiet} mt-1`}>
          {targets.size === shownShops.length && shownShops.length > 0 ? "Seçimi kaldır" : "Listedekilerin hepsini seç"}
        </button>
        <p className="mt-3 text-[13px] text-antrasit-70" role="status">
          {picked.size} ürün, {targets.size} mağaza seçili.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" disabled={pending || !picked.size || !targets.size} onClick={() => run("ekle")} className={buttonClass.primary}>
            Mağazalara ekle
          </button>
          <button type="button" disabled={pending || !picked.size || !targets.size} onClick={() => run("cikar")} className={buttonClass.secondary}>
            Çıkar
          </button>
        </div>
        {message && (
          <p role={message.ok ? "status" : "alert"} className={`mt-3 text-[13px] ${message.ok ? "text-[#35523a]" : "text-[#9a3b31]"}`}>
            {message.text}
          </p>
        )}
      </aside>
    </div>
  );
}
