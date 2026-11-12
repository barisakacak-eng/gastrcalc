// Lauf 6, E5-X (13.11.2026): Funde aus dem Technik-Audit am Rechenwerk – je Fund ein eigener Test (Name = Fund).
// Gemeinsam: Uhr mocken (mock.timers, Date), Beispiel-Laden und Prüfstand-Läden laden, formatierte Beträge vergleichen.
import test, { mock } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { berlinZeitpunkt } from "../js/zeit.js";
import { leererBetrieb } from "../js/store.js";
import { beispielLaden } from "../js/beispiel.js";

const i18n = await import("../js/i18n.js"); i18n.setzeSprache("de");
const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/[⁦-⁩ ]/g, " ").replace(/\s+/g, " ");
const mitUhr = async (tag, fn, stunde = 12) => { mock.timers.enable({ apis: ["Date"], now: berlinZeitpunkt(tag, stunde) }); try { return await fn(); } finally { mock.timers.reset(); } };

// ---------------------------------------------------------------- P1 B5
test("P1 B5: Schicht mit gleichem Beginn und Ende wird nicht eingetragen (Grund „gleich“), Kennung kommt aus dem Inhalt", async () => {
  const { schichtEintragenMitGrund, schichtEintragen } = await import("../js/schichten.js");
  const { schichtKennung } = await import("../js/abgleich_felder.js");
  const s = leererBetrieb(); s.personen = [{ id: "a", kuerzel: "AB" }];
  const gleich = schichtEintragenMitGrund(s, { datum: "2026-11-03", person: "a", von: "10:00", bis: "10:00" });
  assert.deepEqual(gleich, { eintrag: null, grund: "gleich" }); assert.equal((s.schichten || []).length, 0, "nichts eingetragen");
  assert.equal(schichtEintragen(s, { datum: "2026-11-03", person: "a", von: "10:00", bis: "10:00" }), null);
  assert.equal(schichtEintragenMitGrund(s, { datum: "2026-11-03", person: "a", von: "10:00", bis: "" }).grund, "ungueltig");
  // zwei Handys: gleiche Listenlänge, aber verschiedene Zeitpunkte → verschiedene Kennung
  const x = schichtEintragen(s, { datum: "2026-11-03", person: "a", von: "10:00", bis: "18:00", jetzt: "2026-11-03T19:00:00.000Z" });
  const s2 = leererBetrieb(); s2.personen = [{ id: "a", kuerzel: "AB" }];
  const y = schichtEintragen(s2, { datum: "2026-11-03", person: "a", von: "10:00", bis: "18:00", jetzt: "2026-11-03T19:00:05.000Z" });
  assert.notEqual(x.id, y.id); assert.equal(x.id, schichtKennung(x));
});
test("P1 B5: Büro-Bildschirm zeigt bei Beginn = Ende den Hinweis statt „Eingetragen“", async () => {
  const g = await import("../js/screens/geld3.js");
  await mitUhr("2026-11-10", () => {
    const s = leererBetrieb(); s.betrieb = { name: "T", format: "imbiss", ustRhythmus: "monat", rechtsform: "einzel" }; s.personen = [{ id: "a", kuerzel: "AB", aktiv: true }];
    g.geld3Eingabe("g3-s-von", "09:00", s); g.geld3Eingabe("g3-s-bis", "09:00", s); g.geld3Aktion("g3-schicht", {}, s);
    const t1 = text(g.geld3View(s)); assert.match(t1, /Beginn und Ende sind gleich\. Bitte prüfen\./); assert.equal((s.schichten || []).length, 0);
    g.geld3Eingabe("g3-s-bis", "17:00", s); g.geld3Aktion("g3-schicht", {}, s);
    const t2 = text(g.geld3View(s)); assert.ok(!/Beginn und Ende sind gleich/.test(t2)); assert.equal(s.schichten.length, 1);
  });
});

