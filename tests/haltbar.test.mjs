// Stufe 1 (17.10.2026): Haltbarkeit und Abverkauf – Vorschlag MHD/Verbrauchsdatum, FIFO (älteste Lieferung zuerst), Verbrauchsdatum nie Abverkauf,
// Preisrundung auf 50 Cent, nie unter Wareneinsatz, Vergleich mit Wegwerfen, Uhrzeit-Satz, Belegzeile setzen (neues Objekt), Migration,
// Speichern/Sicherung rund, Zusammenführen, Beispiel-Laden an jedem Wochentag, Oberfläche (Büro ja, Laden nein, Personal gesperrt).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { idbAttrappe } from "./hilfe/idb_attrappe.mjs";
const st = await import("../js/store.js");
const h = await import("../js/haltbar.js");
const vk = await import("../js/verkauf.js");
const inv = await import("../js/inventur.js");
const { tagPlus } = await import("../js/engine.js");
const { beispielLaden, HALTBAR_BEISPIEL } = await import("../js/beispiel.js");
const i18n = await import("../js/i18n.js");
i18n.setzeSprache("de");
const HIER = path.dirname(fileURLToPath(import.meta.url));

const H = "2026-10-17"; // Samstag
const nah = (x, y, eps = 1e-6) => assert.ok(Math.abs(x - y) <= eps, `${x} ≠ ${y}`);

