// Goldwert-Tests (28.10.2026): FESTE, von Hand nachgerechnete Endwerte für das Rechenwerk (Abweichung höchstens 0,001 €).
// Warum: Die anderen Tests prüfen Regeln und Verhältnisse. Ein Fehler, der ALLE Zahlen gleichmäßig verschiebt (z. B. überall 1 % zu viel),
// bleibt dort unsichtbar. Hier stehen die Endwerte als Zahlen im Test. Ändert sich eine davon, ist das Rechenwerk anders geworden –
// dann entscheidet ein Mensch, ob die neue Zahl richtig ist, und trägt sie bewusst hier nach. Die Zahlen NICHT einfach an das Ergebnis anpassen.
//
// Zwei Teile:
//  Teil A: der Stand der App nach dem Schnellstart „Döner & Grill“ (Vorlage „Döner Kebab“, Richtpreise Stand 17.10.2026).
//          Der Prüfer vom 28.10.2026 nannte Wareneinsatz 3,944 € – die App liefert genau diese Zahl (siehe Rechnung unten).
//          Fixanteil 3,563 € und „bis null“ 3.164 € des Prüfers ließen sich mit keinem Stand nachbauen, den die App aus dem Schnellstart
//          allein erzeugt (siehe Bericht): sie hängen von Gerichtezahl, Mengen und Kosten ab, die der Prüfer nicht genannt hat.
//  Teil B: ein eigener, vollständig HIER definierter Stand („Goldstand“). Alle Zahlen sind glatte Eingaben, jede Ausgabe ist unten
//          mit dem Taschenrechner nachrechenbar. Er deckt Ware, Fixanteil, Ergebnis je Gericht, Dürüm, Cola (19 %), Strom netto,
//          „bis null“ und 1 % Preisdrift ab.
import test from "node:test";
import assert from "node:assert/strict";
import { leererBetrieb } from "../js/store.js";
import { ladenArtSetzen } from "../js/stamm.js";
import { LADEN_ARTEN, selbstStandard } from "../js/screens/onboarding.js";
import { vorlagenSortiert } from "../js/profil.js";
import { gerichtAusVorlageAnlegen, artikelAbgleichen } from "../js/karte_daten.js";
import { richtpreiseEinsetzen } from "../js/richtpreise.js";
import * as E from "../js/engine.js";
import * as Z from "../js/zaehler.js";

const EPS = 0.001; // höchstens 0,001 € Abweichung
const gold = (ist, soll, was) => assert.ok(Math.abs(ist - soll) <= EPS, `${was}: App ${ist} ≠ Goldwert ${soll} (erlaubt ±${EPS})`);

// ===================================================================================================================================
// Teil A – Stand der App nach dem Schnellstart Döner
// ===================================================================================================================================
// Weg im Test (ohne Bildschirm, dieselben Funktionen wie die App):
//   leererBetrieb()                          neuer Laden
//   ladenArtSetzen(stand, Döner & Grill)     Laden-Art „doener“ (Schnellstart, Kachel „Döner & Grill“)
//   selbstStandard(stand)                    Startwerte „selbst gemacht“ der Laden-Art (beim Verlassen der Karte): Fladenbrot und Knoblauchsauce selbst
//   gerichtAusVorlageAnlegen(… „Döner Kebab“) Vorlage Döner Kebab (8 Zutaten)
//   artikelAbgleichen + richtpreiseEinsetzen Artikel aus den Zutaten, Einkaufspreise = Richtpreise (js/data/richtpreise.js, Stand 17.10.2026)
//
// Wareneinsatz Döner Kebab von Hand (Zutat × Preis je g bzw. Stück, netto):
//   Dönerspieß      180 g × 15,62 €/kg = 2,8116 €; der Spieß verliert beim Garen 15 % → Rohware 180 ÷ 0,85 → 2,8116 ÷ 0,85 = 3,30776 €
//   Dönerbrot        1 Stück, selbst gemacht (Mehl, Hefe, Salz, Öl, 7 Stück je Ansatz) = 0,19336 €
//   Eisbergsalat    50 g × 2,8178 €/kg = 0,14089 €
//   Tomaten         40 g × 2,10 €/kg  = 0,08400 €
//   Zwiebeln        20 g × 0,643 €/kg = 0,01286 €
//   Weißkohl        40 g × 0,70 €/kg  = 0,02800 €
//   Knoblauchsauce  40 g, selbst gemacht (4,2626 € je 1.050 g) = 40 × 4,2626 ÷ 1050 = 0,16238 €
//   Dönertüte        1 Stück × 0,0149 € = 0,01490 €
//   Summe 3,30776 + 0,19336 + 0,14089 + 0,084 + 0,01286 + 0,028 + 0,16238 + 0,0149 = 3,94415 €  → „3,944 €“ wie beim Prüfer.
function appStandDoener() {
  const s = leererBetrieb(); s.phase = "onboarding";
  ladenArtSetzen(s, LADEN_ARTEN.find((a) => a.id === "doener"));
  selbstStandard(s);
  const so = vorlagenSortiert(s);
  const v = [...so.kern, ...so.oft, ...so.weitere].find((x) => x.name === "Döner Kebab");
  gerichtAusVorlageAnlegen(s, v);
  artikelAbgleichen(s);
  richtpreiseEinsetzen(s, { datum: "2026-10-28" });
  return s;
}

