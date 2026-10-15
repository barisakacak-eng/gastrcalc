// Welle 2, Kürzel T (Prüfung p04 Steuer/Buchhalter): Umsatz nur als Notiz, nur anhängen, keine erfundene Vorsteuer, Pfand, Monatslast, Inventur, Änderungen.
import test from "node:test";
import assert from "node:assert/strict";
import { leererBetrieb, migrierenBetrieb } from "../js/store.js";
import * as E from "../js/engine.js";
import * as St from "../js/export_steuer.js";
import { paketDokument, ordnerKachelStand } from "../js/screens/ordner.js";
import { druckHtml } from "../js/export_amt.js";

const Z = St.monatVon("2026-09-01");

test("Tagesnotiz: Tippen ist Entwurf, Verlassen schreibt fest, Änderung hängt an (ersetzt:<id>), Leeren löscht nie", () => {
  const s = leererBetrieb(); const D = "2026-09-15";
  E.tagesnotizSetzen(s, D, 1); E.tagesnotizSetzen(s, D, 14); E.tagesnotizSetzen(s, D, 1456.95);
  assert.equal(s.tagesnotizen.length, 1, "Tasten ändern den eigenen Entwurf");
  E.tagesnotizenFestschreiben(s); const a = s.tagesnotizen[0]; assert.equal(a.entwurf, undefined);
  E.tagesnotizSetzen(s, D, 999.99); E.tagesnotizenFestschreiben(s);
  assert.equal(s.tagesnotizen.length, 2); const b = s.tagesnotizen[1];
  assert.equal(a.storniert, true); assert.equal(a.ersetzt, b.id); assert.ok(a.storniertZeit); assert.equal(a.umsatz, 1456.95, "alter Wert bleibt");
  assert.equal(E.umsatzEintrag(s, D).umsatz, 999.99);
  // Feld leeren und verlassen: Rücknahme, nichts verschwindet
  E.tagesnotizLoeschen(s, D); E.tagesnotizenFestschreiben(s);
  assert.equal(s.tagesnotizen.length, 2); assert.equal(b.storniert, true); assert.equal(b.ersetzt, null); assert.equal(E.umsatzEintrag(s, D), null);
  // Leeren und neu tippen = eine Korrektur mit Vorwert
  E.tagesnotizSetzen(s, "2026-09-16", 500); E.tagesnotizenFestschreiben(s);
  E.tagesnotizLoeschen(s, "2026-09-16"); E.tagesnotizSetzen(s, "2026-09-16", 520); E.tagesnotizenFestschreiben(s);
  const u = St.tagesumsaetze(s, Z); assert.deepEqual(u.zeilen.map((x) => [x.datum, x.brutto, x.geaendert]), [["2026-09-16", 520, 500]]);
  // Spur übersteht das Laden
  const m = migrierenBetrieb(structuredClone(s)); assert.equal(m.tagesnotizen.find((x) => x.id === a.id).ersetzt, b.id); assert.ok(m.tagesnotizen.find((x) => x.id === a.id).storniertZeit);
  const ae = St.aenderungen(s, Z).zeilen.filter((x) => x.art === "notiz");
  assert.deepEqual(ae.map((x) => [x.datum, x.vorgang, x.alt, x.neu]).sort(), [["2026-09-15", "ersetzt", 1456.95, 999.99], ["2026-09-15", "storniert", 999.99, null], ["2026-09-16", "ersetzt", 500, 520]].sort());
});

test("Umsatz-Export: nur Brutto-Notiz mit Kennzeichnung, kein Mischsatz, nie vollständig durch Umsätze", () => {
  const s = leererBetrieb(); s.betrieb.steuerSatz = 0.086;
  s.tagesnotizen = [{ id: "1", datum: "2026-09-01", umsatz: 937.13, erfasst: "a", storniert: false }];
  const p = St.monatsPaket(s, Z, "buch");
  const csv = St.teilCsv(p, "umsatz", ["D", "B", "N", "G", "K"], { kennung: () => "Notiz – kein Z-Bon, nicht für die Buchung" });
  assert.equal(csv, "﻿D;B;N;G;K\r\n01.09.2026;937,13;;;Notiz – kein Z-Bon, nicht für die Buchung\r\n");
  assert.equal(p.stand.umsatz, "notiz"); assert.equal(p.vollstaendig, 0);
  const k = ordnerKachelStand(s, { datum: "2026-10-15" }); assert.notEqual(k.buch.farbe, "gruen"); assert.notEqual(k.steuer.farbe, "gruen");
  const html = druckHtml(paketDokument(s, St.monatsPaket(s, Z, "steuer")));
  assert.match(html, /kein Z-Bon, nicht für die Buchung/); assert.ok(!/Mischsatz/.test(html)); assert.ok(!/Beträge netto, wenn nicht anders/.test(html));
});

