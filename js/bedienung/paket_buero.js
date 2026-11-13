// Das Büro-Paket: alle Büro-Bildschirme mit ihren Klick- und Eingabe-Tabellen. Es wird erst geladen, wenn eine Büro-Ansicht gebraucht wird
// (js/bedienung/nachladen.js); der Laden, Personal und die Einrichtung kommen ohne es aus. Der Start-Kern fragt das Paket über bueroPaket()
// (zeichnen.js, klick.js, eingabe.js, navigation.js, zurueck.js, zuruecksetzen.js, fotos.js, ebene.js).
import { Z } from "../bedienung/zustand.js";
import { zusammenfuehren } from "./tabellen.js";
import { heuteGeschaeft, heute } from "../util.js";
import { hmGezeigtMerken, hmFuerBuero } from "../hinweis_motor.js";
import { sofortSpeichern } from "./speichern.js";
import { ANSICHT_KLICK as KLICK_ANSICHT_BUERO, ANSICHT_EINGABE as EINGABE_BUERO, KLICK as KLICK_BUERO } from "./buero.js";
import { ANSICHT_KLICK as KLICK_ANSICHT_LADEN_BUERO, ANSICHT_EINGABE as EINGABE_LADEN_BUERO, KLICK as KLICK_LADEN_BUERO } from "./laden_buero.js";
import { bueroView, bueroZuruecksetzen } from "../screens/buero.js";
import { laedenView, laedenZuruecksetzen } from "../screens/laeden.js";
import { belegView, belegKennung, belegZurueck, belegZuruecksetzen, belegTextVonFoto } from "../screens/beleg.js";
import { abschlussView, abschlussKennung, abschlussZuruecksetzen } from "../screens/abschluss.js";
import { vergleichView, vergleichZuruecksetzen } from "../screens/vergleich.js";
import { preisrundeView, preisrundeZuruecksetzen, preisrundeOeffnen } from "../screens/preisrunde.js";
import { wareView, wareZuruecksetzen } from "../screens/ware.js";
import { portionView, portionZuruecksetzen, portionOeffnen } from "../screens/portion.js";
import { inventurView, inventurKennung, inventurZurueck, inventurZuruecksetzen } from "../screens/inventur.js";
import { verkaufView, verkaufKennung, verkaufZurueck, verkaufZuruecksetzen, verkaufDatei, verkaufZbonFoto } from "../screens/verkauf.js";
import { bestandView, bestandKennung, bestandZurueck, bestandZuruecksetzen, bestandLink } from "../screens/bestand.js";
import { aktionenView, aktionenKennung, aktionenZurueck, aktionenZuruecksetzen } from "../screens/aktionen.js";
import { tafelView } from "../screens/tafel.js";
import { hinweiseView } from "../screens/hinweise.js";
import { geld3View, geld3Aktion } from "../screens/geld3.js";
import { getraenkeView, getraenkeKennung, getraenkeZurueck, getraenkeZuruecksetzen } from "../screens/getraenke.js";
import { lieferantenView, lieferantenKennung, lieferantenZurueck, lieferantenZuruecksetzen } from "../screens/lieferanten.js";
import { kuehlWareView, kuehlWareKennung, kuehlWareZurueck, kuehlWareZuruecksetzen } from "../screens/kuehl_ware.js";
import { ordnerAmtView, ordnerPaketView, ordnerVorschauOffen, ordnerZuruecksetzen } from "../screens/ordner.js";
import { aktionenAbschliessen } from "../aktion_plan.js";
import { tafelEinstellung } from "../tafel.js";

// Hinweise im Büro: der Takt merkt, was gezeigt wurde (Komfort, kein Absturz).
function hinweiseMitHm() {
  { try { const d = heute(); if (hmGezeigtMerken(Z.stand, hmFuerBuero(Z.stand, { datum: d }).neu, d)) sofortSpeichern(Z.wurzel); } catch { /* Takt ist Komfort, kein Absturz */ } }
  return hinweiseView(Z.stand);
}