test("Goldwert A: Wareneinsatz Döner Kebab nach Schnellstart Döner = 3,944 € (Prüfer 28.10.2026)", () => {
  const s = appStandDoener();
  const z = E.kalkulation(s).zeilen.find((x) => x.name === "Döner Kebab");
  gold(z.waren, 3.94415, "Ware Döner Kebab");
  assert.equal(Math.round(z.waren * 1000) / 1000, 3.944, "auf drei Stellen gerundet genau die Zahl des Prüfers");
  assert.equal(z.warenRichtpreis, true, "mit Richtpreisen gerechnet, also eine Schätzung (≈)");
});

// ===================================================================================================================================
// Teil B – Goldstand (alles im Test definiert)
// ===================================================================================================================================
// Eingaben:
//   Betrieb: 6 Tage je Woche, 12 Monate  → Verkaufstage je Monat = 6 × 52 ÷ 12 = 26
//   Kosten:  Miete 1.500 € netto je Monat
//            Strom 595 € BRUTTO je Monat (19 % Vorsteuer) → netto 595 ÷ 1,19 = 500 €
//            feste Kosten = 1.500 + 500 = 2.000 €
//   Team:    Lohnkosten 3.000 €, eigener Lohn 2.400 € (eigen) – keine Personenzahl, darum kein Zeitzuschlag
//   Monatslast = 2.000 + 3.000 + 2.400 = 7.400 €
//   Menge je Tag: Döner 60, Dürüm 30, Cola 60 → je Monat × 26 = 1.560, 780, 1.560
//   Äquivalenzziffern: Hauptgericht 1,0 · Getränk 0,3
//   Summe der Äquivalenzmengen = 1.560 × 1 + 780 × 1 + 1.560 × 0,3 = 2.808
//   Fixanteil je Hauptgericht = 7.400 ÷ 2.808 = 2,635328 €; je Cola = 0,3 × 2,635328 = 0,790598 €
//
// Artikel (netto, wenn nicht anders genannt):
//   Dönerspieß   10 kg für 85 € = 0,0085 €/g, Garverlust 15 %      Fladenbrot  100 Stück für 40 € = 0,40 €
//   Dürüm-Wrap   50 Stück für 17,50 € = 0,35 €                     Eisbergsalat 5 kg für 12,50 € = 0,0025 €/g
//   Soße         5 kg für 20 € = 0,004 €/g                         Tüte 1.000 Stück für 30 € = 0,03 €
//   Cola 0,33 l  24er Kasten für 14,28 € BRUTTO (19 %) → 14,28 ÷ 1,19 = 12,00 € netto → 0,50 € je Dose
//
// Gerichte:
//   Döner:  180 g Spieß, 1 Fladen, 50 g Salat, 40 g Soße, 1 Tüte;  7,50 € brutto, 7 %
//   Dürüm:  180 g Spieß, 1 Wrap, 40 g Salat, 40 g Soße, 1 Tüte;    9,00 € brutto, 7 %
//   Cola:   1 Dose;                                                 2,50 € brutto, 19 %
const GRUND = { spiess: 85, fladen: 40, wrap: 17.5, salat: 12.5, sosse: 20, tuete: 30, cola: 14.28 };
function goldStand({ spiessPreis = GRUND.spiess } = {}) {
  const s = leererBetrieb(); s.phase = "app";
  s.angelegt = "2026-10-01T12:00:00.000Z"; // vor dem Berichtsmonat: die Zählung beginnt am 1. November
  s.betrieb = { ...s.betrieb, tageProWoche: 6, monate: 12 };
  s.kosten = [
    { id: "k1", posten: "miete", kategorie: "miete", betrag: 1500, status: "bekannt", periode: "monat", basis: "netto" },
    { id: "k2", posten: "strom", kategorie: "energie", betrag: 595, status: "bekannt", periode: "monat", basis: "brutto", satz: 19 },
  ];
  s.team = { personen: null, stundenProPerson: null, lohnkosten: 3000, eigenerLohn: 2400, eigenerLohnStatus: "eigen" };
  s.verkauf = { zielgewinn: 10, zielgewinnStatus: "eigen", bestellungenTag: null, warenQuote: null };
  const art = (name, gruppe, einheit, menge, preis, extra = {}) => ({ name, gruppe, einheit, packung: { menge, einheit }, preis, preisBasis: "netto", preisHistorie: [], status: "bekannt", ...extra });
  s.artikel = [
    art("Dönerspieß Kalb/Pute", "fleisch", "kg", 10, spiessPreis, { garverlust: { wert: 0.15 } }),
    art("Dönerbrot / Fladen", "teig", "stk", 100, GRUND.fladen),
    art("Dürüm-Wrap", "teig", "stk", 50, GRUND.wrap),
    art("Eisbergsalat", "gemuese", "kg", 5, GRUND.salat),
    art("Knoblauchsauce", "sauce", "kg", 5, GRUND.sosse),
    art("Dönertüte", "verpackung", "stk", 1000, GRUND.tuete),
    art("Cola 0,33 l", "getraenk", "stk", 24, GRUND.cola, { preisBasis: "brutto" }),
  ];
  const z = (name, menge, einheit) => ({ name, menge, einheit });
  s.gerichte = [
    { id: "doener", name: "Döner", klasse: "haupt", zeit: 4, preis: 7.5, mengeTag: 60, steuer: 0.07,
      zutaten: [z("Dönerspieß Kalb/Pute", 180, "g"), z("Dönerbrot / Fladen", 1, "stk"), z("Eisbergsalat", 50, "g"), z("Knoblauchsauce", 40, "g"), z("Dönertüte", 1, "stk")] },
    { id: "dueruem", name: "Dürüm", klasse: "haupt", zeit: 5, preis: 9, mengeTag: 30, steuer: 0.07,
      zutaten: [z("Dönerspieß Kalb/Pute", 180, "g"), z("Dürüm-Wrap", 1, "stk"), z("Eisbergsalat", 40, "g"), z("Knoblauchsauce", 40, "g"), z("Dönertüte", 1, "stk")] },
    { id: "cola", name: "Cola 0,33 l", klasse: "getraenk", zeit: 0.5, preis: 2.5, mengeTag: 60,
      zutaten: [z("Cola 0,33 l", 1, "stk")] },
  ];
  return s;
}
const zeile = (s, id) => E.kalkulation(s).zeilen.find((x) => x.id === id);

