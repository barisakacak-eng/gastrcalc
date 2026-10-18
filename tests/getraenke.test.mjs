// Getränke (18.10.2026): Vorgabe des Eigentümers – „Getränkegrößen gibt es von 0,2 bis 1,5 l, je nach Produkt. Jede Gastronomie hat andere
// Lieferanten – nicht alle arbeiten mit Coca-Cola-Dosen, sondern teils mit Fritz-Kola oder mit offenen Getränken.“
// Geprüft: Felder (Größe, Gebinde, Marke, Pfand, Lieferant), Größe aus dem Namen (Migration) und Hinweis statt Raten, offene Getränke mit
// Wareneinsatz je Glas inkl. Schankverlust, Soll-Verbrauch/Bestand/Bestellvorschlag in Litern, Tafel und Aushang nutzen das Feld, Pfand ist
// keine Ware, markenneutraler Katalog, Richtpreise unangetastet, Bildschirm „Getränke“ (Büro, Personal gesperrt).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
globalThis.document ??= { documentElement: {} };
const st = await import("../js/store.js");
const F = await import("../js/getraenk_feld.js");
const G = await import("../js/getraenk.js");
const T = await import("../js/tafel.js");
const D = await import("../js/deal.js");
const vk = await import("../js/verkauf.js");
const b = await import("../js/bestand.js");
const inv = await import("../js/inventur.js");
const { kalkulation, tagPlus } = await import("../js/engine.js");
const { KATALOG, GETRAENK_VORLAGEN, PRODUKT_INDEX } = await import("../js/data/katalog.js");
const { RICHTPREIS_INDEX } = await import("../js/data/richtpreise.js");
const { richtpreiseEinsetzen } = await import("../js/richtpreise.js");
const { beispielLaden } = await import("../js/beispiel.js");
const i18n = await import("../js/i18n.js");
i18n.setzeSprache("de");
const HIER = path.dirname(fileURLToPath(import.meta.url));
const H = "2026-10-17"; // Samstag
const nah = (x, y, eps = 1e-6) => assert.ok(Math.abs(x - y) <= eps, `${x} ≠ ${y}`);
const zeile = (s, id) => kalkulation(s).zeilen.find((z) => z.id === id);

// Imbiss mit Fritz-Kola in der Glasflasche und Cola offen aus der 1,5-l-PET-Flasche (Kiste 6 × 1,5 l = 9 l für 7,20 € netto = 0,80 €/l)
function laden() {
  const s = st.leererBetrieb(); s.phase = "app"; s.betrieb.name = "Getränke-Test"; s.kuehl.ruhetage = [0];
  s.gerichte = [{ id: "f1", name: "Fritz-Kola 0,33 l", preis: 3.2, klasse: "getraenk", steuer: 0.19, zutaten: [{ name: "Fritz-Kola 0,33 l", menge: 1, einheit: "stk" }] }];
  s.artikel = [
    { name: "Fritz-Kola 0,33 l", gruppe: "getraenk", einheit: "stk", packung: { menge: 24, einheit: "stk" }, gebinde: { art: "kiste", zwischen: null }, preis: 16.8, preisBasis: "netto" },
    { name: "Cola 1,5 l PET", gruppe: "getraenk", einheit: "l", packung: { menge: 9, einheit: "l" }, gebinde: { art: "kiste", zwischen: { art: "flasche", anzahl: 6 } }, preis: 7.2, preisBasis: "netto" },
  ];
  return st.migrierenBetrieb(s);
}

