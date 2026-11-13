// EINE Liste aller Bildschirm-Zustände (alle *Zuruecksetzen-Exporte aus js/screens). Ladenwechsel, Einlesen und „Alles löschen“
// setzen alle zurück – ein neuer Bildschirm wird nur hier eingetragen (tests/d.test.mjs prüft, dass keiner fehlt).
import { fotoZuruecksetzen, rechnungsLaufZuruecksetzen } from "../screens/foto.js";
import { tagZuruecksetzen } from "../screens/tag.js";
import { kuehlZuruecksetzen } from "../screens/kuehl.js";
import { muellZuruecksetzen } from "../screens/muell.js";
import { umsatzZuruecksetzen } from "../screens/umsatz.js";
import { putzplanZuruecksetzen } from "../screens/putzplan.js";
import { karteLadenZuruecksetzen } from "../screens/karte_laden.js";
import { karteZuruecksetzen } from "../screens/karte.js";
import { onboardingZuruecksetzen } from "../screens/onboarding.js";
import { umsatzLadenZuruecksetzen } from "../screens/umsatz_laden.js";
import { bueroPaket } from "./nachladen.js";

// Die Büro-Bildschirme setzt das Büro-Paket zurück (paket_buero.js: alleZuruecksetzen), wenn es geladen ist – sonst haben sie noch keinen Zustand.
const ZURUECKSETZER = [
  fotoZuruecksetzen, rechnungsLaufZuruecksetzen, tagZuruecksetzen, kuehlZuruecksetzen, muellZuruecksetzen, umsatzZuruecksetzen,
  putzplanZuruecksetzen, karteLadenZuruecksetzen, karteZuruecksetzen, onboardingZuruecksetzen, umsatzLadenZuruecksetzen];
export function alleZuruecksetzen() {
  for (const f of ZURUECKSETZER) { try { f(); } catch (e) { console.warn(e); } }
  bueroPaket()?.alleZuruecksetzen();
}