// ---------------------------------------------------------------- Hilfen für die Rechen-Funde
const tagesumsatz = async (s, tag, betrag) => { const E = await import("../js/engine.js"); E.tagesnotizSetzen(s, tag, betrag); E.tagesnotizenFestschreiben(s); };
const beleg = (id, datum, zeilen) => ({ id, datum, lieferant: "Großhandel", zeilen, summeNetto: zeilen.reduce((a, z) => a + z.netto, 0), storniert: false, erfasst: datum + "T08:00:00.000Z" });
function ladenMit(extra = {}) { const s = leererBetrieb(); s.phase = "app"; s.betrieb = { ...s.betrieb, name: "T", format: "imbiss", rechtsform: "einzel", ...extra }; return s; }

// ---------------------------------------------------------------- P1 B2
test("P1 B2: ein vergangener Monat rechnet die Reinigung mit dem Datum des Monats – egal ob jetzt 12.11.2026 oder 01.03.2027 ist", async () => {
  const E = await import("../js/engine.js");
  const s = ladenMit(); s.betrieb.reinigung = { wer: "firma", firmaBetrag: 120, basis: "netto", mittelSchaetzung: null, minutenTag: 45, durch: "team" };
  s.lieferungen = [beleg("a", "2026-03-05", [{ artikel: "Spülmittel", netto: 100 }]), beleg("b", "2027-02-10", [{ artikel: "Spülmittel", netto: 400 }])]; // b liegt nach dem Monat
  s.inventuren = [{ id: "i", datum: "2027-02-20", abgeschlossen: true, betriebsmittelJeMonat: 999 }]; // auch eine spätere Inventur zählt für März 2026 nicht
  const a = await mitUhr("2026-11-12", () => E.monatsLast(s, "2026-03-15"));
  const b = await mitUhr("2027-03-01", () => E.monatsLast(s, "2026-03-15"));
  assert.deepEqual(a.reinigung, b.reinigung); assert.equal(a.gesamt, b.gesamt);
  assert.equal(a.reinigung.mittel, 50, "nur der Beleg vom 05.03.2026 (100 € in 60 Tagen → 50 €/Monat)"); assert.equal(a.reinigung.stufe, "beleg"); assert.equal(a.reinigung.betrag, 170);
});

// ---------------------------------------------------------------- P1 B3
test("P1 B3: Beleg 1.000 € netto mit 200 € Spülmittel → überall 800 € Ware und 200 € Putzmittel (Zähler, Was bleibt dir, Prüfer-Blick, Monatsabschluss)", async () => {
  const Z = await import("../js/zaehler.js"), T = await import("../js/steuertopf.js"), M = await import("../js/monatsabschluss.js"), X = await import("../js/export_steuer.js");
  await mitUhr("2026-11-20", async () => {
    const s = ladenMit(); s.lieferungen = [beleg("l1", "2026-11-05", [{ artikel: "Rindfleisch", netto: 800 }, { artikel: "Spülmittel", netto: 200 }])];
    for (const d of ["2026-11-04", "2026-11-05", "2026-11-06"]) await tagesumsatz(s, d, 1190);
    const w = Z.wareNettoAusBelegen(s, "2026-11-01", "2026-11-30"); assert.equal(w.ware, 800); assert.equal(w.betriebsmittel, 200); assert.equal(w.anzahl, 1);
    assert.equal(Z.zaehler(s, { datum: "2026-11-20" }).belegSumme, 800, "Zähler (Stufe 3): Ware 800");
    const p = T.monatsPosten(s, "2026-11"); assert.equal(p.ware, 800, "Was bleibt dir: Ware 800"); assert.equal(p.putzmittel, 200, "Putzmittel als eigene Zeile");
    assert.equal(T.prueferBlick(s, "2026-11").quote, Math.round(800 / p.umsatzNetto * 1e4) / 1e4, "Prüfer-Blick: Quote aus 800");
    assert.equal(M.monatsZahlen(s, "2026-11").ware, 800, "Monatsabschluss: Ware 800");
    const wb = T.wasBleibtAus(p, null); assert.equal(wb.ergebnis, Math.round((p.umsatzNetto - 800 - 200 - p.energie - p.miete - p.personal - p.sonstiges - p.tilgung) * 100) / 100, "Putzmittel zählt als Kosten, nicht als Ware");
    const bl = X.belege(s, { von: "2026-11-01", bis: "2026-11-30" }).zeilen[0]; assert.equal(bl.betriebsmittel, 200, "Beleg-Liste: gleiche 200 €");
  });
});

