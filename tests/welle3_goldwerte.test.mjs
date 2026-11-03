// Welle 3 Goldwerte (Bau-Chat 03.11.2026, Auftrag „Hochtouren“ 2): alle Werte aus „GastroCash Prüfpaket Welle 3 Goldwerte 28.10.2026“
// auf den Cent. Läuft in UTC und Europe/Berlin (Wächter). Gegenprobe: jeder Wert ist im Test als Zahl hinterlegt, nicht aus der App abgeleitet.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ustImUmsatz } from "../js/steuertopf.js";
import { ustTermine, estVorauszahlungen, svTermine, svTermin, werktagAb, pflichtTermine, ERINNERUNG_TAGE } from "../js/fristen.js";
import { liquiditaet } from "../js/liquiditaet.js";
import { schichtZaehler, zaehlerSumme, minijobGrenzeStunden, tageZaehler, schichtStunden, eintragStunden } from "../js/schichten.js";
import { wasBleibtAus, prueferAus } from "../js/steuertopf.js";

const r2 = (x) => Math.round(x * 100) / 100;

// ---------- A 3.1 Steuer-Topf ----------
test("3.1 Steuer-Topf Nov 2026: 26 × 1.100 € brutto, 20 % zu 19 % → USt 2.410,10 €, Vorsteuer 851,00 €, Zahllast 1.559,10 €", () => {
  const tag = ustImUmsatz(1100, 0.2);
  assert.equal(r2(tag.ust7), 57.57); assert.equal(r2(tag.ust19), 35.13);
  assert.equal(r2(tag.ust7 + tag.ust19), 92.70, "Tageszeile 92,70 €");
  const ust = 26 * (tag.ust7 + tag.ust19); assert.equal(r2(ust), 2410.10);
  const vorsteuer = 7000 * 0.07 + 1500 * 0.19 + 400 * 0.19; assert.equal(r2(vorsteuer), 851.00);
  assert.equal(r2(ust - vorsteuer), 1559.10);
  assert.equal(r2((ust - vorsteuer) / 26), 59.97, "je Öffnungstag ≈ 59,97 €");
});

// ---------- A 3.4 Was bleibt / 3.5 Prüfer-Blick ----------
const NOV = { umsatzNetto: 28600 - 2410.10, ware: 8000, energie: 400, miete: 2000, personal: 6500, sonstiges: 600, tilgung: 500 };
test("3.4 Was bleibt: Umsatz netto 26.189,90 €, vor Tilgung 8.689,90 €, nach Tilgung 8.189,90 €, ÷ 260 h ≈ 31,50 €", () => {
  const w = wasBleibtAus(NOV, 260);
  assert.equal(r2(NOV.umsatzNetto), 26189.90);
  assert.equal(w.ergebnisVorTilgung, 8689.90); assert.equal(w.ergebnis, 8189.90); assert.equal(w.jeStunde, 31.50);
  assert.equal(wasBleibtAus(NOV, null).jeStunde, null, "ohne Chef-Stunden keine Stundenzahl");
});
test("3.5 Prüfer-Blick: Wareneinsatz 30,55 %, Rohgewinn I 69,45 %, Rohaufschlag 227,37 %, +2,55 Punkte → Notiz „Warum?“ Pflicht", () => {
  const p = prueferAus(NOV, 0.28);
  assert.equal(r2(p.quote * 100), 30.55); assert.equal(r2(p.rohgewinn1 * 100), 69.45); assert.equal(r2(p.rohaufschlag * 100), 227.37);
  assert.equal(p.abweichung, 2.55); assert.equal(p.notizPflicht, true);
  assert.equal(prueferAus(NOV, 0.2900).notizPflicht, false, "1,55 Punkte: keine Pflicht (Schwelle 2 Punkte, Setzung)");
  assert.equal(p.richtsatz.rohgewinn1, 0.68); assert.equal(p.richtsatz.rohaufschlag, 2.13);
});

