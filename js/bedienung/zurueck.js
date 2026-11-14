// Zurück-Geste des Handys / Browser-Zurück: ein Schritt zurück statt die App zu verlassen.
// Reihenfolge: Führung (wirkt nicht) → offenes Blatt → Einrichtung → Büro-Start → Bildschirm der App (erst die eigene Ebene, dann der Weg).
import { kuehlZurueck } from "../screens/kuehl.js";
import { putzplanZurueck } from "../screens/putzplan.js";
import { Z } from "../bedienung/zustand.js";
import { muellZurueck } from "../screens/muell.js";
import { belegZurueck } from "../screens/beleg.js";
import { inventurZurueck } from "../screens/inventur.js";
import { verkaufZurueck } from "../screens/verkauf.js";
import { bestandZurueck } from "../screens/bestand.js";
import { aktionenZurueck } from "../screens/aktionen.js";
import { getraenkeZurueck } from "../screens/getraenke.js";
import { lieferantenZurueck } from "../screens/lieferanten.js";
import { kuehlWareZurueck } from "../screens/kuehl_ware.js";
import { karteLadenZurueck } from "../screens/karte_laden.js";
import { umsatzLadenZuruecksetzen } from "../screens/umsatz_laden.js";
import { fotoZuruecksetzen, fotoLauf } from "../screens/foto.js";
import { ordnerVorschauOffen, ordnerZuruecksetzen } from "../screens/ordner.js";
import { abschlussZuruecksetzen } from "../screens/abschluss.js";
import { rundgangOffen as fuehrungOffen } from "../screens/rundgang.js";
import { blattSchliessen } from "../screens/ebene.js";
import { modus, startAnsicht, ansichtErlaubt } from "../modus.js";
import { schrittZurueck } from "./einrichtung.js";
import { ebeneWechseln } from "./ebene.js";
import { zeichne } from "./zeichnen.js";

// Bildschirme mit eigenen Ebenen: gibt true zurück, wenn „Zurück“ eine Ebene im Bildschirm selbst hochgegangen ist.
const EBENE_ZURUECK = {
  kuehl: () => kuehlZurueck(), // eine Ebene hoch
  putzplan: () => putzplanZurueck(Z.stand),
  muell: () => muellZurueck(),
  beleg: () => belegZurueck(),
  inventur: () => inventurZurueck(Z.stand), // Karte → Liste → Übersicht
  verkauf: () => verkaufZurueck(), // Vorschau/Handeingabe → Übersicht
  bestand: () => bestandZurueck(), // Mindestbestand-Liste zu
  aktionen: () => aktionenZurueck(), // Kombi-Auswahl leeren; Aktion planen: Plan schließen
  getraenke: () => getraenkeZurueck(), // Formular schließen
  lieferanten: () => lieferantenZurueck(), // Formular bzw. Zuordnung schließen
  kuehlware: () => kuehlWareZurueck(), // offene Entscheidung schließen
  karte: () => karteLadenZurueck(), // erst das Preis-Blatt schließen
};
// Bildschirme, die woanders hin zurückführen: gibt das Ziel der Ansicht zurück.
const ZIEL_ZURUECK = {
  listen: (m) => (Z.herkunft && Z.herkunft !== "listen" ? Z.herkunft : m === "buero" ? "buero" : "umsatz"),
  beleg: (m) => (Z.herkunft && Z.herkunft !== "beleg" ? Z.herkunft : m === "buero" ? "buero" : "umsatz"),
  umsatzheute: (m, anfang) => { umsatzLadenZuruecksetzen(); return Z.herkunft === "abschluss" ? "abschluss" : anfang; },
  kartefoto: (m, anfang) => { fotoZuruecksetzen(); return m === "buero" ? "kartebuero" : anfang; }, // nach der Einrichtung (Laden) zurück zu Heute, nicht ins Büro
};
// Ordner im Büro: erst die Vorschau zu, dann ins Büro.
function ordnerZurueck() {
  if (ordnerVorschauOffen()) ordnerZuruecksetzen(); else { ordnerZuruecksetzen(); Z.ansicht = "buero"; }
}

// Eine Ebene zurück im App-Bildschirm. Laden-Reiter stapeln nicht: Zurück = Heute; Büro → Büro-Start; Personal → drei Kacheln.
function ansichtZurueck(m, anfang) {
  if (Z.ansicht === "listen") { Z.ansicht = ZIEL_ZURUECK.listen(m); return; }
  if (EBENE_ZURUECK[Z.ansicht]?.()) return;
  if (Z.ansicht === "beleg") { Z.ansicht = ZIEL_ZURUECK.beleg(m); return; }
  if (Object.hasOwn(ZIEL_ZURUECK, Z.ansicht)) { Z.ansicht = ZIEL_ZURUECK[Z.ansicht](m, anfang); return; }
  if (Z.ansicht.startsWith("ordner-")) return ordnerZurueck();
  if (m === "buero" && Z.bueroWeg.length) { Z.ansicht = Z.bueroWeg.pop(); return; } // Büro – eine Ebene zurück
  if (Z.ansicht === "abschluss") abschlussZuruecksetzen();
  Z.ansicht = anfang;
}

function aufZurueck() {
  if (!Z.stand) return;
  if (fuehrungOffen()) { history.pushState({ schritt: Z.stand.schritt }, ""); return; } // Mitmach-Rundgang: Zurück-Geste wirkt nicht, Station 16 lässt sich nicht schließen
  if (blattSchliessen()) return; // Zurück schließt zuerst ein offenes Blatt – ohne Neuzeichnen
  const m = modus(Z.wurzel); const anfang = startAnsicht(Z.wurzel);
  if (Z.stand.phase === "onboarding" && (Z.stand.schritt > 0 || Z.stand.rueckkehr || fotoLauf())) { schrittZurueck(); }
  else if (Z.stand.phase === "app" && m === "buero" && Z.ansicht === "buero") { ebeneWechseln("laden", "start"); } // Büro-Start: Zurück = „‹ Laden"
  else if (Z.stand.phase === "app" && Z.ansicht !== anfang) {
    ansichtZurueck(m, anfang);
    if (!ansichtErlaubt(Z.wurzel, Z.ansicht)) Z.ansicht = anfang;
    zeichne();
  }
  history.pushState({ schritt: Z.stand.schritt }, "");
}

export function zurueckAnmelden() { window.addEventListener("popstate", aufZurueck); }
