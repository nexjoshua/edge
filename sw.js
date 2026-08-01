const CACHE_NAME = "edge-cache-v14";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./supabase-config.js",
  "./assets/logo.png",
  "./assets/logo-dark.png",
  "./assets/icons/icon-32.png",
  "./assets/icons/icon-180.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-maskable-512.png",
  "./assets/vendor/chart.umd.min.js",
  "./assets/vendor/supabase.js",
  // Admin dashboard — cached too, so it also works offline / installs cleanly.
  // Now shares manifest.json with index.html (no more manifest-admin.json).
  "./admin.html",
  "./admin.css",
  "./admin.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith("http")) return; // skip chrome-extension:// etc.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((res) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, res.clone());
            return res;
          });
        })
        .catch(() => {
          if (event.request.mode === "navigate") {
            // Offline page load: serve whichever shell matches what was
            // actually requested, so a failed /admin.html load doesn't
            // wrongly hand back the student app.
            const isAdmin = event.request.url.includes("admin.html");
            return caches.match(isAdmin ? "./admin.html" : "./index.html");
          }
        });
    })
  );
});
