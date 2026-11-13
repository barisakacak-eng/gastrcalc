// EINE Liste aller Bildschirm-Zustände (alle *Zuruecksetzen-Exporte aus js/screens). Ladenwechsel, Einlesen und „Alles löschen“
// setzen alle zurück – ein neuer Bildschirm wird nur hier eingetragen (tests/d.test.mjs prüft, dass keiner fehlt).
import { fotoZuruecksetzen, rechnungsLaufZuruecksetzen } from "../screens/foto.js";
import { tagZuruecksetzen } from "../screens/tag.js";
import { kuehlZuruecksetzen } from "../screens/kuehl.js";
import { muellZuruecksetzen } from "../screens/muell.js";
import { umsatzZuruecksetzen } from "../screens/umsatz.js";
import { belegZuruecksetzen } from "../screens/beleg.js";
import { abschlussZuruecksetzen } from "../screens/abschluss.js";
import { inventurZuruecksetzen } from "../screens/inventur.js";
import { putzplanZuruecksetzen } from "../screens/putzplan.js";
import { karteLadenZuruecksetzen } from "../screens/karte_laden.js";
import { bueroZuruecksetzen } from "../screens/buero.js";
import { ordnerZuruecksetzen } from "../screens/ordner.js";
import { karteZuruecksetzen } from "../screens/karte.js";
import { vergleichZuruecksetzen } from "../screens/vergleich.js";
import { preisrundeZuruecksetzen } from "../screens/preisrunde.js";
import { wareZuruecksetzen } from "../screens/ware.js";
import { portionZuruecksetzen } from "../screens/portion.js";
import { onboardingZuruecksetzen } from "../screens/onboarding.js";
import { verkaufZuruecksetzen } from "../screens/verkauf.js";
import { bestandZuruecksetzen } from "../screens/bestand.js";
import { aktionenZuruecksetzen } from "../screens/aktionen.js";
import { getraenkeZuruecksetzen } from "../screens/getraenke.js";
import { lieferantenZuruecksetzen } from "../screens/lieferanten.js";
import { laedenZuruecksetzen } from "../screens/laeden.js";
import { umsatzLadenZuruecksetzen } from "../screens/umsatz_laden.js";
import { kuehlWareZuruecksetzen } from "../screens/kuehl_ware.js";

const ZURUECKSETZER = [
  fotoZuruecksetzen, rechnungsLaufZuruecksetzen, tagZuruecksetzen, kuehlZuruecksetzen, muellZuruecksetzen, umsatzZuruecksetzen,
  belegZuruecksetzen, abschlussZuruecksetzen, inventurZuruecksetzen, putzplanZuruecksetzen, karteLadenZuruecksetzen, bueroZuruecksetzen,
  ordnerZuruecksetzen, karteZuruecksetzen, vergleichZuruecksetzen, preisrundeZuruecksetzen, wareZuruecksetzen, portionZuruecksetzen,
  onboardingZuruecksetzen, verkaufZuruecksetzen, bestandZuruecksetzen, aktionenZuruecksetzen, getraenkeZuruecksetzen,
  lieferantenZuruecksetzen, laedenZuruecksetzen, umsatzLadenZuruecksetzen, kuehlWareZuruecksetzen];
export function alleZuruecksetzen() { for (const f of ZURUECKSETZER) { try { f(); } catch (e) { console.warn(e); } } }
