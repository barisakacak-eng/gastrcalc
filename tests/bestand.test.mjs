// Bestand (17.10.2026): Laufender Bestand und Bestellvorschlag – Bestand aus Inventur/Einkauf/Verkauf/Müll, Selbstgemachtes, Wochentage, nie negativ,
// Sicherheit mit benannten Lücken, Bestellmenge mit Gebinde-Rundung, Puffer, Mindestbestand, Gruppierung nach Lieferant, Text-Export, Uhrzeit-Satz,
// Migration, Sicherung rund, Beispiel-Laden, Oberfläche.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { idbAttrappe } from "./hilfe/idb_attrappe.mjs";
const st = await import("../js/store.js");
const b = await import("../js/bestand.js");
const vk = await import("../js/verkauf.js");
const inv = await import("../js/inventur.js");
const muell = await import("../js/muell.js");
const { tagPlus, wochentag } = await import("../js/engine.js");
const { beispielLaden, KNAPP_BEISPIEL } = await import("../js/beispiel.js");
const i18n = await import("../js/i18n.js");
i18n.setzeSprache("de");
const HIER = path.dirname(fileURLToPath(import.meta.url));

const H = "2026-10-17"; // Samstag
const nah = (x, y, eps = 1e-6) => assert.ok(Math.abs(x - y) <= eps, `${x} ≠ ${y}`);

