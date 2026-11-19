import "server-only";
import { STORAGE_BUCKET, SUPABASE_URL, publicFileUrl, supabaseEnabled } from "@/lib/supabase/config";
import { serviceClient } from "@/lib/supabase/server";
import type { Module, ModuleSet } from "./dizilim";
import { ORNEK_SET } from "./ornek-set";
import { ORNEK_GLB_SET } from "./ornek-glb-set";
import type { ModuleSetInput } from "./set-input";

// Module sets uploaded in the panel (Showroom package, job 4, second part).
// One interface, two backings, as lib/data: Supabase when it is set up,
// otherwise memory (seeded with a small GLB set for Örnek Mobilya, for
// development and tests). The sample set drawn from code is always offered
// besides; it is not stored.

export interface ModuleSetRow {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  modules: number;
  shops: number;
}

export type StoredModuleSet = ModuleSet & { isActive: boolean; firmIds: string[] };

export interface ModuleSetStore {
  listSets(): Promise<ModuleSetRow[]>;
  getSet(id: string): Promise<StoredModuleSet | null>;
  /** Creates (no id) or replaces a set; a module keeps its key, so links to it keep working. */
  saveSet(input: ModuleSetInput, id?: string): Promise<{ ok: true; id: string } | { ok: false; error: string }>;
  /** The active sets given to a shop. */
  setsForFirm(firmId: string): Promise<ModuleSet[]>;
}

/** The sets a shop's page offers: its uploaded sets, then the sample set (for trying the tool). */
export async function pageSets(firmId: string | null | undefined): Promise<ModuleSet[]> {
  const own = firmId ? await getModuleSets().setsForFirm(firmId).catch(() => []) : [];
  return [...own, ORNEK_SET];
}

// ------------------------------------------------------------------ memory

class MemoryModuleSets implements ModuleSetStore {
  private sets: StoredModuleSet[] = [{ ...structuredClone(ORNEK_GLB_SET), isActive: true, firmIds: ["seed-firm-ornek"] }];

  async listSets() {
    return this.sets.map((s) => ({ id: s.id, slug: s.slug, name: s.name, isActive: s.isActive, modules: s.modules.length, shops: s.firmIds.length }));
  }

  async getSet(id: string) {
    const s = this.sets.find((x) => x.id === id);
    return s ? structuredClone(s) : null;
  }

  async saveSet(input: ModuleSetInput, id?: string) {
    if (this.sets.some((s) => s.slug === input.slug && s.id !== id)) return { ok: false as const, error: "Bu bağlantı adı başka bir sette kullanılıyor." };
    const row: StoredModuleSet = { id: id ?? crypto.randomUUID(), slug: input.slug, name: input.name, refWidthCm: input.refWidthCm, modules: structuredClone(input.modules), isActive: input.isActive, firmIds: [...input.firmIds] };
    if (id && !this.sets.some((s) => s.id === id)) return { ok: false as const, error: "Set bulunamadı." };
    this.sets = id ? this.sets.map((s) => (s.id === id ? row : s)) : [...this.sets, row];
    return { ok: true as const, id: row.id };
  }

  async setsForFirm(firmId: string) {
    return this.sets.filter((s) => s.isActive && s.firmIds.includes(firmId)).map((s) => structuredClone({ id: s.id, slug: s.slug, name: s.name, refWidthCm: s.refWidthCm, modules: s.modules }));
  }
}

// ------------------------------------------------------------------ Supabase

