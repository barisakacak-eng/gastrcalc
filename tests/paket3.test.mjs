// Paket 3 (16.10.2026): Rechenwerk-Befunde aus dem Gesamt-Audit – M1 Vorsteuersatz je Posten, M2 Mischsatz geschätzt, M3 Preis 0,
// M4 Wareneinsatz-Warnung, M5 Ruhetage mit Gültig-ab, M6 eine Müll-Bewertung, M7 Geschäftstag bis 4 Uhr, M15/E2 Richtwert Wareneinsatz.
import test from "node:test";
import assert from "node:assert/strict";
globalThis.document ??= { documentElement: {} };
import * as E from "../js/engine.js";
import * as Z from "../js/zaehler.js";
import * as M from "../js/muell.js";
import * as U from "../js/util.js";
import { reinigungMonat, oeffnungstageMonat } from "../js/reinigung.js";
import { leererBetrieb, migrierenBetrieb } from "../js/store.js";
import { monatsZiel, wareneinsatzQuote, startView } from "../js/screens/home.js";
import { vergleichView } from "../js/screens/vergleich.js";
import { navKontext } from "../js/screens/nav.js";
import { jetztDran } from "../js/offen.js";
import { tagGewaehlt, tagAktion } from "../js/screens/tag.js";
import { satzStandard } from "../js/data/kosten.js";

const nah = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);
const um = (hh, mm = 0, tag = 15) => new Date(2026, 9, tag, hh, mm, 0, 0); // Oktober 2026, Ortszeit

function laden() {
  const b = leererBetrieb(); b.phase = "app";
  b.betrieb = { ...b.betrieb, name: "Test", format: "imbiss", tageProWoche: 6, monate: 12, steuerSatz: 0.07 };
  b.team = { personen: 3, stundenProPerson: 160, lohnkosten: 3000, eigenerLohn: 2400, eigenerLohnStatus: "eigen" };
  b.kosten = [{ id: "m", kategorie: "miete", posten: "miete", betrag: 2000, status: "bekannt", periode: "monat", basis: "netto" }];
  b.artikel = [{ name: "Dönerspieß Kalb/Pute", gruppe: "fleisch", einheit: "kg", packung: { menge: 1, einheit: "kg" }, preis: 8, preisBasis: "netto", preisHistorie: [] }];
  b.gerichte = [{ id: "d", name: "Döner", bereich: "doener", klasse: "haupt", zeit: 3, preis: 7, mengeTag: 100, steuer: 0.07, zutaten: [{ name: "Dönerspieß Kalb/Pute", menge: 150, einheit: "g" }] }];
  return b;
}
const umsatz = (b, datum, u) => b.tagesnotizen.push({ id: "n" + datum, datum, umsatz: u, erfasst: datum + "T20:00:00.000Z", storniert: false });

// ---------- M1 ----------
test("M1: Vorsteuersatz je Posten – 7 % Wasser, 19 % Standard, 0 Kleinunternehmer; alte Daten ohne satz = 19", () => {
  nah(E.betragJeMonat({ betrag: 107, basis: "brutto", satz: 7 }), 100); // Beleg aus dem Auftrag
  nah(E.betragJeMonat({ betrag: 119, basis: "brutto" }), 100);           // ohne Feld: 19 %
  nah(E.betragJeMonat({ betrag: 119, basis: "brutto", satz: 0 }), 119);  // steuerfrei
  nah(E.betragJeMonat({ betrag: 119, basis: "brutto", satz: 19 }, { kleinunternehmer: true }), 119); // Schalter setzt alle auf 0
  nah(E.betragJeMonat({ betrag: 119, basis: "netto", satz: 7 }), 119);   // netto bleibt netto
  assert.equal(satzStandard("wasser"), 7); assert.equal(satzStandard("strom"), 19);
  const b = laden(); b.kosten.push({ id: "w", kategorie: "energie", posten: "wasser", betrag: 107, status: "bekannt", periode: "monat", basis: "brutto", satz: 7 });
  nah(E.fixkosten(b).gesamt, 2100);
  b.betrieb.kleinunternehmer = true; nah(E.fixkosten(b).gesamt, 2107);
  // Migration: Wasser bekommt 7, Strom 19, unbekannte Sätze fallen auf den Standard
  const m = migrierenBetrieb({ kosten: [{ posten: "wasser", kategorie: "energie", betrag: 10 }, { posten: "strom", kategorie: "energie", betrag: 10, satz: 5 }], betrieb: { kleinunternehmer: "ja" } });
  assert.equal(m.kosten[0].satz, 7); assert.equal(m.kosten[1].satz, 19); assert.equal(m.betrieb.kleinunternehmer, false);
  // Reinigungsfirma: Kleinunternehmer ohne Vorsteuer
  const r = laden(); r.betrieb.reinigung = { wer: "firma", firmaBetrag: 119, basis: "brutto" };
  nah(reinigungMonat(r).firma, 100); r.betrieb.kleinunternehmer = true; nah(reinigungMonat(r).firma, 119);
});