// ---------------------------------------------------------------- P1 C3
test("P1 C3: eine Öffnungstage-Regel – Reinigung kennt „an Feiertagen zu“ wie der Zähler", async () => {
  const E = await import("../js/engine.js"), Z = await import("../js/zaehler.js"), R = await import("../js/reinigung.js"), F = await import("../js/feiertage.js");
  assert.equal(Z.tagGewicht, E.tagGewicht, "dieselbe Funktion");
  const s = ladenMit(); s.betrieb.reinigung = { wer: "selbst", minutenTag: 45, durch: "team" };
  const offen = R.oeffnungstageMonat(s, "2026-12-31");
  assert.equal(F.feiertagSetzen(s, "offen", false), true); // „an Feiertagen zu“
  const zu = R.oeffnungstageMonat(s, "2026-12-31"); // 02.–31.12.: 25. und 26.12. sind Feiertage
  assert.ok(Math.abs((offen - zu) - 2 * 6 / 7) < 1e-9, `Unterschied ${offen - zu}`);
  assert.equal(zu, E.oeffnungstage(s, "2026-12-02", "2026-12-31"));
  assert.equal(Z.zaehler(s, { datum: "2026-12-20" }).gewichtMonat, E.oeffnungstage(s, "2026-12-01", "2026-12-31"), "Zähler: derselbe Zähler über Tage");
  assert.ok(Math.abs(R.putzzeitMonat(s, "2026-12-31").stunden - 45 * zu / 60) < 1e-9);
});

