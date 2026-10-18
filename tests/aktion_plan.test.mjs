// Aktion planen (18.10.2026): Vorgabe des Eigentümers – „Die Laufzeit einer Aktion muss immer variabel sein und mit dem Gastronomen besprochen
// werden. Dahinter gehören Aktionszeitraum, Warenbestand und Interesse.“ Geprüft: Vorschlag aus Bestand, Haltbarkeit und Interesse mit
// Begründung; nie eine Aktion bei Verbrauchsdatum; frei wählbarer Zeitraum (ab sofort, bis Datum, bis Ware weg) – bestätigt oder geändert,
// nie automatisch; Fortschritt und „Uhrzeit“-Satz; Bilanz nach dem Ende und Lernen; Migration alter Aktionen; Zusammenführen; Bildschirm.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
globalThis.document ??= { documentElement: {} };
const st = await import("../js/store.js");
const P = await import("../js/aktion_plan.js");
const T = await import("../js/tafel.js");
const D = await import("../js/deal.js");
const { tagPlus, wochentag } = await import("../js/engine.js");
const { beispielLaden } = await import("../js/beispiel.js");
const { haltbarStand, letzterOffenTag } = await import("../js/haltbar.js");
const i18n = await import("../js/i18n.js");
i18n.setzeSprache("de");
const HIER = path.dirname(fileURLToPath(import.meta.url));
const H = "2026-10-18"; // Sonntag (im Beispiel-Laden Ruhetag)
const JETZT = "2026-10-18T12:00:00.000Z";
const nah = (x, y, eps = 1e-6) => assert.ok(Math.abs(x - y) <= eps, `${x} ≠ ${y}`);

// Testladen ohne Ruhetag (7 Tage offen): Döner 7 € (Brot 0,30 € Ware), Cola 2,50 € (0,50 € Ware), Kassen-Menü „Döner + Cola“.
// je(d, i) → { d1, c1, menue, menuePreis }: Verkäufe am Tag d (i Tage vor heute) aus der Kasse mit Umsatz.
function laden({ heute = H, tage = 28, je = () => ({ d1: 10, c1: 10 }) } = {}) {
  const s = st.leererBetrieb(); s.phase = "app"; s.betrieb.name = "Testimbiss"; s.betrieb.tageProWoche = 7;
  s.gerichte = [
    { id: "d1", name: "Döner", preis: 7, klasse: "haupt", steuer: 0.07, zutaten: [{ name: "Brot", menge: 1, einheit: "stk" }] },
    { id: "c1", name: "Cola 0,33 l", preis: 2.5, klasse: "getraenk", steuer: 0.19, zutaten: [{ name: "Cola 0,33 l", menge: 1, einheit: "stk" }] },
  ];
  s.artikel = [
    { name: "Brot", gruppe: "teig", einheit: "stk", packung: { menge: 10, einheit: "stk" }, gebinde: { art: "karton", zwischen: null }, preis: 3, preisBasis: "netto" },
    { name: "Cola 0,33 l", gruppe: "getraenk", einheit: "stk", packung: { menge: 24, einheit: "stk" }, gebinde: { art: "kiste", zwischen: null }, preis: 12, preisBasis: "netto" },
  ];
  s.kassenKombis = [{ id: "k1", name: "Menü Döner + Cola", kassenNamen: [], plu: null, teile: [{ gericht: "d1", menge: 1 }, { gericht: "c1", menge: 1 }] }];
  const m = st.migrierenBetrieb(s);
  for (let i = 1; i <= tage; i++) {
    const d = tagPlus(heute, -i); const x = je(d, i);
    const dazu = (id, n, preis, extra = {}) => { if (n > 0) m.verkaeufe.push({ id: `v-${d}-${id}`, datum: d, gericht: extra.kombi ? null : id, ...extra, name: id, menge: n, umsatzBrutto: Math.round(n * preis * 100) / 100, herkunft: "kasse", importId: "imp-" + d, erfasst: d + "T22:00:00.000Z", storniert: false }); };
    dazu("d1", x.d1 || 0, 7); dazu("c1", x.c1 || 0, 2.5); dazu("k1", x.menue || 0, x.menuePreis || 8.5, { kombi: "k1" });
  }
  return m;
}
const KOMBI = { art: "kombi", gerichte: ["d1", "c1"], preis: 8.5 };

