// Bereich Laden: die Bildschirme des Tagesgeschäfts (Karte, Müll, Umsatz, Kühlung, Putzplan, Beleg, Abschluss, Inventur, …).
// KLICK: Namen, die unabhängig vom Bildschirm gelten. ANSICHT_KLICK[ansicht](name, el): der Bildschirm entscheidet über seine Namen (die
// Bildschirm-Dateien in js/screens/ liefern dazu *Aktion-Funktionen). ANSICHT_EINGABE[ansicht](el): eine Eingabe im Bildschirm; die Antwort
// true heißt „Liste neu zeichnen, Fokus behalten“, FERTIG heißt „nichts speichern“.
import { Z } from "../bedienung/zustand.js";
import { zeichne, eigeneFotosLaden } from "./zeichnen.js";
import { karteLadenBlatt, karteLadenAktion, karteLadenRezeptBlatt, karteLadenEingabe, karteLadenTeile } from "../screens/karte_laden.js";
import { artikelAbgleichen } from "../karte_daten.js";
import { ereignis } from "../store.js";
import { sofortSpeichern, speichern } from "./speichern.js";
import { rundgangOffen as fuehrungOffen } from "../screens/rundgang.js";
import { rezeptDirekt } from "./einrichtung.js";
import { meldung } from "./meldung.js";
import { t } from "../i18n.js";
import {
  karteUebernehmen, kartePruefenAktion, fotoLauf, hatVorschlaege, serieAbbrechen, fotoZuruecksetzen, kartePruefenEingabe,
} from "../screens/foto.js";
import {
  muellKlickUnterdrueckt, muellTipp, muellTippZeigen, muellTippZurueck, muellZurueckZeigen, muellRueckgaengig, muellAktion, muellEingabe,
  muellFormGueltig,
} from "../screens/muell.js";
import { umsatzLadenAktion, umsatzLadenEingabe } from "../screens/umsatz_laden.js";
import { startAnsicht, modus } from "../modus.js";
import { putzplanAktion } from "../screens/putzplan.js";
import { kuehlAktion, kuehlZuruecksetzen, kuehlEingabe, kuehlFormGueltig } from "../screens/kuehl.js";
import { umsatzAktion, umsatzEingabe } from "../screens/umsatz.js";
import { kuehlBereit } from "../engine.js";
import { FERTIG } from "./tabellen.js";
import { abgleichHinweisQuittieren } from "../stamm.js";
import { bueroPaket } from "./nachladen.js";

// Laden-Karte: Plus/Minus tauschen nur das Blatt aus (Raster und Bilder bleiben stehen).
function karteBlattTauschen() {
  const b = Z.root.querySelector(".kl-blatt");
  if (!b) return zeichne();
  Z.root.querySelector(".kl-dimmer")?.remove(); b.outerHTML = karteLadenBlatt(Z.stand); eigeneFotosLaden();
}
async function karteKlick(name, el) {
  const r = karteLadenAktion(name, el, Z.stand);
  if (r === "blatt") return karteBlattTauschen();
  if (r && r.gespeichert && r.rezept === true) { // Menge geändert, Blatt bleibt offen
    artikelAbgleichen(Z.stand); ereignis("rezept-laden", { laden: Z.stand.id, gericht: r.id }); await sofortSpeichern(Z.wurzel);
    return karteBlattTauschen();
  }
  if (r && r.rezept && !fuehrungOffen() && karteLadenRezeptBlatt(Z.stand, r.rezept)) return zeichne(); // alle Zutaten im Laden-Blatt
  if (r && r.rezept) return rezeptDirekt(r.rezept, { max: fuehrungOffen() ? 1 : 3 }); // im Rundgang (und ohne Zutaten) die Mengenfrage
  if (r && r.gespeichert) {
    ereignis("preis-geaendert", { laden: Z.stand.id, gericht: r.id, vorher: r.vorher ?? null, preis: r.preis, ort: "laden" });
    meldung(t("kartelaeden.gespeichert")); await sofortSpeichern(Z.wurzel); return zeichne();
  }
  if (r) return zeichne();
}
async function kartefotoKlick(name, el) {
  if (name === "fv-uebernehmen") {
    const r = karteUebernehmen(Z.stand); ereignis("karte-foto-uebernommen", { laden: Z.stand.id, neu: r.neu });
    meldung(t("foto.uebernommen", r.neu, r.artikel)); Z.ansicht = "kartebuero"; await sofortSpeichern(Z.wurzel); return zeichne();
  }
  if (kartePruefenAktion(name, el)) zeichne();
}

