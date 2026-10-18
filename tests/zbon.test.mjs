// Z-Bon per Foto (18.10.2026): Parser (Formate, Lesefehler, Summen- und Storno-Zeilen, Plausibilität), Bearbeiten der Vorschau,
// Übernehmen als Herkunft "zbon" (gleicher Tag ersetzt, nie doppelt), Zuordnung mit Lernen (E7), Rangfolge Kasse vor Z-Bon vor Hand,
// Foto in der Ablage, Steuer-Ordner bleibt Notiz, Personal-Modus gesperrt, Bildschirm zeichnet ohne zu schreiben.
// Die Test-Bons unter tests/daten/zbon/ sind erfunden (so benannt und im Kopf gekennzeichnet).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const st = await import("../js/store.js");
const vk = await import("../js/verkauf.js");
const zb = await import("../js/zbon.js");
const { personalGesperrt } = await import("../js/modus.js");
const { ZWECKE } = await import("../js/ablage.js");
const i18n = await import("../js/i18n.js");
i18n.setzeSprache("de");

const HIER = path.dirname(fileURLToPath(import.meta.url));
const lies = (n) => fs.readFileSync(path.join(HIER, "daten", "zbon", n), "utf8");
const H = "2026-10-18";
const Z = (s) => zb.zbonZeileLesen(s);

function laden() {
  const b = st.leererBetrieb(); b.phase = "app"; b.betrieb.name = "Test";
  b.gerichte = [
    { id: "g1", name: "Döner Kebab", plu: "101", preis: 8, zutaten: [] }, { id: "g2", name: "Dürüm Döner", plu: "102", preis: 9, zutaten: [] },
    { id: "g3", name: "Dönerteller", preis: 14.5, zutaten: [] }, { id: "g4", name: "Lahmacun", preis: 5.5, zutaten: [] },
    { id: "g5", name: "Pommes frites (Beilage)", preis: 3.5, zutaten: [] }, { id: "g6", name: "Cola 0,33 l", plu: "111", preis: 2.5, zutaten: [] },
    { id: "g7", name: "Ayran 0,25 l", plu: "112", preis: 2, zutaten: [] },
  ];
  return st.migrierenBetrieb(b);
}
const aktiv = (s, herkunft, datum) => s.verkaeufe.filter((v) => !v.storniert && v.herkunft === herkunft && (!datum || v.datum === datum));

