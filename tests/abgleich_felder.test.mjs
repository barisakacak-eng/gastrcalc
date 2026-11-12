// Lauf 6, Etappe 5 (Audit P2 A1): Felder, die beim Abgleich zweier Handys bisher verloren gingen.
import test from "node:test"; import assert from "node:assert/strict";
import { FELD_ABGLEICH, felderVerschmelzen, schichtKennung } from "../js/abgleich_felder.js";

const beide = (a, b) => [felderVerschmelzen(structuredClone(a), a, b), felderVerschmelzen(structuredClone(b), b, a)];
const ohneReihe = (s) => JSON.parse(JSON.stringify(s));
test("Stunden auf beiden Handys: beide Tage bleiben, Ergebnis auf beiden Handys gleich, doppelt einlesen ändert nichts", () => {
  const A = { teamTage: [{ datum: "2027-01-02", eintraege: [{ person: "p1", name: "A", stunden: 6, satz: 14 }], erfasst: "2027-01-02T20:00:00.000Z" }] };
  const B = { teamTage: [{ datum: "2027-01-03", eintraege: [{ person: "p1", name: "A", stunden: 4, satz: 14 }], erfasst: "2027-01-03T20:00:00.000Z" }] };
  const [ab, ba] = beide(A, B);
  assert.deepEqual(ab.teamTage.map((x) => x.datum), ["2027-01-02", "2027-01-03"]); assert.deepEqual(ohneReihe(ab), ohneReihe(ba));
  assert.deepEqual(ohneReihe(felderVerschmelzen(structuredClone(ab), ab, B)), ohneReihe(ab));
});
test("Gleicher Tag auf beiden Handys verschieden: der jüngere Eintrag gilt auf beiden (er steht am Ende)", () => {
  const A = { teamTage: [{ datum: "2027-01-02", eintraege: [{ person: "p1", stunden: 6 }], erfasst: "2027-01-02T20:00:00.000Z" }] };
  const B = { teamTage: [{ datum: "2027-01-02", eintraege: [{ person: "p1", stunden: 8 }], erfasst: "2027-01-02T21:00:00.000Z" }] };
  const [ab, ba] = beide(A, B); assert.equal(ab.teamTage.length, 2); assert.equal(ab.teamTage.at(-1).eintraege[0].stunden, 8); assert.equal(ba.teamTage.at(-1).eintraege[0].stunden, 8);
});
test("Schichten auf beiden Handys mit derselben alten Kennung: beide bleiben, Kennungen danach verschieden", () => {
  const s = (datum, von, bis, erfasst) => ({ id: `s-${datum}-p1-0`, datum, person: "p1", von, bis, erfasst, storniert: false });
  const A = { schichten: [s("2027-01-02", "10:00", "18:00", "2027-01-02T18:01:00.000Z")] }, B = { schichten: [s("2027-01-03", "11:00", "19:00", "2027-01-03T19:01:00.000Z")] };
  const [ab, ba] = beide(A, B);
  assert.deepEqual(ab.schichten.map((x) => x.datum), ["2027-01-02", "2027-01-03"]); assert.equal(new Set(ab.schichten.map((x) => x.id)).size, 2);
  assert.equal(ab.schichten[0].id, schichtKennung(A.schichten[0])); assert.deepEqual(ohneReihe(ab), ohneReihe(ba));
});
test("Schicht für denselben Tag und dieselbe Person auf beiden Handys: die jüngere gilt, die ältere ist zurückgenommen; „zurückgenommen“ gewinnt", () => {
  const A = { schichten: [{ id: "s-x-0", datum: "2027-01-02", person: "p1", von: "10:00", bis: "18:00", erfasst: "2027-01-02T18:00:00.000Z", storniert: false }] };
  const B = { schichten: [{ id: "s-x-0", datum: "2027-01-02", person: "p1", von: "10:00", bis: "19:00", erfasst: "2027-01-02T19:30:00.000Z", storniert: false }] };
  const [ab, ba] = beide(A, B); const aktiv = ab.schichten.filter((x) => !x.storniert);
  assert.equal(ab.schichten.length, 2); assert.deepEqual(aktiv.map((x) => x.bis), ["19:00"]); assert.deepEqual(ohneReihe(ab), ohneReihe(ba));
  const C = { schichten: [{ ...A.schichten[0], storniert: "2027-01-03T08:00:00.000Z" }] }; const [ac] = beide(A, C);
  assert.equal(ac.schichten.length, 1); assert.equal(ac.schichten[0].storniert, "2027-01-03T08:00:00.000Z");
});
test("Abwesenheit, Lieferdienst, Preisrunden, Chef-Stunden, Geld heute: nichts geht verloren", () => {
  const A = { abwesend: [{ monat: "2027-01", datum: "2027-01-10", eintraege: [{ person: "p1", tage: 2 }], erfasst: "2027-01-10T10:00:00.000Z" }], lieferTage: [{ datum: "2027-01-02", betrag: 100, erfasst: "2027-01-02T22:00:00.000Z" }],
    preisRunden: [{ datum: "2027-01-05", gericht: "g1", alt: 7, neu: 7.5, mwst: 0.07, mengeMonat: 300 }], chef: { stundenMonat: 260, geaendert: "2027-01-01T10:00:00.000Z" }, liquiditaet: { betrag: 1000, datum: "2027-01-02" } };
  const B = { abwesend: [{ monat: "2027-02", datum: "2027-02-10", eintraege: [{ person: "p2", tage: 1 }], erfasst: "2027-02-10T10:00:00.000Z" }], lieferTage: [{ datum: "2027-01-03", betrag: 50, erfasst: "2027-01-03T22:00:00.000Z" }],
    preisRunden: [{ datum: "2027-01-06", gericht: "g2", alt: 5, neu: 5.5, mwst: 0.07, mengeMonat: 100 }], chef: { stundenMonat: 240, geaendert: "2027-01-05T10:00:00.000Z" }, liquiditaet: { betrag: 800, datum: "2027-01-06" } };
  const [ab, ba] = beide(A, B);
  assert.deepEqual(ab.abwesend.map((x) => x.monat), ["2027-01", "2027-02"]); assert.deepEqual(ab.lieferTage.map((x) => x.betrag), [100, 50]); assert.deepEqual(ab.preisRunden.map((x) => x.gericht), ["g1", "g2"]);
  assert.equal(ab.chef.stundenMonat, 240); assert.equal(ab.liquiditaet.betrag, 800); assert.deepEqual(ohneReihe(ab), ohneReihe(ba));
  const nurA = felderVerschmelzen({}, A, {}); assert.equal(nurA.chef.stundenMonat, 260); assert.equal(nurA.lieferTage.length, 1);
});
test("Zeki-Verlauf: vereinigt; nach „Verlauf löschen“ auf einem Handy kommen ältere Einträge nicht zurück", () => {
  const A = { zekiLog: [{ t: "2027-01-01T10:00:00.000Z", art: "frage" }] }, B = { zekiLog: [{ t: "2027-01-02T10:00:00.000Z", art: "antwort" }] };
  assert.equal(beide(A, B)[0].zekiLog.length, 2);
  const C = { zekiLog: [], zekiLogGeloescht: "2027-01-03T00:00:00.000Z" }; const [bc, cb] = beide(B, C);
  assert.deepEqual(bc.zekiLog, []); assert.deepEqual(cb.zekiLog, []); assert.equal(bc.zekiLogGeloescht, "2027-01-03T00:00:00.000Z");
});
test("Jedes Verfahren verträgt fehlende und kaputte Werte", () => {
  for (const [feld, f] of Object.entries(FELD_ABGLEICH)) for (const [a, b] of [[undefined, undefined], [null, 5], ["x", [null, 3, "y"]], [[{ datum: 5 }], undefined]]) assert.doesNotThrow(() => f(a, b, {}, {}), feld);
});
