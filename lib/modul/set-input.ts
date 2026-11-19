// What the panel sends for a module set, and how it is checked (Showroom
// package, job 4, second part). Pure. Nothing is guessed: a module without
// metres is saved without them (its sets then give no metres, the quote says
// so); a size of 0 or a joint left half-filled is refused.

import { MODULE_TYPES, type Joints, type Module, type ModuleMetres, type ModuleType } from "./dizilim";

export const MAX_SET_MODULES = 20;
const ZONES = ["govde", "kol", "oturak", "sirt"] as const;

export interface ModuleSetInput {
  name: string;
  slug: string;
  refWidthCm: number;
  isActive: boolean;
  firmIds: string[];
  modules: Module[];
}

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
/** "65", "65,5", 65 → 65.5; empty → null; anything else → NaN. */
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).trim().replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};

function sizeOf(v: unknown, label: string, max: number): number | string {
  const n = num(v);
  if (n === null || Number.isNaN(n) || n <= 0 || n > max) return `${label} 0'dan büyük ve en çok ${max} cm olmalı.`;
  return Math.round(n * 10) / 10;
}

function metresOf(raw: unknown, where: string): ModuleMetres | undefined | string {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const zr = (r.zones && typeof r.zones === "object" ? r.zones : {}) as Record<string, unknown>;
  const zones: ModuleMetres["zones"] = {};
  for (const z of ZONES) {
    const n = num(zr[z]);
    if (n === null) continue;
    if (Number.isNaN(n) || n < 0 || n > 50) return `${where}: metraj 0–50 m arasında bir sayı olmalı.`;
    zones[z] = Math.round(n * 100) / 100;
  }
  const extra: { name: string; metres: number }[] = [];
  for (const e of (Array.isArray(r.extra) ? r.extra : []).slice(0, 4) as Record<string, unknown>[]) {
    const name = text(e?.name, 30);
    const n = num(e?.metres);
    if (!name && n === null) continue;
    if (!name || n === null || Number.isNaN(n) || n < 0 || n > 50) return `${where}: ek parçanın adını ve 0–50 m metrajını yazın.`;
    extra.push({ name, metres: Math.round(n * 100) / 100 });
  }
  if (!Object.keys(zones).length && !extra.length) return undefined;
  return { ...(Object.keys(zones).length ? { zones } : {}), ...(extra.length ? { extra } : {}) };
}

function jointsOf(raw: unknown, where: string): Joints | undefined | string {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, Record<string, unknown> | undefined>;
  const vals = [r.sol?.x, r.sol?.z, r.sag?.x, r.sag?.z].map(num);
  if (vals.every((v) => v === null)) return undefined;
  if (vals.some((v) => v === null || Number.isNaN(v) || Math.abs(v!) > 1000)) return `${where}: bağlantı noktalarının dört sayısını da yazın ya da hepsini boş bırakın.`;
  const [sx, sz, gx, gz] = vals as number[];
  if (sx === gx && sz === gz) return `${where}: sol ve sağ bağlantı noktası aynı yerde olamaz.`;
  return { sol: { x: sx, z: sz }, sag: { x: gx, z: gz } };
}

export function validateModuleSet(raw: unknown, ownUrl: (u: string) => boolean): { ok: true; value: ModuleSetInput } | { ok: false; error: string } {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const name = text(r.name, 80);
  if (name.length < 2) return { ok: false, error: "Sete bir ad verin." };
  const slug = text(r.slug, 60);
  if (!/^[a-z0-9-]{2,60}$/.test(slug) || slug === "ornek-set") return { ok: false, error: "Bağlantı adı küçük harf, rakam ve tireden oluşmalı (en az 2)." };
  const ref = num(r.refWidthCm ?? 140);
  if (ref === null || Number.isNaN(ref) || ref <= 0 || ref > 400) return { ok: false, error: "Kumaş eni geçerli bir sayı olmalı." };
  const list = Array.isArray(r.modules) ? (r.modules as Record<string, unknown>[]) : [];
  if (!list.length) return { ok: false, error: "Sete en az bir modül ekleyin." };
  if (list.length > MAX_SET_MODULES) return { ok: false, error: `Bir sette en çok ${MAX_SET_MODULES} modül olur.` };
  const modules: Module[] = [];
  for (const [i, m] of list.entries()) {
    const where = `${i + 1}. modül`;
    const type = m?.type as ModuleType;
    if (!(MODULE_TYPES as readonly string[]).includes(type)) return { ok: false, error: `${where}: tipini seçin.` };
    const key = text(m.key, 40) || `${type}-${i + 1}`;
    if (!/^[a-z0-9-]{1,40}$/.test(key)) return { ok: false, error: `${where}: kısa adı küçük harf, rakam ve tireden oluşmalı.` };
    if (modules.some((x) => x.id === key)) return { ok: false, error: `${where}: “${key}” kısa adı iki kez kullanılmış.` };
    const mname = text(m.name, 60);
    if (!mname) return { ok: false, error: `${where}: adını yazın.` };
    const w = sizeOf(m.widthCm, `${where}: genişlik`, 400);
    const d = sizeOf(m.depthCm, `${where}: derinlik`, 400);
    const h = sizeOf(m.heightCm, `${where}: yükseklik`, 200);
    for (const x of [w, d, h]) if (typeof x === "string") return { ok: false, error: x };
    if (type === "kose" && w !== d) return { ok: false, error: `${where}: köşe modülü kare olmalı (genişlik = derinlik).` };
    const glb = text(m.glbUrl, 500);
    if (glb && !ownUrl(glb)) return { ok: false, error: `${where}: GLB dosyası yüklenmedi.` };
    const metres = metresOf(m.metres, where);
    if (typeof metres === "string") return { ok: false, error: metres };
    const joints = jointsOf(m.joints, where);
    if (typeof joints === "string") return { ok: false, error: joints };
    modules.push({
      id: key,
      type,
      name: mname,
      widthCm: w as number,
      depthCm: d as number,
      heightCm: h as number,
      ...(glb ? { glbUrl: glb } : {}),
      ...(metres ? { metres } : {}),
      ...(joints ? { joints } : {}),
    });
  }
  const firmIds = [...new Set((Array.isArray(r.firmIds) ? r.firmIds : []).filter((x): x is string => typeof x === "string" && /^[0-9a-zA-Z-]{1,40}$/.test(x)))].slice(0, 500);
  return { ok: true, value: { name, slug, refWidthCm: Math.round(ref * 10) / 10, isActive: r.isActive !== false, firmIds, modules } };
}

/** What a set still lacks before a shop can use it well (shown in the panel; saving is not refused). */
export function setWarnings(modules: Module[]): string[] {
  const out: string[] = [];
  const has = (t: ModuleType) => modules.some((m) => m.type === t);
  if (!has("tekli")) out.push("Tekli oturum modülü yok.");
  if (!has("kol-sol") && !has("sezlong-sol")) out.push("Sol uç (sol kol ya da sol şezlong) yok.");
  if (!has("kol-sag") && !has("sezlong-sag")) out.push("Sağ uç (sağ kol ya da sağ şezlong) yok.");
  const noGlb = modules.filter((m) => !m.glbUrl && m.type !== "puf");
  if (noGlb.length) out.push(`${noGlb.length} modülün GLB dosyası yok: takım, hepsi yüklenene kadar koddan çizilen koltukla gösterilir.`);
  const noMetres = modules.filter((m) => !m.metres);
  if (noMetres.length) out.push(`${noMetres.length} modülün metrajı yok: bu setle teklifte metre çıkmaz.`);
  return out;
}