test("Vorschlag: Interesse – Trend aus 2 × 14 Tagen, starke Wochentage, Länge 7 Tage (steigt/gleich) oder 14 Tage (sinkt), Mehrmenge = Break-even", () => {
  const be = D.aktionBreakEven(laden(), KOMBI.gerichte, KOMBI.preis);
  nah(be.rohertragEinzeln, 7 / 1.07 + 2.5 / 1.19 - 0.8); nah(be.rohertragAktion, 8.5 * (7 / 1.07 + 2.5 / 1.19) / 9.5 - 0.8); nah(be.mehrAnteil, (be.rohertragEinzeln - be.rohertragAktion) / be.rohertragAktion);
  const steigt = P.aktionVorschlag(laden({ je: (d, i) => (i <= 14 ? { d1: 20, c1: 20 } : { d1: 10, c1: 10 }) }), KOMBI, { heuteTag: H });
  assert.equal(steigt.moeglich, true); assert.equal(steigt.interesse.trend, "steigt"); assert.equal(steigt.tage, 7); assert.equal(steigt.von, H, "ab sofort"); assert.equal(steigt.bis, tagPlus(H, 6)); assert.equal(steigt.ende, "datum");
  assert.equal(steigt.erwartung.quelle, "breakEven"); nah(steigt.erwartung.mehrAnteil, be.mehrAnteil);
  assert.match(steigt.satz, /^7 Tage: /); assert.ok(steigt.satz.includes("Verkauf steigt") && steigt.satz.includes(`gerechnet mit +${Math.round(be.mehrAnteil * 100)} %`), steigt.satz);
  const sinkt = P.aktionVorschlag(laden({ je: (d, i) => (i <= 14 ? { d1: 6, c1: 6 } : { d1: 12, c1: 12 }) }), KOMBI, { heuteTag: H });
  assert.equal(sinkt.interesse.trend, "sinkt"); assert.equal(sinkt.tage, P.PLAN_TAGE_SINKT); assert.equal(sinkt.bis, tagPlus(H, 13)); assert.ok(sinkt.satz.startsWith("14 Tage: ") && sinkt.satz.includes("zwei Wochen testen"), sinkt.satz);
  const gleich = P.aktionVorschlag(laden(), KOMBI, { heuteTag: H }); assert.equal(gleich.interesse.trend, "gleich"); assert.equal(gleich.tage, 7);
  // Kombi-Einheit: das am wenigsten verkaufte Gericht (5 Cola, 20 Döner → 5 komplette Sätze je Tag)
  assert.equal(P.aktionInteresse(laden({ je: () => ({ d1: 20, c1: 5 }) }), KOMBI, { heuteTag: H }).schnitt, 5);
  // Wochentage: Freitag und Samstag stark
  const wt = P.aktionVorschlag(laden({ je: (d) => ([5, 6].includes(wochentag(d)) ? { d1: 30, c1: 30 } : { d1: 10, c1: 10 }) }), KOMBI, { heuteTag: H });
  assert.deepEqual([...wt.interesse.stark].sort(), [5, 6]); assert.ok(wt.satz.includes("stark: Fr, Sa"), wt.satz);
  // ohne Verkaufszahlen: kein Trend, eine Woche, ehrlich gesagt
  const ohne = P.aktionVorschlag(laden({ tage: 0 }), KOMBI, { heuteTag: H });
  assert.equal(ohne.interesse.trend, "unbekannt"); assert.equal(ohne.tage, 7); assert.ok(ohne.satz.includes("noch keine Verkaufszahlen") && ohne.satz.includes("Bestand unbekannt – erst Inventur"), ohne.satz);
  // drei Quellen in der Begründung
  assert.deepEqual(gleich.gruende.map((g) => g.quelle), ["ware", "interesse", "erwartung"]);
});

