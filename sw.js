// Service Worker: alle App-Dateien einer Fassung werden in EINEN Cache mit Fassungsnamen gelegt – ganz oder gar nicht.
// Die Seite liest nur aus dem Cache ihrer eigenen Fassung, nie gemischt. Eine neue Fassung wartet, bis die Seite sie
// ausdrücklich übernimmt (Hinweis auf der Startseite), dann genau ein Neuladen. (Vorprüfung Gremium, Posten 1.)
const V = "2026-10-15.7";
const NAME = "gc-" + V;
// Fremdbausteine (Texterkennung ~9 MB, PDF-Leser ~1,4 MB) werden nicht bei jeder Fassung neu geladen, sondern beim ersten
// Gebrauch in einen eigenen, fassungsunabhängigen Cache gelegt – danach offline verfügbar. Neuer Name nur bei neuen Bausteinen.
const VENDOR = "gcv-2026-10-14b"; // b: deutsches Modell „best" statt „fast" (Pilot 14.10.)
const DATEIEN = ["./", "index.html", "bilder/g-asia-nudeln.svg", "bilder/g-boerek.svg", "bilder/g-box.svg", "bilder/g-burger.svg", "bilder/g-currywurst.svg", "bilder/g-doener.svg", "bilder/g-duerum.svg", "bilder/g-falafel.svg", "bilder/g-lahmacun.svg", "bilder/g-nudeln.svg", "bilder/g-pide.svg", "bilder/g-pizza.svg", "bilder/g-pommes.svg", "bilder/g-salat.svg", "bilder/g-seele.svg", "bilder/g-teller.svg", "bilder/k-kuehlschrank.svg", "bilder/k-theke.svg", "bilder/k-tiefkuehler.svg", "bilder/kamera.svg", "bilder/laden-anders.svg", "bilder/laden-asia.svg", "bilder/laden-baeckerei.svg", "bilder/laden-burger.svg", "bilder/laden-cafe.svg", "bilder/laden-doener.svg", "bilder/laden-foodtruck.svg", "bilder/laden-pizza.svg", "bilder/m-eimer.svg", "bilder/m-tonne.svg", "bilder/rechnung.svg", "bilder/selbst-ayran.svg", "bilder/selbst-brot.svg", "bilder/selbst-dumplings.svg", "bilder/selbst-lahmacun.svg", "bilder/selbst-patty.svg", "bilder/selbst-salat.svg", "bilder/selbst-sossen.svg", "bilder/selbst-spiess.svg", "bilder/selbst-teig.svg", "bilder/selbst-tomatensosse.svg", "bilder/w-brot.svg", "bilder/w-doenerfleisch.svg", "bilder/w-ei.svg", "bilder/w-feta.svg", "bilder/w-getraenk.svg", "bilder/w-gurke.svg", "bilder/w-hack.svg", "bilder/w-haehnchen.svg", "bilder/w-kaese.svg", "bilder/w-kohl.svg", "bilder/w-mehl.svg", "bilder/w-pommes-tk.svg", "bilder/w-salat.svg", "bilder/w-sosse.svg", "bilder/w-spinat.svg", "bilder/w-tomate.svg", "bilder/w-zwiebel.svg", "bilder/waage.svg", "css/app.css", "css/optik.css", "css/tokens.css", "css/zielbild.css", "fonts/InterVariable-de-tr.woff2", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png", "icons/logo.svg", "js/ablage.js", "js/app.js", "js/auswertung.js", "js/beleg.js", "js/data/branchenwerte.js", "js/data/formate.js", "js/data/katalog.js", "js/data/kosten.js", "js/data/kuechen.js", "js/data/register.js", "js/data/zwischen.js", "js/einrichtung.js", "js/engine.js", "js/i18n.js", "js/karte_lesen.js", "js/kostenbeleg.js", "js/lang/de.js", "js/lang/en.js", "js/lang/tr.js", "js/lieferung.js", "js/muell.js", "js/ocr-worker.js", "js/ocr_layout.js", "js/profil.js", "js/rezept_baukasten.js", "js/rezept_quelle.js", "js/screens/abschluss.js", "js/screens/beleg.js", "js/screens/foto.js", "js/screens/home.js", "js/screens/karte.js", "js/screens/kuehl.js", "js/screens/laeden.js", "js/screens/muell.js", "js/screens/nav.js", "js/screens/onboarding.js", "js/screens/tag.js", "js/screens/umsatz.js", "js/selbst.js", "js/store.js", "js/symbole.js", "js/util.js", "js/zaehler.js", "manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(NAME).then((c) => c.addAll(DATEIEN.map((u) => new Request(u, { cache: "reload" })))));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => (k.startsWith("gc-") && k !== NAME) || (k.startsWith("gcv-") && k !== VENDOR)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes("/vendor/")) {
    e.respondWith(caches.open(VENDOR).then(async (c) => { const t = await c.match(e.request); if (t) return t; const r = await fetch(e.request); if (r.ok) c.put(e.request, r.clone()); return r; }));
    return;
  }
  e.respondWith(caches.open(NAME).then(async (c) => {
    const treffer = await c.match(e.request, { ignoreSearch: true });
    if (treffer) return treffer;
    if (e.request.mode === "navigate") { const start = await c.match("index.html"); if (start) return start; }
    return fetch(e.request);
  }).catch(() => fetch(e.request)));
});
self.addEventListener("message", (e) => { if (e.data === "uebernehmen") self.skipWaiting(); });
