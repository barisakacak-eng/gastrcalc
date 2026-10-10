// Tests Etappe 3: Schwund-Auswertung, Tagesnotiz, Läden-Übersicht, Speicher-Migration.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../js/engine.js";
import { heute } from "../js/util.js";
globalThis.indexedDB = undefined;
const S = await import("../js/store.js");

const nah = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);
const H = heute();
const stand = () => ({
  id: "b1", phase: "app", betrieb: { name: "Döner Baris", format: "imbiss", kuechen: ["doener"], tageProWoche: 6, monate: 12 },
  team: { personen: 3, stundenProPerson: 160, lohnkosten: 6000 },
  kosten: [ { kategorie: "miete", betrag: 2000, status: "bekannt", periode: "monat" } ],
  kanaele: { portale: [] }, verkauf: { zielgewinn: 10, bestellungenTag: 200 },
  artikel: [
    { name: "Dönerspieß Kalb/Pute", gruppe: "fleisch", einheit: "kg", packung: { menge: 10, einheit: "kg" }, preis: 74.5, garverlust: { wert: 0.15 } },
    { name: "Dönerbrot / Fladen", gruppe: "teig", einheit: "stk", packung: { menge: 100, einheit: "stk" }, preis: 41 },
    { name: "Tomaten", gruppe: "gemuese", einheit: "kg", packung: { menge: 5, einheit: "kg" }, preis: null },
  ],
  gerichte: [ { id: "d", name: "Döner", klasse: "haupt", zeit: 4, preis: 7.5, mengeTag: 150, steuer: 0.07, zutaten: [ { name: "Dönerspieß Kalb/Pute", menge: 180, einheit: "g" }, { name: "Dönerbrot / Fladen", menge: 1, einheit: "stk" } ] } ],
  schwund: [
    { id: "s1", datum: H, art: "verderb", ref: { typ: "artikel", name: "Dönerspieß Kalb/Pute" }, menge: 2, einheit: "kg", fraktion: "bio" },
    { id: "s2", datum: H, art: "bruch", ref: { typ: "artikel", name: "Dönerbrot / Fladen" }, menge: 10, einheit: "stk", fraktion: "bio" },
    { id: "s3", datum: H, art: "verderb", ref: { typ: "artikel", name: "Tomaten" }, menge: 1, einheit: "kg", fraktion: "bio" }, // ohne Preis
    { id: "s4", datum: H, art: "personal", ref: { typ: "gericht", id: "d" }, menge: 2, mahlzeit: "mittag" },
    { id: "s5", datum: H, art: "eigen", ref: { typ: "gericht", id: "d" }, menge: 1, person: "Baris" },
    { id: "s6", datum: H, art: "verderb", ref: { typ: "artikel", name: "Dönerbrot / Fladen" }, menge: 50, einheit: "stk", storniert: true },
    { id: "s7", datum: "2020-01-01", art: "verderb", ref: { typ: "artikel", name: "Dönerbrot / Fladen" }, menge: 50, einheit: "stk" },
  ],
  tagesnotizen: [ { datum: H, umsatz: 1800 } ],
});

test("wertEintrag: Rohware nach Gewicht ohne Garverlust, Gericht über Wareneinsatz, fehlender Preis = null", () => {
  const s = stand();
  nah(E.wertEintrag(s.schwund[0], s), 2 * 7.45);          // 2 kg Spieß à 7,45 €/kg
  nah(E.wertEintrag(s.schwund[1], s), 10 * 0.41);
  assert.equal(E.wertEintrag(s.schwund[2], s), null);
  const doenerWaren = (180 / 0.85) * 0.00745 + 0.41;
  nah(E.wertEintrag(s.schwund[3], s), 2 * doenerWaren);
  assert.equal(E.wertEintrag({ art: "verderb", ref: { typ: "artikel", name: "Dönerbrot / Fladen" }, menge: 100, einheit: "g" }, s), null); // Einheiten-Mix
});

test("schwundAuswertung: drei Vorgangsarten getrennt, storniert und alt bleiben draußen, Portionen über DB", () => {
  const s = stand(); const a = E.schwundAuswertung(s, E.zeitraumTage(7));
  nah(a.muellwert, 2 * 7.45 + 10 * 0.41); assert.equal(a.ohneWert, 1); assert.equal(a.anzahl, 5);
  nah(a.jeArt.verderb, 2 * 7.45); nah(a.jeArt.bruch, 4.1);
  assert.equal(a.jeFraktion.bio.anzahl, 3);
  assert.equal(a.personal.anzahl, 2); nah(a.personal.svev, 2 * 4.57); assert.ok(a.personal.waren > 0);
  assert.equal(a.eigen.anzahl, 1);
  assert.ok(a.dbJePortion > 0); nah(a.portionen, a.muellwert / a.dbJePortion);
  assert.equal(E.SCHWUND_ARTEN.personal, 2); assert.equal(E.SCHWUND_ARTEN.eigen, 3);
});