test("Vorschlag: Warenbestand (Beispiel-Laden) – knappe Ware bei erwarteter Mehrmenge, Start am nächsten Öffnungstag", () => {
  const s = beispielLaden(H); const a = s.aktionen[0];
  const v = P.aktionVorschlag(s, a, { heuteTag: H });
  assert.equal(v.moeglich, true); assert.equal(v.von, "2026-10-19", "Sonntag ist Ruhetag → ab Montag"); assert.equal(v.bis, "2026-10-25"); assert.equal(v.ende, "datum");
  assert.equal(v.ware.name, "Dönerspieß Kalb/Pute", "die knappste Ware"); assert.equal(v.ware.reicht, false); assert.ok(v.ware.leerAm <= v.bis);
  assert.ok(v.satz.includes("Dönerspieß Kalb/Pute bei mehr Verkauf am") && v.satz.includes("nachbestellen"), v.satz);
  // mit Mehrmenge ist die Ware früher weg als ohne
  const ohneMehr = P.aktionWare(s, a, { heuteTag: H }).find((w) => w.name === "Dönerspieß Kalb/Pute");
  const mitMehr = v.warenListe.find((w) => w.name === "Dönerspieß Kalb/Pute"); assert.ok(mitMehr.leerAm <= ohneMehr.leerAm);
  assert.ok(!v.warenListe.some((w) => w.name === "Dönertüte"), "Verpackung entscheidet keine Aktion");
  // die Beispiel-Aktion trägt den Vorschlag, den der Wirt gesehen hat, mit Begründung
  assert.equal(a.plan.quelle, "breakEven"); assert.ok(a.plan.satz.length > 20 && a.plan.satz.includes(" · ")); assert.equal(a.plan.von, a.von);
});

test("Vorschlag: Haltbarkeit – MHD-Ware bis zum letzten Öffnungstag vor Ablauf, „bis Ware weg“; Verbrauchsdatum: NIE eine Aktion", () => {
  const s = beispielLaden(H); const hs = haltbarStand(s, { heuteTag: H });
  const ab = hs.abverkauf.find((x) => x.bester); assert.equal(ab.name, "Ayran 0,25 l");
  const v = P.aktionVorschlag(s, { art: "abverkauf", gerichte: [ab.bester.gericht], preis: ab.bester.aktionspreis, ware: ab.name }, { heuteTag: H });
  assert.equal(v.moeglich, true); assert.equal(v.ende, "ware"); assert.ok(v.bis <= letzterOffenTag(s, H, ab.ablauf), v.bis);
  assert.equal(v.haltbar.ware, "Ayran 0,25 l"); assert.ok(v.satz.startsWith("Bis Ware weg, längstens") && v.satz.includes("MHD Ayran 0,25 l"), v.satz);
  assert.ok(v.rest && (v.rest.weg || v.rest.bleibt > 0), "sagt, ob der Rest bis zum MHD weg ist");
  // Verbrauchsdatum (Hähnchenspieß, morgen): kein Vorschlag, keine Aktion – auch nicht, wenn der Wirt sie direkt übernehmen will
  const hd = s.gerichte.find((g) => g.name === "Hähnchendöner");
  const nein = P.aktionVorschlag(s, { art: "abverkauf", gerichte: [hd.id], preis: 6 }, { heuteTag: H });
  assert.deepEqual([nein.moeglich, nein.grund, nein.ware], [false, "verbrauch", "Hähnchenspieß"]); assert.match(nein.satz, /Verbrauchsdatum – keine Aktion/);
  const vorher = s.aktionen.length;
  assert.equal(T.aktionUebernehmen(s, { art: "abverkauf", gerichte: [hd.id], preis: 6, von: "2026-10-19", bis: "2026-10-20" }, { heuteTag: H }), null);
  assert.equal(T.aktionUebernehmen(s, { art: "kombi", gerichte: [hd.id, s.gerichte.find((g) => g.name === "Cola 0,33 l").id], preis: 9, ware: "Hähnchenspieß" }, { heuteTag: H }), null, "Kombi, um Verbrauchsdatum-Ware loszuwerden: nein");
  assert.equal(s.aktionen.length, vorher);
  // eine normale Kombi mit Hähnchendöner bleibt möglich (frische Ware wird normal verkauft, die Aktion ist nicht „für“ sie)
  assert.equal(P.aktionVorschlag(s, { art: "kombi", gerichte: [hd.id, s.gerichte.find((g) => g.name === "Cola 0,33 l").id], preis: 9 }, { heuteTag: H }).moeglich, true);
  // Preis unter der Ware: keine Aktion
  assert.equal(P.aktionVorschlag(laden(), { ...KOMBI, preis: 0.5 }, { heuteTag: H }).grund, "lohnt");
});

