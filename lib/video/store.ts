import "server-only";
import { supabaseEnabled } from "@/lib/supabase/config";
import { serviceClient } from "@/lib/supabase/server";

// The configuration videos sent to customers' phones (job 13). Private: the
// phone opens one by its long random link only, through the server.

export const MAX_VIDEO_BYTES = 10 * 1024 * 1024;
export const VIDEO_TOKEN = /^[A-Za-z0-9_-]{24,48}$/;
export type VideoType = "video/mp4" | "video/webm";

export interface VideoMeta {
  firmId: string;
  firmSlug: string;
  /** "Lara Üçlü · LUMA-02": what the customer looked at. */
  product: string;
  type: VideoType;
  /** The quote made in the same visit, if any (its phone link). */
  quoteToken: string | null;
  createdAt: string;
}

export interface VideoStore {
  put(token: string, data: Uint8Array, meta: VideoMeta): Promise<void>;
  get(token: string): Promise<Uint8Array | null>;
  meta(token: string): Promise<VideoMeta | null>;
}

class MemoryVideos implements VideoStore {
  private files = new Map<string, { data: Uint8Array; meta: VideoMeta }>();
  async put(token: string, data: Uint8Array, meta: VideoMeta) {
    this.files.set(token, { data, meta });
  }
  async get(token: string) {
    return this.files.get(token)?.data ?? null;
  }
  async meta(token: string) {
    return this.files.get(token)?.meta ?? null;
  }
}

class SupabaseVideos implements VideoStore {
  private get bucket() {
    return serviceClient().storage.from("video");
  }
  async put(token: string, data: Uint8Array, meta: VideoMeta) {
    const a = await this.bucket.upload(`${token}.${meta.type === "video/mp4" ? "mp4" : "webm"}`, data, { contentType: meta.type, upsert: false });
    if (a.error) throw new Error(a.error.message);
    const b = await this.bucket.upload(`${token}.json`, new TextEncoder().encode(JSON.stringify(meta)), { contentType: "application/json", upsert: false });
    if (b.error) throw new Error(b.error.message);
  }
  async meta(token: string) {
    const { data, error } = await this.bucket.download(`${token}.json`);
    if (error || !data) return null;
    try {
      return JSON.parse(await data.text()) as VideoMeta;
    } catch {
      return null;
    }
  }
  async get(token: string) {
    const m = await this.meta(token);
    if (!m) return null;
    const { data, error } = await this.bucket.download(`${token}.${m.type === "video/mp4" ? "mp4" : "webm"}`);
    return error || !data ? null : new Uint8Array(await data.arrayBuffer());
  }
}

const holder = globalThis as unknown as { __ormenVideos?: VideoStore };

export function getVideos(): VideoStore {
  holder.__ormenVideos ??= supabaseEnabled() ? new SupabaseVideos() : new MemoryVideos();
  return holder.__ormenVideos;
}
