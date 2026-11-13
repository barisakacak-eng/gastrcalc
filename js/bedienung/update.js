// Neue Fassung: Hinweis „Aktualisieren“, stilles Update, fremder Fassungswechsel, Service Worker, Installieren-Aufforderung,
// und der Stand eines zweiten Fensters.
import { rundgangOffen as fuehrungOffen } from "../screens/rundgang.js";
import { Z } from "../bedienung/zustand.js";
import { startAnsicht, modus, ebeneWiederherstellen, ansichtErlaubt } from "../modus.js";
import { blattOffen, blattSchliessen } from "../screens/ebene.js";
import { rundgangOffen as w2RundgangOffen } from "../engine.js";
import { fotoLauf } from "../screens/foto.js";
import { ereignis, FREMDER_STAND, speichernAbbrechen } from "../store.js";
import { sofortSpeichern } from "./speichern.js";
import { zeichne } from "./zeichnen.js";
import { alleZuruecksetzen } from "./zuruecksetzen.js";
import { aktivSetzen } from "./ladenverwaltung.js";
import { meldung } from "./meldung.js";
import { t } from "../i18n.js";

// „Kein Formular offen“ an einer Stelle – für das stille Update und für den fremden Fassungswechsel.
function formularOffen() {
  return fuehrungOffen() || !Z.wurzel || !Z.stand || Z.ansicht !== startAnsicht(Z.wurzel) || blattOffen() || w2RundgangOffen(Z.stand) || fotoLauf() || !!document.activeElement?.matches?.("input, textarea, select");
}

// Im Laden (und Personal-Modus) still auf die neue Fassung wechseln, wenn die App 30 Minuten nicht bedient wurde und nichts offen ist.
function stillAktualisieren() {
  if (!Z.aktualisierung || Z.aktualisierungKlick || !Z.wurzel || !Z.stand || Z.stand.phase !== "app") return;
  if (modus(Z.wurzel) === "buero" || Date.now() - Z.zuletztBedient < 30 * 60e3) return;
  if (formularOffen()) return; // kein Formular offen
  Z.aktualisierungKlick = true; ereignis("still-aktualisiert", {});
  sofortSpeichern(Z.wurzel, { stempel: false }).finally(() => Z.aktualisierung.postMessage("uebernehmen"));
}

// Ein ANDERES Fenster hat „Aktualisieren“ getippt. Der neue Service Worker löscht beim Aktivieren den alten Cache (sw.js activate).
// Dieses Fenster läuft dann mit altem app.js weiter, holt Nachlader (Sprachdateien, OCR-Worker) aber aus dem neuen Cache – ein Mischstand
// aus zwei Fassungen. Darum: neu laden, sobald hier kein Formular offen ist (sonst alle 2 s nachsehen), vorher sichern.
// Im Onboarding ist jeder Schritt ein Formular: dort wird erst beim nächsten Start neu geladen (pagehide sichert).
function fremdeFassungUebernehmen() {
  if (Z.aktualisierungKlick || Z.fremdeFassung) return;
  Z.fremdeFassung = true; ereignis("fremde-fassung", {});
  const versuch = () => {
    if (!Z.wurzel || !Z.stand || Z.stand.phase !== "app" || formularOffen()) { setTimeout(versuch, 2000); return; }
    Z.aktualisierungKlick = true; // ab jetzt kein zweiter Anlauf
    sofortSpeichern(Z.wurzel, { stempel: false }).finally(() => location.reload());
  };
  versuch();
}

export async function serviceWorkerStarten() {
  if (Z.swGestartet) return; Z.swGestartet = true;
  if (!("serviceWorker" in navigator) || !window.isSecureContext) { Z.offlineStand = "keinSw"; return; }
  try {
    const reg = await navigator.serviceWorker.register("sw.js", { updateViaCache: "none" });
    const bereit = (w) => { Z.aktualisierung = w; if ((Z.ansicht === "start" || Z.ansicht === "buero") && Z.stand?.phase === "app") zeichne(); }; // W2-D: auch im Büro
    if (reg.waiting && navigator.serviceWorker.controller) bereit(reg.waiting);
    reg.addEventListener("updatefound", () => { const w = reg.installing; if (!w) return; w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) bereit(w); }); });
    // 27.10.2026 (Persona-Test): beim allerersten Besuch hat die Seite noch keinen Service Worker. sw.js übernimmt sie per
    // clients.claim() – das löst ebenfalls „controllerchange“ aus, ist aber KEINE neue Fassung (die Seite läuft schon mit genau
    // diesen Dateien). Dieser erste Wechsel lädt deshalb nicht neu; erst ein späterer Wechsel (echtes Update) läuft wie gehabt.
    let ersteUebernahme = !navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (ersteUebernahme) { ersteUebernahme = false; return; }
      if (Z.aktualisierungKlick) location.reload(); else fremdeFassungUebernehmen(); // Paket 2: auch ohne eigenen Tipp
    });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) reg.update().catch(() => {}); });
    await navigator.serviceWorker.ready; Z.offlineStand = "bereit";
    setInterval(stillAktualisieren, 60e3); document.addEventListener("visibilitychange", () => { if (!document.hidden) stillAktualisieren(); }); // W2-D
  } catch (e) { console.warn("Kein Service Worker:", e); Z.offlineStand = "keinSw"; }
}

export function updateAnmelden() {
  if (typeof window !== "undefined") window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); Z.installAufforderung = e; if (Z.ansicht === "einstellungen") zeichne(); });
  for (const e of ["pointerdown", "keydown", "input"]) document.addEventListener(e, () => { Z.zuletztBedient = Date.now(); }, { capture: true, passive: true });
}

// Ein zweites Fenster derselben Fassung hat geschrieben (store.js, Generationszähler). store.js hat die eigenen Änderungen in den frischen
// Stand gemischt und geschrieben (zusammengefuehrt: true) – oder aufgegeben (false: eigene Kopie verworfen). So oder so: den gelieferten
// Stand übernehmen, Bildschirm-Zustände verwerfen, neu zeichnen. Hinweis (vorhandener Toast) nur im Büro und nur beim Aufgeben.
// Ließ sich nichts laden: Seite neu laden.
export function fremderStandAnmelden() {
  window.addEventListener(FREMDER_STAND, (ev) => {
    const neu = ev.detail?.wurzel;
    if (!neu || !Z.wurzel) { location.reload(); return; }
    speichernAbbrechen(); alleZuruecksetzen(); blattSchliessen();
    Z.wurzel = neu; Z.stand = null; aktivSetzen(Z.wurzel.aktiv); ebeneWiederherstellen(Z.wurzel);
    if (!ansichtErlaubt(Z.wurzel, Z.ansicht)) Z.ansicht = startAnsicht(Z.wurzel);
    if (!ev.detail.zusammengefuehrt && modus(Z.wurzel) === "buero") meldung(t("einstellungen.fremderStand"));
    zeichne();
  });
}

export const KLICK = {
  aktualisieren: () => { if (Z.aktualisierung) { Z.aktualisierungKlick = true; Z.aktualisierung.postMessage("uebernehmen"); } },
  "home-installieren": () => {
    const p = Z.installAufforderung; Z.installAufforderung = null;
    if (p) { p.prompt(); p.userChoice?.then(() => zeichne()); }
  },
};