// Testladen: Sonntag Ruhetag, Inventur Sa 10.10., Verkäufe Mo–Fr (je 20 Döner, 10 Cola), ein Beleg am 14.10., Müll und Personalessen
function laden({ verkaufTage = ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16"] } = {}) {
  const s = st.leererBetrieb(); s.phase = "app"; s.betrieb.name = "Testladen"; s.kuehl.ruhetage = [0];
  s.gerichte = [
    { id: "g1", name: "Döner", preis: 8, klasse: "haupt", zutaten: [{ name: "Testfleisch", menge: 200, einheit: "g" }, { name: "Teig", menge: 250, einheit: "g" }, { name: "Box", menge: 1, einheit: "stk" }, { name: "Gewürz", menge: 5, einheit: "g" }] },
    { id: "g2", name: "Cola", preis: 2.5, klasse: "getraenk", zutaten: [{ name: "Cola", menge: 1, einheit: "stk" }] },
  ];
  s.artikel = [
    { name: "Testfleisch", gruppe: "fleisch", einheit: "kg", packung: { menge: 10, einheit: "kg" }, gebinde: { art: "karton", zwischen: null }, preis: 80, preisBasis: "netto" },
    { name: "Mehl", gruppe: "trocken", einheit: "kg", packung: { menge: 25, einheit: "kg" }, gebinde: { art: "sack", zwischen: null }, preis: 20, preisBasis: "netto" },
    { name: "Teig", herkunft: "selbst", einheit: "g", packung: { menge: 1600, einheit: "g" }, preis: null, rezept: { zutaten: [{ name: "Mehl", menge: 1000, einheit: "g" }], ausbeute: { menge: 1600, einheit: "g" }, arbeitMin: 20 } },
    { name: "Box", gruppe: "verpackung", einheit: "stk", packung: { menge: 100, einheit: "stk" }, gebinde: { art: "karton", zwischen: null }, preis: 10, preisBasis: "netto" },
    { name: "Cola", gruppe: "getraenk", einheit: "stk", packung: { menge: 24, einheit: "stk" }, gebinde: { art: "kiste", zwischen: null }, preis: 12, preisBasis: "netto" },
    { name: "Gewürz", gruppe: "gewuerz", einheit: "g", packung: { menge: null, einheit: "g" }, preis: null, preisBasis: "netto" },
  ];
  const m = st.migrierenBetrieb(s);
  const i = inv.inventurStarten(m, { datum: "2026-10-10", jetzt: "2026-10-10T21:00:00.000Z" });
  for (const [n, z] of [["Testfleisch", 3], ["Mehl", 2], ["Box", 5], ["Cola", 4]]) inv.mengeSetzen(i, n, z);
  inv.inventurAbschliessen(m, i, { datum: "2026-10-10", jetzt: "2026-10-10T21:30:00.000Z" });
  m.lieferungen.push({ id: "l1", datum: "2026-10-14", erfasst: "2026-10-14T09:00:00.000Z", lieferant: "Metro", zeilen: [
    { artikel: "Testfleisch", menge: 1, inhaltMenge: 10, inhaltEinheit: "kg", netto: 80 }, { artikel: "Cola", menge: 2, inhaltMenge: 24, inhaltEinheit: "stk", netto: 24 }], storniert: false });
  for (const d of verkaufTage) { vk.handVerkaufSetzen(m, d, "g1", 20); vk.handVerkaufSetzen(m, d, "g2", 10); }
  muell.rohwareWeg(m, m.artikel.find((a) => a.name === "Testfleisch"), { datum: "2026-10-15", menge: 500, einheit: "g" });
  muell.personalessen(m, m.gerichte[0], { datum: "2026-10-13", mahlzeit: "mittag" });
  return m;
}
const ware = (bs, n) => bs.waren.find((w) => w.name === n);

test("Bestand: Inventur + Einkauf − Verkauf × Rezept − Müll − Personalessen, in Grundeinheit, Gebinden (¼) und Euro", () => {
  const s = laden(); const bs = b.bestandStand(s, { heuteTag: H });
  assert.equal(bs.ohneInventur, false); assert.equal(bs.inventur.datum, "2026-10-10"); assert.equal(bs.inventur.alter, 7);
  const f = ware(bs, "Testfleisch");
  nah(f.bestand, 30000 + 10000 - 100 * 200 - 500 - 200); // 19 300 g
  assert.deepEqual(f.teile, { anfang: 30000, einkauf: 10000, verkauf: 20000, muell: 500, personal: 200 });
  assert.equal(f.bestandGebinde, 2); nah(f.wert, 19300 * 0.008); assert.equal(f.geschaetzt, false);
  nah(ware(bs, "Cola").bestand, 96 + 48 - 50); assert.equal(ware(bs, "Cola").bestandGebinde, 4);
  nah(ware(bs, "Box").bestand, 500 - 101);
  assert.equal(bs.start, H, "heute ist noch nichts verkauft: Rechnung ab heute");
});

test("Bestand: Selbstgemachtes wird auf seine Rohwaren heruntergerechnet und steht selbst nicht im Lager", () => {
  const bs = b.bestandStand(laden(), { heuteTag: H });
  assert.equal(ware(bs, "Teig"), undefined);
  nah(ware(bs, "Mehl").bestand, 50000 - 101 * 250 / 1600 * 1000); // Teig 250 g = 156,25 g Mehl je Döner (auch Personalessen)
});

test("Ø-Tagesverbrauch nur aus Öffnungstagen mit Verkauf, Reichweite über Ruhetage, leer am, bestellen bis", () => {
  const s = laden(); const bs = b.bestandStand(s, { heuteTag: H }); const f = ware(bs, "Testfleisch");
  assert.equal(f.quelle, "verkauf"); nah(f.schnitt, (20000 + 500 + 200) / 5); assert.equal(f.jeWochentag, null, "unter 4 Wochen: Durchschnitt");
  nah(f.reichweite, 19300 / 4140, 1e-9); // Sa, (So Ruhetag), Mo, Di, Mi voll, Do angebrochen
  assert.equal(f.leerAm, "2026-10-22"); assert.deepEqual(f.offen, ["2026-10-17", "2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22"]);
  const v = b.bestellVorschlag(s, { heuteTag: H }); const z = v.zeilen.find((x) => x.name === "Testfleisch");
  assert.equal(z.bestellenAm, "2026-10-20", "Puffer 2: Dienstag ist der letzte Tag mit 2 Tagen Rest"); assert.equal(z.dringend, "spaeter");
  assert.equal(ware(bs, "Cola").sicherheit, "gut");
});

test("Wochentage: ab 4 Werten je Wochentag zählen Freitag/Samstag stärker, sonst Durchschnitt", () => {
  const tage = []; for (let d = "2026-09-14"; d <= "2026-10-16"; d = tagPlus(d, 1)) if (wochentag(d) !== 0) tage.push(d);
  const s = laden({ verkaufTage: [] });
  for (const d of tage) vk.handVerkaufSetzen(s, d, "g1", wochentag(d) >= 5 ? 30 : 10);
  s.schwund = []; // nur Verkäufe
  const vs = b.verbrauchSchnitt(s, { heuteTag: H });
  assert.equal(vs.wochentage, true); assert.equal(vs.datenTage.length, 28);
  const f = vs.waren.Testfleisch; nah(f.jeWochentag[5], 30 * 200); nah(f.jeWochentag[6], 30 * 200); nah(f.jeWochentag[1], 10 * 200); assert.equal(f.jeWochentag[0], null);
  // Bedarf für Sa + Mo..Fr (6 Öffnungstage ab Samstag): 2 starke Tage (Sa, Fr) + 4 schwache
  nah(b.bedarfTage(s, f, 6, H), (2 * 30 + 4 * 10) * 200);
  // mit nur 3 Wochen: Durchschnitt
  const s3 = laden({ verkaufTage: [] }); for (const d of tage.filter((x) => x >= "2026-09-28")) vk.handVerkaufSetzen(s3, d, "g1", wochentag(d) >= 5 ? 30 : 10);
  assert.equal(b.verbrauchSchnitt(s3, { heuteTag: H }).wochentage, false);
});

test("Ohne Verkäufe: Ø aus dem Ist-Verbrauch zwischen den letzten zwei Inventuren; ohne beides ehrlich unbekannt", () => {
  const s = laden({ verkaufTage: [] }); s.schwund = [];
  const i2 = inv.inventurStarten(s, { datum: "2026-10-16", jetzt: "2026-10-16T21:00:00.000Z" });
  for (const [n, z] of [["Testfleisch", 1], ["Mehl", 2], ["Box", 5], ["Cola", 4]]) inv.mengeSetzen(i2, n, z);
  inv.inventurAbschliessen(s, i2, { datum: "2026-10-16", jetzt: "2026-10-16T21:30:00.000Z" });
  const bs = b.bestandStand(s, { heuteTag: H }); const f = ware(bs, "Testfleisch");
  assert.equal(f.quelle, "inventur"); nah(f.schnitt, (30000 + 10000 - 10000) / 5, 1e-9); // 11.–16.10.: 5 Öffnungstage (So Ruhetag)
  nah(f.bestand, 10000); assert.equal(bs.start, "2026-10-17");
  assert.equal(ware(bs, "Mehl").schnitt, 0, "nichts verbraucht → 0, kein Vorschlag");
  const nur1 = laden({ verkaufTage: [] }); assert.equal(ware(b.bestandStand(nur1, { heuteTag: H }), "Testfleisch").schnitt, null);
  assert.ok(ware(b.bestandStand(nur1, { heuteTag: H }), "Testfleisch").luecken.some((l) => l.art === "verbrauchUnbekannt"));
  assert.equal(b.bestellVorschlag(nur1, { heuteTag: H }).zeilen.length, 0, "ohne Verbrauch kein Vorschlag");
});

test("Nie negativ: fällt die Rechnung unter null, gilt 0 mit Hinweis „Einkauf fehlt wohl oder Inventur zu alt“", () => {
  const s = laden(); vk.handVerkaufSetzen(s, "2026-10-16", "g2", 150);
  const c = ware(b.bestandStand(s, { heuteTag: H }), "Cola");
  assert.equal(c.bestand, 0); assert.equal(c.negativ, true); assert.equal(c.sicherheit, "grob");
  assert.ok(c.luecken.some((l) => l.art === "negativ")); assert.equal(i18n.t("bestand.luecken.negativ"), "Einkauf fehlt wohl oder Inventur zu alt");
  const z = b.bestellVorschlag(s, { heuteTag: H }).zeilen.find((x) => x.name === "Cola"); assert.equal(z.dringend, "leer");
});

test("Sicherheit: gut / mittel / grob mit benannten Lücken", () => {
  assert.equal(ware(b.bestandStand(laden(), { heuteTag: H }), "Testfleisch").sicherheit, "gut");
  // ein Öffnungstag ohne Verkauf → mittel, mit Datum
  const m = laden({ verkaufTage: ["2026-10-12", "2026-10-14", "2026-10-15", "2026-10-16"] });
  const fm = ware(b.bestandStand(m, { heuteTag: H }), "Testfleisch"); assert.equal(fm.sicherheit, "mittel");
  assert.deepEqual(fm.luecken.find((l) => l.art === "verkaufFehlt"), { art: "verkaufFehlt", anzahl: 1, tage: ["2026-10-13"] });
  // drei Tage ohne Verkauf → grob
  assert.equal(ware(b.bestandStand(laden({ verkaufTage: ["2026-10-12", "2026-10-16"] }), { heuteTag: H }), "Testfleisch").sicherheit, "grob");
  // Inventur 15–28 Tage alt (Verkäufe vollständig) → mittel, über 28 → grob
  const alt = laden({ verkaufTage: [] }); for (let d = "2026-10-11"; d <= "2026-11-06"; d = tagPlus(d, 1)) if (wochentag(d) !== 0) vk.handVerkaufSetzen(alt, d, "g2", 1);
  const a20 = ware(b.bestandStand(alt, { heuteTag: "2026-10-30" }), "Cola"); assert.equal(a20.sicherheit, "mittel"); assert.deepEqual(a20.luecken.find((l) => l.art === "inventurAlt"), { art: "inventurAlt", tage: 20 });
  assert.equal(ware(b.bestandStand(alt, { heuteTag: "2026-11-08" }), "Cola").sicherheit, "grob");
  // gekauft, aber bei der Inventur nicht gezählt → grob, „nicht gezählt“
  const n = laden(); n.artikel.push({ name: "Ayran", gruppe: "getraenk", einheit: "stk", packung: { menge: 20, einheit: "stk" }, gebinde: { art: "kiste", zwischen: null }, preis: 8, preisBasis: "netto" });
  n.lieferungen.push({ id: "l2", datum: "2026-10-15", lieferant: "Metro", zeilen: [{ artikel: "Ayran", menge: 2, inhaltMenge: 20, inhaltEinheit: "stk", netto: 16 }], storniert: false });
  const ay = ware(b.bestandStand(n, { heuteTag: H }), "Ayran"); assert.equal(ay.bestand, 40); assert.equal(ay.sicherheit, "grob"); assert.ok(ay.luecken.some((l) => l.art === "nichtGezaehlt"));
  // Texte zu jeder Lücke vorhanden
  for (const art of ["nichtGezaehlt", "gebinde", "einkaufUnklar", "rezept", "negativ", "verbrauchUnbekannt"]) assert.ok(!i18n.t("bestand.luecken." + art).startsWith("bestand."), art);
  assert.match(i18n.t("bestand.luecken.verkaufFehlt", 2), /2 Tage ohne Verkäufe/);
});

test("Bestellmenge: (Tage + Puffer) × Ø − Bestand, aufgerundet auf ganze Gebinde; ohne Gebinde in 100 g; Puffer und Tage wirken", () => {
  const s = laden();
  assert.equal(ware(b.bestandStand(s, { heuteTag: H }), "Gewürz").bestand, null, "nie gezählt, nie gekauft: unbekannt, kein Vorschlag");
  s.lieferungen.push({ id: "l3", datum: "2026-10-14", lieferant: "Metro", zeilen: [{ artikel: "Gewürz", menge: 0.5, jeKg: true, netto: 4 }], storniert: false }); // 500 g lose
  const v = b.bestellVorschlag(s, { heuteTag: H });
  const f = v.zeilen.find((x) => x.name === "Testfleisch");
  nah(f.bedarf, 9 * 4140); assert.equal(f.gebinde, 2); assert.equal(f.menge, 20000); assert.equal(f.gebindeArt, "karton"); nah(f.wert, 160);
  assert.equal(v.zeilen.find((x) => x.name === "Cola"), undefined, "Cola reicht (94 Stück, 90 nötig)");
  const g = v.zeilen.find((x) => x.name === "Gewürz"); assert.equal(g.gebinde, null); assert.equal(g.menge, 1000, "9 × 101 g − 0 g = 909 g → 1000 g (100-g-Schritte)"); assert.equal(g.wert, null);
  assert.equal(ware(b.bestandStand(s, { heuteTag: H }), "Gewürz").sicherheit, "grob");
  assert.equal(b.mengeDeutsch(g), "1 kg");
  // Puffer 0 und 3 Tage: (3 + 0) × 4140 − 19 300 < 0 → kein Fleisch
  assert.ok(b.lagerSetzen(s, "tage", 3) && b.lagerSetzen(s, "puffer", 0));
  assert.equal(b.bestellVorschlag(s, { heuteTag: H }).zeilen.find((x) => x.name === "Testfleisch"), undefined);
  b.lagerSetzen(s, "tage", 14); const f14 = b.bestellVorschlag(s, { heuteTag: H }).zeilen.find((x) => x.name === "Testfleisch");
  assert.equal(f14.gebinde, Math.ceil((14 * 4140 - 19300) / 10000));
  assert.equal(b.lagerSetzen(s, "tage", 0), false); assert.equal(b.lagerSetzen(s, "puffer", 31), false); assert.equal(b.lagerSetzen(s, "quatsch", 3), false);
  assert.deepEqual(b.lagerEinstellungen(st.leererBetrieb()), { tage: 7, puffer: 2 });
});

test("Mindestbestand (Gebinde) gewinnt, wenn er mehr verlangt; gilt auch ohne Lieferant", () => {
  const s = laden();
  assert.ok(b.mindestbestandSetzen(s, "Cola", 5)); // 120 Stück, da sind 94
  assert.ok(b.mindestbestandSetzen(s, "Box", 10)); // 1000 Stück, da sind 399
  const v = b.bestellVorschlag(s, { heuteTag: H });
  const c = v.zeilen.find((x) => x.name === "Cola"); assert.equal(c.gebinde, 2); assert.equal(c.mindestGewinnt, true);
  const bx = v.zeilen.find((x) => x.name === "Box"); assert.equal(bx.gebinde, 7); assert.equal(bx.lieferant, null);
  assert.ok(b.mindestbestandSetzen(s, "Cola", "")); assert.equal(s.artikel.find((a) => a.name === "Cola").mindestbestand, undefined);
  assert.equal(b.mindestbestandSetzen(s, "Cola", -1), false); assert.equal(b.mindestbestandSetzen(s, "Gibtsnicht", 1), false);
});

test("Gruppierung nach Lieferant (jüngster Beleg der Ware), „ohne Lieferant“ zuletzt; Text zum Teilen auf Deutsch", () => {
  const s = laden(); b.mindestbestandSetzen(s, "Cola", 5); b.mindestbestandSetzen(s, "Box", 10);
  s.lieferungen.push({ id: "l0", datum: "2026-10-01", lieferant: "Alt-Händler", zeilen: [{ artikel: "Cola", menge: 1, inhaltMenge: 24, inhaltEinheit: "stk" }], storniert: false });
  const v = b.bestellVorschlag(s, { heuteTag: H });
  assert.deepEqual(v.gruppen.map((g) => g.lieferant), ["Metro", null]);
  assert.deepEqual(v.gruppen[0].zeilen.map((z) => z.name), ["Testfleisch", "Cola"]);
  assert.deepEqual(v.gruppen[1].zeilen.map((z) => z.name), ["Box"]);
  assert.equal(b.lieferantVon(s, "Cola"), "Metro");
  i18n.setzeSprache("tr"); // Text bleibt deutsch, egal welche Sprache die App spricht
  assert.equal(b.bestellText(s, v.gruppen[0], { datum: H }), "Bestellung Testladen, Sa 17.10.: 2 Kartons Testfleisch, 2 Kisten Cola");
  i18n.setzeSprache("de");
  assert.match(b.bestellText(s, v.gruppen[1], { datum: "2026-10-19" }), /^Bestellung Testladen, Mo 19\.10\.: .*7 Kartons Box/);
  assert.equal(b.mengeDeutsch({ gebinde: 1, gebindeArt: "sack", menge: 25000, basis: "g" }), "1 Sack"); assert.equal(b.mengeDeutsch({ gebinde: 3, gebindeArt: "sack" }), "3 Säcke");
  assert.equal(b.mengeDeutsch({ gebinde: 15, gebindeArt: "lose", menge: 15000, basis: "g" }), "15 kg");
});

test("Die Uhrzeit: höchstens ein kurzer Satz plus Handlung – nichts, wenn alles reicht", () => {
  const s = laden(); assert.equal(b.bestandUhrzeit(s, { heuteTag: H }), null, "Fleisch erst bis Dienstag");
  // morgen: Freitagabend, 10 kg Fleisch weg → reicht 2,2 Tage ab Samstag → Samstag bestellen
  const m = laden(); muell.rohwareWeg(m, m.artikel[0], { datum: "2026-10-16", menge: 10, einheit: "kg" });
  const um = b.bestandUhrzeit(m, { heuteTag: "2026-10-16" }); assert.equal(um.art, "morgen"); assert.equal(um.text, "Morgen bestellen: 1 Ware");
  // heute, eine Ware: Name und Reichweite
  const h = laden(); muell.rohwareWeg(h, h.artikel[0], { datum: "2026-10-16", menge: 12, einheit: "kg" }); // Ø 6540 g, Bestand 7300 g
  const uh = b.bestandUhrzeit(h, { heuteTag: H }); assert.equal(uh.art, "jetzt"); assert.equal(uh.text, "Testfleisch reicht noch ≈ 1 Tag"); assert.equal(uh.knopf, "Bestellen");
  assert.deepEqual(uh.ziel, { aktion: "nav", wert: "bestand" });
  // heute, mehrere Waren
  vk.handVerkaufSetzen(h, "2026-10-16", "g2", 150); assert.equal(b.bestandUhrzeit(h, { heuteTag: H }).text, "Heute bestellen: 2 Waren");
  for (const u of [um, uh]) assert.ok(u.text.split(/\s+/).length <= 15);
  assert.equal(b.bestandUhrzeit(st.migrierenBetrieb(st.leererBetrieb()), { heuteTag: H }), null, "ohne Inventur nichts");
});

test("Migration: alte Läden ohne Lager-Einstellungen, kaputte Werte, Mindestbestand je Artikel; alte Sicherungen lesbar", () => {
  const alt = st.leererBetrieb(); delete alt.lager; alt.artikel = [{ name: "A", mindestbestand: 2.3 }, { name: "B", mindestbestand: -1 }, { name: "C", mindestbestand: "3" }, { name: "D" }];
  const m = st.migrierenBetrieb(alt);
  assert.deepEqual(m.lager, { tage: 7, puffer: 2 }); assert.equal(m.artikel[0].mindestbestand, 2.25);
  for (const i of [1, 2, 3]) assert.ok(!("mindestbestand" in m.artikel[i]), m.artikel[i].name);
  const k = st.leererBetrieb(); k.lager = { tage: 0, puffer: "x" }; assert.deepEqual(st.migrierenBetrieb(k).lager, { tage: 7, puffer: 2 });
  const ok = st.leererBetrieb(); ok.lager = { tage: 10, puffer: 0 }; assert.deepEqual(st.migrierenBetrieb(ok).lager, { tage: 10, puffer: 0 });
  const w = st.migrierenWurzel({ schema: 6, betriebe: [{ ...st.leererBetrieb(), lager: undefined }] }); assert.deepEqual(w.betriebe[0].lager, { tage: 7, puffer: 2 });
  const w3 = st.migrierenWurzel({ schema: 3, betriebe: [{ id: "a", betrieb: { name: "Alt" }, kosten: [] }] }); assert.deepEqual(w3.betriebe[0].lager, { tage: 7, puffer: 2 });
  assert.deepEqual(st.BEREICHE.lager, ["lager"]); assert.equal(i18n.t("w2d.bereich.lager"), "Lager");
});

test("Speicher und Sicherung: Lager-Einstellungen und Mindestbestand überstehen Speichern/Laden und Export/Einlesen; Zusammenführen", async () => {
  idbAttrappe(); await st.laden();
  const w = st.leereWurzel(); const s = laden(); w.betriebe.push(s); w.aktiv = s.id;
  b.lagerSetzen(s, "tage", 10); b.lagerSetzen(s, "puffer", 1); b.mindestbestandSetzen(s, "Cola", 3);
  await st.sofortSpeichern(w);
  const g = await st.laden(); assert.deepEqual(g.betriebe[0].lager, { tage: 10, puffer: 1 }); assert.equal(g.betriebe[0].artikel.find((a) => a.name === "Cola").mindestbestand, 3);
  const { blob } = await st.exportDatei(g); const r = await st.importSicherung(blob); assert.equal(r.pruefsumme, "ok");
  assert.deepEqual(r.wurzel.betriebe[0].lager, { tage: 10, puffer: 1 }); assert.equal(r.wurzel.betriebe[0].artikel.find((a) => a.name === "Cola").mindestbestand, 3);
  // zweites Handy ändert die Tage, später gespeichert → kommt beim Zusammenführen an
  const fremd = structuredClone(r.wurzel); fremd.betriebe[0].lager.tage = 5; fremd.betriebe[0].geaendert = new Date(Date.now() + 1000).toISOString();
  st.zusammenfuehren(g, fremd); assert.equal(g.betriebe[0].lager.tage, 5);
});

test("Beispiel-Laden: eine Ware wird knapp (heute bestellen) mit Lieferant aus den Beispiel-Belegen, an jedem Wochentag, ohne Zufall", () => {
  for (let i = 0; i < 7; i++) {
    const h = tagPlus(H, i); const s = beispielLaden(h);
    const v = b.bestellVorschlag(s, { heuteTag: h });
    const knapp = v.zeilen.find((z) => z.name === KNAPP_BEISPIEL.name);
    assert.ok(knapp && ["jetzt", "leer"].includes(knapp.dringend), `${h}: ${JSON.stringify(knapp && { d: knapp.dringend, r: knapp.reichweite })}`);
    assert.equal(knapp.lieferant, "Großhandel (Beispiel)"); assert.ok(knapp.gebinde > 0);
    const u = b.bestandUhrzeit(s, { heuteTag: h }); assert.ok(u && u.art === "jetzt", h);
    assert.ok(b.bestandStand(s, { heuteTag: h }).waren.every((w) => w.sicherheit === "gut"), "Inventur heute, alles gezählt");
  }
  assert.equal(JSON.stringify(b.bestellVorschlag(beispielLaden(H), { heuteTag: H })), JSON.stringify(b.bestellVorschlag(beispielLaden(H), { heuteTag: H })));
  const s = beispielLaden(H); const v = b.bestellVorschlag(s, { heuteTag: H });
  assert.match(b.bestellText(s, v.gruppen[0], { datum: H }), /^Bestellung Beispiel-Döner, Sa 17\.10\.: \d+ Kartons Dönerspieß Kalb\/Pute, /);
  assert.ok(!v.zeilen.some((z) => z.name === "Adana-Spieß"), "Ladenhüter ohne Verbrauch: kein Vorschlag");
});

test("Oberfläche: Büro-Einstieg für alle, Bereich mit Uhrzeit, Bestellliste, Teilen-Knopf, Lager, Einstellungen; Personal gesperrt; Texte ohne verbotene Wörter", async () => {
  const { bueroView } = await import("../js/screens/buero.js");
  const { bestandView, bestandAktion } = await import("../js/screens/bestand.js");
  const { offenImBuero } = await import("../js/offen.js");
  const { navZiel, ansichtErlaubt } = await import("../js/modus.js");
  const s = beispielLaden(H); const w = st.leereWurzel(); w.betriebe.push(s); w.aktiv = s.id;
  assert.ok(bueroView(s, w).includes('data-wert="bestand"'));
  const eigen = laden(); assert.ok(bueroView(eigen, { betriebe: [eigen] }).includes('data-wert="bestand"'), "für alle sichtbar");
  const html = bestandView(s);
  for (const x of ["Lager &amp; Bestellen", "Dönerspieß Kalb/Pute", 'data-a="best-teilen"', "Großhandel (Beispiel)", "Lager jetzt", "Was heißt das?", 'data-a="best-tage"', 'data-a="best-puffer"', 'data-a="best-mindest-auf"']) assert.ok(html.includes(x), x);
  assert.ok(!/undefined|NaN/.test(html));
  const leer = st.migrierenBetrieb(st.leererBetrieb()); assert.match(bestandView(leer), /Mach zuerst eine Inventur/);
  assert.ok(offenImBuero(s, w).some((o) => o.id === "bestand" && o.farbe === "rot" && o.ziel.wert === "bestand"));
  // Einstellung über den Knopf
  const r = await bestandAktion("best-tage", { dataset: { wert: "14" } }, s); assert.equal(r.speichern, true); assert.equal(s.lager.tage, 14);
  // Personal-Modus: nicht erreichbar; Laden: führt ins Büro
  assert.equal(navZiel({ modus: "personal" }, "bestand").ansicht, "personal"); assert.equal(ansichtErlaubt({ modus: "personal" }, "bestand"), false);
  assert.equal(navZiel({ modus: "laden" }, "bestand").buero, true);
  const VERBOTEN = ["revolutionär", "disruptiv", "Marktführer", "GoBD-konform", "betriebsprüfungsfest", "steuersicher", "rechtssicher"];
  for (const f of ["js/bestand.js", "js/screens/bestand.js", ...fs.readdirSync(path.join(HIER, "..", "js", "lang")).map((x) => "js/lang/" + x)]) {
    const t = fs.readFileSync(path.join(HIER, "..", f), "utf8").toLowerCase(); for (const v of VERBOTEN) assert.ok(!t.includes(v.toLowerCase()), f + ": " + v);
  }
  for (const c of i18n.SPRACHEN) { await i18n.ladeSprache(c); assert.deepEqual(i18n.fehlendeSchluessel(c).filter((k) => k.startsWith("bestand")), [], c); }
});