test("Belege: Pfand eigene Spalte (Netto + USt + Pfand = Brutto), USt nur bei erkanntem Satz, getrennt 7/19, Rechnungs-Nr", () => {
  const s = leererBetrieb();
  s.lieferungen = [
    { id: "m1", datum: "2026-09-02", lieferant: "Metro", rechnungNr: "4711", summeNetto: 64.80, summeBrutto: 72.09, pfand: 1.5, zeilen: [{ name: "Cola", netto: 64.8, steuersatz: 0.19 }], storniert: false },
    { id: "m2", datum: "2026-09-03", lieferant: "Metro", summeNetto: 200, summeBrutto: 226, pfand: 0, zeilen: [{ name: "Fleisch", netto: 100, steuersatz: 0.07 }, { name: "Spülmittel", netto: 100, steuersatz: 0.19 }], storniert: false },
    { id: "m3", datum: "2026-09-04", lieferant: "Markt", summeNetto: 50, summeBrutto: null, pfand: 0, zeilen: [{ name: "Tomaten", netto: 50, steuersatz: null }], storniert: false },
    { id: "m4", datum: "2026-09-05", lieferant: "Alt", summeNetto: 10, summeBrutto: 12, zeilen: [{ name: "X", netto: 10, steuersatz: 0.19 }], storniert: true, storniertZeit: "2026-09-06T10:00:00Z" }];
  s.kostenbelege = [
    { id: "k1", datum: "2026-09-01", stelle: "miete", betrag: 1500, basis: "netto", satz: null, verteilung: "monatlich", lieferant: "Vermieter", storniert: false },
    { id: "k2", datum: "2026-09-01", stelle: "versicherungen", betrag: 600, basis: "netto", satz: 0.19, verteilung: "jaehrlich", lieferant: "Versicherung", storniert: false },
    { id: "k3", datum: "2026-09-10", stelle: "strom", betrag: 297.5, basis: "brutto", satz: 0.19, verteilung: "monatlich", lieferant: "SW", storniert: false }];
  const b = St.belege(s, Z); const z = Object.fromEntries(b.zeilen.map((x) => [x.id, x]));
  assert.deepEqual([z.m1.netto, z.m1.ust19, z.m1.pfand, z.m1.brutto, z.m1.rechnungNr, z.m1.hinweis], [64.8, 5.79, 1.5, 72.09, "4711", null]);
  assert.ok(Math.abs(z.m1.netto + z.m1.ust19 + z.m1.pfand - z.m1.brutto) < 0.001);
  assert.deepEqual([z.m2.ust7, z.m2.ust19], [7, 19]);
  assert.deepEqual([z.m3.ust7, z.m3.ust19, z.m3.brutto, z.m3.hinweis], [null, null, null, "ohneBrutto"]);
  assert.deepEqual([z.k1.netto, z.k1.brutto, z.k1.ust19, z.k1.hinweis], [1500, null, null, "ohneSatz"], "Miete: kein Aufschlag von 19 %");
  assert.deepEqual([z.k2.netto, z.k2.brutto, z.k2.ust19], [600, null, null], "Versicherung: keine Vorsteuer");
  assert.deepEqual([z.k3.netto, z.k3.ust19, z.k3.brutto], [250, 47.5, 297.5]);
  assert.equal(b.brutto, 72.09 + 226 + 297.5, "Brutto-Summe nimmt nie Netto als Ersatz");
  assert.equal(z.m4, undefined);
  const ae = St.aenderungen(s, Z).zeilen; assert.deepEqual(ae.map((x) => [x.art, x.vorgang, x.alt, x.basis]), [["lieferung", "storniert", 12, "brutto"]]);
  const csv = St.teilCsv(St.monatsPaket(s, Z, "steuer"), "aenderungen", ["a", "b", "c", "d", "e", "f", "g", "h"]);
  assert.match(csv, /^﻿a;b;c;d;e;f;g;h\r\n05\.09\.2026;lieferung;storniert;Alt;12,00;;brutto;06\.09\.2026 \d\d:00\r\n$/);
  assert.equal(St.rechnungsNummerLesen("METRO\nKunden-Nr. 123456\nRechnungs-Nr.: 2026-4711\n"), "2026-4711");
  assert.equal(St.rechnungsNummerLesen("Kundennummer 99887"), null);
});

