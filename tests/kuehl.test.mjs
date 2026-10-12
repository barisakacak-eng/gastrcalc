// Tests Etappe 4: Kühlkontrolle – Grenzen, Rundgang, Abschluss ins Journal, Nachkontrollen, Monatsblatt mit Lücken.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../js/engine.js";
import { heute } from "../js/util.js";
globalThis.indexedDB = undefined;
const S = await import("../js/store.js");

const H = heute();
const tag = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return heute(d); };
const laden = () => { const b = S.leererBetrieb(); b.phase = "app";
  b.kuehlstellen = [{ id: "k1", name: "Theke", art: "kuehl", min: null, max: 7, reihe: 0, archiviert: false }, { id: "k2", name: "TK Keller", art: "tk", min: null, max: -18, reihe: 1, archiviert: false }, { id: "k3", name: "Bain-Marie", art: "warm", min: 65, max: null, reihe: 2, archiviert: false }];
  b.kuehl = { takt: 1, ruhetage: [], eingerichtet: true }; b.personen = [{ id: "p1", kuerzel: "MU", aktiv: true, entfernt: false }]; return b; };

test("Grenzen: ohne eigene Grenze gilt der Standard je Art; Abweichung je Art", () => {
  const b = laden(); assert.equal(E.kuehlBereit(b), true);
  b.kuehlstellen.push({ id: "k4", name: "Neu", art: "tk", min: null, max: null, reihe: 3, archiviert: false }); assert.equal(E.kuehlBereit(b), true, "Standardgrenze reicht");
  assert.deepEqual(E.grenzenVon(b.kuehlstellen[3]), { min: null, max: -18, standard: true });
  assert.equal(E.abweichung(b.kuehlstellen[3], -15), true); assert.equal(E.abweichung(b.kuehlstellen[3], -19), false);
  b.kuehlstellen[3].max = -20; assert.deepEqual(E.grenzenVon(b.kuehlstellen[3]), { min: null, max: -20, standard: false }); assert.equal(E.abweichung(b.kuehlstellen[3], -19), true, "eigene Grenze schlägt Standard");
  b.kuehlstellen.push({ id: "k5", name: "", art: "kuehl", min: null, max: null, reihe: 4, archiviert: false }); assert.equal(E.kuehlBereit(b), false, "ohne Namen nicht bereit");
  b.kuehlstellen[4].archiviert = true; assert.equal(E.kuehlBereit(b), true, "archivierte Stelle zählt nicht");
  b.kuehlstellen.splice(3, 2);
  assert.equal(E.abweichung(b.kuehlstellen[0], 7), false); assert.equal(E.abweichung(b.kuehlstellen[0], 7.5), true);
  assert.equal(E.abweichung(b.kuehlstellen[1], -18), false); assert.equal(E.abweichung(b.kuehlstellen[1], -12), true);
  assert.equal(E.abweichung(b.kuehlstellen[2], 70), false); assert.equal(E.abweichung(b.kuehlstellen[2], 58), true);
  assert.equal(E.abweichung(b.kuehlstellen[0], null), false, "nicht gemessen ist keine Abweichung");
});

test("Rundgang: bis zum Abschluss änderbar, danach im Journal mit laufender Nummer; Nachkontrolle schließt durch spätere Messung", () => {
  const b = laden(); const w = S.leereWurzel(); w.betriebe.push(b); w.aktiv = b.id;
  const r = E.rundgangStarten(b, { von: "p1" });
  assert.equal(E.rundgangStarten(b), r, "nur ein offener Rundgang");
  E.stationEintragen(r, b.kuehlstellen[0], { wert: 48 }); // vertippt
  E.stationEintragen(r, b.kuehlstellen[0], { wert: 4.8 }); // korrigiert vor dem Abschluss
  assert.equal(r.messungen.length, 1); assert.equal(r.messungen[0].wert, 4.8); assert.equal(r.messungen[0].abweichung, false);
  E.stationEintragen(r, b.kuehlstellen[1], { wert: -11, massnahmen: ["tuer", "eingestellt"], nachkontrolle: "h2" });
  E.stationEintragen(r, b.kuehlstellen[2], { wert: null, grund: "geraetAus" });
  assert.equal(r.messungen[1].abweichung, true);
  E.rundgangAbschliessen(b, r, () => S.naechsteLfd(w));
  assert.ok(r.abgeschlossen); assert.equal(b.messungen.length, 3); assert.deepEqual(b.messungen.map((m) => m.lfd), [1, 2, 3]);
  assert.equal(b.messungen[1].nachkontrolle.art, "h2"); assert.ok(b.messungen[1].nachkontrolle.faellig);
  assert.equal(b.messungen[2].wert, null); assert.equal(b.messungen[2].grund, "geraetAus");
  assert.equal(E.offeneNachkontrollen(b).length, 1);
  assert.equal(E.rundgangOffen(b), null);
  // spätere Messung derselben Stelle schließt die Nachkontrolle
  const r2 = E.rundgangStarten(b, { von: "p1" }); E.stationEintragen(r2, b.kuehlstellen[1], { wert: -19 }); E.rundgangAbschliessen(b, r2, () => S.naechsteLfd(w));
  assert.equal(E.offeneNachkontrollen(b).length, 0);
  assert.equal(E.letzteMessung(b, "k2").wert, -19);
  const st = E.kuehlStatus(b); assert.equal(st.heuteGemessen, 3); assert.equal(st.nachkontrollen, 0);
});