test("Frei wählbarer Zeitraum: ab sofort, bis Datum, bis Ware weg (auch ohne Datum); ändern statt fester 14 Tage; nie automatisch", () => {
  const s = laden();
  const a = T.aktionUebernehmen(s, { ...KOMBI, von: "2026-10-20", bis: "2026-11-30" }, { heuteTag: H, jetzt: JETZT });
  assert.deepEqual([a.von, a.bis, a.ende], ["2026-10-20", "2026-11-30", "datum"], "6 Wochen – so lange, wie der Wirt will");
  assert.ok(a.plan && a.plan.satz.includes("Tage:"), "der Vorschlag, den die App gemacht hat, bleibt dabei");
  const w = T.aktionUebernehmen(laden(), { ...KOMBI, ende: "ware", bis: "" }, { heuteTag: H, jetzt: JETZT });
  assert.deepEqual([w.von, w.bis, w.ende], [H, null, "ware"], "ab sofort, bis die Ware weg ist");
  const sw = laden(); sw.aktionen = [w];
  const b = T.tafelBeschreibung(sw, { heuteTag: "2027-03-01" }); assert.equal(b.aktionen.length, 1, "ohne Datum läuft sie, bis der Wirt sie beendet"); assert.equal(b.aktionen[0].laufText, "solange der Vorrat reicht");
  assert.equal(T.tafelAktionSichtbar({ von: H, bis: "" }, new Date(2027, 2, 1, 12).getTime()), true);
  const wb = T.aktionUebernehmen(laden(), { ...KOMBI, ende: "ware", von: "2026-10-20", bis: "2026-10-27" }, { heuteTag: H });
  const lt = T.tafelBeschreibung({ ...laden(), aktionen: [wb] }, { heuteTag: H }).aktionen[0].laufText; assert.equal(lt, "ab Di 20.10., solange der Vorrat reicht, längstens bis Di 27.10.");
  // ändern: Ende verschieben, „bis Ware weg“, Unsinn abweisen; läuft sie schon, bleibt der Start
  const s2 = laden(); const x = T.aktionUebernehmen(s2, KOMBI, { heuteTag: H });
  assert.equal(T.aktionZeitraumSetzen(s2, x.id, { von: x.von, bis: tagPlus(H, -2), ende: "datum" }, { heuteTag: H }), null, "Ende vor heute");
  assert.equal(T.aktionZeitraumSetzen(s2, x.id, { von: x.von, bis: null, ende: "datum" }, { heuteTag: H }), null, "bis Datum ohne Datum");
  const neu = T.aktionZeitraumSetzen(s2, x.id, { von: "2026-11-01", bis: "2026-11-10", ende: "ware" }, { heuteTag: H, jetzt: JETZT });
  assert.deepEqual([neu.von, neu.bis, neu.ende, neu.geaendertZeit], [H, "2026-11-10", "ware", JETZT], "läuft schon: Start bleibt"); assert.notEqual(s2.aktionen[0], x, "neues Objekt");
  assert.equal(T.aktionZeitraumSetzen(s2, x.id, { von: H, bis: "2026-11-10", ende: "ware" }, { heuteTag: H }), null, "unverändert");
  const k = laden(); const y = T.aktionUebernehmen(k, { ...KOMBI, von: "2026-10-25", bis: "2026-10-30" }, { heuteTag: H });
  assert.equal(T.aktionZeitraumSetzen(k, y.id, { von: "2026-10-22", bis: "2026-10-30", ende: "datum" }, { heuteTag: H }).von, "2026-10-22", "kommt noch: Start änderbar");
  assert.ok(!fs.readFileSync(path.join(HIER, "..", "js", "tafel.js"), "utf8").includes("KOMBI_LAUFZEIT_TAGE"), "keine feste Laufzeit mehr");
});

