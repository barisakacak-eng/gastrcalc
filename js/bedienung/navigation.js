// Navigation: die Tab-Leiste und das Menü wechseln den Bildschirm. Beim Betreten räumt jedes Ziel seinen alten Zustand ab;
// „Zurück“ (Handy-Geste) steht in zurueck.js. Im Büro merkt sich der Büro-Weg die besuchten Bildschirme (höchstens 12).
import { Z } from "../bedienung/zustand.js";
import { rundgangOffen as fuehrungOffen } from "../screens/rundgang.js";
import { erstSatz, erstZeigen } from "../screens/zeki_erst.js";
import { berlin } from "../zeit.js";
import { speichern } from "./speichern.js";
import { spracheGeladen, ladeSprache } from "../i18n.js";
import { zeichne } from "./zeichnen.js";
import { umsatzLadenZuruecksetzen } from "../screens/umsatz_laden.js";
import { modus, navZiel } from "../modus.js";
import { planSicherstellen } from "../putzplan.js";
import { ereignis } from "../store.js";
import { karteLadenZuruecksetzen } from "../screens/karte_laden.js";
import { muellZuruecksetzen } from "../screens/muell.js";
import { kuehlZuruecksetzen } from "../screens/kuehl.js";
import { putzplanZuruecksetzen } from "../screens/putzplan.js";
import { fotoZuruecksetzen } from "../screens/foto.js";
import { tagZuruecksetzen } from "../screens/tag.js";
import { umsatzZuruecksetzen } from "../screens/umsatz.js";
import { bueroBetreten } from "./ebene.js";
import { bearbeiten } from "./einrichtung.js";
import { bueroPaket, bueroPaketLaden, istBueroAnsicht } from "./nachladen.js";

// Büro-Weg: die vorher besuchten Büro-Bildschirme, damit „Zurück“ eine Ebene zurück führt statt immer zum Büro-Start.
// Büro-Start leert den Weg; „Zurück“ nimmt den letzten Eintrag ab.
function bueroWegFuehren(ziel, zurueck) {
  if (ziel === Z.ansicht) return;
  if (ziel === "buero") { Z.bueroWeg = []; return; }
  if (zurueck) { Z.bueroWeg.pop(); return; }
  const i = Z.bueroWeg.lastIndexOf(ziel); if (i >= 0) { Z.bueroWeg = Z.bueroWeg.slice(0, i); return; } // schon auf dem Weg: dorthin zurückspringen, keine Schleife
  if (Z.ansicht !== "buero") Z.bueroWeg = [...Z.bueroWeg, Z.ansicht].slice(-12);
}

// Ziele, deren Zustand beim Betreten frisch beginnt (Inventur: offene Zählung oder Übersicht; Verkauf, Lager, Aktionen, Waren, Getränke, Lieferanten …):
// die Liste steht im Büro-Paket (paket_buero.js, ZIEL: inventurZuruecksetzen, lieferantenZuruecksetzen …).
// Zeki erklärt die Stelle beim ersten Mal – nie während des Mitmach-Rundgangs (die Erst-Karte lag über dem Rundgang-Ziel).
function erstSatzPlanen(ziel) {
  let sp = null; try { sp = localStorage; } catch { sp = null; }
  const satz = fuehrungOffen() ? null : erstSatz(ziel, { speicher: sp, stunde: berlin().stunde, stand: Z.stand });
  if (satz) setTimeout(() => { if (!fuehrungOffen()) erstZeigen(document, ziel, satz, sp); }, 350);
}
// Was das Ziel beim Betreten vorbereitet (alles vor dem Wechsel der Ansicht).
function zielVorbereiten(ziel, el) {
  const P = bueroPaket(); // Büro-Ziele: das Paket ist hier schon geladen (navKlick wartet darauf)
  if (P?.ZIEL.neu[ziel]) P.ZIEL.neu[ziel]();
  erstSatzPlanen(ziel);
  if (P?.ZIEL.oeffnen(ziel, el)) speichern(Z.wurzel); // Portion, Preisrunde öffnen; Bilanz beendeter Aktionen festhalten
  if (ziel === "tafel") { const sp = P.ZIEL.tafelSprache(Z.stand); if (!spracheGeladen(sp)) ladeSprache(sp).then(() => { if (Z.ansicht === "tafel") zeichne(); }); }
  if (ziel === "umsatzheute") { if (Z.ansicht !== "umsatzheute") Z.herkunft = Z.ansicht; umsatzLadenZuruecksetzen(); }
  if (ziel === "putzplan" && modus(Z.wurzel) === "laden" && planSicherstellen(Z.stand)) { ereignis("putzplan-vorschlag", { laden: Z.stand.id }); speichern(Z.wurzel); } // Vorschlag nach Laden-Art still übernehmen
  if (ziel === "karte" && Z.ansicht !== "karte") karteLadenZuruecksetzen();
  if (ziel === Z.ansicht) { // Menüpunkt der aktuellen Seite: zurück auf deren Anfang
    if (ziel === "muell") muellZuruecksetzen(); if (ziel === "kuehl") kuehlZuruecksetzen();
    if (ziel === "beleg") P?.belegZuruecksetzen(); if (ziel === "putzplan") putzplanZuruecksetzen();
  }
}
// Beim Verlassen des alten Bildschirms: was dort offen war, wird abgeräumt.
function alteAnsichtVerlassen(ziel) {
  if (ziel === "kartefoto" || Z.ansicht === "kartefoto") fotoZuruecksetzen();
  if (ziel === Z.ansicht) return;
  if (Z.ansicht === "beleg") bueroPaket()?.belegZuruecksetzen();
  if (Z.ansicht === "abschluss") bueroPaket()?.abschlussZuruecksetzen();
  if (ziel === "muell" || ziel === "umsatz" || ziel === "abschluss") { tagZuruecksetzen(); muellZuruecksetzen(); umsatzZuruecksetzen(); }
}

async function navKlick(el) {
  const nz = navZiel(Z.wurzel, el.dataset.wert);
  if ((istBueroAnsicht(nz.ansicht) || nz.buero) && !bueroPaket()) await bueroPaketLaden().catch(() => {}); // erst das Büro-Paket holen, der alte Bildschirm bleibt stehen (Fehler: zeichne() zeigt die Fehlerseite)
  if (el.dataset.wert !== Z.ansicht) { // Büro zu, wenn es in den Laden geht
    if (Z.ansicht.startsWith("ordner-")) bueroPaket()?.ordnerZuruecksetzen();
    if (Z.ansicht === "buero") bueroPaket()?.bueroZuruecksetzen();
  }
  if (nz.buero) { Z.bueroWeg = []; return bueroBetreten(nz.ansicht); } // Büro-Bildschirm aus dem Laden: erst ins Büro
  if (modus(Z.wurzel) === "buero") bueroWegFuehren(nz.ansicht, !!el.dataset.zurueck); // Zurück im Büro = eine Ebene
  if (nz.ansicht === "preise") return bearbeiten("preise"); // Richtwert-Zeile „Preise eintragen“ – im Büro direkt in den Schritt
  const ziel = nz.ansicht; if (ziel !== Z.ansicht) Z.herkunft = Z.ansicht; // Zurück führt dorthin, wo man herkam
  zielVorbereiten(ziel, el);
  if (el.dataset.anker) setTimeout(() => document.getElementById(el.dataset.anker)?.scrollIntoView({ block: "start" }), 60);
  alteAnsichtVerlassen(ziel);
  Z.ansicht = ziel; return zeichne();
}

export const KLICK = { nav: (el) => navKlick(el) };
