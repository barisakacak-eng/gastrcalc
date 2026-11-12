// Schutz gegen Einrahmen: Eine fremde Seite darf die App nicht in einem Rahmen zeigen und Tipps abfangen (z. B. auf die Code-Tasten).
// GitHub Pages kann dafür keine Kopfzeile setzen, darum dieses kleine Skript: Es läuft als Erstes, vor der App.
// Steckt die Seite in einem fremden Rahmen, wird sie versteckt und – wenn der Browser es erlaubt – ins ganze Fenster geholt.
// Nach dem Umzug auf den eigenen Server übernimmt zusätzlich die Kopfzeile in .htaccess (frame-ancestors, X-Frame-Options).
(function () {
  if (window.top === window.self) return;
  var eigen = false;
  try { eigen = window.top.location.origin === window.location.origin; } catch (e) { eigen = false; }
  if (eigen) return; // eigener Rahmen (z. B. Vorschau im Büro) ist erlaubt
  document.documentElement.style.display = "none";
  try { window.top.location = window.location.href; } catch (e) { /* bleibt versteckt */ }
})();
