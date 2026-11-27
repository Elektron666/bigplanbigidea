import type { NextConfig } from "next";
// the Content Security Policy, with its reasons, is in lib/csp.ts (the web embed's proxy uses it too)
import { CSP } from "./lib/csp";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // always https once seen (two years); not preloaded, so it can still be undone
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // AR (WebXR) needs xr-spatial-tracking; nothing here uses the microphone or location
          { key: "Permissions-Policy", value: "microphone=(), geolocation=(), xr-spatial-tracking=(self)" },
        ],
      },
      {
        // the web embed's policy comes from proxy.ts, with the shop's allowed sites (job 16)
        source: "/((?!gomme/).*)",
        headers: [{ key: "Content-Security-Policy", value: CSP }],
      },
      {
        // The panel and its APIs must never load inside another site's frame.
        // Public pages (/, /f/…, /p/…) stay embeddable: firms may put the configurator on their own site.
        source: "/panel/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
      {
        // the showroom's offline helper: always asked afresh, so a fix reaches the screens at once
        source: "/showroom-sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
      {
        source: "/api/panel/:path*",
        headers: [{ key: "X-Frame-Options", value: "DENY" }],
      },
    ];
  },
};

export default nextConfig;