// ---------- M2 ----------
test("M2: Mischsatz ohne echte Mengen ist geschätzt – Flag läuft bis in Zähler und Monatsziel", () => {
  const ohne = { betrieb: { tageProWoche: 6 }, verkauf: { bestellungenTag: null }, gerichte: [{ id: "d", preis: 6, klasse: "haupt", steuer: 0.07, zutaten: [] }, { id: "c", preis: 3, klasse: "getraenk", steuer: 0.19, zutaten: [] }] };
  const r1 = E.umsatzSteuerSatz(ohne); assert.equal(r1.quelle, "karte"); assert.equal(r1.geschaetzt, true); nah(r1.satz, 0.11, 1e-3); // Cola zählt wie Döner
  const mit = { ...ohne, verkauf: { bestellungenTag: 100 }, gerichte: [{ ...ohne.gerichte[0], mengeTag: 90 }, { ...ohne.gerichte[1], mengeTag: 10 }] };
  const r2 = E.umsatzSteuerSatz(mit); assert.equal(r2.geschaetzt, false); nah(r2.satz, (540 * 0.07 + 30 * 0.19) / 570, 1e-3);
  assert.equal(E.umsatzSteuerSatz({ betrieb: { steuerSatz: 0.08 }, gerichte: [] }).geschaetzt, false);
  const b = laden(); b.betrieb.steuerSatz = null; b.gerichte[0].mengeTag = null; b.verkauf.bestellungenTag = null; umsatz(b, "2026-10-12", 1070);
  const z = Z.zaehler(b, { datum: "2026-10-12" }); assert.equal(z.steuerGeschaetzt, true); assert.equal(z.geschaetzt, true);
  assert.equal(monatsZiel(b, z, "2026-10-12").geschaetzt, true);
  b.betrieb.steuerSatz = 0.07; b.gerichte[0].mengeTag = 100; b.verkauf.bestellungenTag = 100;
  const z2 = Z.zaehler(b, { datum: "2026-10-12" }); assert.equal(z2.steuerGeschaetzt, false);
});

// ---------- M3 ----------
test("M3: Einkaufspreis 0 ist kein Preis – Gericht bleibt grau, Artikel offen", () => {
  const b = laden(); b.artikel[0].preis = 0;
  assert.equal(E.preisJeBasis(b.artikel[0]), null); assert.equal(E.preisNettoGebinde(b.artikel[0]), null);
  const w = E.warenGericht(b.gerichte[0], { [b.artikel[0].name]: b.artikel[0] });
  assert.equal(w.vollstaendig, false); assert.deepEqual(w.fehlt, ["Dönerspieß Kalb/Pute"]);
  const k = E.kalkulation(b); assert.equal(k.zeilen[0].ampel, "grau"); assert.equal(k.zaehl.grau, 1);
  b.artikel[0].preis = 8; assert.equal(E.kalkulation(b).zeilen[0].ampel !== "grau", true);
});

