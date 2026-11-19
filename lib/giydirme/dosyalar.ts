import "server-only";
import { supabaseEnabled } from "@/lib/supabase/config";
import { serviceClient } from "@/lib/supabase/server";

// Private files of the photo try-on (job 5): customers' photos and the
// pictures made from them. Never public: with Supabase they live in the
// private "giydirme" bucket that only the server key reaches; without it, in
// memory. The server hands a file only to the screen of its session.

const BUCKET = "giydirme";

export interface PrivateFiles {
  put(path: string, data: Uint8Array): Promise<void>;
  get(path: string): Promise<Uint8Array | null>;
  /** Removes every file under the folder; returns how many went. */
  removeFolder(prefix: string): Promise<number>;
  copy(from: string, to: string): Promise<boolean>;
  exists(path: string): Promise<boolean>;
}

class MemoryFiles implements PrivateFiles {
  private files = new Map<string, Uint8Array>();
  async put(path: string, data: Uint8Array) {
    this.files.set(path, data);
  }
  async get(path: string) {
    return this.files.get(path) ?? null;
  }
  async removeFolder(prefix: string) {
    let n = 0;
    for (const k of [...this.files.keys()])
      if (k.startsWith(prefix)) {
        this.files.delete(k);
        n++;
      }
    return n;
  }
  async copy(from: string, to: string) {
    const f = this.files.get(from);
    if (f) this.files.set(to, f);
    return !!f;
  }
  async exists(path: string) {
    return this.files.has(path);
  }
}

class SupabaseFiles implements PrivateFiles {
  private get bucket() {
    return serviceClient().storage.from(BUCKET);
  }
  async put(path: string, data: Uint8Array) {
    const { error } = await this.bucket.upload(path, data, { contentType: "image/jpeg", upsert: true });
    if (error) throw new Error(error.message);
  }
  async get(path: string) {
    const { data, error } = await this.bucket.download(path);
    return error || !data ? null : new Uint8Array(await data.arrayBuffer());
  }
  async removeFolder(prefix: string) {
    const dir = prefix.replace(/\/$/, "");
    const { data } = await this.bucket.list(dir, { limit: 1000 });
    const paths = (data ?? []).map((f) => `${dir}/${f.name}`);
    if (!paths.length) return 0;
    const { error } = await this.bucket.remove(paths);
    if (error) throw new Error(error.message);
    return paths.length;
  }
  async copy(from: string, to: string) {
    const { error } = await this.bucket.copy(from, to);
    return !error;
  }
  async exists(path: string) {
    return (await this.get(path)) !== null;
  }
}

const holder = globalThis as unknown as { __ormenPrivateFiles?: PrivateFiles };

export function privateFiles(): PrivateFiles {
  holder.__ormenPrivateFiles ??= supabaseEnabled() ? new SupabaseFiles() : new MemoryFiles();
  return holder.__ormenPrivateFiles;
}