// ---------- einzelne Zeilen ----------
test("Zeile: Spalten – Text, Menge, Betrag", () => {
  const r = Z("Döner Kebab   43   344,00");
  assert.equal(r.art, "artikel"); assert.equal(r.text, "Döner Kebab"); assert.equal(r.menge, 43); assert.equal(r.betrag, 344); assert.deepEqual(r.gruende, []);
});
test("Zeile: Menge vorn mit „x“, Name mit Zahl („Cola 0,33“)", () => {
  const r = Z("12 x Cola 0,33   30,00"); assert.equal(r.text, "Cola 0,33"); assert.equal(r.menge, 12); assert.equal(r.betrag, 30);
  const r2 = Z("12x Cola 0,33 l 30,00"); assert.equal(r2.text, "Cola 0,33 l"); assert.equal(r2.menge, 12);
  const r3 = Z("Cola 0,33 30 75,00"); assert.equal(r3.text, "Cola 0,33"); assert.equal(r3.menge, 30); assert.equal(r3.betrag, 75);
});
test("Zeile: PLU vorn, Nummer ohne Wort, „Stk“, Euro-Zeichen, Steuerkennzeichen", () => {
  const a = Z("PLU 101 Döner 43 344,00"); assert.equal(a.plu, "101"); assert.equal(a.text, "Döner"); assert.equal(a.menge, 43);
  const b = Z("101 Döner Kebab 43 344,00"); assert.equal(b.plu, "101"); assert.equal(b.text, "Döner Kebab");
  const c = Z("Ayran 20 Stk 40,00 €"); assert.equal(c.text, "Ayran"); assert.equal(c.menge, 20); assert.equal(c.betrag, 40);
  const d = Z("15 Stk Lahmacun 82,50"); assert.equal(d.menge, 15); assert.equal(d.text, "Lahmacun");
  const e = Z("Döner Kebab 43 344,00 A"); assert.equal(e.betrag, 344); assert.equal(e.menge, 43);
  const f = Z("Döner Kebab 43 344,00 EUR"); assert.equal(f.betrag, 344);
});
test("Zeile: Punkt statt Komma, Tausenderpunkt, Leerzeichen im Betrag, Einzelpreis", () => {
  assert.equal(Z("Döner Kebab 43 344.00").betrag, 344);
  const t = Z("Döner Kebab 160 1.280,00"); assert.equal(t.betrag, 1280); assert.equal(t.menge, 160);
  assert.equal(Z("Döner Kebab 43 344 ,00").betrag, 344);
  const e = Z("Döner Kebab 43 x 8,00 344,00"); assert.equal(e.menge, 43); assert.equal(e.einzel, 8); assert.equal(e.text, "Döner Kebab");
  const v = Z("12 x Cola 2,50 30,00"); assert.equal(v.einzel, 2.5); assert.equal(v.text, "Cola");
  const g = Z("Döner Fleisch 2,500 45,00"); assert.equal(g.menge, 2.5);
});
test("Zeile: Lesefehler O/0, l/1, S/5 in Zahlen werden korrigiert und markiert – Namen bleiben", () => {
  const r = Z("Döner Kebab 4S 3l4,0O"); assert.equal(r.menge, 45); assert.equal(r.betrag, 314); assert.ok(r.gruende.includes("ocr"));
  const n = Z("lmbiss Salat 3 15,00"); assert.equal(n.text, "lmbiss Salat"); // ohne Ziffer im Wort: nichts ersetzt
  const o = Z("Cola 0,33 l 1O 25,OO"); assert.equal(o.menge, 10); assert.equal(o.betrag, 25); assert.equal(o.text, "Cola 0,33 l");
  const l = Z("Cola 0,33 1 30 75,00"); assert.equal(l.text, "Cola 0,33 l"); assert.equal(l.menge, 30); assert.ok(l.gruende.includes("name")); // Liter als 1 gelesen (echter Durchlauf)
});
test("Zeile: Summen-, Zahlungs- und Steuerzeilen sind keine Artikel; Pfand auch nicht", () => {
  for (const s of ["Summe 895,50", "Summe PLU 895,50", "Gesamt 1.223,00", "Gesamtumsatz brutto 1.223,00", "Bar 612,50", "EC-Karte 283,00", "Karte 223,00",
    "MwSt 19% 54,92", "MwSt 7% B 6,72", "Netto 772,68", "Zw.Summe 100,00", "Rabatt 0,00", "Trinkgeld 5,00", "Anzahl Bons 112", "Stornos gesamt 3 18,50", "Kassenbestand 250,00"])
    assert.notEqual(Z(s)?.art, "artikel", s);
  assert.equal(Z("Pfand 10 2,50").art, "pfand");
  assert.equal(Z("Storno 2 14,00").art, "stornoSumme");
  assert.equal(Z("Tel. 01234 567890")?.art === "artikel", false);
});
test("Zeile: Storno zieht ab (vorn „Storno“, Minus vorn oder hinten)", () => {
  const a = Z("Storno Döner Kebab 2 16,00"); assert.equal(a.storno, true); assert.equal(a.menge, -2); assert.equal(a.betrag, -16); assert.equal(a.text, "Döner Kebab");
  const b = Z("Döner Kebab -1 -8,00"); assert.equal(b.storno, true); assert.equal(b.menge, -1); assert.equal(b.betrag, -8);
  const c = Z("Storno Cola 0,33 l 1 2,50-"); assert.equal(c.betrag, -2.5); assert.equal(c.menge, -1);
});
test("Zeile: ungewöhnlicher Einzelpreis und dreistellige Zahl vorn sind unsicher", () => {
  assert.ok(Z("Döner Kebab 2 344,00").gruende.includes("preis"));
  assert.ok(Z("101 Döner Kebab 344,00").gruende.includes("mengeVorn"));
  assert.deepEqual(Z("43 Döner Kebab 344,00").gruende, []);
});

