// Start der App: Stand laden, Fehlerseiten, Service Worker, Tageswechsel-Uhr und die Heute-Handlungen „Monat“, „Home-Hinweis“ und Zeki.
import { ladeSprache, t, sprache as aktuelleSprache } from "../i18n.js";
import { spracheDesGeraets, setzeSprache } from "./sprache.js";
import { Z } from "../bedienung/zustand.js";
import { esc, heute, heuteGeschaeft } from "../util.js";
import { BRANCHENWERTE } from "../data/branchenwerte.js";
import { branchenwerteAnwenden } from "../rezept_quelle.js";
import { speichern } from "./speichern.js";
import { fehlendeRezepteErgaenzen } from "../rezept_baukasten.js";
import { artikelAusGerichten } from "../engine.js";
import { aktivSetzen } from "./ladenverwaltung.js";
import { ebeneWiederherstellen, startAnsicht } from "../modus.js";
import { rueckholInfoHolen, dauerhaftAnfragen } from "./sicherung.js";
import { vormonatEinfrieren, tagPruefen } from "./tag.js";
import { serviceWorkerStarten } from "./update.js";
import { speicherDauerhaftPruefen, alleEreignisse, ereignis, laden, ladeProbleme, APP_FASSUNG } from "../store.js";
import { schritteFuer } from "../screens/onboarding.js";
import { zeichne, notfallSeite } from "./zeichnen.js";
import { muellLangdruckEinrichten, muellAktion } from "../screens/muell.js";
import { nurLokal } from "../adapter/testhaken.js";
import { kurzStarten } from "../screens/rundgang_kurz.js";
import { fehlerText, fehlerLeeren } from "../fehler.js";
import { speicherLokal } from "../adapter/browser_speicher.js";
import { erstWiederZeigen } from "../screens/zeki_erst.js";
import { meldung } from "./meldung.js";
import { zekiLogLoeschen } from "../stamm.js";
import { datenschutzText } from "../data/datenschutz.js";
import { blattOffen, monatBlattZeigen } from "../screens/ebene.js";
import { monatsZiel, zaehler } from "../zaehler.js";
import { homeHinweisGesehen } from "../homebildschirm.js";

// Eigener Schirm statt leerer Einrichtung, wenn der Speicher sich nicht öffnen ließ (die Daten sind wahrscheinlich noch da).
// Rückgabe true = trotzdem weiter (ohne Speichern, mit Warnband).
async function speicherGesperrtSchirm() {
  await ladeSprache(spracheDesGeraets()); setzeSprache(spracheDesGeraets());
  Z.root.innerHTML = `<div class="schirm"><div class="inhalt"><h1 class="frage">${esc(t("w2d.gesperrtTitel"))}</h1><p class="hinweis">${esc(t("w2d.gesperrtText"))}</p>
    <button type="button" class="knopf" data-w2="neu">${esc(t("w2d.gesperrtNeu"))}</button>
    <button type="button" class="leise" data-w2="weiter">${esc(t("w2d.gesperrtWeiter"))}</button></div></div>`;
  return new Promise((res) => {
    Z.root.querySelector('[data-w2="neu"]').onclick = () => location.reload();
    Z.root.querySelector('[data-w2="weiter"]').onclick = () => { Z.root.innerHTML = ""; res(true); };
  });
}

// Neue Branchenwerte: einmal je Version einspielen, nur Schätzungen ersetzen, Meldung fürs Cockpit merken.
function branchenwerteEinspielen() {
  if (!BRANCHENWERTE.werte.length) return;
  for (const b of Z.wurzel.betriebe) {
    if ((b.branchenVersion || 0) >= BRANCHENWERTE.version) continue;
    const r = branchenwerteAnwenden(b, BRANCHENWERTE.werte); b.branchenVersion = BRANCHENWERTE.version;
    if (r.geaendert) b.branchenMeldung = { geaendert: r.geaendert, uebersprungenEigen: r.uebersprungenEigen, datum: heute() };
    speichern(Z.wurzel);
  }
}
// Gerichte ohne Rezept (aus älteren Fassungen) bekommen beim Start Startwerte aus dem Baukasten (keine leere App).
function rezepteErgaenzen() {
  let n = 0; for (const b of Z.wurzel.betriebe) n += fehlendeRezepteErgaenzen(b);
  if (n) { for (const b of Z.wurzel.betriebe) b.artikel = artikelAusGerichten(b); speichern(Z.wurzel); }
}
async function startNachLaden() {
  aktivSetzen(Z.wurzel.aktiv);
  ebeneWiederherstellen(Z.wurzel); Z.ansicht = startAnsicht(Z.wurzel); // Modus gilt je Handy und bleibt nach dem Neustart (Büro mit Code: zurück in den Laden)
  rezepteErgaenzen();
  branchenwerteEinspielen();
  rueckholInfoHolen();
  vormonatEinfrieren(); // nach dem Laden des Standes, nur Läden in der Phase „app“
  setInterval(tagPruefen, 60e3); // Minuten-Takt für den Tageswechsel bei offener App
  speicherDauerhaftPruefen().then(() => { if (Z.wurzel.betriebe.some((b) => b.phase === "app")) dauerhaftAnfragen(); }); // einmal nach der Einrichtung (auch für schon eingerichtete Läden)
  // Vor der Sprachwahl in der Sprache des Geräts fragen, damit ein türkischer oder englischer Tester die erste Frage lesen kann.
  await ladeSprache(Z.wurzel.sprache || spracheDesGeraets()); setzeSprache(Z.wurzel.sprache || spracheDesGeraets());
  const ev = await alleEreignisse(); Z.ereignisAnzahl = ev.length;
  await ereignis("app-geoeffnet", { phase: Z.stand.phase, schritt: schritteFuer(Z.stand)[Z.stand.schritt]?.id, sprache: Z.wurzel.sprache, laeden: Z.wurzel.betriebe.length });
  Z.ereignisAnzahl += 1;
  history.replaceState({ schritt: Z.stand.schritt }, "");
  history.pushState({ schritt: Z.stand.schritt }, "");
  zeichne();
  serviceWorkerStarten(); // erst nach dem ersten brauchbaren Bild: Service Worker anmelden, danach lädt er im Leerlauf den Rest nach
}