// Müll: ein Tipp = eingetragen; nur Kachel, Kopfzahl und Hinweis werden getauscht (kein ganzes Neuzeichnen).
function muellTippKlick(el) {
  if (muellKlickUnterdrueckt()) return;
  const r = muellTipp(el, Z.stand);
  if (r) { if (!muellTippZeigen(Z.root, Z.stand)) zeichne(); speichern(Z.wurzel); ereignis("schwund-eintrag", { laden: Z.stand.id, tipp: true }); }
}
function muellKlick(name, el) {
  if (name === "muell-tipp") return muellTippKlick(el);
  if (name === "muell1-zurueck") {
    if (muellTippZurueck(Z.stand, el.dataset.id)) { speichern(Z.wurzel); if (!Z.root.querySelector(".muellraster")) zeichne(); else muellZurueckZeigen(Z.root, Z.stand); }
    return;
  }
  if (name === "muell-rueckgaengig") { if (muellRueckgaengig(Z.stand, el.dataset.id)) { speichern(Z.wurzel); meldung(t("muell.zurueckgenommen")); } return zeichne(); }
  const r = muellAktion(name, el, Z.stand);
  if (r) { speichern(Z.wurzel); if (name === "muell-weg-damit") ereignis("schwund-eintrag", { laden: Z.stand.id }); if (r.meldung) meldung(r.meldung); zeichne(); }
}

// „Umsatz heute“: Speichern, Rückfrage über 100.000 €.
async function umsatzHeuteKlick(name, el) {
  const r = umsatzLadenAktion(name, el, Z.stand, Z.wurzel); if (!r) return;
  const danach = () => { Z.ansicht = Z.herkunft === "abschluss" ? "abschluss" : startAnsicht(Z.wurzel); return zeichne(); };
  if (r === "zeichnen") { zeichne(); Z.root.querySelector('[data-f="ul-umsatz"]')?.focus(); return; }
  if (r.teil) { // Umsatz gespeichert, Lohn je Stunde fehlt noch
    meldung(r.meldung); ereignis("umsatz-laden", { laden: Z.stand.id }); await sofortSpeichern(Z.wurzel); zeichne(); Z.root.querySelector('[data-f="ul-team-satz"]')?.focus(); return;
  }
  if (r.meldung) { meldung(r.meldung); return; }
  if (r.gespeichert) { ereignis("umsatz-laden", { laden: Z.stand.id }); await sofortSpeichern(Z.wurzel); if (r.weiter) return zeichne(); return danach(); }
  if (r.fertig) { meldung(t("tag.gespeichert")); await sofortSpeichern(Z.wurzel); return danach(); } // Mitarbeiter heute
}

async function putzplanKlick(name, el) {
  const r = putzplanAktion(name, el, Z.stand);
  if (!r) return;
  if (r === "zurueck") { Z.ansicht = startAnsicht(Z.wurzel); speichern(Z.wurzel); } else if (r === "speichern") await sofortSpeichern(Z.wurzel);
  return zeichne();
}
async function kuehlKlick(name, el) {
  const r = kuehlAktion(name, el, Z.stand, Z.wurzel);
  if (!r) return;
  zeichne();
  const feld = Z.root.querySelector('[data-f="station-wert"]'); if (feld && !feld.value) feld.focus(); // Tastatur gleich hoch, der nächste Schritt ist Tippen
  if (r === "abgeschlossen") { ereignis("rundgang-fertig", { laden: Z.stand.id }); meldung(t("kuehl.abgeschlossen")); await sofortSpeichern(Z.wurzel); } else speichern(Z.wurzel);
}
export const ANSICHT_KLICK = {
  karte: karteKlick,
  kartefoto: kartefotoKlick,
  muell: muellKlick,
  umsatz: (name, el) => { if (umsatzAktion(name, el)) zeichne(); },
  umsatzheute: umsatzHeuteKlick,
  putzplan: putzplanKlick,
  kuehl: kuehlKlick,
};