// ---------- ganze Bons (erfunden) ----------
test("Bon 1 (Spalten): 7 Artikel, Datum, Z-Nummer, Summe passt, Finanzbericht nicht gezählt", () => {
  const l = zb.zbonLesen(lies("zbon-erfunden-1-spalten.txt"), { heuteTag: H });
  assert.equal(l.datum, "2026-10-16"); assert.equal(l.vortag, false); assert.equal(l.zNr, "0815");
  assert.equal(l.zeilen.length, 7); assert.equal(l.bonSumme, 895.5); assert.equal(l.summePositionen, 895.5); assert.equal(l.pruefung, "passt");
  assert.ok(l.zeilen.every((z) => !z.unsicher));
  assert.ok(!l.zeilen.some((z) => /bar|karte|gesamt|mwst|musterstadt/i.test(z.text)));
  assert.deepEqual(l.zeilen.map((z) => z.menge), [43, 21, 9, 12, 18, 30, 14]);
});
test("Bon 2 (Lesefehler, Menge vorn, umbrochene Zeile, Druck nach Mitternacht): Vortag, Z-Nr korrigiert, Summe passt", () => {
  const l = zb.zbonLesen(lies("zbon-erfunden-2-ocr.txt"), { heuteTag: H });
  assert.equal(l.datum, "2026-10-16"); assert.equal(l.vortag, true); assert.equal(l.zNr, "102");
  assert.equal(l.zeilen.length, 7); assert.equal(l.pruefung, "passt"); assert.equal(l.summePositionen, 675);
  const d = l.zeilen.find((z) => z.text === "Dürüm Döner"); assert.equal(d.menge, 19); assert.equal(d.betrag, 171); assert.ok(d.gruende.includes("geteilt"));
  const doener = l.zeilen.find((z) => z.text === "Döner Kebab"); assert.equal(doener.menge, 40); assert.equal(doener.betrag, 320); assert.equal(doener.unsicher, true);
  assert.equal(l.zeilen.find((z) => z.text === "Eistee 0,33 l").betrag, 15);
});
test("Bon 3 (PLU, Storno, Warengruppen, Pfand): Storno zieht ab, Warengruppen nicht doppelt, passt mit Pfand", () => {
  const l = zb.zbonLesen(lies("zbon-erfunden-3-storno.txt"), { heuteTag: H });
  assert.equal(l.datum, "2026-10-15"); assert.equal(l.zNr, "2207");
  assert.ok(!l.zeilen.some((z) => /speisen|getränke|pfand/i.test(z.text)));
  assert.equal(l.zeilen.filter((z) => z.storno).length, 2);
  assert.equal(l.bonSumme, 1223); assert.equal(l.pfand, 2.5); assert.equal(l.summePositionen, 1220.5); assert.equal(l.pruefung, "passtMitPfand");
  const e = zb.zbonErgebnis(l);
  const d = e.positionen.find((p) => p.plu === "101"); assert.equal(d.menge, 93); assert.equal(d.umsatzBrutto, 744);
  const c = e.positionen.find((p) => p.plu === "111"); assert.equal(c.menge, 27); assert.equal(c.umsatzBrutto, 67.5);
  assert.equal(e.positionen.length, 6); assert.deepEqual(e.tage, ["2026-10-15"]); assert.equal(e.bericht.stornoZeilen, 2);
});
test("Plausibilität: fehlende Zeile zeigt die Abweichung, nichts wird ausgeglichen; ohne Summe → selbst vergleichen", () => {
  const l = zb.zbonLesen(lies("zbon-erfunden-1-spalten.txt"), { heuteTag: H });
  const ohne = zb.zbonAendern(l, l.zeilen[0].id, "weg");
  assert.equal(ohne.zeilen.length, 6); assert.equal(ohne.pruefung, "abweichung"); assert.equal(ohne.abweichung, -344);
  assert.equal(l.zeilen.length, 7, "Original bleibt unverändert");
  const korr = zb.zbonAendern(ohne, ohne.zeilen[0].id, "betrag", "533,00"); assert.equal(korr.abweichung, 0); assert.equal(korr.pruefung, "passt");
  const l2 = zb.zbonLesen("Döner Kebab 10 80,00\nCola 0,33 l 4 10,00", { heuteTag: H });
  assert.equal(l2.bonSumme, null); assert.equal(l2.pruefung, "ohneSumme"); assert.equal(l2.datum, null);
  const l3 = zb.zbonAendern(l2, null, "bonSumme", "90,00"); assert.equal(l3.pruefung, "passt");
});
test("Bearbeiten: Text, Menge, Datum ändern; Zeile dazu; Markierung verschwindet nach dem Ändern", () => {
  let l = zb.zbonLesen("Datum 16.10.2026\nDöner Kebab 4S 360,00\nSumme 360,00", { heuteTag: H });
  assert.equal(l.zeilen[0].unsicher, true);
  l = zb.zbonAendern(l, l.zeilen[0].id, "menge", "45"); assert.equal(l.zeilen[0].menge, 45); assert.equal(l.zeilen[0].unsicher, false);
  l = zb.zbonAendern(l, l.zeilen[0].id, "text", "Döner"); assert.equal(l.zeilen[0].text, "Döner");
  l = zb.zbonAendern(l, null, "datum", "2026-10-15"); assert.equal(l.datum, "2026-10-15");
  l = zb.zbonAendern(l, null, "neu"); assert.equal(l.zeilen.length, 2); assert.equal(l.zeilen[1].unsicher, true);
  assert.equal(zb.zbonErgebnis(l).positionen.length, 1, "leere neue Zeile zählt nicht");
});
test("Nur Mengen ohne Beträge: Zeilen unsicher; mit Beträgen fallen Zeilen ohne Betrag weg (Adresse)", () => {
  const nur = zb.zbonLesen("Artikelbericht\nDöner Kebab 43\nCola 30", { heuteTag: H });
  assert.equal(nur.zeilen.length, 2); assert.ok(nur.zeilen.every((z) => z.unsicher && z.gruende.includes("ohneBetrag")));
  const mit = zb.zbonLesen("Hauptstr. 12\nDöner Kebab 43 344,00", { heuteTag: H });
  assert.deepEqual(mit.zeilen.map((z) => z.text), ["Döner Kebab"]);
});
test("Datum: nie in der Zukunft; Uhrzeit vor 4 Uhr = Vortag; ISO-Datum", () => {
  assert.equal(zb.zbonKopf("Datum 25.10.2026", { heuteTag: H }).datum, null);
  assert.equal(zb.zbonKopf("Z-Bon 18.10.2026 02:10", { heuteTag: H }).datum, "2026-10-17");
  assert.equal(zb.zbonKopf("2026-10-12 22:00", { heuteTag: H }).datum, "2026-10-12");
  assert.equal(zb.zbonKopf("Z-Nr. 77\n17.10.26", { heuteTag: H }).zNr, "77");
});