// Testladen: Sonntag Ruhetag, Inventur Sa 10.10. (Cola 1 Kiste, Hack 2 kg), Belege am 12.10. und 14.10., Verkäufe Mo–Fr je 10 Cola und 5 Hack-Teller.
// Cola kostet 12 € je Kiste à 24 (0,50 €/Stück netto), verkauft für 2,50 € brutto (19 %).
function laden({ art1 = "mhd", datum1 = "2026-10-19", art2 = "mhd", datum2 = "2026-10-30" } = {}) {
  const s = st.leererBetrieb(); s.phase = "app"; s.betrieb.name = "Testladen"; s.kuehl.ruhetage = [0];
  s.gerichte = [
    { id: "g1", name: "Cola", preis: 2.5, klasse: "getraenk", steuer: 0.19, zutaten: [{ name: "Cola", menge: 1, einheit: "stk" }] },
    { id: "g2", name: "Hack-Teller", preis: 9, klasse: "haupt", steuer: 0.07, zutaten: [{ name: "Hackfleisch gemischt", menge: 200, einheit: "g" }] },
  ];
  s.artikel = [
    { name: "Cola", gruppe: "getraenk", einheit: "stk", packung: { menge: 24, einheit: "stk" }, gebinde: { art: "kiste", zwischen: null }, preis: 12, preisBasis: "netto" },
    { name: "Hackfleisch gemischt", gruppe: "fleisch", einheit: "kg", packung: { menge: 2, einheit: "kg" }, gebinde: { art: "packung", zwischen: null }, preis: 14, preisBasis: "netto" },
  ];
  const m = st.migrierenBetrieb(s);
  const i = inv.inventurStarten(m, { datum: "2026-10-10", jetzt: "2026-10-10T21:00:00.000Z" });
  inv.mengeSetzen(i, "Cola", 1); inv.mengeSetzen(i, "Hackfleisch gemischt", 1);
  inv.inventurAbschliessen(m, i, { datum: "2026-10-10", jetzt: "2026-10-10T21:30:00.000Z" });
  m.lieferungen.push({ id: "l1", datum: "2026-10-12", erfasst: "2026-10-12T09:00:00.000Z", lieferant: "Metro", storniert: false, zeilen: [
    { artikel: "Cola", menge: 2, inhaltMenge: 24, inhaltEinheit: "stk", netto: 24, haltbar: { art: art1, datum: datum1 } },
    { artikel: "Hackfleisch gemischt", menge: 2, inhaltMenge: 2, inhaltEinheit: "kg", netto: 28 }] });
  m.lieferungen.push({ id: "l2", datum: "2026-10-14", erfasst: "2026-10-14T09:00:00.000Z", lieferant: "Metro", storniert: false, zeilen: [
    { artikel: "Cola", menge: 2, inhaltMenge: 24, inhaltEinheit: "stk", netto: 24, haltbar: { art: art2, datum: datum2 } }] });
  for (const d of ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16"]) { vk.handVerkaufSetzen(m, d, "g1", 10); vk.handVerkaufSetzen(m, d, "g2", 5); }
  return st.migrierenBetrieb(m);
}

test("Vorschlag MHD/Verbrauchsdatum je Ware (Annahme, änderbar)", () => {
  const v = (name, gruppe) => h.haltbarVorschlag({ name, gruppe });
  for (const [n, g] of [["Hackfleisch gemischt", "fleisch"], ["Lammhackfleisch", "fleisch"], ["Hähnchenbrust", "fleisch"], ["Hähnchenspieß", "fleisch"], ["Dönerspieß Kalb/Pute", "fleisch"], ["Putenstreifen", "fleisch"], ["Lachsfilet", "fisch"]])
    assert.equal(v(n, g), "verbrauch", n);
  for (const [n, g] of [["Sucuk", "fleisch"], ["Putenbrustschinken", "fleisch"], ["Hähnchen-Nuggets", "fleisch"], ["Hähnchenpatty", "fleisch"], ["Thunfisch", "fisch"], ["Cola 0,33 l", "getraenk"], ["Ayran 0,25 l", "getraenk"],
    ["Weizenmehl Typ 550", "teig"], ["Dönergewürz", "gewuerz"], ["Dönertüte", "verpackung"], ["Tomaten", "gemuese"]]) assert.equal(v(n, g), "mhd", n);
  assert.equal(h.haltbarArtVon({ name: "Sucuk", gruppe: "fleisch", haltbarArt: "verbrauch" }), "verbrauch", "eigene Angabe gewinnt");
  assert.equal(h.haltbarArtVon({ name: "Sucuk", gruppe: "fleisch", haltbarArt: "quatsch" }), "mhd");
});

test("FIFO: Bestand steckt in den jüngsten Lieferungen, die älteste wird zuerst verbraucht; Rest bis zum Datum", () => {
  const s = laden();
  const cs = h.chargenStand(s, { heuteTag: H });
  const c = cs.waren.find((w) => w.name === "Cola");
  // Bestand = 24 + 48 + 48 − 50 = 70 → l2 (jüngste) 48, l1 22, ohne Datum 0
  nah(c.bestand, 70); nah(c.ohneDatum, 0);
  const [l1, l2] = c.chargen; assert.equal(l1.lieferung, "l1"); nah(l1.jetzt, 22); nah(l2.jetzt, 48);
  // Verbrauch ab heute (Sa) 10 je Öffnungstag, Sonntag zu: bis Mo 19.10. = 20 → l1 behält 2; bis 30.10. = 12 Öffnungstage = 120 → l2 ist leer
  nah(l1.verbrauch, 20); nah(l1.rest, 2); nah(l2.verbrauch, 120); nah(l2.rest, 0);
  const hs = h.haltbarStand(s, { heuteTag: H });
  assert.equal(hs.abverkauf.length, 1); const k = hs.abverkauf[0];
  assert.equal(k.name, "Cola"); assert.equal(k.ablauf, "2026-10-19"); nah(k.rest, 2); nah(k.wert, 1); assert.equal(k.tage, 2);
  assert.equal(hs.laeuftAb.length, 0);
  // Ohne Datum auf dem Beleg: nichts
  const ohne = laden(); for (const l of ohne.lieferungen) for (const z of l.zeilen) delete z.haltbar;
  assert.deepEqual(h.chargenStand(ohne, { heuteTag: H }).waren, []);
  // MHD in 8 Tagen ist noch kein Kandidat (7 Tage, Auftrag)
  const spaet = laden({ datum1: "2026-10-25", datum2: "2026-11-20" }); const ks = h.haltbarStand(spaet, { heuteTag: H });
  assert.equal(ks.abverkauf.length, 0, JSON.stringify(ks.abverkauf));
});

test("Verbrauchsdatum: nur „nicht mehr verwenden ab …“, NIE ein Abverkauf – auch wenn sich eine Aktion rechnen würde", () => {
  const s = laden({ art1: "verbrauch" });
  const hs = h.haltbarStand(s, { heuteTag: H });
  assert.equal(hs.abverkauf.length, 0);
  assert.equal(hs.laeuftAb.length, 1); const x = hs.laeuftAb[0];
  assert.equal(x.art, "verbrauch"); assert.equal(x.status, "verbrauchen"); assert.equal(x.ab, "2026-10-20"); nah(x.rest, 2);
  // abgelaufen (gestern) mit Rest: „vorbei“, weiter kein Abverkauf
  const alt = laden({ art1: "verbrauch", datum1: "2026-10-16" }); const ha = h.haltbarStand(alt, { heuteTag: H });
  assert.equal(ha.laeuftAb[0].status, "vorbei"); assert.equal(ha.abverkauf.length, 0);
  // MHD vorbei: Hinweis „prüfen“, kein Abverkauf
  const mhd = laden({ datum1: "2026-10-16" }); const hm = h.haltbarStand(mhd, { heuteTag: H });
  assert.equal(hm.laeuftAb[0].status, "mhdVorbei"); assert.equal(hm.abverkauf.length, 0);
  // Verbrauch reicht: Verbrauchsdatum ohne Rest erscheint nicht
  const genug = laden({ art1: "verbrauch", datum1: "2026-10-20" }); assert.equal(h.haltbarStand(genug, { heuteTag: H }).laeuftAb.length, 0);
});

test("Preisrundung auf 50 Cent (App rundet sonst nur Zielpreise auf 10 Cent)", () => {
  nah(h.preisStufeAuf(1.464), 1.5); nah(h.preisStufeAuf(2.0), 2.0); nah(h.preisStufeAuf(2.01), 2.5); nah(h.preisStufeAuf(0.02), 0.5);
  nah(h.preisStufeNah(11.6), 11.5); nah(h.preisStufeNah(11.76), 12); nah(h.preisStufeNah(12.825), 13); assert.equal(h.PREIS_SCHRITT, 0.5);
});

test("Abverkauf: Nachlass höchstens Warenwert, nie unter Wareneinsatz, Portionen, Vergleich mit Wegwerfen", () => {
  const s = laden(); const k = h.haltbarStand(s, { heuteTag: H }).abverkauf[0]; const v = k.bester;
  assert.ok(v, JSON.stringify(k.vorschlaege));
  // Cola 2,50 € brutto (19 %), Ware 0,50 € netto; Rest 2 Stück = 1,00 € → je Portion höchstens 0,50 € netto Nachlass
  assert.equal(v.gericht, "g1"); assert.equal(v.portionen, 2); nah(v.aktionspreis, 2.0); nah(v.preis, 2.5);
  const Anet = 2 / 1.19, Pnet = 2.5 / 1.19;
  assert.ok(v.nachlassGesamtNetto <= k.wert + 1e-9, "Nachlass ≤ Warenwert"); nah(v.nachlassGesamtNetto, 2 * (Pnet - Anet));
  nah(v.verlust, 1); nah(v.vorteil, 2 * (Anet - 0.5) + 1); nah(v.rohertragJePortion, Anet - 0.5);
  assert.equal(h.abverkaufText(v), "Cola nur 2,00 € statt 2,50 € – bis Mo 19.10.");
  // nie unter Wareneinsatz: viel Rest, teure Ware, billiges Gericht → Preis bleibt über der Ware oder kein Vorschlag
  const t2 = { name: "Cola", rest: 40, wert: 40, ablauf: "2026-10-19", geschaetzt: false };
  for (const preis of [0.6, 1.0, 3.0, 9.9]) {
    const g = laden(); g.gerichte[0].preis = preis;
    for (const x of h.abverkaufVorschlaege(g, t2)) if (x.art === "aktion") { assert.ok(x.aktionspreis / 1.19 >= 0.5 - 1e-9, `${preis}: ${x.aktionspreis}`); assert.ok(x.aktionspreis < preis); assert.ok(Math.abs(x.aktionspreis * 2 - Math.round(x.aktionspreis * 2)) < 1e-9, "50-Cent-Stufe"); }
  }
  const billig = laden(); billig.gerichte[0].preis = 0.6; assert.equal(h.abverkaufVorschlaege(billig, t2)[0].art, "lohntNicht", "Rabatt unter einer Stufe: kein Vorschlag");
  // Gericht ohne Preis: ehrlich „ohnePreis“, keine Zahl
  const ohne = laden(); ohne.gerichte[0].preis = null; assert.equal(h.abverkaufVorschlaege(ohne, t2)[0].art, "ohnePreis");
});

test("Uhrzeit: ein Satz – Verbrauchsdatum heute/morgen/vorbei (rot) vor Aktion (gelb); nichts, wenn nichts abläuft", () => {
  const u = (o, heuteTag = H) => h.haltbarUhrzeit(laden(o), { heuteTag });
  const a = u({}); assert.equal(a.ton, "gelb"); assert.equal(a.text, "Cola: Aktion bis Mo lohnt sich"); assert.equal(a.ziel.wert, "aktionen");
  assert.equal(u({ art1: "verbrauch", datum1: "2026-10-18" }).text, "Cola bis morgen verbrauchen");
  assert.equal(u({ art1: "verbrauch", datum1: "2026-10-17" }).text, "Cola heute verbrauchen");
  assert.equal(u({ art1: "verbrauch", datum1: "2026-10-16" }).text, "Cola: Verbrauchsdatum vorbei");
  assert.equal(u({ art1: "verbrauch", datum1: "2026-10-18" }).ton, "rot");
  assert.equal(u({ art1: "verbrauch", datum1: "2026-10-19" }).text, "Cola bis Mo verbrauchen");
  assert.equal(u({ datum1: "2026-10-28", datum2: "2026-11-30" }), null);
  for (const x of [a, u({ art1: "verbrauch", datum1: "2026-10-18" })]) assert.ok(x.text.split(/\s+/).length <= 15);
  assert.equal(h.haltbarUhrzeit(st.migrierenBetrieb(st.leererBetrieb()), { heuteTag: H }), null);
  i18n.setzeSprache("tr"); try { assert.equal(u({}).text, "Cola: Pzt gününe kadar kampanya kazandırır"); } finally { i18n.setzeSprache("de"); }
});

test("Belegzeile setzen: neues Objekt im Journal, Art am Artikel nur bei Abweichung vom Vorschlag, Ungültiges abgelehnt", () => {
  const s = laden(); const vorher = s.lieferungen[0];
  const neu = h.haltbarSetzen(s, "l1", { 1: { art: "verbrauch", datum: "2026-10-18" } }, { jetzt: "2026-10-17T10:00:00.000Z" });
  assert.ok(neu && neu !== vorher && s.lieferungen[0] === neu, "neues Objekt"); assert.deepEqual(neu.zeilen[1].haltbar, { art: "verbrauch", datum: "2026-10-18", erfasst: "2026-10-17T10:00:00.000Z" });
  assert.ok(!("haltbar" in vorher.zeilen[1]), "alter Stand bleibt unberührt");
  assert.ok(!("haltbarArt" in s.artikel.find((a) => a.name === "Hackfleisch gemischt")), "Vorschlag = verbrauch → nichts merken");
  h.haltbarSetzen(s, "l1", { 1: { art: "mhd", datum: "2026-10-20" } }); assert.equal(s.artikel.find((a) => a.name === "Hackfleisch gemischt").haltbarArt, "mhd");
  assert.equal(h.haltbarSetzen(s, "l1", { 1: { art: "mhd", datum: "2026-10-20" } }), null, "gleich → nichts");
  assert.equal(h.haltbarSetzen(s, "l1", { 0: { art: "frisch", datum: "2026-10-20" } }), null); assert.equal(h.haltbarSetzen(s, "l1", { 0: { art: "mhd", datum: "20.10.2026" } }), null);
  const weg = h.haltbarSetzen(s, "l1", { 0: null }); assert.ok(!("haltbar" in weg.zeilen[0]));
  s.lieferungen[1].storniert = true; assert.equal(h.haltbarSetzen(s, "l2", { 0: { art: "mhd", datum: "2026-10-20" } }), null, "storniert");
});

test("Migration: gültige Haltbarkeit bleibt, Ungültiges fällt weg; haltbarArt nur mhd/verbrauch; alte Läden unverändert", () => {
  const s = st.leererBetrieb();
  s.artikel = [{ name: "A", haltbarArt: "verbrauch" }, { name: "B", haltbarArt: "frisch" }, { name: "C" }];
  s.lieferungen = [{ id: "x", datum: "2026-10-10", zeilen: [{ artikel: "A", haltbar: { art: "mhd", datum: "2026-10-20", erfasst: "t" } }, { artikel: "A", haltbar: { art: "mhd", datum: "morgen" } },
    { artikel: "A", haltbar: "2026-10-20" }, { artikel: "A", haltbar: { art: "x", datum: "2026-10-20" } }, { artikel: "A", haltbar: { art: "verbrauch", datum: "2026-10-21", fremd: 1 } }, { artikel: "A" }] }];
  const m = st.migrierenBetrieb(s); const z = m.lieferungen[0].zeilen;
  assert.deepEqual(z[0].haltbar, { art: "mhd", datum: "2026-10-20", erfasst: "t" });
  for (const i of [1, 2, 3, 5]) assert.ok(!("haltbar" in z[i]), String(i));
  assert.deepEqual(z[4].haltbar, { art: "verbrauch", datum: "2026-10-21" });
  assert.equal(m.artikel[0].haltbarArt, "verbrauch"); assert.ok(!("haltbarArt" in m.artikel[1])); assert.ok(!("haltbarArt" in m.artikel[2]));
  const leer = st.migrierenBetrieb(st.leererBetrieb()); assert.ok(!JSON.stringify(leer).includes("haltbar"));
});

test("Speichern, Sicherung und Zusammenführen: Haltbarkeit übersteht alles, nachgetragenes Datum geht nicht verloren", async () => {
  idbAttrappe(); await st.laden();
  const w = st.leereWurzel(); const s = laden(); w.betriebe.push(s); w.aktiv = s.id;
  await st.sofortSpeichern(w);
  const g0 = await st.laden(); h.haltbarSetzen(g0.betriebe[0], "l1", { 1: { art: "verbrauch", datum: "2026-10-18" } }); await st.sofortSpeichern(g0);
  const g = await st.laden(); const l1 = g.betriebe[0].lieferungen.find((l) => l.id === "l1");
  assert.equal(l1.zeilen[1].haltbar.datum, "2026-10-18", "nach Speichern/Laden (geänderter Beleg als neues Objekt)"); assert.equal(l1.zeilen[0].haltbar.art, "mhd");
  const { blob } = await st.exportDatei(g); const r = await st.importSicherung(blob); assert.equal(r.pruefsumme, "ok");
  assert.deepEqual(r.wurzel.betriebe[0].lieferungen.find((l) => l.id === "l1").zeilen.map((z) => z.haltbar?.datum ?? null), ["2026-10-19", "2026-10-18"]);
  // zweites Handy: derselbe Beleg ohne Datum (älterer Stand) → Datum bleibt; dort später ein anderes Datum → das jüngere gewinnt
  const alt = structuredClone(r.wurzel); delete alt.betriebe[0].lieferungen.find((l) => l.id === "l1").zeilen[1].haltbar;
  const ziel = structuredClone(r.wurzel); st.zusammenfuehren(ziel, alt);
  assert.equal(ziel.betriebe[0].lieferungen.find((l) => l.id === "l1").zeilen[1].haltbar.datum, "2026-10-18");
  const andersrum = structuredClone(alt); st.zusammenfuehren(andersrum, r.wurzel);
  assert.equal(andersrum.betriebe[0].lieferungen.find((l) => l.id === "l1").zeilen[1].haltbar.datum, "2026-10-18", "auch wenn das eigene Handy das Datum nicht hat");
  const spaeter = structuredClone(r.wurzel); spaeter.betriebe[0].lieferungen.find((l) => l.id === "l1").zeilen[1].haltbar = { art: "verbrauch", datum: "2026-10-19", erfasst: "2099-01-01T00:00:00.000Z" };
  const z2 = structuredClone(r.wurzel); st.zusammenfuehren(z2, spaeter); assert.equal(z2.betriebe[0].lieferungen.find((l) => l.id === "l1").zeilen[1].haltbar.datum, "2026-10-19");
  assert.equal(z2.betriebe[0].lieferungen.filter((l) => l.id === "l1").length, 1, "kein doppelter Beleg");
});

test("Beispiel-Laden: genau eine Ware mit Verbrauchsdatum läuft bald ab (kein Abverkauf), eine MHD-Ware ergibt einen Abverkauf – an jedem Wochentag", () => {
  assert.deepEqual(HALTBAR_BEISPIEL.map((x) => x.art), ["verbrauch", "mhd"]);
  for (let i = 0; i < 7; i++) {
    const d = tagPlus(H, i); const s = beispielLaden(d); const hs = h.haltbarStand(s, { heuteTag: d });
    assert.equal(hs.laeuftAb.length, 1, d); const x = hs.laeuftAb[0];
    assert.equal(x.name, "Hähnchenspieß"); assert.equal(x.art, "verbrauch"); assert.equal(x.tage, 1); assert.ok(x.rest > 0, d);
    assert.ok(!hs.abverkauf.some((y) => y.name === "Hähnchenspieß"), "Verbrauchsdatum nie Abverkauf");
    assert.equal(hs.abverkauf.length, 1, d); const a = hs.abverkauf[0];
    assert.equal(a.name, "Ayran 0,25 l"); assert.equal(a.tage, 3); assert.ok(a.rest > 0 && a.bester, d);
    assert.equal(a.bester.name, "Ayran 0,25 l"); assert.ok(a.bester.aktionspreis < a.bester.preis && a.bester.aktionspreis / 1.19 >= a.bester.wareneinsatz);
    const u = h.haltbarUhrzeit(s, { heuteTag: d }); assert.equal(u.text, "Hähnchenspieß bis morgen verbrauchen"); assert.equal(u.ton, "rot");
  }
  assert.equal(JSON.stringify(h.haltbarStand(beispielLaden(H), { heuteTag: H })), JSON.stringify(h.haltbarStand(beispielLaden(H), { heuteTag: H })), "ohne Zufall");
});

test("Oberfläche: Büro-Einstieg und Hinweis, Bereich mit drei Teilen und Kassen-Hinweis; Laden zeigt nichts; Personal gesperrt; Beleg-Schritt freiwillig", async () => {
  const { bueroView } = await import("../js/screens/buero.js");
  const { aktionenView, aktionenAktion, aktionenTextFuer, aktionenZuruecksetzen } = await import("../js/screens/aktionen.js");
  const { offenImBuero, jetztDran } = await import("../js/offen.js");
  const { navZiel, ansichtErlaubt } = await import("../js/modus.js");
  const s = beispielLaden(H); const w = st.leereWurzel(); w.betriebe.push(s); w.aktiv = s.id;
  const b = bueroView(s, w); assert.ok(b.includes('data-wert="aktionen"')); assert.ok(b.includes("Hähnchenspieß bis morgen verbrauchen"));
  const eigen = laden(); assert.ok(bueroView(eigen, { betriebe: [eigen] }).includes('data-wert="aktionen"'), "für alle sichtbar");
  assert.ok(offenImBuero(s, w).some((o) => o.id === "haltbar" && o.farbe === "rot" && o.ziel.wert === "aktionen"));
  for (const std of [8, 12, 19, 23]) { const j = jetztDran(s, w, { jetzt: new Date(`${H}T${String(std).padStart(2, "0")}:00:00`) }); assert.ok(!j || j.id !== "haltbar", "Laden: nichts"); }
  aktionenZuruecksetzen();
  const html = aktionenView(s);
  for (const x of ["Aktionen &amp; Haltbarkeit", "Läuft ab", "Hähnchenspieß", "nicht mehr verwenden ab", "Abverkauf", "Ayran 0,25 l für 1,50", "Wegwerfen kostet", "Kombi-Angebot", "Vorschläge",
    "Preise auf Aushang und Kasse müssen gleich sein.", "Was heißt das?", 'data-a="akt-teilen"', 'data-a="akt-kombi"']) assert.ok(html.includes(x), x);
  assert.equal(html.split("Preise auf Aushang und Kasse").length, 2, "Kassen-Hinweis genau einmal");
  assert.ok(!/undefined|NaN|aktionen\./.test(html), html.match(/undefined|NaN|aktionen\.[a-z.]+/)?.[0]);
  assert.ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(html), "keine Emoji");
  assert.match(aktionenTextFuer(s, "abverkauf", "0"), /^Ayran 0,25 l nur 1,50\s€ statt 2,00\s€ – bis (Mo|Di|Mi|Do|Fr|Sa|So) \d\d\.\d\d\.$/);
  // Personal: nicht erreichbar; Laden: führt ins Büro
  assert.equal(navZiel({ modus: "personal" }, "aktionen").ansicht, "personal"); assert.equal(ansichtErlaubt({ modus: "personal" }, "aktionen"), false);
  assert.equal(navZiel({ modus: "laden" }, "aktionen").buero, true);
  // Kombi über die Knöpfe: Vorschlag übernehmen → drei Stufen mit Teilen-Text; Auswahl leeren
  assert.equal(await aktionenAktion("akt-kombi-vorschlag", { dataset: { wert: "0" } }, s), true);
  const k = aktionenView(s); assert.ok(k.includes('data-kombi="1"') && k.includes('data-stufe="vorsichtig"') && k.includes('data-stufe="stark"'), "drei Stufen");
  assert.match(aktionenTextFuer(s, "kombi", "normal"), /^Döner Kebab \+ Pommes frites \+ Cola 0,33 l nur \d+,\d0\s€$/);
  assert.equal(await aktionenAktion("akt-kombi-leeren", { dataset: {} }, s), true); assert.ok(!aktionenView(s).includes('data-kombi="1"'));
  const VERBOTEN = ["revolutionär", "disruptiv", "Marktführer", "GoBD-konform", "betriebsprüfungsfest", "steuersicher", "rechtssicher"];
  for (const f of ["js/haltbar.js", "js/deal.js", "js/screens/aktionen.js", "js/screens/beleg.js", ...fs.readdirSync(path.join(HIER, "..", "js", "lang")).map((x) => "js/lang/" + x)]) {
    const t = fs.readFileSync(path.join(HIER, "..", f), "utf8").toLowerCase(); for (const v of VERBOTEN) assert.ok(!t.includes(v.toLowerCase()), f + ": " + v);
  }
  for (const c of i18n.SPRACHEN) { await i18n.ladeSprache(c); assert.deepEqual(i18n.fehlendeSchluessel(c).filter((k) => k.startsWith("aktionen")), [], c); }
  i18n.setzeSprache("de");
});