// ---------- B 3.7 Liquidität ----------
const POSTEN = [
  { betrag: 1100, wochentage: [1, 2, 3, 4, 5, 6] }, { betrag: -2400, wochentage: [1] },
  { betrag: -2000, tagImMonat: 1 }, { betrag: -400, tagImMonat: 1 }, { betrag: -476, tagImMonat: 15 }, { betrag: -6500, tagImMonat: 28 },
  { betrag: -1559.10, datum: "2026-12-10" }, { betrag: -1500, datum: "2026-12-10" }, { betrag: -1559.10, datum: "2027-01-11" },
];
test("3.7 Liquidität ab Mo 30.11.2026, 8 Wochen: Start 3.000 € → tiefster Stand 400,00 € am 01.12.2026, Ende 19.729,80 € am 24.01.2027", () => {
  const l = liquiditaet({ start: 3000, ab: "2026-11-30", posten: POSTEN });
  assert.deepEqual(l.tiefster, { betrag: 400, datum: "2026-12-01" }); assert.equal(l.reicht, true);
  assert.equal(l.bis, "2027-01-24"); assert.equal(l.ende, 19729.80);
});
test("3.7 Liquidität: Start 2.000 € → −600,00 € am 01.12.2026 („am 01.12. fehlen ≈ 600 €“)", () => {
  const l = liquiditaet({ start: 2000, ab: "2026-11-30", posten: POSTEN });
  assert.deepEqual(l.tiefster, { betrag: -600, datum: "2026-12-01" }); assert.equal(l.reicht, false); assert.equal(l.fehlt, 600);
});

// ---------- C 3.2 Pflichtenkalender ----------
test("3.2 USt-VA 2027 monatlich (BW): verschoben auf 11.01., 12.04., 12.07., 11.10.; alle anderen am 10.", () => {
  const t = ustTermine(2027, { rhythmus: "monat" });
  assert.equal(t.length, 12);
  const soll = ["2027-01-11", "2027-02-10", "2027-03-10", "2027-04-12", "2027-05-10", "2027-06-10", "2027-07-12", "2027-08-10", "2027-09-10", "2027-10-11", "2027-11-10", "2027-12-10"];
  assert.deepEqual(t.map((x) => x.datum), soll);
  assert.deepEqual(t.filter((x) => x.verschoben).map((x) => x.datum), ["2027-01-11", "2027-04-12", "2027-07-12", "2027-10-11"]);
  assert.equal(t[0].zeitraum, "2026-12"); assert.equal(t[0].erinnerung, "2027-01-06", `Erinnerung ${ERINNERUNG_TAGE} Tage vorher`);
  assert.equal(ustTermine(2026, { rhythmus: "monat" }).find((x) => x.zeitraum === "2026-11").datum, "2026-12-10");
});
test("3.2 Rhythmus wird nie geraten, Kleinunternehmer ohne USt-VA, Dauerfristverlängerung einen Monat später", () => {
  assert.deepEqual(ustTermine(2027, {}), [], "ohne Angabe keine Termine");
  assert.deepEqual(ustTermine(2027, { rhythmus: "monat", kleinunternehmer: true }), []);
  const d = ustTermine(2027, { rhythmus: "monat", dauerfrist: true });
  assert.equal(d.find((x) => x.zeitraum === "2026-12").datum, "2027-02-10");
  assert.equal(d.find((x) => x.zeitraum === "2027-02").datum, "2027-04-12");
  const q = ustTermine(2027, { rhythmus: "quartal" }); assert.deepEqual(q.map((x) => [x.zeitraum, x.datum]), [["2026-Q4", "2027-01-11"], ["2027-Q1", "2027-04-12"], ["2027-Q2", "2027-07-12"], ["2027-Q3", "2027-10-11"]]);
  assert.equal(werktagAb("2027-01-10"), "2027-01-11");
});
test("3.2 ESt-Vorauszahlungen: 10.12.2026, 10.03./10.06./10.09./10.12.2027 – keiner verschoben", () => {
  assert.equal(estVorauszahlungen(2026)[3].datum, "2026-12-10");
  assert.deepEqual(estVorauszahlungen(2027).map((x) => x.datum), ["2027-03-10", "2027-06-10", "2027-09-10", "2027-12-10"]);
  assert.ok(estVorauszahlungen(2027).every((x) => !x.verschoben));
});
test("3.2 SV 2027 (AOK-Liste): Beitragsnachweis und Fälligkeit je Monat; Mai hängt am Sitz der Krankenkasse", () => {
  const soll = [["01-25", "01-27"], ["02-22", "02-24"], ["03-23", "03-25"], ["04-26", "04-28"], ["05-24", "05-26"], ["06-24", "06-28"], ["07-26", "07-28"], ["08-25", "08-27"], ["09-24", "09-28"], ["10-25", "10-27"], ["11-24", "11-26"], ["12-23", "12-28"]];
  assert.deepEqual(svTermine(2027).map((x) => [x.nachweis.slice(5), x.faellig.slice(5)]), soll, "Sitz unbekannt: früherer Termin");
  assert.equal(svTermin(2027, 5, { landKasse: "BW" }).faellig, "2027-05-26", "Land mit Fronleichnam");
  assert.equal(svTermin(2027, 5, { landKasse: "NI" }).faellig, "2027-05-27", "Land ohne Fronleichnam");
  assert.equal(svTermin(2026, 11).faellig, "2026-11-26"); assert.equal(svTermin(2026, 12).faellig, "2026-12-28");
});
test("3.2 Kalender: nie ein Text mit Schonfrist; Termine sortiert, SV nur mit Personal", () => {
  const t = pflichtTermine("2026-11-01", "2027-12-31", { rhythmus: "monat", personal: true });
  assert.ok(t.length > 40); assert.ok(t.every((x, i) => i === 0 || t[i - 1].datum <= x.datum));
  assert.ok(!pflichtTermine("2026-11-01", "2027-12-31", { rhythmus: "monat" }).some((x) => x.art === "sv"));
  assert.ok(!JSON.stringify(t).toLowerCase().includes("schonfrist"));
});

