// Service worker: aplikace se otevře i bez internetu.
var VERZE = "inzulin-v5";
var SOUBORY = ["./", "./index.html", "./manifest.webmanifest", "./firebase-bundle.js",
  "./firebase-config.js", "./ikona-192.png", "./ikona-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERZE).then(function (c) { return c.addAll(SOUBORY); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (klice) {
    return Promise.all(klice.filter(function (k) { return k !== VERZE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// Nejdřív zkusit internet (aby se načetla nová verze), když není, vzít uloženou kopii.
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    new Promise(function (hotovo) {
      var vyreseno = false;
      var casovac = setTimeout(function () {
        caches.match(req, { ignoreSearch: true }).then(function (r) { if (r && !vyreseno) { vyreseno = true; hotovo(r); } });
      }, 4000);
      fetch(req).then(function (odp) {
        clearTimeout(casovac);
        if (odp && odp.ok) { var kopie = odp.clone(); caches.open(VERZE).then(function (c) { c.put(req, kopie); }); }
        if (!vyreseno) { vyreseno = true; hotovo(odp); }
      }).catch(function () {
        clearTimeout(casovac);
        caches.match(req, { ignoreSearch: true }).then(function (r) {
          if (!vyreseno) { vyreseno = true; hotovo(r || caches.match("./index.html")); }
        });
      });
    })
  );
});
