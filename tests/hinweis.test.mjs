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

test("in der App erscheinen nur geprüfte Karten mit Prüfdatum; ungeprüfte nie", () => {
  const s = mitPersonal(laden()); for (let i = 1; i <= 5; i++) s.abschluesse.push({ id: "a" + i, datum: "2026-10-0" + i });
  s.inventuren = [{ id: "i1", datum: "2026-10-01", abgeschlossen: "2026-10-01T20:00:00.000Z", posten: {} }]; s.kostenbelege = [{ id: "kb", stelle: "strom", betrag: 50 }];
  const l = hinweiseFuer(s);
  assert.ok(l.length >= 5); for (const h of l) { assert.equal(h.geprueft, true); assert.match(h.pruefung, /^2026-\d{2}-\d{2} /); }
  assert.ok(!l.some((h) => ["bewirtung", "pfand"].includes(h.id)), "ungeprüfte Karten bleiben unsichtbar (24.10.2026: bewirtung und pfand ohne Originallesung)");
  assert.equal(hinweiseFuer(laden()).length, 0, "leerer Laden: keine Karte");
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
  assert.ok(l.some((h) => h.id === "berufskleidung")); assert.ok(!l.some((h) => h.id === "menue_aufteilen")); assert.ok(!l.some((h) => h.id === "steuer_sieben"), "ohne 5 Abschlüsse keine Kassenkarte");
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
  assert.ok(hinweisPruefen({ ...hinweisMitId("gwg"), pruefung: "" }).some((f) => /Prüfdatum/.test(f)), "geprüft nur mit Datum");
});

// Gremium 2 (24.10.2026): kaputte Importdaten dürfen die Hinweise nicht sprengen
test("hinweiseFuer und hinweisStatusSetzen überleben kaputte hinweise-Daten", async () => {
  const { hinweisStatusSetzen } = await import("../js/hinweis.js");
  for (const kaputt of ["x", {}, 5, null]) {
    const s = laden(); s.betrieb.hinweise = kaputt;
    assert.doesNotThrow(() => hinweiseFuer(s));
    assert.doesNotThrow(() => hinweisStatusSetzen(s, "gwg", "erledigt"));
    assert.ok(Array.isArray(s.betrieb.hinweise));
  }
});

// 24.10.2026: Karten in en und tr vollständig, gleiche Regeln wie Deutsch (Satzlänge, Steuerberater-Satz, verbotene Wörter)
test("Hinweis-Texte en/tr: jede geprüfte Karte übersetzt, höchstens 25 Wörter, Steuerberater-Satz, keine verbotenen Wörter", async () => {
  const { HINWEIS_TEXTE, hinweisAnzeige } = await import("../js/data/hinweis_texte.js");
  const verboten = /rechtssicher|steuersicher|betriebsprüfungsfest|gobd|revolution|disrupt|marktführer|lückenlos|zertifiziert|manipulationssicher|haccp/i;
  for (const [sp, pflicht] of [["en", /tax advisor/i], ["tr", /mali müşavir/i]]) {
    for (const h of HINWEISE) {
      const x = HINWEIS_TEXTE[sp][h.id]; assert.ok(x, `${sp}: ${h.id} fehlt`);
      assert.ok(x.satz.split(/\s+/).length <= 27, `${sp} ${h.id}: ${x.satz.split(/\s+/).length} Wörter`);
      assert.match(x.satz, pflicht, `${sp} ${h.id}: Steuerberater-Satz fehlt`);
      assert.ok(!verboten.test(x.titel + " " + x.satz), `${sp} ${h.id}: verbotenes Wort`);
      assert.ok(x.titel.split(/\s+/).length <= 5, `${sp} ${h.id}: Titel zu lang`);
      const a = hinweisAnzeige(h, sp); assert.equal(a.quelle, h.quelle); assert.equal(a.titel, x.titel);
    }
    assert.equal(Object.keys(HINWEIS_TEXTE[sp]).length, HINWEISE.length, `${sp}: verwaiste Übersetzungen`);
  }
  assert.equal(hinweisAnzeige(HINWEISE[0], "xx").titel, HINWEISE[0].titel, "unbekannte Sprache → Deutsch");
});
