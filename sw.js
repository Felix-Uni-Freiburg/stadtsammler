// Offline-Cache. Vorlage: sw.js wird von release.py erzeugt.
var CACHE = "stadtsammler-1.4.1";
var FILES = ["./", "assets/leaflet.a783710282.css", "assets/styles.659ae4ff40.css", "assets/leaflet.db49d009c8.js", "assets/germany.cf57a12707.js", "assets/cities.d4491a2cf5.js", "assets/app.72d2abc324.js", "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

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
  // Dateien mit Fingerabdruck ändern sich nie: direkt aus dem Speicher
  if (url.pathname.indexOf("/assets/") >= 0) {
    e.respondWith(caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (res) {
        if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); }
        return res;
      });
    }));
    return;
  }
  // Seite selbst: online immer die neueste Version, offline die gespeicherte
  e.respondWith(fetch(e.request, { cache: "no-cache" }).then(function (res) {
    if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(e.request, { ignoreSearch: true }).then(function (hit) { return hit || caches.match("index.html"); });
  }));
});
