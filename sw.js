// Vỏ trang chạy được khi mạng chập chờn. html/js/css/manifest: lấy mạng trước; ảnh: lấy bộ đệm trước.
const C = "vtc-1.0.1";
const SHELL = ["./", "index.html", "app.css?v=1.0.1", "app.js?v=1.0.1", "config.js?v=1.0.1", "manifest.webmanifest", "seed.json?v=1.0.1",
  "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(C).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("vtc-") && k !== C).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return; // YouTube, máy chủ: không đụng
  const img = /\.(png|jpg|jpeg|webp|svg)$/i.test(u.pathname);
  if (img) { e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request).then((res) => { const cp = res.clone(); caches.open(C).then((c) => c.put(e.request, cp)); return res; }))); return; }
  e.respondWith(fetch(e.request, { cache: "no-cache" }).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(C).then((c) => c.put(e.request, cp)); } return res; })
    .catch(() => caches.match(e.request).then((r) => r || caches.match("index.html"))));
});