// ---------- M4 ----------
test("M4: eine Warnschwelle für den Wareneinsatz (50 %) – auf der Umsatz-Seite und im Vergleich, nicht im Laden", () => {
  assert.equal(E.wareneinsatzWarnung(0.3), null); assert.equal(E.wareneinsatzWarnung(0.5), "hoch"); assert.equal(E.wareneinsatzWarnung(0.65), "sehrHoch");
  assert.equal(E.wareneinsatzWarnung(null), null); assert.equal(E.wareneinsatzWarnung(undefined), null);
  const b = laden(); b.artikel[0].preis = 30; // 150 g × 30 €/kg = 4,50 € von 6,54 netto ≈ 69 %
  const h = vergleichView(b); assert.ok(h.includes("– hoch"), "Vergleich warnt");
  navKontext(b, { betriebe: [b] });
  const laden_ = startView(b, { wurzel: { betriebe: [b], letzteSicherung: new Date().toISOString() }, jetzt: um(10) });
  assert.ok(!laden_.includes("– hoch") && !laden_.includes("quoteHoch"), "im Laden keine neue Meldung");
});

// ---------- M5 ----------
test("M5: Ruhetagsänderung mitten im Monat ändert vergangene Tage nicht", () => {
  const b = laden(); b.kuehl.ruhetage = []; // ohne Ruhetage: 6/7 je Tag
  E.ruhetageSetzen(b, [6], "2026-10-15"); // ab 15.10.: Samstag frei
  nah(Z.tagGewicht(b, "2026-10-03"), 6 / 7, 1e-9); // Samstag 3.10. vor der Änderung: noch 6/7
  assert.equal(Z.tagGewicht(b, "2026-10-17"), 0);  // Samstag 17.10.: Ruhetag
  assert.equal(Z.tagGewicht(b, "2026-10-16"), 1);
  const z = Z.zaehler(b, { datum: "2026-10-20" });
  nah(z.tage.find((t) => t.datum === "2026-10-03").gewicht, 6 / 7, 1e-9); assert.equal(z.tage.find((t) => t.datum === "2026-10-17").gewicht, 0);
  // Reinigung (eigene tagGewicht-Kopie) folgt demselben Verlauf: 30 Tage rückwärts ab 20.10., Samstage erst ab 15.10. frei
  const r = laden(); r.kuehl.ruhetage = [];
  nah(oeffnungstageMonat(r, "2026-10-20"), 30 * 6 / 7, 1e-9);
  E.ruhetageSetzen(r, [6], "2026-10-15");
  nah(oeffnungstageMonat(r, "2026-10-20"), 6 + 24 * 6 / 7 - 1, 1e-9); // 15.–20.10.: 6 Tage, davon Sa 17.10. = 0 → 5; davor 24 Tage × 6/7
});

// ---------- M6 ----------
test("M6: Alt-Eintrag ohne wert-Feld – schwundAuswertung, Zähler und muellHeute zeigen dieselbe Zahl", () => {
  const b = laden(); umsatz(b, "2026-10-12", 1070);
  b.schwund.push({ id: "alt", datum: "2026-10-12", art: "gericht", vorgang: 1, ref: { typ: "gericht", id: "d" }, menge: 2, einheit: "portion", storniert: false }); // kein wert
  b.schwund.push({ id: "neu", datum: "2026-10-12", art: "rohware", vorgang: 1, ref: { typ: "artikel", name: "x" }, menge: 1, einheit: "kg", wert: null, wertOffen: true, storniert: false });
  const erwartet = 2 * 0.15 * 8; // 2 Döner à 1,20 €
  const sw = E.schwundAuswertung(b, { von: "2026-10-12", bis: "2026-10-12" }); nah(sw.muellwert, erwartet); assert.equal(sw.ohneWert, 1);
  const z = Z.zaehler(b, { datum: "2026-10-12" }); nah(z.muell, erwartet);
  const h = M.muellHeute(b, "2026-10-12"); nah(h.wert, erwartet); assert.equal(h.offen, 1); assert.equal(h.anzahl, 2);
  nah(M.muellWoche(b, "2026-10-12").tage[6].wert, erwartet); nah(M.muellMonatVergleich(b, "2026-10-12").monat, erwartet);
  assert.equal(E.eintragWert({ wert: 5 }, b), 5); assert.equal(E.eintragWert({ wert: null }, b), null); // Momentaufnahme bleibt
});

