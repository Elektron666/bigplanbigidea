"use client";

import { useState, useTransition } from "react";
import { saveShopProductAction } from "@/app/panel/merkez-actions";
import { SHOP_PRODUCT_LIMITS, type ShopProduct } from "@/lib/catalogue/shop-products";
import { Badge, buttonClass, inputClass } from "./ui";

type Row = ShopProduct & { centralName: string; size: string };

// How this shop shows the shared products it was given. The model, its sizes
// and its metres come from the centre and are not edited here.
export function ShopProducts({ firmId, rows }: { firmId: string; rows: Row[] }) {
  if (!rows.length) return null;
  return (
    <section aria-labelledby="magaza-urunleri" className="mb-8 rounded-2xl border border-cizgi bg-kagit p-5">
      <h2 id="magaza-urunleri" className="font-display text-[20px]">
        Bu mağazada nasıl görünsün
      </h2>
      <p className="mt-1 text-[14px] text-antrasit-70">
        Ortak ürünlere mağazanın kendi adını ve kodunu verin. Model, ölçü ve metraj merkezden gelir; burada değişmez. Boş bırakılan alanda merkezdeki ad görünür.
      </p>
      <ul className="mt-4 divide-y divide-cizgi">
        {rows.map((r) => (
          <ProductRow key={r.modelId} firmId={firmId} row={r} />
        ))}
      </ul>
    </section>
  );
}

function ProductRow({ firmId, row }: { firmId: string; row: Row }) {
  const [name, setName] = useState(row.displayName ?? "");
  const [code, setCode] = useState(row.productCode ?? "");
  const [note, setNote] = useState(row.description ?? "");
  const [featured, setFeatured] = useState(row.featured);
  const [hidden, setHidden] = useState(row.hidden);
  const [pending, start] = useTransition();
  const [state, setState] = useState<{ ok: boolean; text: string } | null>(null);
  const touch = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setState(null);
  };
  const save = () =>
    start(async () => {
      const res = await saveShopProductAction(firmId, row.modelId, { displayName: name, productCode: code, description: note, featured, hidden });
      setState(res.ok ? { ok: true, text: "Kaydedildi." } : { ok: false, text: res.error });
    });
  const id = `urun-${row.modelId}`;
  return (
    <li className="grid gap-3 py-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,1.6fr)_auto] md:items-end">
      <div className="min-w-0">
        <p className="font-medium">{row.centralName}</p>
        <p className="text-[13px] text-antrasit-50">{row.size}</p>
        <p className="mt-1 flex gap-1.5">
          {hidden && <Badge tone="off">gizli</Badge>}
          {featured && !hidden && <Badge>öne çıkan</Badge>}
        </p>
      </div>
      <label className="flex flex-col gap-1.5" htmlFor={`${id}-ad`}>
        <span className="text-[13px] text-antrasit-70">Mağazadaki adı</span>
        <input id={`${id}-ad`} value={name} onChange={(e) => touch(setName)(e.target.value)} maxLength={SHOP_PRODUCT_LIMITS.displayName} placeholder={row.centralName} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1.5" htmlFor={`${id}-kod`}>
        <span className="text-[13px] text-antrasit-70">Ürün kodu</span>
        <input id={`${id}-kod`} value={code} onChange={(e) => touch(setCode)(e.target.value)} maxLength={SHOP_PRODUCT_LIMITS.productCode} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1.5" htmlFor={`${id}-not`}>
        <span className="text-[13px] text-antrasit-70">Açıklama</span>
        <input id={`${id}-not`} value={note} onChange={(e) => touch(setNote)(e.target.value)} maxLength={SHOP_PRODUCT_LIMITS.description} className={inputClass} />
      </label>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 md:justify-end">
        <label className="flex h-11 items-center gap-2 text-[14px]">
          <input type="checkbox" checked={featured} onChange={(e) => touch(setFeatured)(e.target.checked)} className="h-5 w-5 accent-[#2a2a28]" />
          Öne çıkar
        </label>
        <label className="flex h-11 items-center gap-2 text-[14px]">
          <input type="checkbox" checked={hidden} onChange={(e) => touch(setHidden)(e.target.checked)} className="h-5 w-5 accent-[#2a2a28]" />
          Gizle
        </label>
        <button type="button" onClick={save} disabled={pending} className={buttonClass.secondary} aria-label={`${row.centralName}: kaydet`}>
          {pending ? "Kaydediliyor" : "Kaydet"}
        </button>
      </div>
      {state && (
        <p role={state.ok ? "status" : "alert"} className={`text-[13px] md:col-span-5 ${state.ok ? "text-[#35523a]" : "text-[#9a3b31]"}`}>
          {state.text}
        </p>
      )}
    </li>
  );
}