test("Felder: Größe 0,02–30 l (Auswahl 0,2–1,5 l), Gebinde-Arten, Marke, Pfand, Lieferant – Ungültiges fällt weg", () => {
  assert.deepEqual(F.GROESSEN, [0.2, 0.25, 0.3, 0.33, 0.4, 0.5, 1, 1.5]);
  assert.deepEqual(F.GEBINDE_VERKAUF, ["dose", "glas", "pet", "offen", "becher"]); assert.ok(["box", "fass"].every((x) => F.GEBINDE_EINKAUF.includes(x)));
  assert.deepEqual(F.getraenkGerichtSauber({ menge: 0.4, gebinde: "offen", quelle: " Cola 1,5 l PET ", schankverlust: 0.05 }), { menge: 0.4, gebinde: "offen", quelle: "Cola 1,5 l PET", schankverlust: 0.05 });
  assert.deepEqual(F.getraenkGerichtSauber({ menge: 99, gebinde: "kiste", schankverlust: 0.05 }), { menge: null, gebinde: null, quelle: null, schankverlust: 0 }, "ohne Großgebinde kein Schankverlust");
  assert.equal(F.getraenkGerichtSauber({ quelle: "X", schankverlust: 0.8 }).schankverlust, 0, "über 50 %: ungültig");
  assert.deepEqual(F.getraenkArtikelSauber({ menge: 0.33, gebinde: "glas", marke: "  Fritz-Kola ", pfand: 0.08, lieferant: "Getränke Meyer" }), { menge: 0.33, gebinde: "glas", marke: "Fritz-Kola", pfand: 0.08, lieferant: "Getränke Meyer" });
  assert.equal(F.getraenkArtikelSauber({ pfand: -1 }).pfand, null); assert.equal(F.getraenkArtikelSauber({ pfand: 99 }).pfand, null);
  for (const [t, l] of [["Cola 0,33 l", 0.33], ["Ayran 0,2l", 0.2], ["Wasser 1,5 L", 1.5], ["Bier 500 ml", 0.5], ["Saft 20 cl", 0.2], ["Ayran 0,25 Liter", 0.25], ["Fass 30 l", 30]]) assert.equal(F.literAusText(t), l, t);
  for (const t of ["Ayran", "Cola light", "Dürüm XL", "Pizzakarton 30 cm", "Fanta 0 lecker"]) assert.equal(F.literAusText(t), null, t);
  assert.equal(F.literText(0.33), "0,33 l"); assert.equal(F.literText(1), "1 l"); assert.equal(F.literEingabe("0,4"), 0.4); assert.equal(F.literEingabe("400 ml"), 0.4); assert.equal(F.literEingabe("abc"), undefined); assert.equal(F.literEingabe(""), null);
});

test("Migration: Größe aus dem Namen („0,33 l“, „0,2l“, „1,5 L“), sonst leer – kein Raten; Katalog-Gebinde; idempotent; Wirt darf leeren", () => {
  const s = st.leererBetrieb();
  s.gerichte = [
    { id: "a", name: "Cola 0,33 l", klasse: "getraenk", preis: 2.5, zutaten: [] }, { id: "b", name: "Ayran 0,2l", klasse: "getraenk", preis: 2, zutaten: [] },
    { id: "c", name: "Wasser 1,5 L", klasse: "getraenk", preis: 3, zutaten: [] }, { id: "d", name: "Ayran", klasse: "getraenk", preis: 2, zutaten: [] },
    { id: "e", name: "Wasser", ausschank: "0.5l", klasse: "getraenk", preis: 2, zutaten: [] }, { id: "f", name: "Döner 0,5 l", klasse: "haupt", preis: 7, zutaten: [] },
  ];
  s.artikel = [{ name: "Cola 0,33 l", gruppe: "getraenk", einheit: "stk" }, { name: "Cola Bag-in-Box (Postmix)", gruppe: "getraenk", einheit: "l" }, { name: "Eistee", gruppe: "getraenk", einheit: "l" }, { name: "Trinkbecher 0,3 l", gruppe: "verpackung", einheit: "stk" }];
  const m = st.migrierenBetrieb(s);
  const g = Object.fromEntries(m.gerichte.map((x) => [x.id, x]));
  assert.deepEqual([g.a.getraenk.menge, g.b.getraenk.menge, g.c.getraenk.menge, g.d.getraenk.menge, g.e.getraenk.menge], [0.33, 0.2, 1.5, null, 0.5]);
  assert.equal(g.d.getraenk.gebinde, null, "Gebinde nicht geraten"); assert.ok(!("ausschank" in g.e), "altes Tafel-Feld ist umgezogen"); assert.ok(!("getraenk" in g.f), "nur Getränke");
  const a = Object.fromEntries(m.artikel.map((x) => [x.name, x]));
  assert.deepEqual(a["Cola 0,33 l"].getraenk, { menge: 0.33, gebinde: null, marke: "", pfand: null, lieferant: "" });
  assert.equal(a["Cola Bag-in-Box (Postmix)"].getraenk.gebinde, "box", "Gebinde aus dem Katalog"); assert.equal(a.Eistee.getraenk.menge, null); assert.ok(!("getraenk" in a["Trinkbecher 0,3 l"]));
  assert.deepEqual(st.migrierenBetrieb(structuredClone(m)), m, "zweimal migrieren ändert nichts");
  const leer = structuredClone(m); leer.gerichte[0].getraenk.menge = null; assert.equal(st.migrierenBetrieb(leer).gerichte[0].getraenk.menge, null, "vom Wirt geleert: bleibt leer");
});