type SetRow = { id: string; slug: string; name: string; ref_width_cm: number | string; is_active: boolean };
type ModRow = {
  key: string; type: Module["type"]; name: string; width_cm: number | string; depth_cm: number | string; height_cm: number | string;
  glb_path: string | null; joints: Module["joints"] | null; metres: Module["metres"] | null; sort_order: number;
};
const STORAGE_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/`;
const toStored = (url: string | undefined) => (!url ? null : url.startsWith(STORAGE_PREFIX) ? url.slice(STORAGE_PREFIX.length) : url);
const fromStored = (p: string | null) => (!p ? undefined : p.startsWith("/") ? p : publicFileUrl(p));

function moduleFromRow(r: ModRow): Module {
  const glbUrl = fromStored(r.glb_path);
  return {
    id: r.key,
    type: r.type,
    name: r.name,
    widthCm: Number(r.width_cm),
    depthCm: Number(r.depth_cm),
    heightCm: Number(r.height_cm),
    ...(glbUrl ? { glbUrl } : {}),
    ...(r.joints ? { joints: r.joints } : {}),
    ...(r.metres ? { metres: r.metres } : {}),
  };
}

function check<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

class SupabaseModuleSets implements ModuleSetStore {
  private get db() {
    return serviceClient();
  }

  async listSets() {
    const rows = check(await this.db.from("module_sets").select("id, slug, name, is_active, module_set_modules(count), module_set_firms(count)").order("name")) as (SetRow & {
      module_set_modules: { count: number }[];
      module_set_firms: { count: number }[];
    })[];
    return rows.map((r) => ({ id: r.id, slug: r.slug, name: r.name, isActive: r.is_active, modules: r.module_set_modules[0]?.count ?? 0, shops: r.module_set_firms[0]?.count ?? 0 }));
  }

  async getSet(id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const s = check(await this.db.from("module_sets").select("*").eq("id", id).maybeSingle()) as SetRow | null;
    if (!s) return null;
    const [mods, firms] = await Promise.all([
      this.db.from("module_set_modules").select("*").eq("set_id", id).order("sort_order"),
      this.db.from("module_set_firms").select("firm_id").eq("set_id", id),
    ]);
    return {
      id: s.id,
      slug: s.slug,
      name: s.name,
      refWidthCm: Number(s.ref_width_cm),
      isActive: s.is_active,
      modules: (check(mods) as ModRow[]).map(moduleFromRow),
      firmIds: (check(firms) as { firm_id: string }[]).map((f) => f.firm_id),
    };
  }

  async saveSet(input: ModuleSetInput, id?: string) {
    const row = { slug: input.slug, name: input.name, ref_width_cm: input.refWidthCm, is_active: input.isActive };
    const res = id ? await this.db.from("module_sets").update(row).eq("id", id).select("id").maybeSingle() : await this.db.from("module_sets").insert(row).select("id").single();
    if (res.error?.code === "23505") return { ok: false as const, error: "Bu bağlantı adı başka bir sette kullanılıyor." };
    const saved = check(res) as { id: string } | null;
    if (!saved) return { ok: false as const, error: "Set bulunamadı." };
    const setId = saved.id;
    // modules: by key, so a module edited keeps its place in links; modules taken out go
    const keys = input.modules.map((m) => m.id);
    check(
      await this.db.from("module_set_modules").upsert(
        input.modules.map((m, i) => ({
          set_id: setId, key: m.id, type: m.type, name: m.name, width_cm: m.widthCm, depth_cm: m.depthCm, height_cm: m.heightCm,
          glb_path: toStored(m.glbUrl), joints: m.joints ?? null, metres: m.metres ?? null, sort_order: i,
        })),
        { onConflict: "set_id,key" },
      ),
    );
    const have = check(await this.db.from("module_set_modules").select("key").eq("set_id", setId)) as { key: string }[];
    const gone = have.map((r) => r.key).filter((k) => !keys.includes(k));
    if (gone.length) check(await this.db.from("module_set_modules").delete().eq("set_id", setId).in("key", gone));
    // shops: only the difference, so shops that keep the set do not get an update for nothing
    const firms = (check(await this.db.from("module_set_firms").select("firm_id").eq("set_id", setId)) as { firm_id: string }[]).map((r) => r.firm_id);
    const add = input.firmIds.filter((f) => !firms.includes(f));
    const drop = firms.filter((f) => !input.firmIds.includes(f));
    if (add.length) check(await this.db.from("module_set_firms").insert(add.map((firm_id) => ({ set_id: setId, firm_id }))));
    if (drop.length) check(await this.db.from("module_set_firms").delete().eq("set_id", setId).in("firm_id", drop));
    return { ok: true as const, id: setId };
  }

  async setsForFirm(firmId: string) {
    const rows = check(
      await this.db.from("module_set_firms").select("module_sets!inner(id, slug, name, ref_width_cm, is_active, module_set_modules(*))").eq("firm_id", firmId).eq("module_sets.is_active", true),
    ) as unknown as { module_sets: SetRow & { module_set_modules: ModRow[] } }[];
    return rows
      .map((r) => r.module_sets)
      .sort((a, b) => a.name.localeCompare(b.name, "tr"))
      .map((s) => ({ id: s.id, slug: s.slug, name: s.name, refWidthCm: Number(s.ref_width_cm), modules: [...s.module_set_modules].sort((a, b) => a.sort_order - b.sort_order).map(moduleFromRow) }));
  }
}

const holder = globalThis as unknown as { __ormenModuleSets?: ModuleSetStore };

export function getModuleSets(): ModuleSetStore {
  holder.__ormenModuleSets ??= supabaseEnabled() ? new SupabaseModuleSets() : new MemoryModuleSets();
  return holder.__ormenModuleSets;
}