test("Buchhalter: Monatslast ohne eigenen Lohn, wie eingetragen, auf den gewählten Monat bezogen", () => {
  const s = leererBetrieb();
  s.team.lohnkosten = 3000; s.team.eigenerLohn = 2000; s.team.eigenerLohnStatus = "eigen";
  s.kosten = [{ id: "a", posten: "miete", kategorie: "miete", betrag: 1600, status: "bekannt", periode: "monat", basis: "netto" },
    { id: "b", posten: "strom", kategorie: "energie", betrag: 297.5, status: "bekannt", periode: "monat", basis: "brutto" },
    { id: "c", posten: "versicherungen", kategorie: "versicherung", betrag: 600, status: "bekannt", periode: "jahr", basis: "netto" }];
  // Miete wurde im Oktober per Beleg von 1500 auf 1600 erhöht: für September gilt 1500
  s.kostenbelege = [{ id: "k", datum: "2026-10-02", stelle: "miete", betrag: 1600, basis: "netto", satz: null, verteilung: "monatlich", storniert: false, vorher: { betrag: 1500, status: "bekannt", periode: "monat", basis: "netto" } }];
  const k = St.festeKosten(s, Z);
  assert.deepEqual(k.zeilen.map((x) => [x.posten, x.jeMonat, x.basis]), [["miete", 1500, "netto"], ["strom", 297.5, "brutto"], ["versicherungen", 50, "netto"], ["lohn", 3000, "lohn"]]);
  assert.deepEqual([k.netto, k.brutto, k.lohn], [1550, 297.5, 3000]);
  assert.ok(!k.zeilen.some((x) => x.betrag === 2000), "eigener Lohn gehört nicht in die Buchhaltung");
  assert.equal(St.festeKosten(s, St.monatVon("2026-10-01")).zeilen[0].jeMonat, 1600);
});

test("Inventur: 0,00 € oder Waren ohne Preis → prüfen, nie Neubewertung; Personalessen ohne Person → prüfen", () => {
  const s = leererBetrieb();
  s.inventuren = [{ id: "i", datum: "2026-09-30", abgeschlossen: "x", posten: {}, ausgeblendet: [], wert: 0 }];
  let p = St.monatsPaket(s, Z, "steuer"); assert.equal(p.stand.inventur, "pruefen");
  s.inventuren[0].wert = 412.37; p = St.monatsPaket(s, Z, "steuer"); assert.equal(p.stand.inventur, "ok");
  delete s.inventuren[0].wert; p = St.monatsPaket(s, Z, "steuer"); assert.equal(p.inventur.zeilen[0].wert, null); assert.equal(p.stand.inventur, "pruefen");
  s.personen = [{ id: "a", kuerzel: "Ayşe", aktiv: true, entfernt: false }];
  s.schwund = [{ id: "p1", datum: "2026-09-02", art: "personal", menge: 1, mahlzeit: "mittag", ref: { name: "Döner" }, wert: 2, von: "a", storniert: false },
    { id: "p2", datum: "2026-09-03", art: "personal", menge: 1, mahlzeit: "mittag", ref: { name: "Döner" }, wert: 2, storniert: false }];
  p = St.monatsPaket(s, Z, "steuer");
  assert.deepEqual(p.personal.zeilen.map((x) => x.person), ["Ayşe", null]); assert.equal(p.personal.ohnePerson, 1); assert.equal(p.stand.personal, "pruefen");
  const html = druckHtml(paketDokument(s, p)); assert.match(html, /Ayşe: 1/);
});