test("Goldwert B1: Döner – Ware 2,515 €, Fixanteil 2,635328 €, Ergebnis +1,859018 €", () => {
  // Ware: Spieß 180 g ÷ 0,85 = 211,7647 g × 0,0085 = 1,80 €; Fladen 0,40; Salat 50 × 0,0025 = 0,125; Soße 40 × 0,004 = 0,16; Tüte 0,03
  //       1,80 + 0,40 + 0,125 + 0,16 + 0,03 = 2,515 €
  // Fixanteil: 7.400 ÷ 2.808 × 1,0 = 2,635328 €
  // Preis netto: 7,50 ÷ 1,07 = 7,009346 €
  // Ergebnis je Döner: 7,009346 − 2,515 − 2,635328 = 1,859018 €
  const z = zeile(goldStand(), "doener");
  gold(z.waren, 2.515, "Ware Döner");
  gold(z.fix, 2.635328, "Fixanteil Döner");
  gold(z.preisNetto, 7.009346, "Nettopreis Döner");
  gold(z.preisNetto - z.waren - z.fix, 1.859018, "Ergebnis je Döner");
  gold(z.sk, 5.150328, "Selbstkosten Döner (Ware + Fixanteil)");
});

test("Goldwert B2: Dürüm – Ware 2,44 €, Fixanteil 2,635328 €, Ergebnis +3,335887 €", () => {
  // Ware: Spieß 1,80; Wrap 0,35; Salat 40 × 0,0025 = 0,10; Soße 0,16; Tüte 0,03 → 1,80 + 0,35 + 0,10 + 0,16 + 0,03 = 2,44 €
  // Fixanteil: wie Döner (gleiche Klasse „Hauptgericht“) 2,635328 €
  // Preis netto: 9,00 ÷ 1,07 = 8,411215 €;  Ergebnis: 8,411215 − 2,44 − 2,635328 = 3,335887 €
  const z = zeile(goldStand(), "dueruem");
  gold(z.waren, 2.44, "Ware Dürüm");
  gold(z.fix, 2.635328, "Fixanteil Dürüm");
  gold(z.preisNetto, 8.411215, "Nettopreis Dürüm");
  gold(z.preisNetto - z.waren - z.fix, 3.335887, "Ergebnis je Dürüm");
});