// Welche Funktion liefert das HTML einer Büro-Ansicht? (Gegenstück zu ANSICHT_VIEW in zeichnen.js)
export const VIEW = {
  buero: () => bueroView(Z.stand, Z.wurzel, { aktualisierung: !!Z.aktualisierung }),
  laeden: () => laedenView(Z.wurzel),
  beleg: () => belegView(Z.stand),
  abschluss: () => abschlussView(Z.stand),
  vergleich: () => vergleichView(Z.stand),
  preisrunde: () => preisrundeView(Z.stand),
  ware: () => wareView(Z.stand, { datum: heuteGeschaeft() }),
  portion: () => portionView(Z.stand),
  inventur: () => inventurView(Z.stand),
  verkauf: () => verkaufView(Z.stand),
  bestand: () => bestandView(Z.stand),
  aktionen: () => aktionenView(Z.stand),
  tafel: () => tafelView(Z.stand),
  hinweise: () => hinweiseMitHm(),
  geld3: () => geld3View(Z.stand),
  getraenke: () => getraenkeView(Z.stand),
  lieferanten: () => lieferantenView(Z.stand),
  kuehlware: () => kuehlWareView(Z.stand),
  "ordner-amt": () => ordnerAmtView(Z.stand),
  "ordner-steuer": () => ordnerPaketView(Z.stand, "steuer"),
  "ordner-buch": () => ordnerPaketView(Z.stand, "buch"),
};
// Zusatz zur Kennung eines Büro-Bildschirms (ein offenes Formular zählt als anderer Bildschirm)
export const KENNUNG = {
  beleg: belegKennung, abschluss: abschlussKennung, inventur: inventurKennung, verkauf: verkaufKennung, bestand: bestandKennung,
  aktionen: aktionenKennung, getraenke: getraenkeKennung, kuehlware: kuehlWareKennung, lieferanten: lieferantenKennung,
};
export const ANSICHT_KLICK = zusammenfuehren(KLICK_ANSICHT_BUERO, KLICK_ANSICHT_LADEN_BUERO);
export const ANSICHT_EINGABE = zusammenfuehren(EINGABE_BUERO, EINGABE_LADEN_BUERO);
export const KLICK = zusammenfuehren(KLICK_BUERO, KLICK_LADEN_BUERO);

// Zurück-Geste: gibt true zurück, wenn „Zurück“ eine Ebene im Bildschirm selbst hochgegangen ist.
export const EBENE_ZURUECK = {
  beleg: () => belegZurueck(),
  inventur: () => inventurZurueck(Z.stand), // Karte → Liste → Übersicht
  verkauf: () => verkaufZurueck(), // Vorschau/Handeingabe → Übersicht
  bestand: () => bestandZurueck(), // Mindestbestand-Liste zu
  aktionen: () => aktionenZurueck(), // Kombi-Auswahl leeren; Aktion planen: Plan schließen
  getraenke: () => getraenkeZurueck(), // Formular schließen
  lieferanten: () => lieferantenZurueck(), // Formular bzw. Zuordnung schließen
  kuehlware: () => kuehlWareZurueck(), // offene Entscheidung schließen
};

// Ziele, deren Zustand beim Betreten frisch beginnt (navigation.js)
const ZIEL_NEU = {
  inventur: inventurZuruecksetzen, verkauf: verkaufZuruecksetzen, bestand: bestandZuruecksetzen, aktionen: aktionenZuruecksetzen,
  ware: wareZuruecksetzen, getraenke: getraenkeZuruecksetzen, lieferanten: lieferantenZuruecksetzen, kuehlware: kuehlWareZuruecksetzen,
};
// Was ein Büro-Ziel beim Betreten vorbereitet (navigation.js, vor dem Wechsel der Ansicht): true, wenn der Stand geändert wurde (dann speichern).
function zielOeffnen(ziel, el) {
  if (ziel === "portion") portionOeffnen(Z.stand, el.dataset.id || null);
  if (ziel === "preisrunde") preisrundeOeffnen(Z.stand, el.dataset.id || null, el.dataset.cent || null);
  if (ziel === "aktionen" || ziel === "tafel") return !!aktionenAbschliessen(Z.stand); // Bilanz beendeter Aktionen festhalten
  return false;
}
export const ZIEL = { neu: ZIEL_NEU, oeffnen: zielOeffnen, tafelSprache: (stand) => tafelEinstellung(stand).sprache };

// Alle Zustände dieser Bildschirme zurücksetzen (zuruecksetzen.js: Ladenwechsel, Einlesen, „Alles löschen“).
const ZURUECKSETZER = [
  belegZuruecksetzen, abschlussZuruecksetzen, inventurZuruecksetzen, bueroZuruecksetzen, ordnerZuruecksetzen, vergleichZuruecksetzen,
  preisrundeZuruecksetzen, wareZuruecksetzen, portionZuruecksetzen, verkaufZuruecksetzen, bestandZuruecksetzen, aktionenZuruecksetzen,
  getraenkeZuruecksetzen, lieferantenZuruecksetzen, laedenZuruecksetzen, kuehlWareZuruecksetzen];
export function alleZuruecksetzen() { for (const f of ZURUECKSETZER) { try { f(); } catch (e) { console.warn(e); } } }

// Einzelne Funktionen, die der Start-Kern „wenn da“ braucht
export { abschlussZuruecksetzen, ordnerZuruecksetzen, ordnerVorschauOffen, bueroZuruecksetzen, belegZuruecksetzen, bestandLink, geld3Aktion, verkaufDatei, verkaufZbonFoto, belegTextVonFoto };
