// Bereich Büro: Büro-Start, Ordner (Amt, Steuerberater, Buchhalter), Verkauf, Bestand, Waren, Preise, Aktionen, Lieferanten, Getränke,
// Menütafel, Läden-Ebene, Geld-Seite, Einstellungen. Gleiche Form wie js/bedienung/laden.js: KLICK für Namen ohne Bildschirm,
// ANSICHT_KLICK[ansicht](name, el), ANSICHT_EINGABE[ansicht](el) (true = Liste neu zeichnen, FERTIG = nichts speichern).
import { sofortSpeichern, speichern } from "./speichern.js";
import { Z } from "../bedienung/zustand.js";
import { meldung } from "./meldung.js";
import { zeichne } from "./zeichnen.js";
import { portionAktion, portionEingabe } from "../screens/portion.js";
import { heuteGeschaeft, parseZahl } from "../util.js";
import { karteLadenZuruecksetzen } from "../screens/karte_laden.js";
import { bueroAktion, bueroEingabe } from "../screens/buero.js";
import { ordnerAktion, ordnerEingabe } from "../screens/ordner.js";
import { verkaufAktion, verkaufEingabe } from "../screens/verkauf.js";
import { bestandAktion, bestandEingabe } from "../screens/bestand.js";
import { wareAktion, wareEingabe } from "../screens/ware.js";
import { preisrundeAktion, preisrundeEingabe } from "../screens/preisrunde.js";
import { aktionenAktion, aktionenEingabe } from "../screens/aktionen.js";
import { lieferantenAktion, lieferantenEingabe } from "../screens/lieferanten.js";
import { getraenkeAktion, getraenkeEingabe } from "../screens/getraenke.js";
import { tafelAktion, tafelEingabe } from "../screens/tafel.js";
import { laedenAktion, laedenEingabe } from "../screens/laeden.js";
import { warenQuoteSetzen, steuerSatzSetzen, ruhezeitSetzen } from "../stamm.js";
import { FERTIG } from "./tabellen.js";
import { ladeSprache } from "../i18n.js";
import { geld3Eingabe } from "../screens/geld3.js";

// Die meisten Büro-Bildschirme antworten gleich: { speichern, meldung } – danach wird neu gezeichnet.
// Läuft die Aktion selbst asynchron (aktionenAktion, bestandAktion, tafelAktion), wird auf sie gewartet; sonst gleich weiter.
async function standardAntwort(r) {
  if (r) { if (r.speichern) await sofortSpeichern(Z.wurzel); if (r.meldung) meldung(r.meldung); zeichne(); }
}
const standardKlick = (aktion) => (name, el) => {
  const r = aktion(name, el);
  return r instanceof Promise ? r.then(standardAntwort) : standardAntwort(r);
};
async function bueroErgebnis(r) {
  if (!r) return;
  if (r.speichern) await sofortSpeichern(Z.wurzel);
  if (r.meldung) meldung(r.meldung);
  zeichne(); Z.root.querySelector(".b-codefeld")?.focus();
}
async function portionKlick(name, el) {
  if (!name.startsWith("po-")) return;
  const r = portionAktion(name, el, Z.stand, { datum: heuteGeschaeft() });
  if (r) { if (r.speichern) await sofortSpeichern(Z.wurzel); if (r.nav) { Z.ansicht = r.nav; karteLadenZuruecksetzen(); } zeichne(); }
}
const jetztDatum = () => ({ datum: heuteGeschaeft() });

export const ANSICHT_KLICK = {
  buero: async (name, el) => bueroErgebnis(await bueroAktion(name, el, Z.stand, Z.wurzel)),
  "ordner-": async (name, el) => bueroErgebnis(await ordnerAktion(name, el, Z.stand, Z.ansicht)),
  verkauf: standardKlick((name, el) => verkaufAktion(name, el, Z.stand, Z.wurzel)), // Verkauf je Gericht
  bestand: standardKlick((name, el) => bestandAktion(name, el, Z.stand)), // Lager & Bestellen
  ware: (name, el) => name.startsWith("wa-") ? standardKlick((n, e) => wareAktion(n, e, Z.stand, { ...jetztDatum(), jetzt: new Date().toISOString() }))(name, el) : undefined,
  portion: portionKlick,
  preisrunde: (name, el) => name.startsWith("pr-") ? standardKlick((n, e) => preisrundeAktion(n, e, Z.stand, jetztDatum()))(name, el) : undefined,
  aktionen: standardKlick((name, el) => aktionenAktion(name, el, Z.stand)), // Vorschläge; „Auf die Tafel“ speichert
  lieferanten: standardKlick((name, el) => lieferantenAktion(name, el, Z.stand)), // Liste, Bearbeiten, Waren zuordnen
  getraenke: standardKlick((name, el) => getraenkeAktion(name, el, Z.stand)), // Felder je Getränk, neues Getränk
  tafel: standardKlick((name, el) => tafelAktion(name, el, Z.stand)), // Einstellungen, Aktion beenden, Datei teilen
  laeden: async (name, el) => { // Eigentümer-Ebene: Zeitraum, Bericht drucken, CSV
    const r = await laedenAktion(name, el, Z.wurzel);
    if (r) { if (r.meldung) meldung(r.meldung); zeichne(); }
  },
};

