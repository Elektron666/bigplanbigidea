// ORMEN Atelier: the showroom screen's offline helper (Showroom package, job 1).
//
// Registered only by the paired showroom page (/showroom), with that page as
// its scope. It keeps on the device what the screen needs to open and work
// without internet:
//   - the showroom page itself: always asked from the network first; the copy
//     on the device is used only when the network does not answer. So a new
//     version is taken as soon as it is reachable, and a half-finished update
//     never locks the screen: the last page that worked still opens.
//   - the app's own files (/_next/static, the Draco decoder): they never
//     change under the same name, so the device copy is used directly.
//   - fabric and floor textures, models and logos: device copy first, kept up
//     to a limit; when the limit or the storage is full, the ones used least
//     recently go first. Nothing here makes the screen fail.
// Records made offline are not handled here: the page keeps them in its own
// outbox (lib/offline/outbox.ts) and sends them when the connection is back.

const SHELL = "ormen-kabuk-v1";
const STATIC = "ormen-statik-v1";
const MEDIA = "ormen-doku-v1";
const KEEP = new Set([SHELL, STATIC, MEDIA]);
const MEDIA_MAX = 600;
const PAGE = "/showroom";
const NETWORK_WAIT_MS = 6000;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key.startsWith("ormen-") && !KEEP.has(key)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

function isStatic(url) {
  return url.origin === self.location.origin && (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/draco/") || url.pathname.startsWith("/fonts/"));
}

function isMedia(url, request) {
  if (url.origin === self.location.origin) {
    return url.pathname.startsWith("/seed/") || url.pathname.startsWith("/api/dosya/") || url.pathname.startsWith("/_next/image");
  }
  // Supabase public storage (textures, models, logos uploaded in the panel)
  return url.pathname.includes("/storage/v1/object/public/") && (request.destination === "image" || request.mode === "cors");
}

/** Stores a copy; on a full disk drops the oldest textures and tries once more. Never throws. */
async function store(cacheName, key, response) {
  if (!response || !response.ok || response.type === "opaque") return;
  const cache = await caches.open(cacheName);
  try {
    await cache.put(key, response);
  } catch {
    await trim(MEDIA, 0, 100);
    try {
      await cache.put(key, response);
    } catch {
      /* still full: the screen works on, this file is just not kept */
    }
  }
}

/** Keeps at most `max` entries (oldest first out); `extra` removes that many more to make room. */
async function trim(cacheName, max, extra = 0) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  const over = max ? Math.max(0, keys.length - max) : 0;
  for (const key of keys.slice(0, over + extra)) await cache.delete(key);
}

async function pageFirstFromNetwork(request) {
  const cache = await caches.open(SHELL);
  try {
    const response = await fetch(request, { signal: AbortSignal.timeout(NETWORK_WAIT_MS) });
    // only a real showroom page is kept, never an error page
    if (response.ok && response.type === "basic") await store(SHELL, PAGE, response.clone());
    return response;
  } catch {
    const kept = await cache.match(PAGE, { ignoreVary: true, ignoreSearch: true });
    if (kept) {
      // marked, so the screen (and its tests) can tell it opened from the device copy
      const headers = new Headers(kept.headers);
      headers.set("x-ormen-kaynak", "cihaz");
      return new Response(kept.body, { status: kept.status, statusText: kept.statusText, headers });
    }
    return new Response(
      '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><body style="font:20px system-ui;background:#f5f1ea;color:#2a2a28;display:grid;place-items:center;height:100vh;margin:0;text-align:center"><div><p style="font-size:32px">İnternet bağlantısı yok</p><p>Ekran ilk açılışta internete bağlanmalı. Bağlantı gelince sayfa kendiliğinden açılır.</p></div><script>addEventListener("online",()=>location.reload());setTimeout(()=>location.reload(),30000)</script>',
      { status: 503, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
    );
  }
}

async function fromDeviceFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  // Next.js marks its answers "Vary: RSC…"; a texture is the same file whatever the request said
  const kept = await cache.match(request, { ignoreVary: true });
  if (kept) {
    if (cacheName === MEDIA) {
      // Used again: move it to the back of the line, so it is not the next to go.
      // The copy is taken now, before `kept` is handed to the page: a body that
      // was already read cannot be copied, and the entry would just be lost.
      const copy = kept.clone();
      void (async () => {
        await cache.put(request, copy);
      })().catch(() => undefined);
    }
    return kept;
  }
  const response = await fetch(request);
  await store(cacheName, request, response.clone());
  if (cacheName === MEDIA) void trim(MEDIA, MEDIA_MAX);
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (request.mode === "navigate" && url.origin === self.location.origin && url.pathname === PAGE) {
    event.respondWith(pageFirstFromNetwork(request));
  } else if (isStatic(url)) {
    event.respondWith(fromDeviceFirst(STATIC, request));
  } else if (isMedia(url, request)) {
    event.respondWith(fromDeviceFirst(MEDIA, request));
  }
  // everything else (records, sync, panel) goes to the network untouched
});

// The page sends the files the shop's screen will need (every fabric's
// textures, the models, the floors); they are fetched one by one while the
// screen is idle, so the first try of a fabric works offline too.
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== "isit" || !Array.isArray(data.urls)) return;
  event.waitUntil(
    (async () => {
      // The page this screen opened was loaded before the helper was in charge,
      // so it was never kept. Keep it now, so the very next start works offline.
      try {
        const page = await fetch(PAGE, { credentials: "same-origin", cache: "no-store" });
        if (page.ok && page.type === "basic") await store(SHELL, PAGE, page);
      } catch {
        /* offline already: the next start online keeps it */
      }
      let kept = 0;
      let failed = 0;
      // A list of files to go through. The app's code parts name the parts they
      // load later (a dialog, the 3D scene): each part is read and the parts it
      // names are added, so every part the screen can reach ends up on the
      // device, not only the ones it happened to open while online.
      const queue = [];
      const seen = new Set();
      const add = (raw) => {
        let url;
        try {
          url = new URL(raw, self.location.origin);
        } catch {
          failed++;
          return;
        }
        if (seen.has(url.href)) return;
        seen.add(url.href);
        queue.push(url);
      };
      for (const raw of data.urls) add(raw);
      const LIMIT = MEDIA_MAX * 2;
      for (let i = 0; i < queue.length && i < LIMIT; i++) {
        const url = queue[i];
        const statik = isStatic(url);
        if (!statik && !isMedia(url, { destination: "image", mode: "cors" })) continue;
        const target = statik ? STATIC : MEDIA;
        const cache = await caches.open(target);
        let response = await cache.match(url.href, { ignoreVary: true });
        if (!response) {
          try {
            // the same mode the page loads them with (three.js asks images with CORS)
            const fetched = await fetch(url.href, { mode: url.origin === self.location.origin ? "same-origin" : "cors", credentials: "omit" });
            if (!fetched.ok) {
              failed++;
              continue;
            }
            await store(target, url.href, fetched.clone());
            response = fetched;
          } catch {
            failed++;
            continue;
          }
        }
        kept++;
        if (statik && url.pathname.endsWith(".js")) {
          try {
            const text = await response.text();
            for (const m of text.matchAll(/static\/chunks\/[A-Za-z0-9_.~-]+\.(?:js|css)/g)) add("/_next/" + m[0]);
          } catch {
            /* unreadable: its parts are fetched when the page asks for them online */
          }
        }
      }
      await trim(MEDIA, MEDIA_MAX);
      if (event.source) event.source.postMessage({ type: "isindi", kept, failed });
    })(),
  );
});
