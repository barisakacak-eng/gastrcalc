import test from "node:test";
import assert from "node:assert/strict";
globalThis.document ??= { documentElement: {} };
import { leererBetrieb, leereWurzel } from "../js/store.js";
import { setzeSprache } from "../js/i18n.js";
import { heute } from "../js/util.js";
import { navKontext } from "../js/screens/nav.js";
import { personalKontext, schichtPersonSetzen } from "../js/screens/personal.js";
import * as K from "../js/screens/kuehl.js";
setzeSprache("de");
const el = (dataset = {}) => ({ dataset });
function laden() {
  const s = leererBetrieb(), w = leereWurzel(); s.phase = "app";
  s.kuehlstellen = [{ id: "k1", name: "Kühlschrank", art: "kuehl", min: 0, max: 7, reihe: 0 }, { id: "k2", name: "Tiefkühler", art: "tk", max: -18, reihe: 1 }];
  s.kuehl = { ...s.kuehl, eingerichtet: true, seit: heute() };
  s.personen = [{ id: "chef", kuerzel: "AA", aktiv: true }, { id: "schicht", kuerzel: "BB", aktiv: true }];
  w.betriebe = [s]; w.aktiv = s.id; w.modus = "laden";
  personalKontext(w); navKontext(s, w, "kuehl"); K.kuehlZuruecksetzen(); K.kuehlView(s);
  return { s, w, a: (name, d) => K.kuehlAktion(name, el(d), s, w), eingabe: (f, v) => K.kuehlEingabe(f, v, s) };
}

test("L3: ungültige Eingabe bleibt Entwurf; bestätigte Station sofort sichern, Fortsetzen ohne Doppelung", () => {
  const { s, a, eingabe } = laden(); a("kuehl-rundgang-los");
  for (const v of ["", "abc", "12,3,4", "Infinity"]) {
    eingabe("station-wert", v); assert.equal(a("station-speichern"), false);
  }
  assert.equal(s.messungen.length, 0); assert.equal(s.rundgaenge[0].messungen.length, 0);
  eingabe("station-wert", "4"); assert.equal(a("station-speichern"), "eingetragen");
  assert.equal(s.rundgaenge[0].messungen.length, 1); assert.equal(s.messungen.length, 0);
  K.kuehlZuruecksetzen(); K.kuehlView(s); a("kuehl-rundgang-los");
  assert.match(K.kuehlView(s), /Tiefkühler/); assert.match(K.kuehlView(s), /value=""/);
  eingabe("station-wert", "-20"); assert.equal(a("station-speichern"), "abgeschlossen-still");
  assert.equal(s.messungen.length, 2); assert.equal(a("station-speichern"), false);
  assert.equal(s.messungen.length, 2, "Doppelklick erzeugt keinen dritten Messwert");
});

test("L3: Nicht-Messung ist als Grund mit Datum sichtbar, keine Temperatur oder bestätigte Kontrolle erfunden", () => {
  const { s, a, eingabe } = laden(); a("kuehl-einzel", { id: "k1" });
  eingabe("station-wert", "4"); a("station-speichern");
  K.kuehlView(s); a("kuehl-einzel", { id: "k1" }); a("l3-grund"); a("station-grund", { wert: "geraetAus" });
  assert.equal(a("station-speichern"), "abgeschlossen-still");
  const h = K.kuehlView(s); assert.match(h, /Heute dokumentiert/);
  assert.match(h, />Gerät aus \/ abgetaut</); assert.ok(!h.includes("4,0°C"));
  assert.equal(s.messungen.at(-1).wert, null); assert.equal(s.messungen.at(-1).grund, "geraetAus");
});

test("L3: Maßnahmen und Ware vor Abschluss, Zurück kehrt zur Ware zurück; Korrektur schreibt einmal", () => {
  const { s, a, eingabe } = laden(); a("kuehl-rundgang-los"); eingabe("station-wert", "12");
  a("l3-weiter"); assert.equal(a("station-speichern"), false);
  a("massnahme", { wert: "weggeworfen" }); a("l3-weiter");
  eingabe("weg-name", "Fiktive Ware"); eingabe("weg-menge", "2"); a("weg-hinzu");
  a("l3-weiter"); assert.match(K.kuehlView(s), /data-a="nachkontrolle"/);
  a("l3-zurueck"); assert.match(K.kuehlView(s), /data-f="weg-name"/);
  assert.equal(s.schwund.length, 0, "noch kein abgeschlossener Nachweis");
  a("l3-weiter"); assert.equal(a("station-speichern"), "eingetragen");
  a("station-zu"); a("station", { id: "k1" }); eingabe("station-wert", "11");
  a("l3-weiter"); a("l3-weiter"); a("l3-weiter"); a("station-speichern");
  assert.equal(s.rundgaenge[0].messungen.length, 1, "Korrektur ersetzt den offenen Entwurf");
  eingabe("station-wert", "-20"); a("station-speichern");
  assert.equal(s.messungen.length, 2); assert.equal(s.schwund.length, 1);
  assert.equal(s.messungen.find((m) => m.stelle === "k1").wert, 11);
});

test("L3: Personal übernimmt die Schicht-Person ohne erneute Auswahl und ohne Euro", () => {
  const { s, w, a } = laden(); w.modus = "personal"; personalKontext(w); schichtPersonSetzen(s, "schicht");
  K.kuehlView(s); a("kuehl-rundgang"); a("start-von", { id: "schicht" });
  assert.equal(s.rundgaenge[0].von, "schicht"); const h = K.kuehlView(s);
  assert.match(h, /data-f="station-wert"/); assert.ok(!h.includes("€")); assert.ok(!h.includes('data-a="rg-von"'));
  assert.equal(K.kuehlZurueck(s), true); assert.equal(K.kuehlAnsicht(), "start", "keine leere Korrekturübersicht als zusätzlicher Rückweg");
  assert.equal(K.kuehlZurueck(s), false, "nächste Zurück-Geste darf zum Personal-Start führen");
  w.modus = "laden"; personalKontext(w);
});