test("Goldwert B3: Cola 0,33 l – 19 % Steuer: Ware 0,50 €, netto 2,100840 €, Ergebnis +0,810242 €", () => {
  // Einkauf: Kasten 14,28 € brutto ÷ 1,19 = 12,00 € netto ÷ 24 Dosen = 0,50 € je Dose
  // Verkauf: 2,50 € brutto ÷ 1,19 = 2,100840 € netto (NICHT ÷ 1,07 = 2,336449)
  // Fixanteil Getränk: 0,3 × 2,635328 = 0,790598 €
  // Ergebnis: 2,100840 − 0,50 − 0,790598 = 0,810242 €
  const z = zeile(goldStand(), "cola");
  assert.equal(z.mwst, 0.19, "Getränke zahlen 19 %");
  gold(z.waren, 0.5, "Ware Cola");
  gold(z.preisNetto, 2.10084, "Nettopreis Cola (19 %)");
  gold(z.fix, 0.790598, "Fixanteil Cola");
  gold(z.preisNetto - z.waren - z.fix, 0.810242, "Ergebnis je Cola");
});

test("Goldwert B4: Strom 595 € brutto (19 %) → 500,00 € netto je Monat; feste Kosten 2.000 €, Monatslast 7.400 €", () => {
  const s = goldStand();
  const strom = s.kosten.find((k) => k.posten === "strom");
  gold(E.betragJeMonat(strom, s.betrieb), 500, "Strom netto je Monat (595 ÷ 1,19)");
  // Jahresbetrag: 1.428 € brutto je Jahr ÷ 1,19 = 1.200 € netto ÷ 12 = 100 € je Monat
  gold(E.betragJeMonat({ betrag: 1428, basis: "brutto", periode: "jahr", satz: 19 }, s.betrieb), 100, "Strom Jahresbetrag netto je Monat");
  // 7 % statt 19 %: 107 ÷ 1,07 = 100
  gold(E.betragJeMonat({ betrag: 107, basis: "brutto", periode: "monat", satz: 7 }, s.betrieb), 100, "Posten mit 7 %");
  gold(E.fixkosten(s).gesamt, 2000, "feste Kosten (Miete 1.500 + Strom 500)");
  gold(E.monatsLast(s).gesamt, 7400, "Monatslast (2.000 + Lohn 3.000 + eigener Lohn 2.400)");
});