test("Fortschritt: verkauft seit Start gegen gleiche Wochentage vorher, Rohertrag, Urteil und „Uhrzeit“-Satz", () => {
  const von = tagPlus(H, -7);
  const gut = laden({ tage: 35, je: (d) => (d >= von ? { menue: 14, menuePreis: 8.5 } : { d1: 10, c1: 10 }) });
  const a = T.aktionUebernehmen(gut, { ...KOMBI, von, bis: tagPlus(H, 6) }, { heuteTag: von });
  const f = P.aktionFortschritt(gut, a, { heuteTag: H });
  assert.equal(f.vergleich.vergleichbar, 7); assert.equal(f.vergleich.verkauft, 7 * 28, "Menü zählt je Bestandteil"); assert.equal(f.vergleich.vorher, 7 * 20);
  nah(f.vergleich.mehrAnteil, 0.4); const rk = 8.5 * (7 / 1.07 + 2.5 / 1.19) / 9.5 - 0.8, re = 7 / 1.07 + 2.5 / 1.19 - 0.8;
  nah(f.vergleich.rohertrag, Math.round(7 * 14 * rk * 100) / 100, 0.02); nah(f.vergleich.rohertragVorher, Math.round(7 * 10 * re * 100) / 100, 0.02); assert.equal(f.vergleich.geschaetzt, false, "Umsatz aus der Kasse");
  assert.equal(f.status, "gut");
  const z = P.fortschrittZeilen(f); assert.ok(z[0].startsWith("Seit Start 196 verkauft – vorher ≈ 140"), z[0]); assert.match(z[1], /^Rohertrag bisher .*€ – vorher ≈ .*€$/);
  assert.equal(P.aktionUhrzeit(gut, { heuteTag: H }).text, "Kombi läuft gut");
  const wenig = laden({ tage: 35, je: (d) => (d >= von ? { menue: 10, menuePreis: 8.5 } : { d1: 10, c1: 10 }) });
  const b = T.aktionUebernehmen(wenig, { ...KOMBI, von, bis: tagPlus(H, 6) }, { heuteTag: von });
  assert.equal(P.aktionFortschritt(wenig, b, { heuteTag: H }).status, "weniger");
  assert.deepEqual([P.aktionUhrzeit(wenig, { heuteTag: H }).text, P.aktionUhrzeit(wenig, { heuteTag: H }).ziel.wert], ["Kombi bringt bisher weniger – beenden?", "aktionen"]);
  // zu früh: erst 1 Tag
  const frueh = laden({ tage: 30, je: (d) => (d >= tagPlus(H, -1) ? { menue: 5 } : { d1: 10, c1: 10 }) });
  const c = T.aktionUebernehmen(frueh, { ...KOMBI, von: tagPlus(H, -1), bis: tagPlus(H, 6) }, { heuteTag: tagPlus(H, -1) });
  const fc = P.aktionFortschritt(frueh, c, { heuteTag: H }); assert.equal(fc.status, "zuFrueh"); assert.equal(P.fortschrittZeilen(fc)[0], "Erst 1 Tag mit Verkäufen – noch zu früh.");
  assert.equal(P.aktionUhrzeit(frueh, { heuteTag: H }), null, "zu früh: kein Satz");
  // Ware knapp (Beispiel-Laden): „Kombi: … reicht nur noch …“ – Büro-Hinweis, im Laden nichts
  const s = beispielLaden(H); const u = P.aktionUhrzeit(s, { heuteTag: H });
  assert.equal(u.art, "knapp"); assert.match(u.text, /^Kombi: Dönerspieß Kalb\/Pute reicht nur noch \d Tag/);
});

test("„Uhrzeit“ im Büro: Hinweis-Chip (ein Satz je Bereich, Haltbarkeit hat Vorrang), im Laden nichts", async () => {
  const { offenImBuero, jetztDran } = await import("../js/offen.js");
  const von = tagPlus(H, -7); const s = laden({ tage: 35, je: (d) => (d >= von ? { menue: 10 } : { d1: 10, c1: 10 }) });
  T.aktionUebernehmen(s, { ...KOMBI, von, bis: tagPlus(H, 6) }, { heuteTag: von });
  const w = st.leereWurzel(); w.betriebe = [s]; w.aktiv = s.id;
  const o = offenImBuero(s, w, { jetzt: new Date(2026, 9, 18, 12) }).find((x) => x.id === "aktion");
  assert.deepEqual([o?.text, o?.ziel.wert, o?.farbe], ["Kombi bringt bisher weniger – beenden?", "aktionen", "gelb"]);
  for (const std of [9, 13, 20]) { const j = jetztDran(s, w, { jetzt: new Date(2026, 9, 18, std) }); assert.ok(!j || j.id !== "aktion", "Laden: nichts"); }
  const bsp = beispielLaden(H); const wb = st.leereWurzel(); wb.betriebe = [bsp]; wb.aktiv = bsp.id;
  const ob = offenImBuero(bsp, wb, { jetzt: new Date(2026, 9, 18, 12) }).filter((x) => x.ziel?.wert === "aktionen");
  assert.deepEqual(ob.map((x) => x.id), ["haltbar"], "Verbrauchsdatum zuerst, nur ein Hinweis");
});