// ---------- D 3.8 Schichtzähler ----------
const A = [["2026-12-20", "11:00", "19:00"], ["2026-12-24", "10:00", "16:00"], ["2026-12-25", "12:00", "20:00"], ["2026-12-27", "18:00", "03:00"], ["2026-12-31", "16:00", "02:00"]];
const B = [["2026-12-05", "17:00", "23:00"], ["2026-12-12", "17:00", "23:00"], ["2026-12-19", "17:00", "23:00"], ["2026-12-26", "17:00", "23:30"], ["2026-12-30", "22:00", "05:00"], ["2026-12-31", "22:00", "01:00"]];
const schicht = (l) => l.map(([datum, von, bis]) => ({ datum, von, bis }));
test("3.8 Schichtzähler Person A, Dezember 2026: 41 h / Nacht 25 % 8 h / Nacht 40 % 5 h / Sonntag 17 h / 125 % 10 h / 150 % 10 h", () => {
  assert.deepEqual(zaehlerSumme(schicht(A)), { gesamt: 41, nacht25: 8, nacht40: 5, sonntag: 17, feiertag125: 10, feiertag150: 10 });
});
test("3.8 Schichtzähler Person B, Dezember 2026: 34,5 h / 17,5 / 5 / 0 / 3 / 6,5", () => {
  assert.deepEqual(zaehlerSumme(schicht(B)), { gesamt: 34.5, nacht25: 17.5, nacht40: 5, sonntag: 0, feiertag125: 3, feiertag150: 6.5 });
});
test("3.8 Einzelregeln: 24.12. ab 14 Uhr 150 %, 31.12. ab 14 Uhr 125 % (in BW kein Feiertag), 0–4 Uhr nach Beginn vor 0 Uhr 40 % und Vortagsstufe", () => {
  assert.deepEqual(schichtZaehler("2026-12-24", "10:00", "16:00"), { gesamt: 6, nacht25: 0, nacht40: 0, sonntag: 0, feiertag125: 0, feiertag150: 2 });
  assert.equal(schichtZaehler("2026-12-31", "10:00", "16:00").feiertag125, 2);
  const s = schichtZaehler("2026-12-27", "18:00", "03:00"); assert.equal(s.sonntag, 9); assert.equal(s.nacht25, 4); assert.equal(s.nacht40, 3);
  assert.equal(schichtZaehler("2026-12-28", "00:00", "03:00").nacht40, 0, "Beginn um 0 Uhr ist nicht „vor 0 Uhr“ → 25 %");
  assert.equal(schichtStunden("22:00", "05:00"), 7); assert.equal(eintragStunden({ stunden: 6 }), 6, "alte Einträge ohne Zeiten bleiben gültig");
  assert.equal(eintragStunden({ stunden: 6, von: "17:00", bis: "23:30" }), 6.5);
});
test("3.8 Minijob-Wächter: 43,38 h (2026), 43,35 h (ab 01.01.2027, abgerundet); Person B 34,5 h × 13,90 € = 479,55 € unter der Grenze", () => {
  assert.equal(minijobGrenzeStunden("2026-12-15"), 43.38); assert.equal(minijobGrenzeStunden("2027-01-01"), 43.35);
  assert.ok(43.36 * 14.60 > 633 && 43.35 * 14.60 <= 633);
  assert.equal(r2(34.5 * 13.90), 479.55); assert.ok(34.5 < minijobGrenzeStunden("2026-12-15"));
});
test("3.8 70-Tage-Zähler: 58 Tage + 9 Tage im Dezember = „67 von 70“", () => {
  const dez = ["2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04", "2026-12-05", "2026-12-08", "2026-12-09", "2026-12-10", "2026-12-11", "2026-12-11"];
  assert.deepEqual(tageZaehler(58, dez), { tage: 67, grenze: 70, rest: 3 }, "doppelter Tag zählt einmal");
});