test("Tagesnotiz: ein Eintrag je Tag, Umsatz im Zeitraum, Wochen-Soll = Monatslast × 12/52", () => {
  const s = stand(); E.tagesnotizSetzen(s, H, 2100); E.tagesnotizSetzen(s, H, 2150); E.tagesnotizSetzen(s, "2020-01-01", 99);
  assert.equal(s.tagesnotizen.filter((n) => n.datum === H).length, 2, "Tippen in derselben Sitzung ändert den frischen Eintrag (plus der alte aus dem Fixture)");
  assert.equal(E.umsatzEintrag(s, H).umsatz, 2150);
  // Eintrag von einem anderen Gerät: neuer Eintrag, Konflikt sichtbar
  s.tagesnotizen.push({ id: "fremd", datum: H, umsatz: 1900, erfasst: "2020-01-01T00:00:00Z", nacherfasst: false, geraet: "anderes-handy" });
  assert.deepEqual(E.umsatzKonflikte(s), [H]); assert.equal(E.umsatzEintrag(s, H).umsatz, 2150, "jüngster gilt");
  s.tagesnotizen.pop(); s.tagesnotizen = s.tagesnotizen.filter((n) => n.datum !== H || n.sitzung); E.tagesnotizSetzen(s, H, 2100);
  assert.deepEqual(E.umsatzZeitraum(s, E.zeitraumTage(7)), { summe: 2100, tage: 1 });
  E.tagesnotizLoeschen(s, H); assert.equal(E.umsatzEintrag(s, H), null);
  nah(E.wochenSoll(s), E.monatsLast(s).gesamt * 12 / 52);
});

test("ladenUebersicht: die fünf Zahlen je Laden", () => {
  const u = E.ladenUebersicht(stand());
  assert.equal(u.name, "Döner Baris"); nah(u.umsatz7, 1800); assert.ok(u.soll7 > 0); assert.ok(u.abfall7 > 0); assert.ok(u.portionen7 > 0);
  assert.equal(u.ohneWert7, 1); assert.ok(u.ampel); assert.equal(u.offen, 0);
});

test("Speicher: Schema 1 wird zu einer Wurzel mit einem Laden, Schema 2 bleibt, Zusammenführen ersetzt und ergänzt", async () => {
  const alt = { schema: 1, sprache: "tr", phase: "app", betrieb: { name: "Alt" }, kosten: [], kanaele: {}, gerichte: [], artikel: [] };
  const w = S.migrierenWurzel(alt);
  assert.equal(w.schema, S.SCHEMA); assert.equal(w.sprache, "tr"); assert.equal(w.betriebe.length, 1); assert.equal(w.aktiv, w.betriebe[0].id);
  assert.equal(w.betriebe[0].betrieb.name, "Alt"); assert.equal(w.betriebe[0].schema, undefined);
  const w2 = S.migrierenWurzel({ schema: 2, sprache: "de", aktiv: "x", betriebe: [ { id: "x", betrieb: { name: "X" } }, { id: "y", betrieb: { name: "Y" } } ] });
  assert.equal(w2.betriebe.length, 2); assert.equal(w2.aktiv, "x");
  const imp = S.migrierenWurzel({ schema: 2, aktiv: "y", betriebe: [ { id: "y", betrieb: { name: "Y neu" } }, { id: "z", betrieb: { name: "Z" } } ] });
  const r = S.zusammenfuehren(w2, imp);
  assert.deepEqual(r, { ersetzt: 1, neu: 1 }); assert.equal(w2.betriebe.length, 3);
  assert.equal(w2.betriebe.find((b) => b.id === "y").betrieb.name, "Y neu"); assert.equal(w2.aktiv, "x");
  // Alte Sicherungsdatei (Schema 1) lesen
  const d = await S.importDatei(JSON.stringify({ typ: "gastrocalc-sicherung", schema: 1, stand: alt, ereignisse: [] }));
  assert.equal(d.wurzel.betriebe[0].betrieb.name, "Alt");
});

test("Momentaufnahme: 'kein Preis' bleibt 'kein Preis', auch wenn später ein Preis da ist", () => {
  const s = stand();
  s.schwund.push({ id: "x", datum: H, art: "verderb", ref: { typ: "artikel", name: "Dönerspieß Kalb/Pute" }, menge: 1, einheit: "kg", fraktion: "bio", wert: null });
  const ohne = E.schwundAuswertung(stand(), { von: H, bis: H });
  const mit = E.schwundAuswertung(s, { von: H, bis: H });
  assert.equal(mit.ohneWert, ohne.ohneWert + 1); nah(mit.muellwert, ohne.muellwert);
});