export const KLICK = {}; // keine Namen ohne Bildschirm im Büro („abgleich-ok“ steht in laden.js: der Chip erscheint auch auf Heute)

// ---------- Eingaben ----------
function einstellungenEingabe(el) {
  const f = el.dataset.f;
  if (f === "warenQuote") warenQuoteSetzen(Z.stand, parseZahl(el.value));
  if (f === "steuerSatz") steuerSatzSetzen(Z.stand, parseZahl(el.value));
  const m = /^ruhe-(\d)-(von|bis)$/.exec(f || ""); if (m) ruhezeitSetzen(Z.stand, Number(m[1]), m[2], el.value); // Stoßzeiten
  return false;
}
function bueroEingabeTeil(el) {
  const neu = bueroEingabe(el.dataset.f, el.value);
  if (neu === "knopf") { const ziffern = el.value.replace(/\D/g, "").slice(0, 4); if (el.value !== ziffern) el.value = ziffern; return false; }
  return neu;
}
function ordnerEingabeTeil(el) { const neu = ordnerEingabe(el.dataset.f, el.value); return neu === "knopf" ? false : neu; }
function verkaufEingabeTeil(el) { // Handeingabe ist ein Entwurf bis „Speichern“; nur der Tag zeichnet neu
  const r = verkaufEingabe(el.dataset.f, el.value);
  if (r === "zeichnen") { zeichne(); return FERTIG; }
  return r === "entwurf" ? FERTIG : false;
}
function tafelEingabeTeil(el) { // Sprache der Tafel: speichern, Sprache laden, neu zeichnen
  const r = tafelEingabe(el.dataset.f, el.value, Z.stand); if (!r) return FERTIG;
  speichern(Z.wurzel); ladeSprache(r.sprache).then(() => { if (Z.ansicht === "tafel") zeichne(); });
  return FERTIG;
}
function wareEingabeTeil(el) { // Entwurf; Zukaufpreis speichert sofort
  const r = wareEingabe(el.dataset.f, el.value, Z.stand, el);
  if (r === "speichern") { speichern(Z.wurzel); return FERTIG; }
  if (r && typeof r === "object") { const k = Z.root.querySelector('[data-a="wa-spiess"]'); if (k) { k.disabled = !r.knopf; k.textContent = r.text; } }
  return FERTIG;
}
function preisrundeEingabeTeil(el) { // Gericht wechseln zeichnet neu, Extra-Felder schalten nur den Knopf
  const r = preisrundeEingabe(el.dataset.f, el.value, Z.stand);
  if (r === "zeichnen") zeichne();
  else if (r) { const k = Z.root.querySelector('[data-a="pr-extra-dazu"]'); if (k) k.disabled = r !== "knopf-an"; }
  return FERTIG;
}
function aktionenEingabeTeil(el) { // Datum im Plan ist ein Entwurf bis „Auf die Tafel“
  const r = aktionenEingabe(el.dataset.f, el.value);
  if (r === "zeichnen") { zeichne(); return FERTIG; }
  return r === "entwurf" || !r ? FERTIG : false;
}
function lieferantenEingabeTeil(el) { // Formular = Entwurf; Zuordnung (Auswahl) schreibt gleich
  const r = lieferantenEingabe(el.dataset.f, el.value, Z.stand);
  if (r === "speichern") { speichern(Z.wurzel); zeichne(); } else if (r?.meldung) { meldung(r.meldung); zeichne(); }
  return FERTIG;
}
function geld3EingabeTeil(el) { // speichern, neu rechnen, Fokus und offene Karten bleiben
  if (!geld3Eingabe(el.dataset.f, el.value, Z.stand)) return FERTIG;
  speichern(Z.wurzel); const f = el.dataset.f;
  const offen = [...Z.root.querySelectorAll("details[data-g3][open]")].map((d) => d.dataset.g3);
  zeichne();
  for (const id of offen) Z.root.querySelector(`details[data-g3="${id}"]`)?.setAttribute("open", "");
  const neuEl = Z.root.querySelector(`[data-f="${f}"]`);
  if (neuEl) { neuEl.focus(); try { neuEl.setSelectionRange(neuEl.value.length, neuEl.value.length); } catch { /* egal */ } }
  return FERTIG;
}

export const ANSICHT_EINGABE = {
  einstellungen: einstellungenEingabe,
  buero: bueroEingabeTeil,
  "ordner-": ordnerEingabeTeil,
  laeden: (el) => laedenEingabe(el.dataset.f, el.value), // freier Zeitraum
  verkauf: verkaufEingabeTeil,
  tafel: tafelEingabeTeil,
  portion: (el) => { portionEingabe(el.dataset.f, el.value); return FERTIG; }, // Zahl merken, Feld behält den Fokus
  ware: wareEingabeTeil,
  preisrunde: preisrundeEingabeTeil,
  aktionen: aktionenEingabeTeil,
  lieferanten: lieferantenEingabeTeil,
  getraenke: (el) => { if (getraenkeEingabe(el.dataset.f, el.value) === "zeichnen") zeichne(); return FERTIG; }, // Formular ist ein Entwurf bis „Speichern“
  bestand: (el) => (bestandEingabe(el.dataset.f, el.value) === "entwurf" ? FERTIG : false), // Mindestbestand ist ein Entwurf bis „Speichern“
  geld3: geld3EingabeTeil,
};
