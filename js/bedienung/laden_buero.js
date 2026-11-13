// Bereich Laden, Büro-Teil: Beleg, Tagesabschluss, Inventur und Ware nach einer Kühl-Abweichung. Gleiche Form wie js/bedienung/laden.js
// (ANSICHT_KLICK[ansicht](name, el), ANSICHT_EINGABE[ansicht](el)), wird aber erst mit dem Büro-Paket geladen (js/bedienung/paket_buero.js).
import { Z } from "../bedienung/zustand.js";
import { zeichne } from "./zeichnen.js";
import { ereignis } from "../store.js";
import { sofortSpeichern, speichern } from "./speichern.js";
import { meldung } from "./meldung.js";
import { belegAktion, belegEingabe, belegTextDa } from "../screens/beleg.js";
import { abschlussAktion } from "../screens/abschluss.js";
import { inventurAktion, inventurEingabe } from "../screens/inventur.js";
import { kuehlWareAktion, kuehlWareEingabe, kuehlWareGrundGueltig } from "../screens/kuehl_ware.js";
import { vergleichModus } from "../screens/vergleich.js";
import { umsatzEingabe } from "../screens/umsatz.js";
import { FERTIG } from "./tabellen.js";
import { parseZahl } from "../util.js";

async function belegKlick(name, el) {
  const r = belegAktion(name, el, Z.stand, Z.wurzel);
  if (!r) return;
  if (r.meldung) meldung(r.meldung);
  if (r === "uebernommen") { ereignis("beleg-uebernommen", { laden: Z.stand.id }); await sofortSpeichern(Z.wurzel); } else speichern(Z.wurzel);
  zeichne();
}
async function abschlussKlick(name, el) {
  const r = abschlussAktion(name, el, Z.stand, Z.wurzel);
  if (r === "schon") return zeichne(); // dieser Tag ist schon abgeschlossen – nur die Bilanz zeigen, kein zweiter Abschluss
  if (r) { ereignis("tag-abgeschlossen", { laden: Z.stand.id }); await sofortSpeichern(Z.wurzel); zeichne(); }
}
async function inventurKlick(name, el) {
  const r = inventurAktion(name, el, Z.stand);
  if (!r) return;
  if (r === "abgeschlossen") { ereignis("inventur-fertig", { laden: Z.stand.id }); await sofortSpeichern(Z.wurzel); }
  else if (r === "sofort" || r.sofort) await sofortSpeichern(Z.wurzel); else speichern(Z.wurzel);
  if (r.meldung) meldung(r.meldung);
  zeichne();
}
// Ware nach einer Kühl-Abweichung: weggeworfen (Müll) oder behalten (Begründung).
async function kuehlWareKlick(name, el) {
  const r = kuehlWareAktion(name, el, Z.stand);
  if (r) { if (r.speichern) await sofortSpeichern(Z.wurzel); if (r.meldung) meldung(r.meldung); zeichne(); }
}


export const ANSICHT_KLICK = {
  beleg: belegKlick,
  abschluss: abschlussKlick,
  inventur: inventurKlick,
  kuehlware: kuehlWareKlick,
};

export const KLICK = {
  "vergleich-modus": (el) => { vergleichModus(el.dataset.wert); return zeichne(); },
};

// ---------- Eingaben ----------
// Beleg und Ware: Knöpfe schalten nur um, ob das Formular gültig ist – kein Neuzeichnen, der Fokus bleibt.
const knopf = (sel, an) => { const k = Z.root.querySelector(sel); if (k) k.disabled = !an; };
function belegEingabeTeil(el) {
  const neu = belegEingabe(el.dataset.f, el.value);
  if (neu === "knopf") { knopf('[data-a="beleg-zerlegen"]', belegTextDa()); return false; }
  if (neu === "knopf-zw") { knopf('[data-a="zw-speichern"]', parseZahl(el.value) > 0); return false; }
  return neu;
}
function kuehlWareEingabeTeil(el) { // Entwurf; Begründung schaltet nur den Knopf
  const neu = kuehlWareEingabe(el.dataset.f, el.value, Z.stand);
  if (neu === "knopf") { knopf('[data-a="kw-behalten-speichern"]', kuehlWareGrundGueltig()); return FERTIG; }
  return neu === true ? neu : FERTIG;
}


export const ANSICHT_EINGABE = {
  abschluss: (el) => umsatzEingabe(el.dataset.f, el.value, Z.stand, Z.wurzel),
  beleg: belegEingabeTeil,
  inventur: (el) => inventurEingabe(el.dataset.f, el.value),
  kuehlware: kuehlWareEingabeTeil,
};