// ---------- 3.1 über den Laden (Rechenweg der App: Tagesnotizen + Belege) ----------
import { steuerTopf, steuerTopfTag } from "../js/steuertopf.js";
test("3.1 Steuer-Topf aus dem Laden: Nov 2026, 26 Öffnungstage, Mischsatz 9,4 % (= 20 % zu 19 %), Belege 7.000/1.500/400 € netto → 1.559,10 €; Summe der Tage = Monat", () => {
  const tage = Array.from({ length: 26 }, (_, i) => `2026-11-${String(i + 1).padStart(2, "0")}`); // 26 Öffnungstage (der Kalender ist für die Steuer egal)
  assert.equal(tage.length, 26);
  const stand = { betrieb: { steuerSatz: 0.094 }, gerichte: [], tagesnotizen: tage.map((datum) => ({ id: datum, datum, umsatz: 1100, erfasst: datum + "T20:00:00Z" })), lieferungen: [],
    kostenbelege: [{ id: "k1", datum: "2026-11-03", betrag: 7000, basis: "netto", satz: 0.07, stelle: "ware" }, { id: "k2", datum: "2026-11-03", betrag: 1500, basis: "netto", satz: 0.19, stelle: "ware" }, { id: "k3", datum: "2026-11-16", betrag: 400, basis: "netto", satz: 0.19, stelle: "energie" }] };
  const t = steuerTopf(stand, "2026-11");
  assert.equal(t.ust, 2410.10); assert.equal(t.vorsteuer, 851.00); assert.equal(t.zahllast, 1559.10); assert.equal(t.oeffnungstage, 26);
  assert.equal(steuerTopfTag(stand, "2026-11-01").ust, 92.70, "Tageszeile 92,70 € USt");
  assert.ok(t.tage.every((x) => x.ust === 92.70 || x.ust === 92.69), "kumuliert gerundet: jeder Tag 92,70 oder 92,69 €");
  const d3 = steuerTopfTag(stand, "2026-11-03"); assert.equal(d3.vorsteuer, 775); assert.equal(d3.topf, r2(d3.ust - 775), "Tag mit Belegen: USt minus Vorsteuer der Tagesbelege");
  assert.equal(r2(t.tage.reduce((s, x) => s + x.ust, 0) - t.vorsteuer), 1559.10, "Summe der Tageszeilen = Monatszahl");
  assert.equal(steuerTopf({ ...stand, betrieb: { ...stand.betrieb, kleinunternehmer: true } }, "2026-11"), null, "§ 19 UStG: kein Topf");
});