// Der gespeicherte Stand stammt aus einer neueren Fassung der App (z. B. alte Fassung aus dem Cache): nichts anfassen, nur erklären.
function standZuNeuSchirm() {
  setzeSprache(spracheDesGeraets());
  Z.root.innerHTML = `<div class="schirm"><div class="inhalt"><h1 class="frage">${esc(t("einstellungen.fehlerTitel"))}</h1><p class="hinweis">${esc(t("einstellungen.standNeuer"))}</p><button type="button" class="knopf" data-a="aktualisieren-oder-neu">${esc(t("start.jetztUebernehmen"))}</button></div></div>`;
  Z.root.querySelector('[data-a="aktualisieren-oder-neu"]').onclick = () => { if (Z.aktualisierung) { Z.aktualisierungKlick = true; Z.aktualisierung.postMessage("uebernehmen"); } else location.reload(); };
  serviceWorkerStarten();
}
// Der Start bricht ab (z. B. kaputter Stand): Fehlerseite statt leerem Bildschirm.
async function startFehler(e) {
  console.error(e);
  try { await ladeSprache(Z.wurzel?.sprache || spracheDesGeraets()); setzeSprache(Z.wurzel?.sprache || spracheDesGeraets()); } catch (_) { /* Deutsch */ }
  notfallSeite(); serviceWorkerStarten();
}

export function starten() {
  (async () => {
    try { Z.wurzel = await laden(); }
    catch (e) { standZuNeuSchirm(); return; }
    if (ladeProbleme().gesperrt && !(await speicherGesperrtSchirm())) return;
    try { await startNachLaden(); } catch (e) { await startFehler(e); }
  })();
}

// Zahlenfelder markieren beim Antippen ihren Inhalt – „750“ ersetzt „0,00“ statt „0750,00“ zu ergeben. Nur markieren, wenn der Finger das
// Feld angetippt hat – nicht, wenn die App nach dem Neuzeichnen den Fokus zurückgibt (sonst ersetzte jede zweite Ziffer alles).
// Ein Antippen markiert genau einmal.
export function zahlenfelderAnmelden() {
  Z.root.addEventListener("pointerdown", (ev) => { const i = ev.target; Z.zeigerAufFeld = i instanceof HTMLInputElement && i.inputMode === "decimal" ? i : null; }, true);
  Z.root.addEventListener("focusin", (ev) => {
    const i = ev.target; if (!(i instanceof HTMLInputElement && i.inputMode === "decimal" && i.value) || Z.zeigerAufFeld !== i) return;
    Z.zeigerAufFeld = null;
    const vorher = i.value; setTimeout(() => { if (document.activeElement === i && i.value === vorher) { try { i.select(); } catch { /* egal */ } } }, 0); // schon getippt: nichts überschreiben
  });
  muellLangdruckEinrichten(Z.root, (el) => { if (Z.ansicht === "muell" && Z.stand && muellAktion("muell-detail", el, Z.stand)) zeichne(); }); // lang drücken auf ein Müll-Foto: Detail
}

// Für Tests und Fehlersuche – nur am eigenen Rechner (localhost, 127.0.0.1, [::1]). In der echten App gibt es dieses Objekt nicht.
export function debugAnmelden() {
  if (!nurLokal()) return;
  window.__gastrocalc = {
    get stand() { return Z.stand; }, get wurzel() { return Z.wurzel; }, zeichne, kurzStarten: () => kurzStarten(document),
    fehlerText: () => fehlerText(speicherLokal(), { fassung: APP_FASSUNG, sprache: aktuelleSprache() }), fehlerLeeren: () => fehlerLeeren(speicherLokal()),
  };
}

export const KLICK = {
  "zeki-erst-wieder": () => { // Zeki erklärt jede Stelle wieder beim ersten Tipp
    let sp = null; try { sp = localStorage; } catch { sp = null; }
    erstWiederZeigen(sp); meldung(t("rundgang.erst.wiederOk"));
  },
  "zeki-log-loeschen": () => { // Datenschutz: Zekis Verlauf löschen
    const n = zekiLogLoeschen(Z.stand); speichern(Z.wurzel);
    meldung(datenschutzText(aktuelleSprache())[n ? "zekiGeloescht" : "zekiLeer"]); return zeichne();
  },
  "monat-blatt": () => { // große Zahl → Blatt im Laden
    if (!blattOffen()) history.pushState({ blatt: true }, "");
    const H = heuteGeschaeft(); const m = monatsZiel(Z.stand, zaehler(Z.stand, { datum: H }), H);
    monatBlattZeigen(Z.stand, { umsatz: m.umsatz, nullpunkt: m.nullpunkt, ziel: m.ziel, geschaetzt: m.geschaetzt });
  },
  "home-weg": () => { homeHinweisGesehen(Z.wurzel); speichern(Z.wurzel); return zeichne(); }, // Laden-Hinweis einmal, dann weg
};
