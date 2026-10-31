// Home-Bildschirm-Führung (Lauf 2, Bildpaket D Punkt 1 – 31.10.2026). Hintergrund: Safari löscht den Speicher einer Website nach
// sieben Safari-Tagen ohne Nutzung; Web-Apps auf dem Home-Bildschirm sind davon ausgenommen (webkit.org, „Full Third-Party Cookie
// Blocking and More“, 24.03.2020). Darum zeigt die App – nur solange sie NICHT als Home-App läuft – den Weg dorthin:
// iPhone/iPad: Teilen → „Zum Home-Bildschirm“; Android: Browser-Menü → „App installieren“ (oder der Installieren-Knopf, wenn der
// Browser ihn anbietet). Reine Logik, keine Oberfläche, nichts gespeichert außer der Marke „gesehen“ in der Wurzel.
export function installZustand({ matchMedia, navigator } = globalThis) {
  const standalone = (typeof matchMedia === "function" && matchMedia("(display-mode: standalone)").matches) || navigator?.standalone === true;
  const ua = String(navigator?.userAgent || "");
  const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator?.platform === "MacIntel" && (navigator?.maxTouchPoints || 0) > 1);
  const android = !ios && /Android/i.test(ua);
  const plattform = ios ? "ios" : android ? "android" : "andere";
  return { standalone, plattform, weg: standalone ? null : plattform === "ios" ? "teilen" : plattform === "android" ? "installieren" : "andere" };
}
// Laden: der Hinweis kommt einmal (höchstens 15 Wörter) und verschwindet mit „OK“ oder sobald die App als Home-App läuft.
export function homeHinweisFaellig(wurzel, zustand) {
  if (!wurzel || zustand.standalone || !zustand.weg) return false;
  return !wurzel.homeHinweisGesehen;
}
export function homeHinweisGesehen(wurzel, datum = new Date().toISOString().slice(0, 10)) { if (wurzel) wurzel.homeHinweisGesehen = datum; }