test("Beleg-Schritt: Haltbarkeit eintragen setzt die Zeile, Vorschlag der Art vorbelegt, Speichern ohne Datum ändert nichts", async () => {
  const bel = await import("../js/screens/beleg.js"); bel.belegZuruecksetzen();
  const s = laden(); const w = { geraet: "t" };
  bel.belegEingabe("beleg-text", "Metro 17.10.2026\nHackfleisch gemischt 2 x 7,00 14,00\nSumme 14,00");
  const r0 = bel.belegAktion("beleg-zerlegen", { dataset: {} }, s, w); assert.ok(r0);
  let html = bel.belegView(s);
  if (/beleg-zuordnen/.test(html)) { const i = html.match(/data-a="beleg-zuordnen" data-i="(\d+)"/)[1]; bel.belegAktion("beleg-zuordnen", { dataset: { i, name: "Hackfleisch gemischt" } }, s, w); }
  html = bel.belegView(s); if (/data-a="beleg-basis"/.test(html)) bel.belegAktion("beleg-basis", { dataset: { wert: "netto" } }, s, w);
  const r = bel.belegAktion("beleg-uebernehmen", { dataset: {} }, s, w); assert.equal(r, "uebernommen");
  html = bel.belegView(s); assert.ok(html.includes("Haltbarkeit (freiwillig)") && html.includes('data-a="hb-auf"'), "freiwilliger Schritt da");
  const l = s.lieferungen[s.lieferungen.length - 1];
  assert.ok(bel.belegAktion("hb-auf", { dataset: {} }, s, w)); html = bel.belegView(s);
  assert.ok(html.includes('data-wert="verbrauch" aria-pressed="true"') || /class="an" aria-pressed="true" data-a="hb-art" data-i="0" data-wert="verbrauch"/.test(html), "Hack: Verbrauchsdatum vorbelegt");
  assert.equal(bel.belegAktion("hb-speichern", { dataset: {} }, s, w).meldung, "Nichts geändert");
  assert.ok(!("haltbar" in s.lieferungen[s.lieferungen.length - 1].zeilen[0]), "ohne Datum nichts gespeichert");
  bel.belegAktion("hb-auf", { dataset: {} }, s, w); bel.belegEingabe("hb-datum:0", "2026-10-19");
  assert.equal(bel.belegAktion("hb-speichern", { dataset: {} }, s, w).meldung, "Gespeichert");
  const neu = s.lieferungen[s.lieferungen.length - 1]; assert.notEqual(neu, l); assert.equal(neu.id, l.id); assert.deepEqual({ art: neu.zeilen[0].haltbar.art, datum: neu.zeilen[0].haltbar.datum }, { art: "verbrauch", datum: "2026-10-19" });
  assert.match(bel.belegView(s), /1 Datum eingetragen/);
  bel.belegZuruecksetzen();
});
