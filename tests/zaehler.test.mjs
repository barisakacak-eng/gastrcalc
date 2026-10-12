import test from "node:test";
import assert from "node:assert/strict";
import * as Z from "../js/zaehler.js";
import * as M from "../js/muell.js";
import * as L from "../js/lieferung.js";
import * as E from "../js/engine.js";
import { leererBetrieb } from "../js/store.js";
import { belegZerlegen } from "../js/beleg.js";

const nah = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

// Testladen: Oktober 2026, 26 Öffnungstage (Samstag frei), Fixkosten 2.600 netto, Löhne 3.000, eigener Lohn 2.400 → 8.000 im Monat, 307,69 je Tag.
function laden() {
  const b = leererBetrieb();
  b.betrieb = { name: "Test", format: "imbiss", kuechen: ["doener"], tageProWoche: 6, monate: 12, steuerSatz: 0.07 };
  b.team = { personen: 3, stundenProPerson: 160, lohnkosten: 3000, eigenerLohn: 2400, eigenerLohnStatus: "eigen" };
  b.kosten = [{ id: "m", kategorie: "miete", posten: "miete", betrag: 2000, status: "bekannt", periode: "monat", basis: "netto" }, { id: "s", kategorie: "energie", posten: "strom", betrag: 714, status: "bekannt", periode: "monat", basis: "brutto" }];
  b.kuehl.ruhetage = [6];
  b.artikel = [{ name: "Dönerspieß Kalb/Pute", gruppe: "fleisch", einheit: "kg", packung: { menge: 1, einheit: "kg" }, gebinde: { art: "packung", zwischen: null }, preis: 8, preisBasis: "netto", preisHistorie: [] },
    { name: "Dönerbrot / Fladen", gruppe: "teig", einheit: "stk", packung: { menge: 10, einheit: "stk" }, gebinde: { art: "packung", zwischen: null }, preis: 3, preisBasis: "netto", preisHistorie: [] },
    { name: "Tomaten", gruppe: "gemuese", einheit: "kg", packung: { menge: 6, einheit: "kg" }, gebinde: { art: "kiste", zwischen: null }, preis: 9.6, preisBasis: "netto", preisHistorie: [] }];
  b.gerichte = [{ id: "d", name: "Döner", bereich: "doener", klasse: "haupt", zeit: 3, vorlage: true, preis: 7, mengeTag: 100, steuer: 0.07,
    zutaten: [{ name: "Dönerspieß Kalb/Pute", menge: 150, einheit: "g" }, { name: "Dönerbrot / Fladen", menge: 1, einheit: "stk" }, { name: "Tomaten", menge: 50, einheit: "g" }] }];
  b.phase = "app";
  return b;
}
const stand = (b, datum, umsatz) => { b.tagesnotizen.push({ id: "n" + datum, datum, umsatz, erfasst: datum + "T20:00:00.000Z", storniert: false }); };

test("Zähler Stufe 2: Kosten je Öffnungstag, netto, Deckungsbeitrag statt vollem Umsatz, Müll drückt", () => {
  const b = laden();
  const z0 = Z.zaehler(b, { datum: "2026-10-12" });
  assert.equal(z0.stufe, 2); assert.equal(z0.keinUmsatz, true); assert.equal(z0.imPlus, false);
  nah(z0.gewichtMonat, 26); nah(z0.tageskosten, (2000 + 600 + 3000 + 2400) / 26); // Strom 714 brutto = 600 netto
  nah(z0.gewichtBisHeute, 10); // 1.–12.10.: zwei Samstage (3. und 10.)
  nah(z0.kosten, z0.tageskosten * 10); nah(z0.stand, -z0.tageskosten * 10);
  // Umsatz 1.070 brutto = 1.000 netto am 12.; Ware aus der Karte: Döner 1,2 € Fleisch + 0,3 Brot + 0,08 Tomaten = 1,58 € von 6,54 netto
  stand(b, "2026-10-12", 1070);
  const z = Z.zaehler(b, { datum: "2026-10-12" });
  nah(z.umsatzNetto, 1000); const q = (0.15 * 8 + 0.3 + 0.05 * 1.6) / (7 / 1.07); nah(z.quote, q, 1e-6); nah(z.ware, 1000 * q);
  nah(z.stand, 1000 - 1000 * q - z.kosten); assert.equal(z.tageMitUmsatz, 1); nah(z.bewegungHeute, 1000 - 1000 * q - z.tageskosten);
  // Müll heute 20 € schiebt den Zähler um 20 € ins Rote
  b.schwund.push({ id: "w", datum: "2026-10-12", art: "gericht", vorgang: 1, ref: { typ: "gericht", id: "d" }, menge: 2, einheit: "portion", wert: 20, storniert: false });
  nah(Z.zaehler(b, { datum: "2026-10-12" }).stand, z.stand - 20);
  // Prognose: Tagesschnitt netto 1.000 − Ware − Müll gegen Tageskosten → Null-Tag liegt vor Monatsende
  const z2 = Z.zaehler(b, { datum: "2026-10-12" });
  assert.ok(z2.dbProTag > z2.tageskosten); assert.ok(z2.nullTag !== null && z2.nullTag > "2026-10-12" && z2.nullTag <= "2026-10-31", z2.nullTag);
  assert.ok(z2.monatsende > z2.stand); assert.equal(z2.reichtNicht, false);
  assert.equal(z2.tage.length, 31); assert.equal(z2.tage[2].gewicht, 0, "Samstag 3.10. ist Ruhetag"); assert.equal(z2.tage[11].status, "heute"); assert.equal(z2.tage[12].status, "zukunft");
});