test("Hinweis bei fehlender Größe: Büro „Getränke“ und Menütafel sagen es, statt zu raten", () => {
  const s = st.migrierenBetrieb(Object.assign(st.leererBetrieb(), { gerichte: [{ id: "d", name: "Ayran", klasse: "getraenk", preis: 2, zutaten: [] }, { id: "o", name: "Cola offen", klasse: "getraenk", preis: 2.5, zutaten: [], getraenk: { gebinde: "offen", menge: 0.4 } }] }));
  const l = G.getraenkeListe(s); assert.deepEqual(G.getraenkHinweise(l), [{ id: "d", name: "Ayran", fehlt: ["menge"] }, { id: "o", name: "Cola offen", fehlt: ["quelle"] }]);
  const tb = T.tafelBeschreibung(s, { heuteTag: H }); assert.deepEqual(tb.hinweise.map((h) => h.art + ":" + h.name), ["mengeFehlt:Ayran"]);
});

test("Menütafel und Aushang nutzen das Feld Ausschankmenge, nicht den Namen (§ 13 PAngV)", () => {
  const s = st.migrierenBetrieb(Object.assign(st.leererBetrieb(), { gerichte: [
    { id: "a", name: "Ayran", klasse: "getraenk", preis: 2, zutaten: [], getraenk: { menge: 0.25 } },
    { id: "c", name: "Cola 0,33 l", klasse: "getraenk", preis: 2.5, zutaten: [], getraenk: { menge: 0.5 } },
    { id: "x", name: "Cola 0,33 l Dose", klasse: "getraenk", preis: 2.5, zutaten: [], getraenk: { menge: null } },
    { id: "d", name: "Döner", klasse: "haupt", preis: 7, zutaten: [] }] }));
  const tb = T.tafelBeschreibung(s, { heuteTag: H }); const e = Object.fromEntries(tb.gruppen.find((x) => x.gruppe === "getraenke").eintraege.map((x) => [x.id, x]));
  assert.equal(e.a.menge, "0,25 l", "Feld, obwohl der Name keine Menge hat"); assert.equal(e.c.menge, "0,5 l", "Feld gilt, nicht der Name");
  assert.equal(e.x.menge, null, "Feld leer: nichts geraten, auch wenn der Name eine Menge nennt");
  assert.deepEqual(tb.hinweise.map((h) => h.art + ":" + h.id).sort(), ["mengeAnders:c", "mengeFehlt:x"]);
  assert.ok(T.tafelHtml(tb, { eingebettet: false }).includes('<span class="menge">0,25 l</span>'));
  assert.equal(T.aktionName(s, { gerichte: ["d", "a"] }), "Döner + Ayran 0,25 l", "Aktion auf der Tafel mit Menge");
  // Teilen-Text (Aushang/WhatsApp): Getränk mit Menge aus dem Feld
  const t = laden(); t.gerichte.push({ id: "d1", name: "Döner", klasse: "haupt", preis: 7, steuer: 0.07, zutaten: [{ name: "Brot", menge: 1, einheit: "stk" }] },
    { id: "ay", name: "Ayran", klasse: "getraenk", preis: 2, steuer: 0.19, zutaten: [{ name: "Ayran-Becher", menge: 1, einheit: "stk" }], getraenk: { menge: 0.25, gebinde: "becher" } });
  t.artikel.push({ name: "Brot", gruppe: "teig", einheit: "stk", packung: { menge: 10, einheit: "stk" }, preis: 3, preisBasis: "netto" }, { name: "Ayran-Becher", gruppe: "getraenk", einheit: "stk", packung: { menge: 20, einheit: "stk" }, preis: 8, preisBasis: "netto" });
  const k = D.kombiRechnen(t, ["d1", "ay"]); assert.equal(D.kombiText(k, k.stufen[1]), `Döner + Ayran 0,25 l nur ${k.stufen[1].preis.toFixed(2).replace(".", ",")} €`);
});

