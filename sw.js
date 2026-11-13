// Offline-Cache: App-Dateien werden beim ersten Besuch gespeichert und offline daraus geladen.
var CACHE = "stadtsammler-v4";
var FILES = ["./", "index.html", "styles.css", "app.js", "cities.js", "germany.js",
  "vendor/leaflet.js", "vendor/leaflet.css", "manifest.webmanifest",
  "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES.map(function (f) { return new Request(f, { cache: "reload" }); })); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (/version\.json$/.test(url.pathname)) return; // Update-Abfrage nie aus dem Cache
  // Online immer die neueste Version, offline die gespeicherte
  e.respondWith(fetch(e.request, { cache: "no-cache" }).then(function (res) {
    if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(e.request, { ignoreSearch: true }).then(function (hit) { return hit || caches.match("index.html"); });
  }));
});