// ---------- M7 ----------
test("M7: Geschäftstag bis 4 Uhr – Umsatz um 01:30 auf dem Vortag, Monatswechsel, Kühlmessung behält das echte Datum", () => {
  assert.equal(U.heuteGeschaeft(um(1, 30)), "2026-10-14"); assert.equal(U.heute(um(1, 30)), "2026-10-15");
  assert.equal(U.heuteGeschaeft(um(3, 59)), "2026-10-14"); assert.equal(U.heuteGeschaeft(um(4, 0)), "2026-10-15"); assert.equal(U.heuteGeschaeft(um(23, 59)), "2026-10-15");
  assert.equal(U.heuteGeschaeft(new Date(2026, 10, 1, 2, 0)), "2026-10-31"); // 1.11. 02:00 → Oktober
  // Zähler am 1. des Monats um 02:00 rechnet den Vormonat
  const b = laden(); umsatz(b, "2026-10-31", 1070);
  const z = Z.zaehler(b, { datum: U.heuteGeschaeft(new Date(2026, 10, 1, 2, 0)) }); assert.equal(z.monat.monat, 10); assert.equal(z.datum, "2026-10-31"); nah(z.umsatzBrutto, 1070);
  // Umsatz-Eingabe: der gewählte Tag ist der Geschäftstag; tagesnotizLoeschen kennzeichnet nach Geschäftstag
  const D = tagGewaehlt(); assert.equal(D, U.heuteGeschaeft());
  tagAktion("tag-datum", { dataset: { wert: U.heuteGeschaeft() } }, b); assert.equal(tagGewaehlt(), U.heuteGeschaeft());
  // Müll um 01:30: Standarddatum = Geschäftstag, nacherfasst false
  const e = M.gerichtWeg(b, b.gerichte[0]); assert.equal(e.datum, U.heuteGeschaeft()); assert.equal(e.nacherfasst, false);
  assert.equal(M.mahlzeitJetzt(um(1, 30)), "abend"); assert.equal(M.mahlzeitJetzt(um(9)), "fruehstueck");
  // Kühlmessung um 01:30: Kalendertag mit echter Zeit
  b.kuehlstellen = [{ id: "k1", name: "Saladette", art: "kuehl", min: 0, max: 7, reihe: 0, archiviert: false }]; b.kuehl.eingerichtet = true;
  const r = E.rundgangStarten(b); const m = E.stationEintragen(r, b.kuehlstellen[0], { wert: 5 }); m.zeit = um(1, 30).toISOString();
  E.rundgangAbschliessen(b, r, null); assert.equal(b.messungen[0].datum, "2026-10-15"); assert.equal(b.messungen[0].zeit, m.zeit);
  // Tagesabschluss um 01:30 bucht auf den Vortag; „Jetzt dran“ bietet ihn nachts noch an
  const a = Z.tagAbschliessen(b, { datum: U.heuteGeschaeft(um(1, 30)) }); assert.equal(a.datum, "2026-10-14");
  const c = laden(); assert.equal(jetztDran(c, { betriebe: [c], letzteSicherung: new Date().toISOString() }, { jetzt: um(1, 30) })?.id, "abschluss");
  assert.equal(jetztDran(c, { betriebe: [c], letzteSicherung: new Date().toISOString() }, { jetzt: um(5, 0) }), null);
  assert.equal(E.zeitraumTage(7).bis, U.heuteGeschaeft()); assert.equal(E.monatsZeitraum().bis, U.heuteGeschaeft());
});