test("Offenes Getränk: Ware je Glas = Preis je Liter × Ausschank, mit Schankverlust (Standard 0 %, frei einstellbar)", () => {
  const s = laden();
  const r = G.getraenkAnlegen(s, { vorlage: "Cola offen 0,4 l", preis: 2.9 }); assert.equal(r.ok, true);
  const g = r.gericht; assert.deepEqual(g.getraenk, { menge: 0.4, gebinde: "offen", quelle: "Cola 1,5 l PET", schankverlust: 0 }); assert.deepEqual(g.zutaten, [{ name: "Cola 1,5 l PET", menge: 400, einheit: "ml" }]);
  nah(zeile(s, g.id).waren, 0.8 * 0.4, 1e-9);
  assert.deepEqual(G.getraenkSetzen(s, g.id, { schankverlust: 0.05 }), { ok: true }); nah(zeile(s, g.id).waren, 0.8 * 0.4 / 0.95, 1e-9);
  assert.equal(G.getraenkSetzen(s, g.id, { schankverlust: 0.6 }).grund, "schankverlust"); nah(s.gerichte.find((x) => x.id === g.id).getraenk.schankverlust, 0.05);
  // Ausschank 0,3 l statt 0,4 l: die Rezept-Zutat folgt
  G.getraenkSetzen(s, g.id, { menge: 0.3 }); assert.equal(s.gerichte.find((x) => x.id === g.id).zutaten[0].menge, 300); nah(zeile(s, g.id).waren, 0.8 * 0.3 / 0.95, 1e-9);
  const liste = G.getraenkeListe(s).find((x) => x.id === g.id); assert.equal(liste.offen, true); nah(liste.jeLiter, 0.8); assert.equal(liste.mengeText, "0,3 l");
  // eine Flasche zum offenen Getränk machen: die Flaschen-Zutat wird durch das Großgebinde ersetzt, der Becher bleibt
  const t = laden(); t.gerichte[0].zutaten.push({ name: "Trinkbecher 0,3 l", menge: 1, einheit: "stk" });
  assert.deepEqual(G.getraenkSetzen(t, "f1", { gebinde: "offen", quelle: "Cola 1,5 l PET", menge: 0.3 }), { ok: true });
  assert.deepEqual(t.gerichte[0].zutaten.map((z) => z.name + ":" + z.menge), ["Cola 1,5 l PET:300", "Trinkbecher 0,3 l:1"]);
  // Großgebinde muss in Litern geführt sein; Ausschankmenge ist Pflicht
  assert.equal(G.getraenkSetzen(laden(), "f1", { gebinde: "offen", quelle: "Fritz-Kola 0,33 l", menge: 0.3 }).grund, "quelleEinheit");
  assert.equal(G.getraenkSetzen(laden(), "f1", { gebinde: "offen", quelle: "Cola 1,5 l PET", menge: null }).grund, "menge");
  assert.equal(G.getraenkSetzen(laden(), "f1", { gebinde: "offen", quelle: "gibtsnicht", menge: 0.3 }).grund, "quelle");
  // Bag-in-Box aus dem Katalog: wird als Artikel in Litern angelegt (ohne Preis – den trägt der Wirt ein)
  const u = laden(); const p = G.getraenkAnlegen(u, { vorlage: "Cola offen 0,3 l" }); assert.equal(p.ok, true);
  const box = u.artikel.find((a) => a.name === "Cola Bag-in-Box (Postmix)"); assert.deepEqual([box.einheit, box.packung.einheit, box.preis, box.getraenk.gebinde], ["l", "l", null, "box"]);
  assert.equal(zeile(u, p.gericht.id).waren, null, "ohne Einkaufspreis kein Wareneinsatz (grau), keine Schätzung erfunden");
});