test("Bilanz nach dem Ende und Lernen: gespeichert, die nächste gleiche Aktion rechnet mit dem, was die letzte gebracht hat", () => {
  const von = tagPlus(H, -14), bis = tagPlus(H, -8);
  const s = laden({ tage: 50, je: (d) => (d >= von && d <= bis ? { menue: 14 } : { d1: 10, c1: 10 }) });
  T.aktionUebernehmen(s, { ...KOMBI, von, bis }, { heuteTag: von });
  assert.equal(P.aktionenAbschliessen(s, { heuteTag: H, jetzt: JETZT }), 1); assert.equal(P.aktionenAbschliessen(s, { heuteTag: H, jetzt: JETZT }), 0, "nur einmal");
  const bil = s.aktionen[0].bilanz; assert.equal(bil.vergleichbar, 7); nah(bil.mehrAnteil, 0.4); assert.equal(bil.erstellt, JETZT); assert.ok(bil.rohertrag > bil.rohertragVorher);
  assert.match(P.bilanzText(bil), /^\+40 % verkauft · Rohertrag .*€ \(vorher ≈ .*€\)$/);
  const v = P.aktionVorschlag(s, KOMBI, { heuteTag: H });
  assert.equal(v.erwartung.quelle, "gelernt"); nah(v.erwartung.mehrAnteil, 0.4); assert.ok(v.satz.includes("letzte gleiche Aktion +40 % – damit gerechnet"), v.satz);
  // brachte die letzte zu wenig, gilt die Break-even-Mehrmenge als Untergrenze – und die Begründung sagt es
  const s2 = laden({ tage: 50, je: (d) => (d >= von && d <= bis ? { menue: 10 } : { d1: 10, c1: 10 }) });
  T.aktionUebernehmen(s2, { ...KOMBI, von, bis }, { heuteTag: von }); P.aktionenAbschliessen(s2, { heuteTag: H });
  const v2 = P.aktionVorschlag(s2, KOMBI, { heuteTag: H }); const be = D.aktionBreakEven(s2, KOMBI.gerichte, KOMBI.preis).mehrAnteil;
  assert.equal(v2.erwartung.quelle, "breakEven"); nah(v2.erwartung.mehrAnteil, be); assert.ok(v2.satz.includes(`letzte gleiche Aktion nur +0 %, nötig +${Math.round(be * 100)} %`), v2.satz);
  // Beenden durch den Wirt: Bilanz sofort; andere Gerichte lernen nicht davon
  const s3 = laden({ tage: 35, je: (d) => (d >= tagPlus(H, -5) ? { menue: 12 } : { d1: 10, c1: 10 }) });
  const x = T.aktionUebernehmen(s3, { ...KOMBI, von: tagPlus(H, -5), bis: tagPlus(H, 5) }, { heuteTag: tagPlus(H, -5) });
  assert.equal(T.aktionBeenden(s3, x.id, { jetzt: new Date(2026, 9, 18, 12).toISOString() }), true);
  const e = s3.aktionen[0]; assert.equal(e.entfernt, true); assert.ok(e.bilanz && e.bilanz.vergleichbar >= 3); assert.equal(e.bilanz.bis, H);
  assert.equal(P.letzteBilanz(s3, { art: "abverkauf", gerichte: ["d1"] }, { heuteTag: H }), null);
});

