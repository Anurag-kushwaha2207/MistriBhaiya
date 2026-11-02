// Minimal service worker: caches the app shell so the app opens fast on weak networks. API calls are never cached.
const CACHE = "mistribaiya-v4";
const SHELL = ["/", "/index.html", "/config.js", "/app.js", "/negotiation.js", "/contractor.js", "/assistant.js", "/style.css", "/manifest.webmanifest"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (u.pathname.startsWith("/api") || u.pathname.startsWith("/ws") || e.request.method !== "GET") return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
