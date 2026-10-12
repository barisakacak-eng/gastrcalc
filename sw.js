// Service Worker: alle App-Dateien einer Fassung werden in EINEN Cache mit Fassungsnamen gelegt – ganz oder gar nicht.
// Die Seite liest nur aus dem Cache ihrer eigenen Fassung, nie gemischt. Eine neue Fassung wartet, bis die Seite sie
// ausdrücklich übernimmt (Hinweis auf der Startseite), dann genau ein Neuladen. (Vorprüfung Gremium, Posten 1.)
const V = "2026-10-12.1";
const NAME = "gc-" + V;
const DATEIEN = ["./", "index.html", "css/app.css", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png", "js/app.js", "js/beleg.js", "js/data/formate.js", "js/data/katalog.js", "js/data/kosten.js", "js/data/kuechen.js", "js/engine.js", "js/i18n.js", "js/lang/de.js", "js/lang/en.js", "js/lang/tr.js", "js/lieferung.js", "js/muell.js", "js/screens/abschluss.js", "js/screens/beleg.js", "js/screens/home.js", "js/screens/karte.js", "js/screens/kuehl.js", "js/screens/laeden.js", "js/screens/muell.js", "js/screens/nav.js", "js/screens/onboarding.js", "js/screens/tag.js", "js/screens/umsatz.js", "js/store.js", "js/util.js", "js/zaehler.js", "manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(NAME).then((c) => c.addAll(DATEIEN.map((u) => new Request(u, { cache: "reload" })))));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("gc-") && k !== NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(caches.open(NAME).then(async (c) => {
    const treffer = await c.match(e.request, { ignoreSearch: true });
    if (treffer) return treffer;
    if (e.request.mode === "navigate") { const start = await c.match("index.html"); if (start) return start; }
    return fetch(e.request);
  }).catch(() => fetch(e.request)));
});
self.addEventListener("message", (e) => { if (e.data === "uebernehmen") self.skipWaiting(); });
