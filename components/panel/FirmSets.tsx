"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSetAction, saveSetAction } from "@/app/panel/merkez-actions";
import { autoArrange, MAX_SET_PIECES, ROTATIONS, type Rot, type SetPiece, type SofaSet } from "@/lib/takim/takim";
import { PRODUCT_CATEGORY_LABELS, type ProductCategory } from "@/lib/catalogue/products";
import { slugify } from "@/lib/panel/upload";
import { buttonClass, Field, inputClass } from "./ui";

// The shop's sofa sets (job 6): which of its models stand together and where,
// relative to the main piece. "Yerleşimi öner" gives a first arrangement.

export interface SetModel {
  id: string;
  name: string;
  category: ProductCategory | null;
  w: number;
  d: number;
}

type Draft = { id?: string; name: string; slug: string; pieces: SetPiece[]; isActive: boolean };
const empty = (): Draft => ({ name: "", slug: "", pieces: [], isActive: true });

export function FirmSets({ firmId, sets, models, canDelete }: { firmId: string; sets: SofaSet[]; models: SetModel[]; canDelete: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const byId = new Map(models.map((m) => [m.id, m]));
  const toggle = (id: string) =>
    draft &&
    setDraft({ ...draft, pieces: draft.pieces.some((p) => p.modelId === id) ? draft.pieces.filter((p) => p.modelId !== id) : [...draft.pieces, { modelId: id, x: 0, z: 0, rot: 0 }] });
  const arrange = () => {
    if (!draft) return;
    const chosen = draft.pieces.map((p) => byId.get(p.modelId)!).filter(Boolean);
    setDraft({ ...draft, pieces: autoArrange(chosen.map((m) => ({ id: m.id, category: m.category ?? undefined, dimensionsCm: { w: m.w, d: m.d, h: 0 } }))) });
  };
  const setPiece = (i: number, patch: Partial<SetPiece>) => draft && setDraft({ ...draft, pieces: draft.pieces.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  const save = () =>
    start(async () => {
      if (!draft) return;
      const r = await saveSetAction(firmId, { ...draft, slug: draft.slug || slugify(draft.name) }, draft.id);
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      setMsg({ ok: true, text: `“${draft.name}” kaydedildi.` });
      setDraft(null);
      router.refresh();
    });
  const remove = (s: SofaSet) =>
    start(async () => {
      if (!confirm(`“${s.name}” takımı silinsin mi?`)) return;
      const r = await deleteSetAction(firmId, s.id);
      setMsg(r.ok ? { ok: true, text: `“${s.name}” silindi.` } : { ok: false, text: r.error });
      router.refresh();
    });

  return (
    <section aria-labelledby="takimlar" className="mb-8 rounded-2xl border border-cizgi bg-kagit p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="takimlar" className="font-display text-[20px]">
            Takımlar
          </h2>
          <p className="text-[13px] text-antrasit-70">Showroom ekranında tek dokunuşla kurulan takımlar (üçlü, ikili, berjer, puf…). Her parça kendi kumaşını alır.</p>
        </div>
        {!draft && (
          <button type="button" onClick={() => setDraft(empty())} className={buttonClass.secondary}>
            Yeni takım
          </button>
        )}
      </div>
      {sets.length > 0 && (
        <ul className="mb-4 divide-y divide-cizgi rounded-xl border border-cizgi bg-white" aria-label="Kayıtlı takımlar">
          {sets.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-2 text-[14px]">
              <span className="min-w-0 flex-1">
                <strong>{s.name}</strong> · {s.pieces.map((p) => byId.get(p.modelId)?.name ?? "?").join(", ")}
                {!s.isActive && " · gizli"}
              </span>
              <button type="button" className={buttonClass.quiet} onClick={() => setDraft({ id: s.id, name: s.name, slug: s.slug, pieces: s.pieces, isActive: s.isActive })}>
                Düzenle
              </button>
              {canDelete && (
                <button type="button" className={buttonClass.quiet} onClick={() => remove(s)} disabled={pending}>
                  Sil
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {draft && (
        <div className="flex flex-col gap-4 rounded-xl border border-cizgi bg-white p-4" role="group" aria-label="Takım">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Takımın adı">
              <input className={inputClass} value={draft.name} maxLength={60} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </Field>
            <Field label="Bağlantı adı" hint="Boşsa addan yapılır.">
              <input className={inputClass} value={draft.slug} maxLength={42} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder={slugify(draft.name)} />
            </Field>
          </div>
          <fieldset>
            <legend className="mb-2 text-[13px] text-antrasit-70">Parçalar (2–{MAX_SET_PIECES}; ilk seçilen ana parça)</legend>
            <div className="flex flex-wrap gap-2">
              {models.map((m) => (
                <label key={m.id} className="flex min-h-11 items-center gap-2 rounded-full border border-cizgi px-3 text-[14px]">
                  <input type="checkbox" className="h-4 w-4 accent-[#2a2a28]" checked={draft.pieces.some((p) => p.modelId === m.id)} onChange={() => toggle(m.id)} />
                  {m.name}
                  {m.category && <span className="text-antrasit-50">({PRODUCT_CATEGORY_LABELS[m.category]})</span>}
                </label>
              ))}
            </div>
          </fieldset>
          {draft.pieces.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[13px] text-antrasit-70">Yer: ana parçaya göre cm (sağa +x, öne +z); yön derece.</p>
                <button type="button" onClick={arrange} className={buttonClass.quiet}>
                  Yerleşimi öner
                </button>
              </div>
              <table className="w-full text-[14px]">
                <tbody>
                  {draft.pieces.map((p, i) => (
                    <tr key={p.modelId} className="border-t border-cizgi/60">
                      <th scope="row" className="py-1.5 pr-3 text-left font-normal">
                        {byId.get(p.modelId)?.name}
                      </th>
                      <td className="py-1.5 pr-2">
                        <input aria-label={`${byId.get(p.modelId)?.name} x (cm)`} inputMode="numeric" className={`${inputClass} h-10 w-24`} value={p.x} onChange={(e) => setPiece(i, { x: Number(e.target.value) || 0 })} />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input aria-label={`${byId.get(p.modelId)?.name} z (cm)`} inputMode="numeric" className={`${inputClass} h-10 w-24`} value={p.z} onChange={(e) => setPiece(i, { z: Number(e.target.value) || 0 })} />
                      </td>
                      <td className="py-1.5">
                        <select aria-label={`${byId.get(p.modelId)?.name} yön`} className={`${inputClass} h-10 w-24`} value={p.rot} onChange={(e) => setPiece(i, { rot: Number(e.target.value) as Rot })}>
                          {ROTATIONS.map((r) => (
                            <option key={r} value={r}>
                              {r}°
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <label className="flex items-center gap-2 text-[14px]">
            <input type="checkbox" className="h-4 w-4 accent-[#2a2a28]" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
            Ekranda görünsün
          </label>
          <div className="flex gap-3">
            <button type="button" onClick={save} disabled={pending} className={buttonClass.primary}>
              Takımı kaydet
            </button>
            <button type="button" onClick={() => setDraft(null)} className={buttonClass.secondary}>
              Vazgeç
            </button>
          </div>
        </div>
      )}
      {msg && (
        <p role="status" className={`mt-3 text-[13px] ${msg.ok ? "text-[#35523a]" : "text-[#9a3b31]"}`}>
          {msg.text}
        </p>
      )}
    </section>
  );
}