// ---------------------------------------------------------------- P1 C4
test("P1 C4: eine Warenquote – Karte, Zähler, Monatsziel, Mindestlohn und Kombi-Grenze rufen warenQuote, ein Deckel", async () => {
  const Z = await import("../js/zaehler.js"), D = await import("../js/deal.js"), ML = await import("../js/mindestlohn.js"), E = await import("../js/engine.js");
  const s = beispielLaden("2026-11-10"); const q = Z.warenQuote(s);
  assert.equal(q.quelle, "karte"); assert.ok(q.quote > E.RICHTWERT_WARENEINSATZ.quote);
  assert.equal(D.kombiGrenze(s).quote, q.quote, "Kombi-Grenze = Quote der Karte (über dem Richtwert)"); assert.equal(D.kombiGrenze(s).quelle, "karte");
  assert.equal(Z.zaehler(s, { datum: "2026-11-09" }).quote, q.quote);
  // ein Deckel: eigener Wert 95 % → überall höchstens QUOTE_MAX
  const e = beispielLaden("2026-11-10"); e.verkauf.warenQuote = 0.95;
  assert.equal(Z.QUOTE_MAX, 0.9); assert.equal(Z.warenQuote(e).quote, Z.QUOTE_MAX);
  const z = Z.zaehler(e, { datum: "2026-11-09" }); assert.ok(z.quoteEff <= Z.QUOTE_MAX);
  const quelltext = fs.readFileSync(new URL("../js/zaehler.js", import.meta.url), "utf8") + fs.readFileSync(new URL("../js/deal.js", import.meta.url), "utf8");
  assert.ok(!/0\.89\b/.test(quelltext), "kein zweiter Deckel 0,89"); assert.ok(!/Math\.min\(0\.9,/.test(quelltext), "kein Deckel als Literal");
  // unter dem Richtwert bleibt der Richtwert die Grenze (sonst warnt jede Kombi)
  assert.equal(ML.MONATSTAGE, E.TAGE_JE_MONAT);
});

// ---------------------------------------------------------------- P1 C5
test("P1 C5: Fixkosten je Tag aus einer Funktion, Wochen/Tage je Monat aus einer Stelle (keine angezeigte Zahl ändert sich)", async () => {
  const Z = await import("../js/zaehler.js"), E = await import("../js/engine.js"), W = await import("../js/ware.js"), ML = await import("../js/mindestlohn.js");
  assert.equal(E.WOCHEN_JE_MONAT, 52 / 12); assert.equal(W.WOCHEN_JE_MONAT, E.WOCHEN_JE_MONAT); assert.equal(ML.MONATSTAGE, 30.4);
  const s = beispielLaden("2026-11-10");
  for (const H of ["2026-10-15", "2026-11-09"]) {
    const f = Z.fixkostenJeTag(s, H); const z = Z.zaehler(s, { datum: H });
    assert.equal(f.jeTag, z.tageskosten); assert.equal(f.fest, z.tageskostenFest);
    assert.ok(Math.abs(f.jeTag * f.gewichtMonat - (E.monatsLast(s, H).gesamt + f.sonder.summe)) < 1e-9, "Summe über den Monat = Monatskosten");
  }
  // Karte: Mengen = Gerichte am Tag × Öffnungstage je Woche × Wochen je Monat
  const m = ladenMit({ tageProWoche: 6 }); m.gerichte = [{ id: "g", name: "A", mengeTag: 10, preis: 5, zutaten: [] }];
  assert.ok(Math.abs(E.mengenJeMonat(m).mengen.g - 10 * 6 * E.WOCHEN_JE_MONAT) < 1e-9);
});

// ---------------------------------------------------------------- Mischsatz / Gewinn je Gericht
test("Mischsatz: Umsatz netto im Monatsposten (Was bleibt dir, Monatsabschluss) = Umsatz netto im Zähler; Gewinn je Gericht aus einer Funktion", async () => {
  const Z = await import("../js/zaehler.js"), T = await import("../js/steuertopf.js"), E = await import("../js/engine.js");
  const s = beispielLaden("2026-11-10");
  const z = Z.zaehler(s, { datum: "2026-10-31" }); const p = T.monatsPosten(s, "2026-10");
  assert.equal(p.umsatzBrutto, Math.round(z.umsatzBrutto * 100) / 100); assert.equal(p.umsatzNetto, Math.round(z.umsatzNetto * 100) / 100);
  const a = T.anteil19(s); const sa = E.umsatzSteuerSatz(s); assert.ok(Math.abs((0.07 * (1 - a.anteil) + 0.19 * a.anteil) - sa.satz) < 1e-3, "anteil19 leitet sich aus demselben Mischsatz ab");
  // Gewinn je Gericht: die Zeile der Kalkulation trägt dieselbe Zahl wie preisAmpel
  for (const x of E.kalkulation(s).zeilen) if (x.preisBrutto !== null && x.sk !== null) assert.equal(x.ampelGewinn, E.preisAmpel(x, x.preisBrutto).gewinn);
});

// ---------------------------------------------------------------- P1 B6
const tiefFrieren = (o) => { if (o && typeof o === "object" && !Object.isFrozen(o)) { Object.freeze(o); for (const k of Object.keys(o)) tiefFrieren(o[k]); } return o; };
test("P1 B6: kalkulation() ist rein – tief eingefrorener Stand wirft nicht und liefert dieselben Zahlen; Zwischenpreise setzt eine eigene Funktion", async () => {
  const E = await import("../js/engine.js"); const K = await import("../js/karte_daten.js");
  const s = beispielLaden("2026-11-10");
  const selbst = s.artikel.filter((a) => a.herkunft === "selbst"); assert.ok(selbst.length > 0, "Beispiel-Laden hat selbst gemachte Teile");
  // vorbereiten: ein Rohstoffpreis ändert sich, die Teile sind noch nicht nachgezogen
  const roh = s.artikel.find((a) => a.herkunft !== "selbst" && typeof a.preis === "number" && s.artikel.some((t) => t.herkunft === "selbst" && (t.rezept?.zutaten || []).some((z) => z.name === a.name)));
  assert.ok(roh, "gekaufter Rohstoff, den ein selbst gemachtes Teil braucht"); roh.preis = roh.preis * 1.5;
  const vorher = JSON.stringify(s);
  const k1 = E.kalkulation(s); assert.equal(JSON.stringify(s), vorher, "Lesen ändert den Stand nicht");
  const eingefroren = tiefFrieren(structuredClone(s));
  const k2 = E.kalkulation(eingefroren); assert.deepEqual(JSON.parse(JSON.stringify(k2)), JSON.parse(JSON.stringify(k1)), "dieselben Zahlen");
  // Setzen: eigene Funktion, danach rechnet die Karte dasselbe wie vorher im Ergebnis
  E.zwischenpreiseSetzen(s); assert.notEqual(JSON.stringify(s), vorher, "Setzen schreibt");
  assert.deepEqual(JSON.parse(JSON.stringify(E.kalkulation(s).zeilen)), JSON.parse(JSON.stringify(k1.zeilen)), "Karte nach dem Setzen = Karte davor");
  // Artikelpreis ändern ruft das Setzen
  const s2 = beispielLaden("2026-11-10"); const r2 = s2.artikel.find((a) => a.name === roh.name); const t2 = s2.artikel.find((a) => a.herkunft === "selbst" && (a.rezept?.zutaten || []).some((z) => z.name === roh.name));
  const alt = t2.preis; K.artikelFeldSetzen(s2, r2.name, "preis", r2.preis * 2, "2026-11-10"); assert.notEqual(t2.preis, alt, "selbst gemachtes Teil folgt beim Ändern des Preises");
});

// ---------------------------------------------------------------- P1 B4
async function ladenMitMiete() {
  const S = await import("../js/stamm.js");
  const s = ladenMit({ monate: 12 }); S.kostenBetragSetzen(s, "miete", "miete", 2400); s.kosten.find((k) => k.posten === "miete").basis = "netto";
  s.team.lohnkosten = 0; s.team.eigenerLohn = 0; s.team.eigenerLohnStatus = "eigen";
  await mitUhr("2026-10-20", async () => { for (const d of ["2026-09-10", "2026-10-10", "2026-10-11"]) await tagesumsatz(s, d, 900); });
  return { s, S };
}
const mieteIm = (E, s, monat) => E.monatsLast(s, monat + "-15").fix.jeKategorie.miete.summe;
test("P1 B4: Miete heute von 2.400 auf 3.000 € ändert den Oktober nicht (gültig ab Monat der Änderung)", async () => {
  const E = await import("../js/engine.js"); const { s, S } = await ladenMitMiete();
  assert.equal(mieteIm(E, s, "2026-10"), 2400);
  await mitUhr("2026-11-12", () => S.kostenBetragSetzen(s, "miete", "miete", 3000));
  const m = s.kosten.find((k) => k.posten === "miete"); assert.deepEqual(m.verlauf, [{ ab: "", wert: 2400 }, { ab: "2026-11", wert: 3000 }]); assert.equal(m.betrag, 3000);
  assert.equal(mieteIm(E, s, "2026-09"), 2400); assert.equal(mieteIm(E, s, "2026-10"), 2400, "Oktober bleibt");
  assert.equal(mieteIm(E, s, "2026-11"), 3000); assert.equal(mieteIm(E, s, "2026-12"), 3000, "ab November und später der neue Betrag");
  assert.equal(E.monatsLast(s, "2026-10-31").gesamt + 600, E.monatsLast(s, "2026-11-30").gesamt);
  // Tippen Ziffer für Ziffer im selben Monat ergibt einen Eintrag
  await mitUhr("2026-11-12", () => { for (const w of [4, 40, 400, 4000]) S.kostenBetragSetzen(s, "miete", "miete", w); });
  assert.deepEqual(m.verlauf, [{ ab: "", wert: 2400 }, { ab: "2026-11", wert: 4000 }]);
  // Zurückgestellt im selben Monat: kein Verlauf mehr
  await mitUhr("2026-11-13", () => S.kostenBetragSetzen(s, "miete", "miete", 2400)); assert.equal(m.verlauf, undefined);
  assert.equal(mieteIm(E, s, "2026-10"), 2400);
});
test("P1 B4: erste Zahl im ersten Monat ist kein Verlauf; Betrag ohne frühere Daten gilt schon immer", async () => {
  const S = await import("../js/stamm.js"); const s = ladenMit();
  await mitUhr("2026-11-12", () => { for (const w of [2, 24, 240, 2400]) S.kostenBetragSetzen(s, "miete", "miete", w); });
  assert.equal(s.kosten.find((k) => k.posten === "miete").verlauf, undefined);
});
test("P1 B4: Vormonat wird beim ersten Rechnen nach dem Monatswechsel eingefroren; eingefrorene Monate bleiben unverändert", async () => {
  const E = await import("../js/engine.js"), M = await import("../js/monatsabschluss.js"); const { s, S } = await ladenMitMiete();
  assert.equal(M.vormonatEinfrierenWennNoetig(s, "2026-09-05"), null, "August: kein Umsatz, nichts einzufrieren");
  const a = await mitUhr("2026-11-02", () => M.vormonatEinfrierenWennNoetig(s, "2026-11-02", { jetzt: "2026-11-02T08:00:00.000Z" }));
  assert.equal(a.monat, "2026-10"); assert.equal(a.umsatzBrutto, 1800); const vorher = JSON.stringify(M.eingefroren(s, "2026-10"));
  assert.equal(M.vormonatEinfrierenWennNoetig(s, "2026-11-03"), null, "zweiter Aufruf tut nichts"); assert.equal(s.monatsabschluesse.length, 1);
  await mitUhr("2026-11-12", () => S.kostenBetragSetzen(s, "miete", "miete", 3000));
  await tagesumsatz(s, "2026-10-12", 500); // Nachtrag in den Oktober
  assert.equal(JSON.stringify(M.eingefroren(s, "2026-10")), vorher, "eingefrorener Monat unverändert");
  assert.equal(M.monatVergleich(s, "2026-10").jetzt.umsatzBrutto, 1800);
  // September (nicht eingefroren) rechnet live – aber mit dem Betrag von damals
  assert.equal(M.monatsZahlen(s, "2026-09").personal, 0); assert.equal(E.monatsLast(s, "2026-09-30").fix.jeKategorie.miete.summe, 2400);
});
test("P1 B4: Rundreise Stand → JSON → Stand (und Einlesen über store.js) ergibt dieselben Monatszahlen", async () => {
  const M = await import("../js/monatsabschluss.js"), E = await import("../js/engine.js"), st = await import("../js/store.js"); const { s, S } = await ladenMitMiete();
  await mitUhr("2026-11-12", () => S.kostenBetragSetzen(s, "miete", "miete", 3000));
  const zahlen = (x) => ["2026-09", "2026-10", "2026-11"].map((m) => ({ m: E.monatsLast(x, m + "-15").gesamt, z: M.monatsZahlen(x, m) }));
  const j = JSON.parse(JSON.stringify(s)); assert.deepEqual(zahlen(j), zahlen(s));
  const geladen = st.migrierenBetrieb(JSON.parse(JSON.stringify(s))); assert.deepEqual(geladen.kosten.find((k) => k.posten === "miete").verlauf, [{ ab: "", wert: 2400 }, { ab: "2026-11", wert: 3000 }], "store.js reicht verlauf durch");
  assert.deepEqual(zahlen(geladen), zahlen(s));
  // alter Stand ohne Feld: gilt schon immer
  const alt = JSON.parse(JSON.stringify(s)); delete alt.kosten.find((k) => k.posten === "miete").verlauf; assert.equal(E.monatsLast(alt, "2026-10-15").fix.jeKategorie.miete.summe, 3000);
});
