// Content Security Policy (gece toplantısı, 12 Oct). Scripts only from this site (Next's
// own inline bootstrap needs 'unsafe-inline'; a nonce would make every page dynamic), so an
// injected <script src> from elsewhere does not run; the page talks only to this site and
// Supabase, so data cannot be sent anywhere else. 'wasm-unsafe-eval': the Draco decoder
// for GLB models; blob: workers: the same decoder. Development also needs 'unsafe-eval'.
// Shared by next.config.ts (every page) and proxy.ts (the web embed, with its frame-ancestors).
const supabase = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "";
  } catch {
    return "";
  }
})();
const dev = process.env.NODE_ENV === "development";
export const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabase}`.trim(),
  `media-src 'self' blob: ${supabase}`.trim(),
  "font-src 'self' data:",
  `connect-src 'self' blob: data: ${supabase}`.trim(),
  "worker-src 'self' blob:",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");