test("Migration alter Aktionen: Laufzeit bleibt, ende „datum“; „bis Ware weg“ ohne Datum bleibt; Plan und Bilanz geprüft; Zusammenführen", () => {
  const s = st.leererBetrieb();
  s.aktionen = [
    { id: "alt", art: "kombi", gerichte: ["g1", "g2"], preis: 9, statt: 10, von: "2026-10-01", bis: "2026-10-14", erfasst: JETZT, entfernt: false },
    { id: "ware", art: "abverkauf", gerichte: ["g1"], preis: 2, von: "2026-10-18", bis: null, ende: "ware", ware: "Ayran", erfasst: JETZT },
    { id: "kaputt", art: "kombi", gerichte: ["g1"], preis: 5, von: "2026-10-18", bis: null }, // ohne Ende und ohne „bis Ware weg“: fällt weg
    { id: "plan", art: "kombi", gerichte: ["g1"], preis: 5, von: "2026-10-18", bis: "2026-10-24", ende: "datum", plan: { von: "2026-10-18", bis: "2026-10-24", ende: "quatsch", satz: 5, erwartung: 0.15, quelle: "x" },
      bilanz: { tage: 7, vergleichbar: 7, verkauft: 100, vorher: 80, mehrAnteil: 0.25, rohertrag: 300, rohertragVorher: 250, geschaetzt: "ja" }, geaendertZeit: JETZT },
  ];
  const m = st.migrierenBetrieb(structuredClone(s));
  assert.deepEqual(m.aktionen.map((a) => a.id), ["alt", "ware", "plan"]);
  assert.deepEqual([m.aktionen[0].von, m.aktionen[0].bis, m.aktionen[0].ende], ["2026-10-01", "2026-10-14", "datum"], "alte Laufzeit bleibt erhalten");
  assert.deepEqual([m.aktionen[1].bis, m.aktionen[1].ende, m.aktionen[1].ware], [null, "ware", "Ayran"]);
  assert.deepEqual(m.aktionen[2].plan, { von: "2026-10-18", bis: "2026-10-24", ende: "datum", satz: "", erwartung: 0.15, quelle: "breakEven", erstellt: null });
  assert.equal(m.aktionen[2].bilanz.geschaetzt, false); assert.equal(m.aktionen[2].bilanz.mehrAnteil, 0.25); assert.equal(m.aktionen[2].geaendertZeit, JETZT);
  assert.deepEqual(st.migrierenBetrieb(structuredClone(m)), m, "zweimal migrieren ändert nichts");
  // Zusammenführen: Zeitraum – die zuletzt geänderte Fassung gilt; Bilanz geht nicht verloren; beendet gewinnt
  const w = st.leereWurzel(); const l = laden(); w.betriebe = [l]; w.aktiv = l.id;
  const a = T.aktionUebernehmen(l, KOMBI, { heuteTag: H, jetzt: JETZT });
  const A = structuredClone(w), B = structuredClone(w);
  T.aktionZeitraumSetzen(A.betriebe[0], a.id, { von: a.von, bis: "2026-11-01", ende: "datum" }, { heuteTag: H, jetzt: "2026-10-18T13:00:00.000Z" });
  T.aktionZeitraumSetzen(B.betriebe[0], a.id, { von: a.von, bis: "2026-10-28", ende: "ware" }, { heuteTag: H, jetzt: "2026-10-18T14:00:00.000Z" });
  for (const [ziel, fremd] of [[structuredClone(A), B], [structuredClone(B), A]]) {
    st.zusammenfuehren(ziel, fremd); const x = ziel.betriebe[0].aktionen.find((y) => y.id === a.id);
    assert.deepEqual([x.bis, x.ende], ["2026-10-28", "ware"], "die spätere Änderung gilt");
  }
  const C = structuredClone(w); T.aktionBeenden(C.betriebe[0], a.id, { jetzt: JETZT }); const D2 = structuredClone(w);
  st.zusammenfuehren(D2, C); const y = D2.betriebe[0].aktionen.find((z) => z.id === a.id); assert.equal(y.entfernt, true); assert.ok(y.bilanz, "Bilanz kommt mit");
});