test("Monatsblatt: pünktlich, nacherfasst, nicht gemessen, fehlt, Ruhetag, offen heute", () => {
  const b = laden(); b.kuehl.ruhetage = [new Date(tag(-3) + "T12:00:00").getDay()];
  const w = S.leereWurzel();
  // Messung „an einem Tag": pünktliche Messungen tragen das Datum ihrer Eingabe – für den Test wird es nachträglich gesetzt
  const mess = (datum, wert, extra = {}) => { const r = E.rundgangStarten(b, { datum, ...extra }); E.stationEintragen(r, b.kuehlstellen[0], { wert }); E.rundgangAbschliessen(b, r, () => S.naechsteLfd(w)); if (!extra.nacherfasst) { const m = b.messungen.at(-1); m.datum = datum; m.zeit = datum + "T06:00:00.000Z"; } };
  mess(tag(-6), 4); mess(tag(-5), 5, { nacherfasst: true, quelle: "zettel" }); mess(tag(-4), null); // -3 Ruhetag, -2 fehlt, -1 fehlt, heute offen
  const mb = E.monatsblatt(b, "k1", { von: tag(-6), bis: H });
  assert.deepEqual(mb.tage.map((t) => t.status), ["puenktlich", "nacherfasst", "nichtGemessen", "ruhetag", "fehlt", "fehlt", "offen"]);
  assert.equal(mb.zaehl.fehlt, 2);
  const st = E.kuehlStatus(b); assert.equal(st.fehlt7, 6, "7 Vortage, davon ein Ruhetag; k2/k3 nie gemessen");
  // takt 2: eine Messung ist „teilweise"
  b.kuehl.takt = 2; assert.equal(E.monatsblatt(b, "k1", { von: tag(-6), bis: tag(-6) }).tage[0].status, "teilweise");
});

test("Schwund ohne Wert aus der Kühlkontrolle: Wert einmal nachtragen, nie überschreiben", () => {
  const b = laden(); b.schwund.push({ id: "e1", datum: H, art: "verderb", ref: { typ: "frei", name: "Inhalt Theke" }, menge: 1, einheit: "stk", wert: null, wertOffen: true, quelle: "kuehl" });
  assert.equal(E.schwundOhneWert(b).length, 1);
  assert.equal(E.schwundWertSetzen(b.schwund[0], 180), true); assert.equal(b.schwund[0].wert, 180); assert.equal(E.schwundOhneWert(b).length, 0);
  assert.equal(E.schwundWertSetzen(b.schwund[0], 999), false, "einmal gesetzt bleibt");
  const a = E.schwundAuswertung(b, { von: H, bis: H }); assert.equal(a.muellwert, 180);
});