test("Goldwert B5: 1 % Preisdrift beim Dönerspieß → Ware Döner steigt um genau 0,018 €", () => {
  // Spieß 85,00 € → 85,85 € je 10 kg (+1 %). Der Spieß macht im Döner 1,80 € Ware aus: 1,80 × 0,01 = 0,018 €.
  const vorher = goldStand(), nachher = goldStand({ spiessPreis: GRUND.spiess * 1.01 });
  const d0 = zeile(vorher, "doener"), d1 = zeile(nachher, "doener");
  gold(d1.waren - d0.waren, 0.018, "Anstieg Ware Döner");
  gold(d1.waren, 2.533, "Ware Döner nach +1 %");
  gold(zeile(nachher, "dueruem").waren - zeile(vorher, "dueruem").waren, 0.018, "Anstieg Ware Dürüm (gleicher Spieß)");
  gold(zeile(nachher, "cola").waren - zeile(vorher, "cola").waren, 0, "Cola bleibt gleich");
  gold(d1.fix, d0.fix, "Fixanteil bleibt gleich (Kosten unverändert)");
  gold(d1.preisNetto - d1.waren - d1.fix, 1.859018 - 0.018, "Ergebnis je Döner sinkt um genau 0,018 €");
});

test("Goldwert B6: „bis null“ im November 2026 = 11.835,33 € Umsatz (brutto), mit Zielgewinn 10 % = 13.869,04 €", () => {
  // Monatskosten 7.400 € (Zählung ab 1. November, am 30. November sind alle Tage gezählt).
  // Wareneinsatz-Quote aus der Karte: Σ Ware × Menge ÷ Σ Nettopreis × Menge
  //   Ware je Monat   2,515 × 1.560 + 2,44 × 780 + 0,50 × 1.560 = 3.923,40 + 1.903,20 + 780,00 = 6.606,60 €
  //   Netto je Monat  7,009346 × 1.560 + 8,411215 × 780 + 2,100840 × 1.560 = 10.934,58 + 6.560,75 + 3.277,31 = 20.772,64 €
  //   Quote = 6.606,60 ÷ 20.772,64 = 0,318043
  // Mischsatz Umsatzsteuer, gewichtet mit Preis × Menge: (7,5 × 1.560 × 0,07 + 9 × 780 × 0,07 + 2,5 × 1.560 × 0,19) ÷ (7,5 × 1.560 + 9 × 780 + 2,5 × 1.560)
  //   = (819 + 491,40 + 741) ÷ 22.620 = 2.051,40 ÷ 22.620 = 0,090690 → die App rundet auf vier Stellen: 0,0907
  // Umsatz (brutto), bei dem der Monat auf null kommt: Kosten ÷ ((1 − Quote) ÷ (1 + Satz))
  //   = 7.400 ÷ (0,681957 ÷ 1,0907) = 7.400 ÷ 0,625246 ≈ 11.835,33 €
  // Mit Zielgewinn 10 % vom Nettoumsatz: 7.400 ÷ ((1 − 0,318043 − 0,10) ÷ 1,0907) = 7.400 ÷ 0,533554 ≈ 13.869,04 €
  const s = goldStand();
  const z = Z.zaehler(s, { datum: "2026-11-30" });
  gold(z.quote, 0.318043, "Wareneinsatz-Quote aus der Karte");
  gold(z.steuer, 0.0907, "Mischsatz Umsatzsteuer");
  gold(z.last.gesamt, 7400, "Monatslast im Zähler");
  const m = Z.monatsZiel(s, z, "2026-11-30");
  gold(m.nullpunkt, 11835.328, "Umsatz bis null");
  gold(m.fehltNull, 11835.328, "es fehlen bis null (noch kein Umsatz eingetragen)");
  gold(m.ziel, 13869.041, "Umsatz bis null plus Zielgewinn");
});