export const KLICK = {
  "abgleich-ok": () => { abgleichHinweisQuittieren(Z.stand); speichern(Z.wurzel); return zeichne(); }, // Hinweis „Beim Zusammenführen …“ gelesen (Büro-Chip und Heute)
  "foto-abbrechen": () => { if (fotoLauf()?.zweck === "speisekarte" || hatVorschlaege()) serieAbbrechen(); else fotoZuruecksetzen(); return zeichne(); },
  "kuehl-rundgang-start": (el) => { // im Laden direkt zur ersten Stelle
    if (Z.ansicht === "abschluss") bueroPaket()?.abschlussZuruecksetzen();
    Z.ansicht = "kuehl";
    if (el.dataset.offen !== "1") { kuehlAktion(modus(Z.wurzel) === "buero" ? "kuehl-rundgang" : "kuehl-rundgang-los", el, Z.stand, Z.wurzel); speichern(Z.wurzel); }
    return zeichne();
  },
  "kuehl-einrichtung-oeffnen": (el) => { Z.ansicht = "kuehl"; kuehlAktion("kuehl-einrichtung", el, Z.stand, Z.wurzel); return zeichne(); },
  "kuehl-blatt-oeffnen": (el) => { // Büro-Zeile „Kontrollblatt“ öffnet das Blatt selbst
    Z.ansicht = "kuehl"; kuehlZuruecksetzen();
    kuehlAktion(kuehlBereit(Z.stand) ? "kuehl-blatt" : "kuehl-einrichtung", el, Z.stand, Z.wurzel);
    return zeichne();
  },
};

// ---------- Eingaben ----------
// Müll, Beleg, Kühlung: Knöpfe schalten nur um, ob das Formular gültig ist – kein Neuzeichnen, der Fokus bleibt.
const knopf = (sel, an) => { const k = Z.root.querySelector(sel); if (k) k.disabled = !an; };
function karteEingabe(el) { // Preis tippen – nur „Bleibt dir“ und Knopf austauschen, Feld behält den Fokus; Entwurf, noch nichts zu speichern
  if (karteLadenEingabe(el.dataset.f, el.value) === "teil") {
    const teil = karteLadenTeile(Z.stand); const z = Z.root.querySelector(".kl-bleibt-teil"); if (teil && z) z.outerHTML = teil.bleibt;
    const k = Z.root.querySelector('[data-a="kl-speichern"]'); if (k && teil) k.disabled = !teil.speichernAn;
  }
  return FERTIG;
}
function muellEingabeTeil(el) {
  const neu = muellEingabe(el.dataset.f, el.value);
  if (neu === "knopf") { knopf('[data-a="muell-weg-damit"]', muellFormGueltig()); return false; }
  return neu;
}
function kuehlEingabeTeil(el) {
  const neu = kuehlEingabe(el.dataset.f, el.value, Z.stand);
  if (neu === "knopf") { knopf('[data-a="station-speichern"]', kuehlFormGueltig()); return false; }
  return neu;
}
export const ANSICHT_EINGABE = {
  karte: karteEingabe,
  kartefoto: (el) => kartePruefenEingabe(el.dataset.f, el.value),
  umsatzheute: (el) => { umsatzLadenEingabe(el.dataset.f, el.value); return FERTIG; }, // nur merken – gespeichert wird mit „Speichern“
  umsatz: (el) => umsatzEingabe(el.dataset.f, el.value, Z.stand, Z.wurzel),
  muell: muellEingabeTeil,
  kuehl: kuehlEingabeTeil,
};