test("Abnahme Posten 1: Nachkontrolle schließt nur durch echte spätere Messung; weggeworfen erst beim Abschluss; Datum vom Eingabetag", () => {
  const b = laden(); const w = S.leereWurzel();
  const r = E.rundgangStarten(b, { von: "p1" });
  E.stationEintragen(r, b.kuehlstellen[0], { wert: 12, massnahmen: ["weggeworfen"], nachkontrolle: "h1", weg: [{ ref: { typ: "frei", name: "Salat" }, menge: 2, einheit: "stk", wert: null }] });
  assert.equal(b.schwund.length, 0, "vor dem Abschluss kein Schwund");
  E.stationEintragen(r, b.kuehlstellen[0], { wert: 12, massnahmen: ["weggeworfen"], nachkontrolle: "h1", weg: [{ ref: { typ: "frei", name: "Salat" }, menge: 2, einheit: "stk", wert: null }] }); // erneut gespeichert
  E.rundgangAbschliessen(b, r, () => S.naechsteLfd(w), w.geraet, (n) => "Kühl " + n);
  assert.equal(b.schwund.length, 1, "genau ein Schwund-Eintrag trotz doppeltem Speichern"); assert.equal(b.schwund[0].wertOffen, true); assert.equal(b.schwund[0].grund, "Kühl Theke");
  assert.equal(b.messungen[0].geraet, w.geraet); assert.equal(b.messungen[0].datum, H);
  assert.equal(E.offeneNachkontrollen(b).length, 1);
  // „nicht gemessen" schließt nicht; nacherfasste Messung schließt nicht; echte Messung schließt
  const r2 = E.rundgangStarten(b); E.stationEintragen(r2, b.kuehlstellen[0], { wert: null, grund: "leer" }); E.rundgangAbschliessen(b, r2, () => S.naechsteLfd(w));
  assert.equal(E.offeneNachkontrollen(b).length, 1, "nicht gemessen schließt nicht");
  const r3 = E.rundgangStarten(b, { datum: tag(-1), nacherfasst: true, quelle: "zettel" }); E.stationEintragen(r3, b.kuehlstellen[0], { wert: 3 }); E.rundgangAbschliessen(b, r3, () => S.naechsteLfd(w));
  assert.equal(E.offeneNachkontrollen(b).length, 1, "Nachtrag vom Vortag schließt nicht");
  assert.equal(b.messungen.at(-1).datum, tag(-1), "nacherfasst behält den gewählten Tag");
  const r4 = E.rundgangStarten(b); E.stationEintragen(r4, b.kuehlstellen[0], { wert: 4 }); E.rundgangAbschliessen(b, r4, () => S.naechsteLfd(w));
  assert.equal(E.offeneNachkontrollen(b).length, 0);
  // nacherfasste Abweichung: keine Fälligkeit „ab jetzt"
  const r5 = E.rundgangStarten(b, { datum: tag(-2), nacherfasst: true }); E.stationEintragen(r5, b.kuehlstellen[1], { wert: -5, massnahmen: ["tuer"], nachkontrolle: "h2" }); E.rundgangAbschliessen(b, r5, () => S.naechsteLfd(w));
  assert.equal(b.messungen.at(-1).nachkontrolle, null, "Nachtrag: keine Nachkontrolle, kein offener Punkt");
  assert.equal(E.offeneNachkontrollen(b).length, 0);
  // Korrektur ohne Abweichung nimmt Maßnahmen mit
  const r6 = E.rundgangStarten(b); E.stationEintragen(r6, b.kuehlstellen[0], { wert: 48, massnahmen: ["tuer"], notiz: "x", nachkontrolle: "h1" }); E.stationEintragen(r6, b.kuehlstellen[0], { wert: 4.8, massnahmen: ["tuer"], notiz: "x", nachkontrolle: "h1" });
  assert.deepEqual(r6.messungen[0].massnahmen, []); assert.equal(r6.messungen[0].nachkontrolle, null);
  // letzte Messung: nach Datum, nicht nach Eingabezeit
  const r7 = E.rundgangStarten(b); E.stationEintragen(r7, b.kuehlstellen[0], { wert: 5 }); E.rundgangAbschliessen(b, r7, () => S.naechsteLfd(w));
  const r8 = E.rundgangStarten(b, { datum: tag(-3), nacherfasst: true }); E.stationEintragen(r8, b.kuehlstellen[0], { wert: 1 }); E.rundgangAbschliessen(b, r8, () => S.naechsteLfd(w));
  assert.equal(E.letzteMessung(b, "k1").wert, 5, "Nachtrag vom Vortag ist nicht die letzte Messung");
});

test("Etappe 5: Grenze je Feld (Standard bleibt für das leere Feld); Nachkontrolle nur durch Wert innerhalb der Grenze erledigt", () => {
  const b = laden();
  const k = { id: "k9", name: "Fisch", art: "kuehl", min: 0, max: null, reihe: 9, archiviert: false };
  assert.deepEqual(E.grenzenVon(k), { min: 0, max: 7, standard: false }); assert.equal(E.abweichung(k, 12), true);
  const m1 = { id: "m1", stelle: "k1", datum: "2026-10-12", zeit: "2026-10-12T08:00:00.000Z", wert: 8, abweichung: true, nachkontrolle: { art: "h1", faellig: null }, storniert: false, nacherfasst: false };
  const m2 = { id: "m2", stelle: "k1", datum: "2026-10-12", zeit: "2026-10-12T09:00:00.000Z", wert: 9, abweichung: true, nachkontrolle: { art: "h1", faellig: null }, storniert: false, nacherfasst: false };
  b.messungen = [m1, m2];
  assert.equal(E.nachkontrolleErledigt(b, m1), null, "ein weiterer Ausreißer erledigt nichts"); assert.equal(E.offeneNachkontrollen(b).length, 2);
  b.messungen.push({ id: "m3", stelle: "k1", datum: "2026-10-12", zeit: "2026-10-12T10:00:00.000Z", wert: 4, abweichung: false, nachkontrolle: null, storniert: false, nacherfasst: false });
  assert.equal(E.nachkontrolleErledigt(b, m1)?.id, "m3"); assert.equal(E.offeneNachkontrollen(b).length, 0);
});
