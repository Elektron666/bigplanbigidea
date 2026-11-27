"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveShopProductAction, setShopGroupPricesAction, setShopPriceAction } from "@/app/magaza/actions";
import { SHOP_PRODUCT_LIMITS } from "@/lib/catalogue/shop-products";
import type { ShopProductRow } from "@/lib/magaza/store";
import { Badge, Field, buttonClass, inputClass } from "@/components/panel/ui";

const priceText = (p: number | null) => (p === null ? "" : p.toLocaleString("tr-TR", { maximumFractionDigits: 2 }));

// One product as the shop shows it. Read-only in ORMEN's support view.
export function ShopProductEditor({ row, groups = [], readOnly }: { row: ShopProductRow; groups?: string[]; readOnly: boolean }) {
  const router = useRouter();
  const [f, setF] = useState({ displayName: row.displayName ?? "", productCode: row.productCode ?? "", description: row.description ?? "", featured: row.featured, hidden: row.hidden, price: priceText(row.price) });
  const groupText = () => Object.fromEntries(groups.map((g) => [g, priceText(row.groupPrices[g] ?? null)]));
  const [gp, setGp] = useState<Record<string, string>>(groupText);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const title = row.displayName ?? row.centralName;
  const save = () =>
    start(async () => {
      setMessage(null);
      const a = await saveShopProductAction(row.modelId, { displayName: f.displayName, productCode: f.productCode, description: f.description, featured: f.featured, hidden: f.hidden });
      if (!a.ok) return setMessage({ ok: false, text: a.error });
      if (f.price !== priceText(row.price)) {
        const b = await setShopPriceAction(row.modelId, f.price);
        if (!b.ok) return setMessage({ ok: false, text: b.error });
      }
      const was = groupText();
      const changed = Object.fromEntries(Object.entries(gp).filter(([g, v]) => v !== was[g]));
      if (Object.keys(changed).length) {
        const c = await setShopGroupPricesAction(row.modelId, changed);
        if (!c.ok) return setMessage({ ok: false, text: c.error });
      }
      setMessage({ ok: true, text: "Kaydedildi." });
      router.refresh();
    });

  return (
    <li className="rounded-2xl border border-cizgi bg-kagit p-5" aria-label={title}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-[20px]">{title}</h2>
        <div className="flex gap-1.5">
          {row.featured && <Badge>vitrinde öne çıkar</Badge>}
          {row.hidden && <Badge tone="off">gizli</Badge>}
        </div>
      </div>
      <p className="text-[13px] text-antrasit-50">
        ORMEN&apos;deki adı: {row.centralName} · {row.size}
      </p>
      <form
        className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <fieldset disabled={readOnly || pending} className="contents">
          <Field label="Mağazadaki adı" hint="Boşsa ORMEN'deki adı görünür.">
            <input className={inputClass} value={f.displayName} maxLength={SHOP_PRODUCT_LIMITS.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} />
          </Field>
          <Field label="Ürün kodu">
            <input className={inputClass} value={f.productCode} maxLength={SHOP_PRODUCT_LIMITS.productCode} onChange={(e) => setF({ ...f, productCode: e.target.value })} />
          </Field>
          <Field label="Satış fiyatı (TL)" hint="Yalnızca siz ve ORMEN yöneticisi görür.">
            <input className={inputClass} value={f.price} inputMode="decimal" maxLength={14} onChange={(e) => setF({ ...f, price: e.target.value })} />
          </Field>
          {groups.length > 0 && (
            <fieldset className="grid gap-3 sm:col-span-2 sm:grid-cols-3 lg:col-span-4 lg:grid-cols-6">
              <legend className="mb-1 text-[13px] text-antrasit-70">Kumaş grubuna göre fiyat (TL). Boş bırakılan grupta yukarıdaki satış fiyatı geçer.</legend>
              {groups.map((g) => (
                <Field key={g} label={`${g} grubu`}>
                  <input className={inputClass} value={gp[g] ?? ""} inputMode="decimal" maxLength={14} onChange={(e) => setGp({ ...gp, [g]: e.target.value })} />
                </Field>
              ))}
            </fieldset>
          )}
          <Field label="Açıklama">
            <input className={inputClass} value={f.description} maxLength={SHOP_PRODUCT_LIMITS.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </Field>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 sm:col-span-2 lg:col-span-4">
            <label className="flex min-h-11 items-center gap-2 text-[14px]">
              <input type="checkbox" className="h-5 w-5 accent-antrasit" checked={f.featured} onChange={(e) => setF({ ...f, featured: e.target.checked })} />
              Vitrinde öne çıkar
            </label>
            <label className="flex min-h-11 items-center gap-2 text-[14px]">
              <input type="checkbox" className="h-5 w-5 accent-antrasit" checked={f.hidden} onChange={(e) => setF({ ...f, hidden: e.target.checked })} />
              Mağazada gizle
            </label>
            {!readOnly && (
              <button type="submit" className={buttonClass.primary}>
                Kaydet
              </button>
            )}
            {message && (
              <p role={message.ok ? "status" : "alert"} className={`text-[13px] ${message.ok ? "text-[#35523a]" : "text-[#9a3b31]"}`}>
                {message.text}
              </p>
            )}
          </div>
        </fieldset>
      </form>
    </li>
  );
}