test("Bestand, Soll-Verbrauch und Bestellvorschlag rechnen offene Getränke in Litern (mit Schankverlust)", () => {
  const s = laden(); const g = G.getraenkAnlegen(s, { vorlage: "Cola offen 0,4 l", preis: 2.9, schankverlust: 0.05 }).gericht;
  const i = inv.inventurStarten(s, { datum: "2026-10-10", jetzt: "2026-10-10T21:00:00.000Z" }); inv.mengeSetzen(i, "Cola 1,5 l PET", 3); inv.mengeSetzen(i, "Fritz-Kola 0,33 l", 1);
  inv.inventurAbschliessen(s, i, { datum: "2026-10-10", jetzt: "2026-10-10T21:30:00.000Z" });
  for (const d of ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16"]) vk.handVerkaufSetzen(s, d, g.id, 10);
  const bed = vk.bedarfGericht(s.gerichte.find((x) => x.id === g.id), Object.fromEntries(s.artikel.map((a) => [a.name, a]))).bedarf;
  assert.deepEqual(bed.map((x) => x.name + ":" + x.basis), ["Cola 1,5 l PET:ml"]); nah(bed[0].menge, 400 / 0.95);
  const soll = vk.sollVerbrauch(s, { [g.id]: 50 }).artikel["Cola 1,5 l PET"]; nah(soll.menge, 50 * 400 / 0.95); nah(soll.wert, 50 * 0.4 / 0.95 * 0.8);
  const bs = b.bestandStand(s, { heuteTag: H }); const w = bs.waren.find((x) => x.name === "Cola 1,5 l PET");
  assert.equal(w.basis, "ml"); nah(w.bestand, 27000 - 50 * 400 / 0.95); assert.equal(w.inhalt, 9000); nah(w.schnitt, 10 * 400 / 0.95 * 5 / bs.datenTage, 1e-6);
  const v = b.bestellVorschlag(s, { heuteTag: H, bs }).zeilen.find((z) => z.name === "Cola 1,5 l PET");
  assert.ok(v && v.gebinde >= 1 && v.menge === v.gebinde * 9000, "in ganzen Kisten (9 l)"); assert.equal(b.mengeDeutsch(v), `${v.gebinde} ${v.gebinde === 1 ? "Kiste" : "Kisten"}`);
  // Lieferant am Getränk gilt, solange kein Beleg einen nennt
  G.getraenkSetzen(s, g.id, { lieferant: "Getränke Meyer" });
  assert.equal(b.bestellVorschlag(s, { heuteTag: H }).zeilen.find((z) => z.name === "Cola 1,5 l PET").lieferant, "Getränke Meyer");
});

test("Pfand ist nur Information: Wareneinsatz bleibt gleich, der Beleg führt Pfand getrennt", () => {
  const s = laden(); const vorher = zeile(s, "f1").waren;
  assert.deepEqual(G.getraenkSetzen(s, "f1", { gebinde: "glas", marke: "Fritz-Kola", pfand: 0.08, einkauf: "glas" }), { ok: true });
  assert.equal(zeile(s, "f1").waren, vorher); assert.deepEqual(s.artikel[0].getraenk, { menge: 0.33, gebinde: "glas", marke: "Fritz-Kola", pfand: 0.08, lieferant: "" });
  assert.equal(G.getraenkSetzen(s, "f1", { pfand: -2 }).grund, "pfand");
  assert.match(fs.readFileSync(path.join(HIER, "..", "js", "beleg.js"), "utf8"), /Regel 7: Pfand und Leergut sind keine Ware/);
  const l = G.getraenkeListe(s)[0]; assert.deepEqual([l.marke, l.pfand, l.gebinde, l.einkauf], ["Fritz-Kola", 0.08, "glas", "glas"]);
});

test("Katalog markenneutral, eigene Marken frei; Richtpreise unangetastet und nur bei eindeutigem Namen", () => {
  const neu = ["Cola 0,33 l Dose", "Cola 0,33 l Glas", "Cola 0,5 l PET", "Cola 1,0 l Glas", "Cola 1,5 l PET", "Cola Bag-in-Box (Postmix)", "Ayran 1,0 l"];
  const alle = new Set(Object.values(KATALOG).flatMap((x) => x.produkte.map((p) => p.n))); for (const n of neu) assert.ok(alle.has(n), n);
  assert.equal(PRODUKT_INDEX["Cola 1,5 l PET"].e, "l"); assert.equal(PRODUKT_INDEX["Cola 0,33 l Dose"].e, "stk");
  for (const v of GETRAENK_VORLAGEN) { assert.ok(!/coca|fritz|pepsi|afri|fanta|sprite/i.test(v.name), "markenneutral: " + v.name); if (v.quelle) assert.equal(PRODUKT_INDEX[v.quelle].e, "l", v.quelle); }
  assert.ok(GETRAENK_VORLAGEN.some((v) => v.gebinde === "offen") && GETRAENK_VORLAGEN.some((v) => v.gebinde === "dose") && GETRAENK_VORLAGEN.some((v) => v.gebinde === "glas"));
  const s = laden(); const r = G.getraenkAnlegen(s, { name: "Hausbrause 0,5 l", preis: 3.5, menge: 0.5, gebinde: "glas", marke: "Hausmarke", pfand: 0.15, lieferant: "Brauerei Nord" });
  assert.equal(r.ok, true); assert.deepEqual(s.artikel.find((a) => a.name === "Hausbrause 0,5 l").getraenk, { menge: 0.5, gebinde: null, marke: "Hausmarke", pfand: 0.15, lieferant: "Brauerei Nord" });
  assert.equal(r.gericht.steuer, 0.19); assert.equal(G.getraenkAnlegen(s, { name: "hausbrause 0,5 l" }).grund, "doppelt"); assert.equal(G.getraenkAnlegen(s, { name: " " }).grund, "name");
  // Richtpreise: Daten unverändert, neue Namen bekommen keinen Richtpreis (nicht eindeutig zuzuordnen)
  const diff = execFileSync("git", ["diff", "--stat", "HEAD", "--", "js/data/richtpreise.js", "js/richtpreise.js"], { cwd: path.join(HIER, ".."), encoding: "utf8" });
  assert.equal(diff.trim(), "", "Richtpreise unangetastet");
  for (const n of neu) assert.equal(RICHTPREIS_INDEX[n], undefined, n);
  const t = laden(); G.getraenkAnlegen(t, { vorlage: "Cola 0,33 l Dose" }); const rp = richtpreiseEinsetzen(t, { datum: H }); assert.ok(rp.ohneRichtpreis.includes("Cola 0,33 l Dose"));
});

test("Beispiel-Laden: Markengetränk in der Glasflasche (Fritz-Kola, Pfand), offenes Getränk aus der 1,5-l-Flasche; alles mit Größe", () => {
  const s = beispielLaden("2026-10-18"); const l = Object.fromEntries(G.getraenkeListe(s).map((x) => [x.name, x]));
  assert.deepEqual([l["Cola 0,33 l"].gebinde, l["Cola 0,33 l"].marke, l["Cola 0,33 l"].pfand, l["Cola 0,33 l"].mengeText], ["glas", "Fritz-Kola", 0.08, "0,33 l"]);
  assert.deepEqual([l["Eistee 0,33 l"].offen, l["Eistee 0,33 l"].quelle, l["Eistee 0,33 l"].flasche, l["Eistee 0,33 l"].gebinde], [true, "Eistee", 1.5, "becher"]);
  assert.ok(l["Eistee 0,33 l"].jeLiter > 0 && l["Eistee 0,33 l"].waren > 0);
  assert.equal(G.getraenkHinweise(G.getraenkeListe(s)).length, 0); assert.equal(T.tafelBeschreibung(s, { heuteTag: "2026-10-18" }).hinweise.length, 0);
});

test("Bildschirm „Getränke“: Liste, Hinweis, ändern, neu aus dem Katalog; Büro-Kachel; nur vorhandene Klassen; Personal gesperrt; Anzeigen schreibt nicht", async () => {
  const sc = await import("../js/screens/getraenke.js"); const { bueroView } = await import("../js/screens/buero.js"); const { personalGesperrt, ansichtErlaubt } = await import("../js/modus.js");
  sc.getraenkeZuruecksetzen();
  const s = beispielLaden("2026-10-18"); const w = st.leereWurzel(); w.betriebe = [s]; w.aktiv = s.id;
  assert.ok(bueroView(s, w).includes('data-a="nav" data-wert="getraenke"'));
  const vor = JSON.stringify(s); const html = sc.getraenkeView(s); assert.equal(JSON.stringify(s), vor);
  for (const x of ["Getränke", "Deine Getränke", "Glasflasche", "Fritz-Kola", "Pfand 0,08", "offen 0,33 l aus Eistee", "Ware je Glas", 'data-a="gt-auf"', 'data-a="gt-neu"', "Was heißt das?"]) assert.ok(html.replace(/ /g, " ").includes(x), x);
  assert.ok(!/undefined|NaN|getraenke\.[a-z]/.test(html), html.match(/undefined|NaN|getraenke\.[a-z.]+/)?.[0]);
  // ändern: Ayran im Becher → Marke eintragen
  const ay = s.gerichte.find((g) => g.name === "Ayran 0,25 l");
  assert.equal(sc.getraenkeAktion("gt-auf", { dataset: { wert: ay.id } }, s), true); const f = sc.getraenkeView(s);
  for (const x of [`data-gt-form="${ay.id}"`, 'data-a="gt-gebinde"', 'data-a="gt-groesse"', 'data-f="gt-menge"', 'data-f="gt-marke"', 'data-f="gt-pfand"', 'data-f="gt-lieferant"', 'data-a="gt-speichern"', "Pfand nur zur Info"]) assert.ok(f.includes(x), x);
  assert.equal(sc.getraenkeEingabe("gt-marke", "Sütaş"), "entwurf"); assert.equal(sc.getraenkeEingabe("gt-pfand", "0,25"), "entwurf");
  assert.equal(sc.getraenkeAktion("gt-speichern", { dataset: {} }, s).speichern, true);
  assert.deepEqual([s.artikel.find((a) => a.name === "Ayran 0,25 l").getraenk.marke, s.artikel.find((a) => a.name === "Ayran 0,25 l").getraenk.pfand], ["Sütaş", 0.25]);
  // falsche Zahl: Meldung, nichts gespeichert
  sc.getraenkeAktion("gt-auf", { dataset: { wert: ay.id } }, s); sc.getraenkeEingabe("gt-menge", "abc");
  assert.equal(sc.getraenkeAktion("gt-speichern", { dataset: {} }, s).meldung, "Größe prüfen, z. B. 0,33."); sc.getraenkeAktion("gt-zu", { dataset: {} }, s);
  // neu aus dem Katalog: offen aus der Bag-in-Box
  sc.getraenkeAktion("gt-neu", { dataset: {} }, s); sc.getraenkeAktion("gt-vorlage", { dataset: { wert: "Cola offen 0,3 l" } }, s);
  const n = sc.getraenkeView(s); assert.ok(n.includes('data-f="gt-quelle"') && n.includes('data-f="gt-schank"') && n.includes("Aus dem Katalog"));
  sc.getraenkeEingabe("gt-preis", "2,40"); const r = sc.getraenkeAktion("gt-anlegen", { dataset: {} }, s); assert.equal(r.speichern, true, r.meldung);
  const neu = s.gerichte.find((g) => g.name === "Cola offen 0,3 l"); assert.deepEqual([neu.preis, neu.getraenk.quelle, neu.getraenk.gebinde], [2.4, "Cola Bag-in-Box (Postmix)", "becher"]);
  // nur vorhandene CSS-Klassen
  const css = ["app", "buero", "zielbild", "optik", "laden", "heute"].map((x) => fs.readFileSync(path.join(HIER, "..", "css", x + ".css"), "utf8")).join("\n");
  for (const h of [html, f, n]) for (const k of new Set([...h.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean))) assert.ok(new RegExp("\\." + k.replace(/[-]/g, "\\-") + "(?![\\w-])").test(css), "Klasse ohne CSS: " + k);
  for (const x of ["gt-auf", "gt-neu", "gt-speichern", "gt-anlegen", "gt-gebinde"]) assert.equal(personalGesperrt(x, null, H), true, x);
  assert.equal(ansichtErlaubt({ modus: "personal" }, "getraenke"), false); assert.equal(ansichtErlaubt({ modus: "laden" }, "getraenke"), false, "Büro");
  sc.getraenkeZuruecksetzen();
});
