// Hinweis-Karten (Vertrag docs/vertraege.md Abschnitt 2): nur geprüfte, ausgelöste Karten; Status nur über hinweisStatusSetzen.
import test from "node:test";
import assert from "node:assert/strict";
import { leererBetrieb } from "../js/store.js";
import { HINWEISE, AUSLOESER, hinweiseFuer, hinweiseAnzahl, hinweisStatusSetzen, hinweisPruefen, hinweisMitId, KNOPF } from "../js/hinweis.js";

function laden() { const b = leererBetrieb(); b.betrieb = { name: "Test", format: "imbiss" }; return b; }
const mitPersonal = (s) => { s.personen = [{ id: "p1", kuerzel: "AL", aktiv: true, entfernt: false }]; return s; };

test("jede Karte hält den Vertrag: ≤ 25 Wörter, ≤ 4 Wörter Titel, Steuerberater-Hinweis, Quelle, Auslöser, keine verbotenen Wörter", () => {
  assert.ok(HINWEISE.length >= 5);
  for (const h of HINWEISE) assert.deepEqual(hinweisPruefen(h), [], h.id);
  assert.equal(new Set(HINWEISE.map((h) => h.id)).size, HINWEISE.length, "ids eindeutig");
});

test("in der App ist die Liste leer, solange keine Karte geprüft ist (keine ungeprüfte Steuerkarte)", () => {
  const s = mitPersonal(laden());
  assert.equal(hinweiseFuer(s).length, HINWEISE.filter((h) => h.geprueft).length);
});

test("Auslöser mitarbeiter: nur aktive, nicht entfernte Personen", () => {
  const s = laden(); assert.equal(AUSLOESER.mitarbeiter(s), false);
  s.personen = [{ id: "p1", kuerzel: "AL", aktiv: false }]; assert.equal(AUSLOESER.mitarbeiter(s), false);
  s.personen.push({ id: "p2", kuerzel: "ME", aktiv: true, entfernt: false }); assert.equal(AUSLOESER.mitarbeiter(s), true);
});

test("Auslöser personalessen, menue, inventur, abschluesse5, belege aus echten Feldern", () => {
  const s = laden();
  assert.equal(AUSLOESER.personalessen(s), false); s.schwund.push({ id: "x", datum: "2026-10-20", art: "personal", menge: 1 }); assert.equal(AUSLOESER.personalessen(s), true);
  assert.equal(AUSLOESER.menue(s), false); s.kassenKombis = [{ id: "k1", teile: [{ gericht: "g1" }, { gericht: "g2" }] }]; assert.equal(AUSLOESER.menue(s), true);
  assert.equal(AUSLOESER.inventur(s), false); s.inventuren = [{ id: "i1", datum: "2026-10-01", abgeschlossen: "2026-10-01T20:00:00.000Z", posten: {} }]; assert.equal(AUSLOESER.inventur(s), true);
  assert.equal(AUSLOESER.abschluesse5(s), false); for (let i = 1; i <= 5; i++) s.abschluesse.push({ id: "a" + i, datum: "2026-10-0" + i }); assert.equal(AUSLOESER.abschluesse5(s), true);
  assert.equal(AUSLOESER.belege(s), false); s.kostenbelege = [{ id: "kb", stelle: "strom", betrag: 50, storniert: false }]; assert.equal(AUSLOESER.belege(s), true);
});

test("ausgelöste Karten mit nurGeprueft: false; nicht ausgelöste fehlen; Reihenfolge nach Register-Nummer", () => {
  const s = mitPersonal(laden()); const l = hinweiseFuer(s, { nurGeprueft: false });
  assert.ok(l.some((h) => h.id === "berufskleidung")); assert.ok(!l.some((h) => h.id === "menue_aufteilen"));
  for (const h of l) { assert.equal(h.status, "neu"); assert.equal(h.knopf, KNOPF); }
  const nummern = l.map((h) => h.register); assert.deepEqual(nummern, [...nummern].sort());
});

test("Status: erledigt blendet aus, später sortiert nach hinten, unbekannte Karte/Status wird abgelehnt", () => {
  const s = mitPersonal(laden());
  assert.equal(hinweisStatusSetzen(s, "berufskleidung", "erledigt", { jetzt: "2026-10-23T10:00:00.000Z" }), true);
  assert.equal(hinweisStatusSetzen(s, "berufskleidung", "erledigt"), false, "gleicher Status = keine Änderung");
  assert.ok(!hinweiseFuer(s, { nurGeprueft: false }).some((h) => h.id === "berufskleidung"));
  assert.ok(hinweiseFuer(s, { nurGeprueft: false, mitErledigt: true }).some((h) => h.id === "berufskleidung" && h.status === "erledigt"));
  assert.equal(hinweisStatusSetzen(s, "personalessen", "spaeter"), true);
  const l = hinweiseFuer(s, { nurGeprueft: false }); assert.equal(l[l.length - 1].id, "personalessen");
  assert.equal(hinweisStatusSetzen(s, "gibtesnicht", "neu"), false); assert.equal(hinweisStatusSetzen(s, "personalessen", "weg"), false);
  assert.deepEqual(s.betrieb.hinweise.map((e) => e.id), ["berufskleidung", "personalessen"]);
});

test("Anzahl zählt nur neue Karten; Betriebsart filtert gilt_fuer", () => {
  const s = mitPersonal(laden());
  const alle = hinweiseAnzahl(s, { nurGeprueft: false }); assert.ok(alle >= 3);
  hinweisStatusSetzen(s, "berufskleidung", "spaeter"); assert.equal(hinweiseAnzahl(s, { nurGeprueft: false }), alle - 1);
  assert.equal(hinweiseFuer(s, { nurGeprueft: false, betriebsart: "burger" }).length, hinweiseFuer(s, { nurGeprueft: false }).length, "alle Startkarten gelten für beide");
});

test("hinweisPruefen erkennt Verstöße: zu lang, ohne Steuerberater-Hinweis, verbotenes Wort", () => {
  const zuLang = { ...hinweisMitId("gwg"), satz: Array(26).fill("wort").join(" ") + " mit deinem Steuerberater klären" };
  assert.ok(hinweisPruefen(zuLang).some((f) => /Wörter/.test(f)));
  assert.ok(hinweisPruefen({ ...hinweisMitId("gwg"), satz: "So sparst du Geld." }).length >= 2);
  assert.ok(hinweisPruefen({ ...hinweisMitId("gwg"), titel: "Das ist rechtssicher und gut" }).some((f) => /verboten|titel/.test(f)));
});