test("Bildschirm „Aktionen & Haltbarkeit“: Plan mit Vorschlag, Begründung und änderbarem Zeitraum; laufende Aktion mit Fortschritt; Personal gesperrt", async () => {
  const akt = await import("../js/screens/aktionen.js"); const { personalGesperrt } = await import("../js/modus.js");
  akt.aktionenZuruecksetzen();
  const s = beispielLaden(H); const vor = JSON.stringify(s);
  const html = akt.aktionenView(s); assert.equal(JSON.stringify(s), vor, "Anzeigen schreibt nicht");
  for (const x of ["Laufende Aktionen", 'data-aktion-lauf="bsp-aktion-1"', "Geplant: ", 'data-a="akt-zeit"', 'data-a="akt-beenden"', "Zeitraum ändern"]) assert.ok(html.includes(x), x);
  assert.ok(!/undefined|NaN|plan\.[a-z]/.test(html), html.match(/undefined|NaN|plan\.[a-z.]+/)?.[0]);
  // „Auf die Tafel“ beim Abverkauf → Plan, nichts gespeichert
  assert.equal(await akt.aktionenAktion("akt-tafel", { dataset: { art: "abverkauf", wert: "0" } }, s), true); assert.equal(JSON.stringify(s), vor, "nie automatisch");
  const p = akt.aktionenView(s);
  for (const x of ['data-plan="neu"', "Aktion planen", "Vorschlag:", "MHD Ayran 0,25 l", 'data-f="akt-von"', 'data-f="akt-bis"', 'data-a="akt-plan-von"', 'data-a="akt-plan-ende" data-wert="ware" aria-pressed="true"', 'data-a="akt-plan-ok"', 'data-a="akt-plan-zu"', "Du entscheidest."]) assert.ok(p.includes(x), x);
  // Zeitraum ändern im Plan: anderes Ende, dann übernehmen
  assert.equal(akt.aktionenEingabe("akt-bis", "2026-10-20"), "zeichnen"); assert.ok(akt.aktionenView(s).includes("Du hast den Vorschlag geändert."));
  const r = await akt.aktionenAktion("akt-plan-ok", { dataset: {} }, s); assert.equal(r.speichern, true);
  const neu = s.aktionen.at(-1); assert.deepEqual([neu.art, neu.bis, neu.ende, neu.ware], ["abverkauf", "2026-10-20", "ware", "Ayran 0,25 l"]); assert.ok(neu.plan.satz.includes("MHD Ayran"));
  // laufende Aktion: Zeitraum ändern (Start gesperrt), speichern
  assert.equal(await akt.aktionenAktion("akt-zeit", { dataset: { wert: "bsp-aktion-1" } }, s), true);
  const z = akt.aktionenView(s); assert.ok(z.includes('data-plan="aendern"') && /data-f="akt-von"[^>]*disabled/.test(z), "Start einer laufenden Aktion bleibt");
  akt.aktionenEingabe("akt-bis", "2026-10-30"); assert.equal((await akt.aktionenAktion("akt-zeit-ok", { dataset: {} }, s)).speichern, true);
  assert.equal(s.aktionen.find((a) => a.id === "bsp-aktion-1").bis, "2026-10-30");
  // nur vorhandene CSS-Klassen
  const css = ["app", "buero", "zielbild", "optik", "laden", "heute"].map((n) => fs.readFileSync(path.join(HIER, "..", "css", n + ".css"), "utf8")).join("\n");
  for (const h of [html, p, z]) for (const k of new Set([...h.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean))) assert.ok(new RegExp("\\." + k.replace(/[-]/g, "\\-") + "(?![\\w-])").test(css), "Klasse ohne CSS: " + k);
  for (const n of ["akt-plan-ok", "akt-zeit-ok", "akt-zeit", "akt-beenden", "akt-plan-ende"]) assert.equal(personalGesperrt(n, null, H), true, n);
  akt.aktionenZuruecksetzen();
});

test("Texte: alle Plan-Schlüssel in 18 Sprachen, keine verbotenen Wörter", async () => {
  for (const c of i18n.SPRACHEN) { await i18n.ladeSprache(c); assert.deepEqual(i18n.fehlendeSchluessel(c).filter((k) => k.startsWith("plan") || k.startsWith("getraenke") || k.startsWith("tafel")), [], c); }
  i18n.setzeSprache("de");
  const VERBOTEN = ["revolutionär", "disruptiv", "Marktführer", "GoBD-konform", "betriebsprüfungsfest", "steuersicher", "rechtssicher"];
  for (const f of ["js/aktion_plan.js", "js/screens/aktionen.js", "js/tafel.js", ...fs.readdirSync(path.join(HIER, "..", "js", "lang")).map((x) => "js/lang/" + x)]) {
    const t = fs.readFileSync(path.join(HIER, "..", f), "utf8").toLowerCase(); for (const v of VERBOTEN) assert.ok(!t.includes(v.toLowerCase()), f + ": " + v);
  }
});
