"use client";

import { useState } from "react";
import type { Fabric } from "@/lib/types";
import { FABRIC_TYPE_LABELS, t } from "@/lib/i18n/tr";
import { IconCheck, IconCopy } from "@/components/ui/icons";
import { propertyLabels } from "@/lib/kumas/ozellik";
import { stockLine, type StockEntry } from "@/lib/kumas/stok";
import type { Alternative } from "@/lib/kumas/muadil";

export function CopyCodeButton({ code, className = "" }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* clipboard unavailable (e.g. insecure context); the code stays selectable */
        }
      }}
      className={`inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 text-xs text-antrasit-70 transition-colors hover:bg-cizgi/60 hover:text-antrasit focus-visible:outline-2 focus-visible:outline-antrasit ${className}`}
      aria-label={copied ? t.copied : `${code} kodunu kopyala`}
    >
      {copied ? <IconCheck width={18} height={18} /> : <IconCopy width={18} height={18} />}
      <span aria-live="polite">{copied ? t.copied : t.copy}</span>
    </button>
  );
}

/** Technical sheet of the selected fabric. Rows without data are omitted. */
export function FabricSpecs({ fabric }: { fabric: Fabric }) {
  const rows: [string, string | undefined][] = [
    [t.type, FABRIC_TYPE_LABELS[fabric.type]],
    [t.composition, fabric.composition],
    [t.martindale, fabric.martindale ? `${fabric.martindale.toLocaleString("tr-TR")} tur` : undefined],
    [t.width, fabric.widthCm ? `${fabric.widthCm} cm` : undefined],
    [
      t.pattern,
      fabric.pattern === "duz" ? "Düz" : fabric.pattern === "desenli" && fabric.patternRepeatCm ? `Desenli, rapor ${fabric.patternRepeatCm.w} × ${fabric.patternRepeatCm.h} cm` : undefined,
    ],
    [t.cutDirection, fabric.cutDirection === "tek" ? "Tek yön" : fabric.cutDirection === "cift" ? "Çift yön" : undefined],
    [t.weight, fabric.weightGsm ? `${fabric.weightGsm} g/m²` : undefined],
    [t.fireRating, fabric.fireRating],
    // only what ORMEN marked "yes"; nothing from the fabric's type
    ["Özellikler", propertyLabels(fabric).join(" · ") || undefined],
  ];
  const visible = rows.filter((r): r is [string, string] => Boolean(r[1]));
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
      {visible.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-antrasit-50">{k}</dt>
          <dd className="text-antrasit">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function FabricHeadline({ fabric, loading }: { fabric: Fabric; loading: boolean }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className="eyebrow">Seçili kumaş</span>
        <span
          className={`h-1 w-1 rounded-full bg-accent transition-opacity duration-300 ${loading ? "animate-pulse opacity-100" : "opacity-0"}`}
          aria-hidden="true"
        />
        {loading && <span className="sr-only">{t.loadingFabric}</span>}
      </div>
      <p className="font-display text-[1.75rem] leading-[1.15] tracking-[0.01em] text-antrasit select-all" translate="no">
        {fabric.code}
      </p>
      <p className="mt-0.5 truncate text-sm text-antrasit-70">
        <span translate="no">{fabric.series}</span> · {fabric.colorName}
      </p>
      {fabric.isPlaceholder && (
        // a stand-in until ORMEN's real photos arrive: never passed off as a product (geniş toplantı, 11 Oct)
        <p className="mt-1 inline-block rounded-full bg-[#F4E9DD] px-2 py-0.5 text-[11.5px] text-ceviz">Örnek kumaş · satışta değil</p>
      )}
    </div>
  );
}

/**
 * Stock of the selected fabric (job 8), on a screen whose shop shows it. Out
 * of stock: the lead time, and the alternatives (ORMEN's "Muadil" list, or
 * "Benzer" ones by type and colour when the list is empty).
 */
export function FabricStock({ entry, alternatives, onSelect }: { entry: StockEntry | undefined; alternatives: Alternative[]; onSelect: (f: Fabric) => void }) {
  const line = stockLine(entry);
  if (!line) return null;
  const out = entry?.status === "yok";
  return (
    <section aria-label="Stok" className={`mt-3 rounded-xl px-3 py-2.5 text-[13px] ${out ? "bg-[#F4E9DD] text-ceviz" : "bg-cizgi/40 text-antrasit-70"}`} data-testid="stok">
      <p>{line}</p>
      {out && alternatives.length > 0 && (
        <div className="mt-2">
          <p className="mb-1.5 text-antrasit-70">{alternatives[0].kind === "muadil" ? "Muadil kumaşlar" : "Benzer kumaşlar (aynı tip ve renk ailesi)"}</p>
          <ul className="flex flex-wrap gap-2">
            {alternatives.map(({ fabric: f, kind }) => (
              <li key={f.code}>
                <button
                  type="button"
                  onClick={() => onSelect(f)}
                  aria-label={`${kind === "muadil" ? "Muadil" : "Benzer"}: ${f.code}, ${f.colorName}`}
                  className="flex min-h-11 items-center gap-2 rounded-full border border-cizgi bg-white py-1 pl-1 pr-3 text-[12px] text-antrasit hover:border-cizgi-koyu focus-visible:outline-2 focus-visible:outline-antrasit"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.texture.thumbUrl} alt="" className="h-8 w-8 rounded-full" />
                  <span translate="no">{f.code}</span>
                  <span className="rounded-full bg-cizgi/60 px-1.5 text-[10.5px] text-antrasit-70">{kind === "muadil" ? "Muadil" : "Benzer"}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