// ---------- M15 + E2 ----------
test("M15/E2: ohne Einkaufspreise gilt der Branchen-Richtwert 32 % als Schätzung, mit Quelle; Karte und Belege gehen vor", () => {
  assert.equal(E.RICHTWERT_WARENEINSATZ.quote, 0.32); assert.equal(E.RICHTWERT_WARENEINSATZ.min, 0.23); assert.equal(E.RICHTWERT_WARENEINSATZ.max, 0.41);
  assert.match(E.RICHTWERT_WARENEINSATZ.quelle, /BMF-Richtsatzsammlung Kalenderjahr 2025/); assert.equal(E.RICHTWERT_WARENEINSATZ.stand, "2026-10-16");
  const b = laden(); b.gerichte = []; b.artikel = []; umsatz(b, "2026-10-12", 1070);
  const q = Z.warenQuote(b); assert.equal(q.quelle, "richtwert"); assert.equal(q.geschaetzt, true); nah(q.quote, 0.32);
  const z = Z.zaehler(b, { datum: "2026-10-12" }); assert.equal(z.stufe, 1); nah(z.ware, 1000 * 0.32); nah(z.quoteEff, 0.32); assert.equal(z.geschaetzt, true);
  assert.deepEqual(wareneinsatzQuote(b, z), { quote: 0.32, quelle: "richtwert", geschaetzt: true });
  const m = monatsZiel(b, z, "2026-10-12"); assert.equal(m.geschaetzt, true); assert.equal(m.richtwertWare, true);
  nah(m.nullpunkt, (z.tageskosten * z.tage.filter((x) => x.datum >= z.start).reduce((s, x) => s + x.gewicht, 0)) / (1 - 0.32) * 1.07); // Ziel nicht mehr zu niedrig
  // Gericht ohne Preis: Richtwert; Karte mit Preisen: Kartenquote, nicht geschätzt
  const c = laden(); c.artikel[0].preis = 0; assert.equal(Z.warenQuote(c).quelle, "richtwert");
  const d = laden(); const qd = Z.warenQuote(d); assert.equal(qd.quelle, "karte"); assert.equal(qd.geschaetzt, false);
  // Eigener Lohn als Richtwert markiert die Zielkarte ebenfalls als geschätzt
  const e = laden(); e.team.eigenerLohn = null; e.team.eigenerLohnStatus = "geschaetzt"; umsatz(e, "2026-10-12", 1070);
  const ze = Z.zaehler(e, { datum: "2026-10-12" }); const me = monatsZiel(e, ze, "2026-10-12"); assert.equal(me.richtwertLohn, true); assert.equal(me.geschaetzt, true);
  // Laden: „≈“ vor der Zahl und Kupferzeile zur Einkaufspreis-Seite; mit Karte und eigenem Lohn keine Zeile
  navKontext(b, { betriebe: [b] });
  const html = startView(b, { wurzel: { betriebe: [b], letzteSicherung: new Date().toISOString() }, jetzt: um(10) });
  assert.ok(html.includes('class="h-richtwert" data-a="nav" data-wert="preise"') && html.includes("Richtwert · Preise eintragen ›"));
  assert.ok(!html.includes("BMF"), "Quelle nur im Büro und hinter dem ?");
  const f = laden(); f.betrieb.steuerSatz = 0.07; umsatz(f, "2026-10-12", 1070); umsatz(f, "2026-10-11", 1070);
  f.lieferungen.push({ id: "l1", datum: "2026-10-11", erfasst: "x", basis: "netto", summeNetto: 900, zeilen: [], storniert: false }); // Stufe 3
  navKontext(f, { betriebe: [f] });
  const zf = Z.zaehler(f, { datum: "2026-10-12" }); assert.equal(zf.stufe, 3);
  const mf = monatsZiel(f, zf, "2026-10-12"); assert.equal(mf.richtwertWare, false);
});
