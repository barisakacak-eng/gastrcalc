// Personal-Modus: Person wählen, Kacheln, Zurück zum Personal-Start. Was im Personal-Modus gesperrt ist, steht in js/modus.js
// (personalGesperrt, personalFeldGesperrt); die Prüfung läuft in klick.js und eingabe.js vor allem anderen.
import { personalAktion, schichtPerson } from "../screens/personal.js";
import { Z } from "../bedienung/zustand.js";
import { tagZuruecksetzen } from "../screens/tag.js";
import { muellZuruecksetzen } from "../screens/muell.js";
import { kuehlZuruecksetzen, kuehlAktion } from "../screens/kuehl.js";
import { kuehlBereit, rundgangOffen } from "../engine.js";
import { speichern } from "./speichern.js";
import { putzplanZuruecksetzen, putzplanAktion } from "../screens/putzplan.js";
import { zeichne } from "./zeichnen.js";
import { personalZielErlaubt } from "../modus.js";

export function personalKlick(name, el) {
  if (name === "personal-ziel" && !personalZielErlaubt(el?.dataset?.wert)) return; // nur die drei Kacheln
  const r = personalAktion(name, el, Z.stand); if (!r) return;
  if (r.ziel) {
    const wer = schichtPerson(Z.stand) || "";
    if (r.ziel === "muell") { tagZuruecksetzen(); muellZuruecksetzen(); }
    if (r.ziel === "kuehl") { // Schicht-Person steht fest – kein „Wer misst?“ mit „Los“, gleich die erste Stelle
      kuehlZuruecksetzen();
      if (kuehlBereit(Z.stand) && !rundgangOffen(Z.stand)) { kuehlAktion("kuehl-rundgang-los", el, Z.stand, Z.wurzel); speichern(Z.wurzel); }
    }
    if (r.ziel === "putzplan") { putzplanZuruecksetzen(); if (wer) putzplanAktion("pp-wer", { dataset: { id: wer } }, Z.stand); }
    Z.herkunft = "personal"; Z.ansicht = r.ziel;
  }
  return zeichne();
}
