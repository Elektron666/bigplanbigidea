"use client";

import { parseNumber } from "@/lib/panel/fabric-form";
import { METERAGE_ZONES, validateMeterage, type MeterageZone, type ModelMeterage } from "@/lib/metraj";
import { ZONE_LABELS } from "@/lib/three/zones";

// The firm's own fabric metres for one piece of this model, as its
// upholsterer knows them. Repeated on the cutter's sheet only for a plain,
// two-way ORMEN fabric of the same width; never calculated by us. The split
// by zone (meeting of 10 Oct) lets the sheet give metres for a piece in more
// than one fabric too.

export interface MeterageDraft {
  metres: string;
  refWidthCm: string;
  zones: Record<MeterageZone, string>;
  extra: { name: string; metres: string }[];
}

const emptyZones = () => Object.fromEntries(METERAGE_ZONES.map((z) => [z, ""])) as Record<MeterageZone, string>;

export const meterageDraft = (m?: ModelMeterage | null): MeterageDraft => ({
  metres: m?.metres.toString() ?? "",
  refWidthCm: m?.refWidthCm.toString() ?? "140",
  zones: { ...emptyZones(), ...Object.fromEntries(Object.entries(m?.zones ?? {}).map(([z, v]) => [z, v.toString()])) },
  extra: (m?.extra ?? []).map((e) => ({ name: e.name, metres: e.metres.toString() })),
});

/** Draft → value for the save action: null when no metres were entered. */
export function meterageValue(d: MeterageDraft): ModelMeterage | null {
  const metres = parseNumber(d.metres);
  if (metres === undefined) return null;
  const zones: ModelMeterage["zones"] = {};
  for (const z of METERAGE_ZONES) {
    const v = d.zones[z].trim() ? (parseNumber(d.zones[z]) ?? NaN) : undefined;
    if (v !== undefined) zones[z] = v;
  }
  // a row left completely empty is no part; a half-filled one is sent as it is, so the check names it
  const extra = d.extra.filter((e) => e.name.trim() || e.metres.trim()).map((e) => ({ name: e.name.trim(), metres: parseNumber(e.metres) ?? NaN }));
  return { metres, refWidthCm: parseNumber(d.refWidthCm) ?? 0, ...(Object.keys(zones).length ? { zones } : {}), ...(extra.length ? { extra } : {}) };
}

const field = "h-11 w-full rounded-lg border border-cizgi bg-white px-3 text-[15px] text-antrasit placeholder:text-antrasit-50 focus:border-antrasit-50 focus:outline-none";

export function MeterageFields({ value, onChange }: { value: MeterageDraft; onChange: (v: MeterageDraft) => void }) {
  const error = validateMeterage(meterageValue(value));
  const noTotal = !value.metres.trim() && METERAGE_ZONES.some((z) => value.zones[z].trim());
  return (
    <fieldset className="mt-5">
      <legend className="mb-1.5 text-[13px] text-antrasit-70">Metraj (teklif ve usta föyü için, isteğe bağlı)</legend>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-[12px] text-antrasit-70">
          Bir adet için kumaş (m)
          <input inputMode="decimal" value={value.metres} onChange={(e) => onChange({ ...value, metres: e.target.value })} placeholder="ör. 8" className={field} aria-invalid={!!error || noTotal} />
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-antrasit-70">
          Hangi kumaş eninde (cm)
          <input inputMode="decimal" value={value.refWidthCm} onChange={(e) => onChange({ ...value, refWidthCm: e.target.value })} className={field} />
        </label>
      </div>
      <p className={`mt-1.5 text-[12px] ${error || noTotal ? "text-[#9a3b31]" : "text-antrasit-50"}`}>
        {error ??
          (noTotal
            ? "Bölge metrajı için önce bir adetin toplam metrajını yazın."
            : "Firmanın ustasının bu model için kullandığı metraj, düz kumaşta. Showroom ekranındaki teklif bu sayıları ve paneldeki fire katsayılarını kullanır; metrajın eninden farklı enli kumaşta sayı vermez. Bilmiyorsanız boş bırakın.")}
      </p>
      <details className="mt-3" open={METERAGE_ZONES.some((z) => value.zones[z].trim())}>
        <summary className="cursor-pointer text-[12.5px] text-antrasit-70">Bölge başına metraj (aynı en)</summary>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {METERAGE_ZONES.map((z) => (
            <label key={z} className="flex flex-col gap-1 text-[12px] text-antrasit-70">
              {ZONE_LABELS[z]} (m)
              <input
                inputMode="decimal"
                aria-label={`${ZONE_LABELS[z]} metrajı`}
                value={value.zones[z]}
                onChange={(e) => onChange({ ...value, zones: { ...value.zones, [z]: e.target.value } })}
                className={field}
              />
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-[12px] text-antrasit-50">
          Müşteri kola, minderlere ayrı kumaş seçtiğinde teklif ve föy bu sayıları toplar. Modelde olmayan bölgeyi boş bırakın.
        </p>
      </details>
      <details className="mt-3" open={value.extra.length > 0}>
        <summary className="cursor-pointer text-[12.5px] text-antrasit-70">Ek parçalar (kırlent, biye…)</summary>
        <div className="mt-2 flex flex-col gap-2">
          {value.extra.map((e, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1fr)_7rem_auto] items-end gap-2">
              <label className="flex flex-col gap-1 text-[12px] text-antrasit-70">
                Parça adı
                <input value={e.name} aria-label={`${i + 1}. ek parçanın adı`} onChange={(ev) => onChange({ ...value, extra: value.extra.map((x, j) => (j === i ? { ...x, name: ev.target.value } : x)) })} placeholder="ör. Kırlent" className={field} />
              </label>
              <label className="flex flex-col gap-1 text-[12px] text-antrasit-70">
                Metraj (m)
                <input inputMode="decimal" aria-label={`${i + 1}. ek parçanın metrajı`} value={e.metres} onChange={(ev) => onChange({ ...value, extra: value.extra.map((x, j) => (j === i ? { ...x, metres: ev.target.value } : x)) })} className={field} />
              </label>
              <button type="button" onClick={() => onChange({ ...value, extra: value.extra.filter((_, j) => j !== i) })} className="h-11 rounded-full px-3 text-[13px] text-antrasit-70 hover:bg-cizgi/60" aria-label={`${i + 1}. ek parçayı kaldır`}>
                Kaldır
              </button>
            </div>
          ))}
          {value.extra.length < 8 && (
            <button type="button" onClick={() => onChange({ ...value, extra: [...value.extra, { name: "", metres: "" }] })} className="h-10 self-start rounded-full border border-cizgi bg-white px-4 text-[13px]">
              + Ek parça
            </button>
          )}
        </div>
        <p className="mt-1.5 text-[12px] text-antrasit-50">Bölgelerin dışında sayılan parçalar. Koltuğun ana kumaşından kesilir, aynı kumaş eninde.</p>
      </details>
    </fieldset>
  );
}