test("Zähler: Stufe 1 ohne Karte, unvollständig bei offenen Kosten, Kipptag und Plus", () => {
  const b = laden(); b.gerichte = []; b.artikel = [];
  stand(b, "2026-10-01", 5000); // ein großer Tag
  const z = Z.zaehler(b, { datum: "2026-10-01" });
  assert.equal(z.stufe, 1); nah(z.ware, 0); assert.equal(z.imPlus, true); assert.equal(z.kippTag, "2026-10-01"); nah(z.stand, 5000 / 1.07 - z.tageskosten);
  b.kosten[0].status = "offen"; b.kosten[0].betrag = null;
  assert.equal(Z.zaehler(b, { datum: "2026-10-01" }).unvollstaendig, true);
});

test("Zähler Stufe 3: Einkauf aus Belegen statt Schätzung, Müll nicht doppelt", () => {
  const b = laden(); stand(b, "2026-10-12", 1070);
  b.lieferungen.push({ id: "l1", datum: "2026-10-11", erfasst: "2026-10-11T10:00:00.000Z", lieferant: "Metro", basis: "netto", summeNetto: 300, zeilen: [], storniert: false });
  b.schwund.push({ id: "w", datum: "2026-10-12", art: "gericht", vorgang: 1, ref: { typ: "gericht", id: "d" }, menge: 2, einheit: "portion", wert: 20, storniert: false });
  const z = Z.zaehler(b, { datum: "2026-10-12" });
  assert.equal(z.stufe, 3); nah(z.ware, 300); nah(z.muell, 0); nah(z.stand, 1000 - 300 - z.kosten);
  // Ein Beleg weit unter der Schätzung macht den Zähler nicht grüner: es bleibt Stufe 2
  b.lieferungen[0].summeNetto = 20;
  const z2 = Z.zaehler(b, { datum: "2026-10-12" }); assert.equal(z2.stufe, 2); assert.ok(z2.ware > 20); assert.equal(z2.belege, 1);
});

test("Wochenvergleich: sieben Tage gegen die sieben davor", () => {
  const b = laden(); stand(b, "2026-10-12", 1000); stand(b, "2026-10-05", 900);
  const w = Z.wochenVergleich(b, "2026-10-12");
  assert.equal(w.diese.length, 7); assert.equal(w.diese[6].umsatz, 1000); assert.equal(w.vorige[6].umsatz, 900); assert.equal(w.tageDiese, 1); nah(w.max, 1000);
});

