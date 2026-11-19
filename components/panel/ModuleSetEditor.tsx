"use client";

import { useId, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { saveModuleSetAction } from "@/app/panel/merkez-actions";
import { MODULE_TYPES, MODULE_TYPE_LABELS, type ModuleSet, type ModuleType } from "@/lib/modul/dizilim";
import { setWarnings, validateModuleSet } from "@/lib/modul/set-input";
import { slugify, stamp, uploadFile } from "@/lib/panel/upload";
import { buttonClass, inputClass } from "./ui";

// A module set in the panel (Showroom package, job 4, second part): one sofa
// series as modules (arm, seat, corner, chaise…), each with its GLB file,
// its size, where its neighbours join (optional) and its metres, given to
// shops. ORMEN enters the real sets; nothing here invents a figure.

type Row = {
  key: string;
  type: ModuleType;
  name: string;
  widthCm: string;
  depthCm: string;
  heightCm: string;
  glbUrl: string;
  zones: Record<"govde" | "kol" | "oturak" | "sirt", string>;
  joints: { sx: string; sz: string; gx: string; gz: string };
};

const ZONE_NAMES = { govde: "Kasa", kol: "Kollar", oturak: "Oturak", sirt: "Sırt" } as const;
const s = (n: number | undefined) => (n === undefined || n === null ? "" : String(n).replace(".", ","));

function rowOf(m: ModuleSet["modules"][number]): Row {
  return {
    key: m.id,
    type: m.type,
    name: m.name,
    widthCm: s(m.widthCm),
    depthCm: s(m.depthCm),
    heightCm: s(m.heightCm),
    glbUrl: m.glbUrl ?? "",
    zones: { govde: s(m.metres?.zones?.govde), kol: s(m.metres?.zones?.kol), oturak: s(m.metres?.zones?.oturak), sirt: s(m.metres?.zones?.sirt) },
    joints: { sx: s(m.joints?.sol.x), sz: s(m.joints?.sol.z), gx: s(m.joints?.sag.x), gz: s(m.joints?.sag.z) },
  };
}

const empty = (type: ModuleType = "tekli"): Row => ({
  key: "",
  type,
  name: MODULE_TYPE_LABELS[type],
  widthCm: "",
  depthCm: "",
  heightCm: "",
  glbUrl: "",
  zones: { govde: "", kol: "", oturak: "", sirt: "" },
  joints: { sx: "", sz: "", gx: "", gz: "" },
});

function payload(f: { name: string; slug: string; refWidthCm: string; isActive: boolean; firmIds: string[] }, rows: Row[]) {
  return {
    ...f,
    modules: rows.map((r) => ({
      key: r.key,
      type: r.type,
      name: r.name,
      widthCm: r.widthCm,
      depthCm: r.depthCm,
      heightCm: r.heightCm,
      glbUrl: r.glbUrl,
      metres: { zones: r.zones },
      joints: { sol: { x: r.joints.sx, z: r.joints.sz }, sag: { x: r.joints.gx, z: r.joints.gz } },
    })),
  };
}

/** A label tied to its control by id (so the control's name is the label alone). */
function L({ label, children, className = "" }: { label: string; children: (id: string) => ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1.5 text-[13px] text-antrasit-70 ${className}`}>
      <label htmlFor={id}>{label}</label>
      {children(id)}
    </div>
  );
}

/** A GLB's size as the 3D will show it (width × depth × height, cm), measured in the browser. */
async function measureGlb(url: string): Promise<{ w: number; d: number; h: number }> {
  const [{ GLTFLoader }, { DRACOLoader }, THREE] = await Promise.all([import("three/examples/jsm/loaders/GLTFLoader.js"), import("three/examples/jsm/loaders/DRACOLoader.js"), import("three")]);
  const draco = new DRACOLoader().setDecoderPath("/draco/");
  try {
    const g = await new GLTFLoader().setDRACOLoader(draco).loadAsync(url);
    const size = new THREE.Box3().setFromObject(g.scene).getSize(new THREE.Vector3());
    const cm = (v: number) => Math.round(v * 1000) / 10;
    return { w: cm(size.x), d: cm(size.z), h: cm(size.y) };
  } finally {
    draco.dispose();
  }
}

/** The file's own size next to the one typed; a difference over 1 cm is pointed out (the scene shows the file's). */
function SizeCheck({ size, typed, onTake }: { size: { w: number; d: number; h: number }; typed: { w: number; d: number; h: number }; onTake: () => void }) {
  const off = (["w", "d", "h"] as const).some((k) => !Number.isFinite(typed[k]) || Math.abs(size[k] - typed[k]) > 1);
  const text = `${s(size.w)} × ${s(size.d)} × ${s(size.h)} cm`;
  return (
    <div className={`mt-2 flex flex-wrap items-center gap-3 rounded-lg px-3 py-2 text-[13px] ${off ? "bg-[#F4E9DD] text-ceviz" : "bg-[#E8EFE6] text-[#35523a]"}`} data-testid="modul-olcu">
      <span>
        Dosyadaki ölçü: {text}
        {off ? " · girilen ölçüden farklı. Sahnede dosyanın kendi ölçüsü görünür; şema ve metraj girilen ölçüyle hesaplanır." : " · girilen ölçüyle aynı."}
      </span>
      {off && (
        <button type="button" className={buttonClass.quiet} onClick={onTake}>
          Ölçüleri dosyadan al
        </button>
      )}
    </div>
  );
}

export function ModuleSetEditor({ set, shops }: { set?: ModuleSet & { isActive: boolean; firmIds: string[] }; shops: { id: string; name: string }[] }) {
  const router = useRouter();
  const [f, setF] = useState({ name: set?.name ?? "", slug: set?.slug ?? "", refWidthCm: s(set?.refWidthCm ?? 140), isActive: set?.isActive ?? true, firmIds: set?.firmIds ?? [] });
  const [slugTouched, setSlugTouched] = useState(!!set);
  const [rows, setRows] = useState<Row[]>(() => (set ? set.modules.map(rowOf) : [empty("kol-sol"), empty("tekli"), empty("kose"), empty("kol-sag")]));
  const [shopFilter, setShopFilter] = useState("");
  const [uploading, setUploading] = useState<number | null>(null);
  // the size of each uploaded file, measured in the browser (cm), to compare with what was typed
  const [measured, setMeasured] = useState<Record<number, { w: number; d: number; h: number }>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const checked = validateModuleSet(payload(f, rows), () => true);
  const warnings = checked.ok ? setWarnings(checked.value.modules) : [];
  const needle = shopFilter.trim().toLocaleLowerCase("tr");
  const shownShops = needle ? shops.filter((x) => x.name.toLocaleLowerCase("tr").includes(needle)) : shops;

  const upload = async (i: number, file: File) => {
    setMessage(null);
    if (!/\.glb$/i.test(file.name)) return setMessage({ ok: false, text: "Yalnızca .glb dosyası yüklenir." });
    if (file.size > 30 * 1024 * 1024) return setMessage({ ok: false, text: "Dosya 30 MB'tan büyük; modeli sadeleştirin." });
    setUploading(i);
    try {
      const base = slugify(f.slug || f.name || "set") || "set";
      const url = await uploadFile(`moduller/${base}-${slugify(rows[i].key || rows[i].type)}-${stamp()}.glb`, new File([file], file.name, { type: "model/gltf-binary" }));
      setRow(i, { glbUrl: url });
      const size = await measureGlb(url).catch(() => null);
      if (size) setMeasured((m) => ({ ...m, [i]: size }));
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Dosya yüklenemedi." });
    } finally {
      setUploading(null);
    }
  };

  const save = () =>
    start(async () => {
      setMessage(null);
      const res = await saveModuleSetAction(set?.id ?? null, payload(f, rows));
      if (!res.ok) return setMessage({ ok: false, text: res.error });
      setMessage({ ok: true, text: "Set kaydedildi." });
      if (!set) router.push(`/panel/modul-setleri/${res.id}?kaydedildi=1`);
      router.refresh();
    });

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <section aria-labelledby="set-bilgi" className="rounded-2xl border border-cizgi bg-kagit p-5">
        <h2 id="set-bilgi" className="font-display text-[20px]">
          Set
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <L label="Setin adı" className="lg:col-span-2">
            {(id) => <input id={id} className={inputClass} value={f.name} maxLength={80} onChange={(e) => setF({ ...f, name: e.target.value, slug: slugTouched ? f.slug : slugify(e.target.value) })} />}
          </L>
          <L label="Bağlantı adı">
            {(id) => (
              <input
                id={id}
                className={inputClass}
                value={f.slug}
                maxLength={60}
                onChange={(e) => {
                  setSlugTouched(true);
                  setF({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") });
                }}
              />
            )}
          </L>
          <L label="Metrajların kumaş eni (cm)">
            {(id) => <input id={id} className={inputClass} value={f.refWidthCm} inputMode="decimal" maxLength={6} onChange={(e) => setF({ ...f, refWidthCm: e.target.value })} />}
          </L>
        </div>
        <label className="mt-4 flex min-h-11 items-center gap-2 text-[14px]">
          <input type="checkbox" className="h-5 w-5 accent-antrasit" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} />
          Yayında (kapalıyken mağazalarda görünmez; silinmez)
        </label>
      </section>

      <section aria-labelledby="set-moduller" className="rounded-2xl border border-cizgi bg-kagit p-5">
        <h2 id="set-moduller" className="font-display text-[20px]">
          Modüller
        </h2>
        <p className="mt-1 text-[14px] text-antrasit-70">
          Ölçüler santimetre. Köşe modülü kare olur. Metrajlar bu setin kumaş enindedir; bilinmeyen metraj boş kalır, uydurulmaz. GLB modeli metre biriminde ve önü +z yönüne bakacak şekilde
          hazırlanmalı. Minder ve kırlentin ayrı kumaş alabilmesi için parça adları <code>govde</code>, <code>kol</code>, <code>oturum</code>, <code>sirt-minder</code> ile başlamalı.
        </p>
        <ol className="mt-4 flex flex-col gap-4">
          {rows.map((r, i) => (
            <li key={i} className="rounded-xl border border-cizgi bg-white p-4" aria-label={`${i + 1}. modül`}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <L label="Tip">
                  {(id) => (
                    <select id={id} className={inputClass} value={r.type} onChange={(e) => setRow(i, { type: e.target.value as ModuleType, name: r.name === MODULE_TYPE_LABELS[r.type] ? MODULE_TYPE_LABELS[e.target.value as ModuleType] : r.name })}>
                      {MODULE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {MODULE_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  )}
                </L>
                <L label="Ekranda görünen adı" className="lg:col-span-2">
                  {(id) => <input id={id} className={inputClass} value={r.name} maxLength={60} onChange={(e) => setRow(i, { name: e.target.value })} />}
                </L>
                <L label="Genişlik">{(id) => <input id={id} className={inputClass} value={r.widthCm} inputMode="decimal" maxLength={6} onChange={(e) => setRow(i, { widthCm: e.target.value })} />}</L>
                <L label="Derinlik">{(id) => <input id={id} className={inputClass} value={r.depthCm} inputMode="decimal" maxLength={6} onChange={(e) => setRow(i, { depthCm: e.target.value })} />}</L>
                <L label="Yükseklik">{(id) => <input id={id} className={inputClass} value={r.heightCm} inputMode="decimal" maxLength={6} onChange={(e) => setRow(i, { heightCm: e.target.value })} />}</L>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                {(Object.keys(ZONE_NAMES) as (keyof typeof ZONE_NAMES)[]).map((z) => (
                  <L key={z} label={`${ZONE_NAMES[z]} (m)`}>
                    {(id) => <input id={id} className={inputClass} value={r.zones[z]} inputMode="decimal" maxLength={6} onChange={(e) => setRow(i, { zones: { ...r.zones, [z]: e.target.value } })} />}
                  </L>
                ))}
                <L label="GLB dosyası" className="lg:col-span-2">
                  {(id) => (
                    <div className="flex items-center gap-2">
                      <input id={id} type="file" accept=".glb,model/gltf-binary" className="peer sr-only" disabled={uploading !== null} onChange={(e) => e.target.files?.[0] && upload(i, e.target.files[0])} />
                      <label htmlFor={id} className={`${buttonClass.secondary} cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-antrasit`}>
                        {r.glbUrl ? "Dosyayı değiştir" : "Dosya seç"}
                      </label>
                    </div>
                  )}
                </L>
              </div>
              <p className="mt-2 text-[13px] text-antrasit-50" data-testid="modul-glb">
                {uploading === i ? "Yükleniyor…" : r.glbUrl ? `Dosya: ${decodeURIComponent(r.glbUrl.split("/").pop() ?? "")}` : "GLB yüklenmedi."}
              </p>
              {measured[i] && (
                <SizeCheck
                  size={measured[i]}
                  typed={{ w: Number(r.widthCm.replace(",", ".")), d: Number(r.depthCm.replace(",", ".")), h: Number(r.heightCm.replace(",", ".")) }}
                  onTake={() => setRow(i, { widthCm: s(measured[i].w), depthCm: s(measured[i].d), heightCm: s(measured[i].h) })}
                />
              )}
              <details className="mt-2">
                <summary className="min-h-11 cursor-pointer py-2 text-[14px] text-antrasit-70">Bağlantı noktaları (isteğe bağlı)</summary>
                <p className="text-[13px] text-antrasit-50">
                  GLB&apos;nin kendi koordinatlarında, üstten bakışla cm (x: soldan sağa, z: arkadan öne). Düz modülde arka-sol ve arka-sağ köşe; köşe modülünde ön-sol ve arka-sağ köşe. Boşsa modelin kutusundan alınır.
                </p>
                <div className="mt-2 grid gap-3 sm:grid-cols-4">
                  <L label="Sol x">{(id) => <input id={id} className={inputClass} value={r.joints.sx} inputMode="decimal" onChange={(e) => setRow(i, { joints: { ...r.joints, sx: e.target.value } })} />}</L>
                  <L label="Sol z">{(id) => <input id={id} className={inputClass} value={r.joints.sz} inputMode="decimal" onChange={(e) => setRow(i, { joints: { ...r.joints, sz: e.target.value } })} />}</L>
                  <L label="Sağ x">{(id) => <input id={id} className={inputClass} value={r.joints.gx} inputMode="decimal" onChange={(e) => setRow(i, { joints: { ...r.joints, gx: e.target.value } })} />}</L>
                  <L label="Sağ z">{(id) => <input id={id} className={inputClass} value={r.joints.gz} inputMode="decimal" onChange={(e) => setRow(i, { joints: { ...r.joints, gz: e.target.value } })} />}</L>
                </div>
              </details>
              <button type="button" className={`${buttonClass.quiet} mt-2`} onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>
                Modülü çıkar
              </button>
            </li>
          ))}
        </ol>
        <button type="button" className={`${buttonClass.secondary} mt-4`} onClick={() => setRows((rs) => [...rs, empty()])}>
          + Modül ekle
        </button>
      </section>

      <section aria-labelledby="set-magazalar" className="rounded-2xl border border-cizgi bg-kagit p-5">
        <h2 id="set-magazalar" className="font-display text-[20px]">
          Mağazalar
        </h2>
        <p className="mt-1 text-[14px] text-antrasit-70">Set, işaretli mağazaların “Köşe kur” sekmesinde çıkar ({f.firmIds.length} mağaza).</p>
        <input value={shopFilter} onChange={(e) => setShopFilter(e.target.value)} placeholder="Mağaza ara" aria-label="Mağaza ara" className={`${inputClass} mt-3 max-w-md`} />
        <ul className="mt-3 grid max-h-72 gap-1 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3" aria-label="Mağaza listesi">
          {shownShops.map((x) => (
            <li key={x.id}>
              <label className="flex min-h-11 items-center gap-2 text-[14px]">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-antrasit"
                  checked={f.firmIds.includes(x.id)}
                  onChange={(e) => setF({ ...f, firmIds: e.target.checked ? [...f.firmIds, x.id] : f.firmIds.filter((id) => id !== x.id) })}
                />
                {x.name}
              </label>
            </li>
          ))}
        </ul>
      </section>

      {(warnings.length > 0 || !checked.ok) && (
        <ul className="flex flex-col gap-1 rounded-xl bg-[#F4E9DD] px-4 py-3 text-[14px] text-ceviz" aria-label="Eksikler">
          {!checked.ok && <li>{checked.error}</li>}
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending || uploading !== null} className={buttonClass.primary}>
          Seti kaydet
        </button>
        {message && (
          <p role={message.ok ? "status" : "alert"} className={`text-[14px] ${message.ok ? "text-[#35523a]" : "text-[#9a3b31]"}`}>
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}