// ---------- Übernehmen, Ersetzen, Zuordnung, Rangfolge ----------
test("Übernehmen: Herkunft zbon, Foto und Z-Nummer am Eintrag, Upload übernommen; gleicher Tag ersetzt statt doppelt", () => {
  const s = laden(); s.uploads.push({ id: "u-z1", zweck: "zbon", status: "gelesen", datei: { id: "d-1", ort: "lokal", zweck: "zbon" } });
  const l = zb.zbonLesen(lies("zbon-erfunden-1-spalten.txt"), { heuteTag: H });
  const r = zb.zbonUebernehmen(s, l, { upload: { id: "u-z1" }, jetzt: "2026-10-18T10:00:00.000Z" });
  assert.equal(r.neu, 7); assert.equal(aktiv(s, "zbon", "2026-10-16").length, 7);
  assert.ok(aktiv(s, "zbon").every((v) => v.upload === "u-z1" && v.zNr === "0815" && v.kasse === "Z-0815"));
  assert.equal(s.uploads[0].status, "uebernommen"); assert.equal(s.uploads[0].ergebnis.zbon, "2026-10-16");
  // dasselbe Foto noch einmal: nichts Neues
  const r2 = zb.zbonUebernehmen(s, l, { jetzt: "2026-10-18T10:05:00.000Z" }); assert.equal(r2.neu, 0); assert.equal(r2.gleich, 1); assert.equal(aktiv(s, "zbon").length, 7);
  // korrigierter Z-Bon für denselben Tag: ersetzt den alten Stand
  const k = zb.zbonAendern(l, l.zeilen[0].id, "menge", "44");
  const r3 = zb.zbonUebernehmen(s, k, { jetzt: "2026-10-18T10:10:00.000Z" }); assert.equal(r3.ersetzt, 7); assert.equal(r3.neu, 7);
  assert.equal(aktiv(s, "zbon").length, 7); assert.equal(aktiv(s, "zbon").find((v) => v.text === "Döner Kebab").menge, 44);
  // anderer Tag: kommt dazu
  zb.zbonUebernehmen(s, zb.zbonAendern(l, null, "datum", "2026-10-15"), { jetzt: "2026-10-18T10:20:00.000Z" });
  assert.equal(aktiv(s, "zbon").length, 14);
  // ohne Datum: nichts
  const o = zb.zbonUebernehmen(s, { ...l, datum: null }); assert.equal(o.neu, 0); assert.deepEqual(o.fehler, ["datum"]);
});
test("Übernehmen überlebt Speichern/Laden (Migration behält Foto und Z-Nummer) und Zusammenführen zählt einmal", () => {
  const s = laden(); const l = zb.zbonLesen(lies("zbon-erfunden-1-spalten.txt"), { heuteTag: H });
  zb.zbonUebernehmen(s, l, { upload: "u-x", jetzt: "2026-10-18T10:00:00.000Z" });
  const m = st.migrierenBetrieb(structuredClone(s));
  assert.equal(m.verkaeufe.filter((v) => v.herkunft === "zbon" && !v.storniert).length, 7); assert.ok(m.verkaeufe.every((v) => v.upload === "u-x" && v.zNr === "0815"));
  const b = structuredClone(s); zb.zbonUebernehmen(b, zb.zbonAendern(l, l.zeilen[0].id, "menge", "50"), { jetzt: "2026-10-18T11:00:00.000Z" });
  const e = st.verkaeufeEntdoppeln([...s.verkaeufe, ...b.verkaeufe.filter((v) => !s.verkaeufe.some((x) => x.id === v.id))]);
  const z = e.filter((v) => !v.storniert && v.herkunft === "zbon"); assert.equal(z.length, 7); assert.equal(z.find((v) => v.text === "Döner Kebab").menge, 50);
});
test("Zuordnung: Nummer, Name, gelernt (E7) – unbekannter Text bekommt Chips, Lernen gilt für den nächsten Z-Bon", () => {
  const s = laden(); const l = zb.zbonLesen(lies("zbon-erfunden-1-spalten.txt"), { heuteTag: H });
  const v = zb.zbonVorschau(s, l);
  assert.equal(v.zugeordnet, 6); assert.equal(v.offen.length, 1); assert.equal(v.offen[0].text, "Pommes frites"); assert.ok(v.offen[0].vorschlaege.includes("g5"));
  vk.zuordnungLernen(s, { text: "Pommes frites" }, "g5");
  assert.equal(zb.zbonVorschau(s, l).offenAnzahl, 0);
  zb.zbonUebernehmen(s, l, { jetzt: "2026-10-18T10:00:00.000Z" });
  assert.equal(aktiv(s, "zbon").find((x) => x.text === "Pommes frites").gericht, "g5");
  // Bon 3: PLU 101/102/111/112 über die Nummer, Hähnchendöner und Mineralwasser offen
  const v3 = zb.zbonVorschau(s, zb.zbonLesen(lies("zbon-erfunden-3-storno.txt"), { heuteTag: H }));
  assert.deepEqual(v3.offen.map((o) => o.text).sort(), ["Hähnchendöner", "Mineralwasser"]);
  assert.equal(v3.positionen.find((p) => p.plu === "101").weg, "plu");
});
test("Rangfolge: Kasse vor Z-Bon vor Hand – je Tag zählt nur die beste Herkunft", () => {
  const s = laden(); const d = "2026-10-16";
  vk.handVerkaufSetzen(s, d, "g1", 99, { jetzt: "2026-10-17T09:00:00.000Z" });
  let z = vk.verkaeufeImZeitraum(s, { von: d, bis: d }); assert.equal(z.eintraege.length, 1); assert.equal(z.eintraege[0].herkunft, "hand");
  zb.zbonUebernehmen(s, zb.zbonLesen(lies("zbon-erfunden-1-spalten.txt"), { heuteTag: H }), { jetzt: "2026-10-18T10:00:00.000Z" });
  z = vk.verkaeufeImZeitraum(s, { von: d, bis: d }); assert.ok(z.eintraege.every((e) => e.herkunft === "zbon")); assert.equal(z.doppelt, 1);
  assert.equal(vk.verkaufJeGericht(s, { von: d, bis: d }).zeilen.find((r) => r.gericht === "g1").menge, 43);
  vk.importUebernehmen(s, { positionen: [{ datum: d, kasse: "K1", plu: "101", text: "Döner Kebab", menge: 40, umsatzBrutto: 320 }], tage: [d], fingerabdruck: "imp-x" }, { herkunft: "dsfinvk", jetzt: "2026-10-18T11:00:00.000Z" });
  z = vk.verkaeufeImZeitraum(s, { von: d, bis: d }); assert.ok(z.eintraege.every((e) => e.herkunft === "dsfinvk"));
  assert.equal(vk.verkaufJeGericht(s, { von: d, bis: d }).zeilen.find((r) => r.gericht === "g1").menge, 40);
  assert.equal(zb.zbonVorschau(s, zb.zbonLesen(lies("zbon-erfunden-1-spalten.txt"), { heuteTag: H })).kasseDa, true);
  assert.equal(aktiv(s, "hand").length, 1, "Hand-Eintrag bleibt gespeichert, zählt nur nicht");
});
test("Steuer-Ordner: Z-Bon-Foto ändert keine Tagesnotiz – Umsatz bleibt „Notiz – kein Z-Bon“", async () => {
  const s = laden(); s.tagesnotizen.push({ id: "n1", datum: "2026-10-16", umsatz: 900, erfasst: "2026-10-16T23:00:00.000Z", storniert: false });
  const vorher = JSON.stringify(s.tagesnotizen);
  zb.zbonUebernehmen(s, zb.zbonLesen(lies("zbon-erfunden-1-spalten.txt"), { heuteTag: H }), { jetzt: "2026-10-18T10:00:00.000Z" });
  assert.equal(JSON.stringify(s.tagesnotizen), vorher);
  const de = (await import("../js/lang/de.js")).default; assert.match(de.verkaeufe.zbon.keineBuchhaltung, /Notiz/);
  assert.ok(ZWECKE.includes("zbon"), "Foto wird mit Zweck zbon abgelegt");
});
test("Zwei Z-Bons am selben Tag: andere Z-Nummer addiert, gleiche ersetzt; ohne Nummer fragen (Standard ersetzen)", () => {
  const s = laden(); const d = "2026-10-16";
  const a = zb.zbonLesen("Z-Nr. 100\nDatum 16.10.2026\nDöner Kebab 10 80,00\nSumme 80,00", { heuteTag: H });
  const b = zb.zbonLesen("Z-Nr. 101\nDatum 16.10.2026\nDöner Kebab 5 40,00\nSumme 40,00", { heuteTag: H });
  zb.zbonUebernehmen(s, a, { jetzt: "2026-10-18T10:00:00.000Z" });
  const vb = zb.zbonVorschau(s, b); assert.equal(vb.frage, false); assert.equal(vb.addiert, true); assert.equal(vb.ersetzt, 0);
  zb.zbonUebernehmen(s, b, { jetzt: "2026-10-18T10:01:00.000Z" });
  const menge = () => vk.verkaufJeGericht(s, { von: d, bis: d }).zeilen.find((r) => r.gericht === "g1").menge;
  assert.equal(menge(), 15, "zwei Kassen addieren");
  zb.zbonUebernehmen(s, zb.zbonAendern(b, b.zeilen[0].id, "menge", "6"), { jetzt: "2026-10-18T10:02:00.000Z" });
  assert.equal(menge(), 16, "gleiche Nummer ersetzt nur ihren Stand");
  // ohne Nummer: Frage, Standard ersetzen (alle Z-Bons des Tages)
  const c = zb.zbonLesen("Datum 16.10.2026\nDöner Kebab 3 24,00\nSumme 24,00", { heuteTag: H });
  const vc = zb.zbonVorschau(s, c); assert.equal(vc.frage, true); assert.equal(vc.zweite, false); assert.ok(vc.ersetzt > 0);
  const s2 = structuredClone(s);
  zb.zbonUebernehmen(s2, c, { jetzt: "2026-10-18T10:03:00.000Z" }); assert.equal(vk.verkaufJeGericht(s2, { von: d, bis: d }).zeilen.find((r) => r.gericht === "g1").menge, 3, "Nein = ersetzen");
  // Ja = addieren
  const cj = zb.zbonAendern(c, null, "zweite", true); assert.equal(zb.zbonVorschau(s, cj).addiert, true);
  zb.zbonUebernehmen(s, cj, { jetzt: "2026-10-18T10:04:00.000Z" }); assert.equal(menge(), 19, "Ja = addieren");
  // ohne vorherigen Z-Bon am Tag: keine Frage
  assert.equal(zb.zbonVorschau(laden(), c).frage, false);
});
test("Zusammenführen zweier Geräte mit zwei Z-Bons am Tag: jeder Schlüssel zählt einmal", () => {
  const s = laden(); const d = "2026-10-16";
  const a = zb.zbonLesen("Z-Nr. 100\nDatum 16.10.2026\nDöner Kebab 10 80,00", { heuteTag: H });
  const b = zb.zbonLesen("Z-Nr. 101\nDatum 16.10.2026\nDöner Kebab 5 40,00", { heuteTag: H });
  const g1 = structuredClone(s), g2 = structuredClone(s);
  zb.zbonUebernehmen(g1, a, { jetzt: "2026-10-18T10:00:00.000Z" }); zb.zbonUebernehmen(g1, b, { jetzt: "2026-10-18T10:01:00.000Z" });
  zb.zbonUebernehmen(g2, a, { jetzt: "2026-10-18T11:00:00.000Z" }); // dasselbe Foto auf dem zweiten Handy (andere Kennungen)
  zb.zbonUebernehmen(g2, b, { jetzt: "2026-10-18T11:01:00.000Z" });
  const e = st.verkaeufeEntdoppeln([...g1.verkaeufe, ...g2.verkaeufe]);
  const z = e.filter((v) => !v.storniert && v.herkunft === "zbon"); assert.equal(z.length, 2);
  assert.equal(z.reduce((t, v) => t + v.menge, 0), 15);
});
test("Personal-Modus: Verkauf- und Z-Bon-Handlungen gesperrt", () => {
  for (const n of ["vk-zb-uebernehmen", "vk-zb-zweite", "vk-zb-weg", "vk-zb-neu", "vk-uebernehmen", "vk-hand-speichern"]) assert.equal(personalGesperrt(n, null, H), true, n);
});
test("Bildschirm: Z-Bon-Vorschau zeichnet Zeilen, Prüfung und Chips, ohne den Laden zu verändern", async () => {
  const sc = await import("../js/screens/verkauf.js");
  const s = laden(); const vorher = JSON.stringify(s);
  sc.verkaufZbonText(lies("zbon-erfunden-1-spalten.txt"), null);
  const html = sc.verkaufView(s);
  assert.equal(JSON.stringify(s), vorher, "Zeichnen schreibt nicht");
  for (const w of ["Z-Bon prüfen", "Döner Kebab", "Summe passt zum Bon", "Pommes frites", 'data-a="vk-zb-uebernehmen"', 'data-f="zb-datum"', 'data-a="vk-zuordnen"', "Notiz"]) assert.ok(html.includes(w), w);
  assert.ok(!/NaN|undefined/.test(html));
  sc.verkaufEingabe("zb:z1:betrag", "352,00");
  assert.ok(sc.verkaufView(s).includes("mehr als die Summe"), "Abweichung nach Änderung sichtbar");
  sc.verkaufEingabe("zb:z1:betrag", "344,00");
  const r = sc.verkaufAktion("vk-zb-uebernehmen", { dataset: {} }, s, null);
  assert.ok(r.speichern); assert.equal(aktiv(s, "zbon").length, 7);
  sc.verkaufZbonText("Datum 16.10.2026\nDöner Kebab 3 24,00\nSumme 24,00", null);
  let h = sc.verkaufView(s); assert.ok(h.includes('data-a="vk-zb-zweite"') && h.includes("zweite Kasse"), "Frage ohne Z-Nummer");
  sc.verkaufAktion("vk-zb-zweite", { dataset: { wert: "1" } }, s, null); h = sc.verkaufView(s); assert.ok(h.includes("dazugezählt"));
  sc.verkaufZbonText("", null); assert.ok(sc.verkaufView(s).includes("nichts zu lesen"));
  sc.verkaufZuruecksetzen();
});

test("Z-Bon Kopf: Datum mit Kommas aus der OCR („17,10,2026“) wird erkannt, Beträge nicht", () => {
  const H = "2026-10-18";
  assert.equal(zb.zbonKopf("Z-Bon Nr. 412  17,10,2026  21:30", { heuteTag: H }).datum, "2026-10-17");
  assert.equal(zb.zbonKopf("Datum: 17,10,2026\nZeit: 00:45", { heuteTag: H }).datum, "2026-10-16", "Uhrzeit in eigener Zeile, vor 4 Uhr = Vortag");
  assert.equal(zb.zbonKopf("Döner 12,50 344,00", { heuteTag: H }).datum, null, "Beträge sind kein Datum");
  assert.equal(zb.zbonKopf("17,10,26", { heuteTag: H }).datum, null, "nur vierstelliges Jahr");
});