test("Müll: Gericht weg bewertet zum Wareneinsatz, Eimer zieht gemeldete Teller ab, Tonne aus Warengruppe", () => {
  const b = laden();
  const e = M.gerichtWeg(b, b.gerichte[0], { datum: "2026-10-12" });
  nah(e.wert, 0.15 * 8 + 0.3 + 0.05 * 1.6); assert.equal(e.art, "gericht"); assert.equal(e.fraktion, "bio");
  nah(M.gewichtGericht(b.gerichte[0]), 200); // Fleisch und Tomaten, Brot zählt nicht (Stück)
  nah(M.gemeldetKg(b, "2026-10-12"), 0.2);
  const r = M.rohwareWeg(b, b.artikel[2], { datum: "2026-10-12", menge: 1.8, einheit: "kg" }); nah(r.wert, 1.8 * 1.6); assert.equal(r.fraktion, "bio");
  nah(M.gemeldetKg(b, "2026-10-12"), 2.0);
  const v = M.eimerVerrechnen(b, "2026-10-12", 2.8); nah(v.gemeldet, 2.0); nah(v.rest, 0.8); nah(v.preisJeKg, 1.58 / 0.2); nah(v.wert, 0.8 * 7.9);
  const ei = M.eimerEintragen(b, { datum: "2026-10-12", kg: 2.8 }); assert.equal(ei.art, "eimer"); nah(ei.menge, 0.8); nah(ei.gewogen, 2.8); assert.equal(ei.wertOffen, false);
  const z = M.heuteJeGericht(b, "2026-10-12"); assert.equal(z.d, 1);
  const p = M.personalessen(b, b.gerichte[0], { datum: "2026-10-12", mahlzeit: "mittag" }); assert.equal(p.vorgang, 2);
  const sw = E.schwundAuswertung(b, { von: "2026-10-12", bis: "2026-10-12" }); nah(sw.muellwert, e.wert + r.wert + ei.wert); assert.equal(sw.personal.anzahl, 1);
  assert.equal(M.mahlzeitJetzt(new Date(2026, 9, 12, 9)), "fruehstueck"); assert.equal(M.mahlzeitJetzt(new Date(2026, 9, 12, 19)), "abend");
  // Eimer ohne Karte: kein Preis je kg → Wert offen
  const c = laden(); c.gerichte = []; const e2 = M.eimerEintragen(c, { datum: "2026-10-12", kg: 1 }); assert.equal(e2.wert, null); assert.equal(e2.wertOffen, true);
});

test("Lieferung: Beleg übernehmen setzt Preise netto nach, merkt den alten Preis und meldet die Änderung", () => {
  const b = laden();
  const beleg = belegZerlegen("METRO\nRechnung vom 11.10.2026\n4001 Tomaten rot KI 6kg 1 11,10 11,10 A\n4002 Dönerbrot 10er PK 3 3,30 9,90 A\nSumme Netto 21,00\nMwSt A 7% 1,47\nGesamtbetrag 22,47", { bekannt: b.artikel.map((a) => a.name) });
  assert.equal(beleg.basis, "netto"); assert.equal(beleg.zeilen.length, 2);
  // Zuordnung „Dönerbrot" → „Dönerbrot / Fladen" kommt vom Zerleger; Tomaten eindeutig
  const l = L.lieferungAnlegen(b, beleg, { zeilen: beleg.zeilen, geraet: "g1" });
  assert.equal(b.lieferungen.length, 1); assert.equal(l.lieferant, "Metro"); assert.equal(l.datum, "2026-10-11"); nah(l.summeNetto, 21);
  const ae = L.preiseUebernehmen(b, l);
  const t = b.artikel.find((a) => a.name === "Tomaten"); nah(t.preis, 11.1); nah(t.packung.menge, 6); assert.equal(t.packung.einheit, "kg"); assert.equal(t.gebinde.art, "kiste");
  assert.equal(t.preisHistorie.length, 1); nah(t.preisHistorie[0].preis, 9.6);
  const at = ae.find((x) => x.name === "Tomaten"); assert.ok(at); nah(at.alt, 9.6 / 6000); nah(at.neu, 11.1 / 6000); nah(at.prozent, 11.1 / 9.6 - 1);
  const pa = L.preisAenderungen(b, { datum: "2026-10-12" }); assert.ok(pa.some((x) => x.name === "Tomaten" && x.prozent > 0.15));
  // Zähler steht jetzt auf Stufe 3 für den Oktober
  assert.equal(Z.zaehler(b, { datum: "2026-10-12" }).stufe, 3);
});

test("Tag abschließen: Journal mit Stand, jüngster je Datum gilt", () => {
  const b = laden(); stand(b, "2026-10-12", 1070);
  const a = Z.tagAbschliessen(b, { datum: "2026-10-12", geraet: "g1" });
  assert.equal(b.abschluesse.length, 1); assert.equal(a.umsatz, 1070); assert.equal(typeof a.stand, "number");
  const a2 = Z.tagAbschliessen(b, { datum: "2026-10-12", geraet: "g1" }); assert.equal(Z.abschlussVon(b, "2026-10-12").id, a2.id);
});
