// Prüfgremium 18.10.2026 – Regressionstests für die 12 bestätigten Befunde (H1, H2, M1–M5, N1–N5) und die Feiertage.
// Jeder Test war vor der Korrektur rot (Nachweis: /home/claude/audit/pruef2_fix.md). Alle Bons sind erfunden.
import test from "node:test";
import assert from "node:assert/strict";
globalThis.document ??= { documentElement: {} };
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
const st = await import("../js/store.js");
const vk = await import("../js/verkauf.js");
const zb = await import("../js/zbon.js");
const T = await import("../js/tafel.js");
const AP = await import("../js/aktion_plan.js");
const L = await import("../js/lieferant.js");
const G = await import("../js/getraenk.js");
const F = await import("../js/feiertage.js");
const { tagGewicht } = await import("../js/zaehler.js");
const { beispielLaden } = await import("../js/beispiel.js");
const i18n = await import("../js/i18n.js");
i18n.setzeSprache("de");
const H = "2026-10-18";
const um = (tag, h, m = 0) => new Date(`${tag}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);

function laden() {
  const b = st.leererBetrieb(); b.phase = "app"; b.betrieb.name = "Test";
  b.gerichte = [{ id: "g1", name: "Döner Kebab", preis: 8, zutaten: [] }, { id: "g2", name: "Pommes", preis: 3, zutaten: [] }, { id: "g6", name: "Cola 0,33 l", preis: 2.5, zutaten: [], klasse: "getraenk" }];
  return st.migrierenBetrieb(b);
}
const menge = (s, d, g = "g1") => vk.verkaufJeGericht(s, { von: d, bis: d }).zeilen.find((r) => r.gericht === g)?.menge ?? 0;
const BON = (kopf) => `${kopf}\nDatum 16.10.2026 23:48\nPLU-BERICHT\nDöner Kebab 43 344,00\nCola 0,33 l 30 75,00\nSumme 419,00`;

// ---------- H1 ----------
test("H1: Aktion „bis Ware weg“ ohne Enddatum – Menütafel-Bildschirm, Tafel-Datei, Fortschritt und Bilanz stürzen nicht ab", async () => {
  const TS = await import("../js/screens/tafel.js");
  const s = beispielLaden(H); s.aktionen = [];
  const ids = [s.gerichte.find((g) => g.klasse === "haupt").id, s.gerichte.find((g) => g.klasse === "getraenk").id];
  const a = T.aktionUebernehmen(s, { art: "kombi", gerichte: ids, preis: 10, ende: "ware", bis: "" }, { heuteTag: H, jetzt: "2026-10-18T09:00:00Z" });
  assert.ok(a); assert.equal(a.bis, null); assert.equal(a.ende, "ware");
  const html = TS.tafelView(s); assert.ok(html.includes("data-tafel-aktion"), "Aktion steht in der Liste");
  assert.ok(!/undefined|NaN/.test(html));
  const b = T.tafelBeschreibung(s, { heuteTag: H, jetzt: "2026-10-18T10:00:00Z" });
  const datei = T.tafelHtml(b); assert.ok(datei.includes('data-bis=""')); assert.equal(T.tafelAktionSichtbar({ von: a.von, bis: "" }, Date.parse("2026-12-01T12:00:00")), true);
  assert.ok(AP.aktionZeitraumText(a).length > 0); assert.ok(Array.isArray(AP.fortschrittZeilen(AP.aktionFortschritt(s, a, { heuteTag: H }))));
  assert.equal(AP.aktionBilanz(s, a, { heuteTag: H }).bis, H);
  assert.equal(AP.aktionZeitraumText({ von: H, bis: null }).includes("undefined"), false, "auch ohne ende: kein Absturz");
});

// ---------- H2 ----------
test("H2: Zusammenführen – ein Handy las die Z-Nummer, das andere nicht: derselbe Bon zählt einmal; Laden bereinigt alte Doppel (idempotent)", () => {
  const basis = laden(); st.abgleichGrundlage(basis);
  const A = structuredClone(basis), B = structuredClone(basis);
  const lA = zb.zbonLesen(BON("Z-BON Nr. 0815"), { heuteTag: H }), lB = zb.zbonLesen(BON("Z-BON"), { heuteTag: H });
  assert.equal(lA.zNr, "0815"); assert.equal(lB.zNr, null);
  zb.zbonUebernehmen(A, lA, { jetzt: "2026-10-17T08:00:00.000Z" }); zb.zbonUebernehmen(B, lB, { jetzt: "2026-10-17T09:00:00.000Z" });
  const M = st.verschmelzen(A, B, { jetzt: Date.parse("2026-10-18T10:00:00Z") });
  assert.equal(menge(M, "2026-10-16"), 43); assert.equal(vk.verkaufJeGericht(M, { von: "2026-10-16", bis: "2026-10-16" }).umsatz, 419);
  // gleiches Foto, abweichend gelesen (andere Summe), aber dieselbe Ablage-Datei → derselbe Bon
  const C = structuredClone(basis), D = structuredClone(basis);
  zb.zbonUebernehmen(C, lA, { upload: "u-1", jetzt: "2026-10-17T08:00:00.000Z" });
  zb.zbonUebernehmen(D, zb.zbonAendern(lB, lB.zeilen[0].id, "menge", "42"), { upload: "u-1", jetzt: "2026-10-17T09:00:00.000Z" });
  assert.equal(menge(st.verschmelzen(C, D, { jetzt: Date.parse("2026-10-18T10:00:00Z") }), "2026-10-16"), 42, "der jüngere Stand gilt");
  // anderer Inhalt, anderes Foto: zweite Kasse bleibt möglich
  const E = structuredClone(basis), F2 = structuredClone(basis);
  zb.zbonUebernehmen(E, lA, { jetzt: "2026-10-17T08:00:00.000Z" }); zb.zbonUebernehmen(F2, zb.zbonLesen("Datum 16.10.2026\nDöner Kebab 5 40,00\nSumme 40,00", { heuteTag: H }), { jetzt: "2026-10-17T09:00:00.000Z" });
  assert.equal(menge(st.verschmelzen(E, F2, { jetzt: Date.parse("2026-10-18T10:00:00Z") }), "2026-10-16"), 48);
  // alter Stand mit Doppel → Laden bereinigt, zweites Laden ändert nichts
  const roh = structuredClone(basis); roh.verkaeufe = [...structuredClone(A.verkaeufe), ...structuredClone(B.verkaeufe)];
  const g1 = st.migrierenBetrieb(structuredClone(roh)); assert.equal(menge(g1, "2026-10-16"), 43);
  const g2 = st.migrierenBetrieb(structuredClone(g1)); assert.deepEqual(g2.verkaeufe, g1.verkaeufe);
  // ein Gerät: erst ohne Nummer, dann mit Nummer (gleicher Bon) → ersetzt, nicht addiert
  const S = laden(); zb.zbonUebernehmen(S, lB, { jetzt: "2026-10-17T08:00:00.000Z" });
  const v = zb.zbonVorschau(S, lA); assert.equal(v.addiert, false); assert.ok(v.ersetzt > 0);
  zb.zbonUebernehmen(S, lA, { jetzt: "2026-10-17T09:00:00.000Z" }); assert.equal(menge(S, "2026-10-16"), 43);
});

// ---------- M1 ----------
test("M1: dieselbe Aktion auf zwei Handys angelegt – nach dem Zusammenführen eine Aktion auf der Tafel, die Kopie ohne eigene Bilanz", () => {
  const basis = beispielLaden(H); basis.aktionen = []; st.abgleichGrundlage(basis);
  const A = structuredClone(basis), B = structuredClone(basis);
  const ids = A.gerichte.filter((g) => g.preis > 0).slice(0, 2).map((g) => g.id);
  const pa = T.aktionUebernehmen(A, { art: "kombi", gerichte: ids, preis: 10 }, { heuteTag: H, jetzt: "2026-10-18T09:00:00Z" });
  T.aktionUebernehmen(B, { art: "kombi", gerichte: ids, preis: 10 }, { heuteTag: H, jetzt: "2026-10-18T09:05:00Z" });
  const M = st.verschmelzen(A, B, { jetzt: Date.parse("2026-10-18T10:00:00Z") });
  const akt = T.aktiveAktionen(M, { heuteTag: H }); assert.equal(akt.length, 1); assert.equal(akt[0].id, pa.id, "die zuerst angelegte bleibt");
  assert.equal(T.tafelBeschreibung(M, { heuteTag: H, jetzt: "2026-10-18T10:00:00Z" }).aktionen.length, 1);
  const kopie = M.aktionen.find((a) => a.id !== pa.id); assert.equal(kopie.entfernt, true); assert.equal(kopie.doppelt, pa.id);
  assert.equal(AP.aktionenAbschliessen(M, { heuteTag: H }), 0, "Kopie bekommt keine Bilanz");
  const N = st.verschmelzen(M, B, { jetzt: Date.parse("2026-10-18T11:00:00Z") }); assert.equal(T.aktiveAktionen(N, { heuteTag: H }).length, 1, "zweites Zusammenführen bleibt bei einer");
  assert.equal(st.migrierenBetrieb(structuredClone(N)).aktionen.filter((a) => !a.entfernt).length, 1);
});

// ---------- M2 ----------
test("M2: Menü-Bestandteile mit 0,00 € zählen nicht (Menü-Wort, gelerntes Kassen-Menü oder Einzug); andere 0,00-Zeilen nicht mit bezahlten zusammengezählt", () => {
  const s = laden();
  vk.kombiLernen(s, { text: "Menü Döner" }, [{ gericht: "g1", menge: 1 }, { gericht: "g2", menge: 1 }, { gericht: "g6", menge: 1 }]);
  const text = "Z-Bon Nr. 7\nDatum 17.10.2026 22:00\nPLU-Bericht\nDöner Kebab 20 160,00\nMenü Döner 5 57,50\n  Döner Kebab 5 0,00\n  Pommes 5 0,00\n  Cola 0,33 l 5 0,00\nSumme 217,50";
  const l = zb.zbonLesen(text, { heuteTag: H, stand: s });
  assert.deepEqual(l.zeilen.filter((z) => z.bestandteil).map((z) => z.text), ["Döner Kebab", "Pommes", "Cola 0,33 l"]);
  zb.zbonUebernehmen(s, l, { jetzt: "2026-10-18T08:00:00Z" });
  assert.equal(menge(s, "2026-10-17", "g1"), 25); assert.equal(menge(s, "2026-10-17", "g2"), 5);
  // ohne Menü-Wort, aber gelerntes Kassen-Menü und ohne Einzug
  const s2 = laden(); vk.kombiLernen(s2, { text: "Spar 1" }, [{ gericht: "g1", menge: 1 }, { gericht: "g2", menge: 1 }]);
  const l2 = zb.zbonLesen("Datum 17.10.2026\nSpar 1 4 40,00\nDöner Kebab 4 0,00\nPommes 4 0,00\nSumme 40,00", { heuteTag: H, stand: s2 });
  assert.equal(l2.zeilen.filter((z) => z.bestandteil).length, 2);
  // Wirt nimmt eine Zeile doch dazu
  const l3 = zb.zbonAendern(l2, l2.zeilen[1].id, "teil", false); assert.equal(l3.zeilen[1].bestandteil, undefined);
  // 0,00-Zeile ohne Menü darüber: bleibt markiert und wird nicht mit der bezahlten gleichen Namens zusammengezählt
  const l4 = zb.zbonLesen("Datum 17.10.2026\nDöner Kebab 10 80,00\nDöner Kebab 1 0,00\nSumme 80,00", { heuteTag: H });
  assert.equal(l4.zeilen[1].bestandteil, undefined); assert.ok(l4.zeilen[1].gruende.includes("preis"));
  assert.equal(zb.zbonErgebnis(l4).positionen.length, 2);
  // Gegenbeispiel: „Gratis Ayran 0,00“ unter einem normalen Gericht ist kein Bestandteil
  const l5 = zb.zbonLesen("Datum 17.10.2026\nDöner Kebab 10 80,00\nAyran 2 0,00\nSumme 80,00", { heuteTag: H });
  assert.equal(l5.zeilen.some((z) => z.bestandteil), false);
});

// ---------- M3 ----------
test("M3: angeklebte Steuerkennzeichen und „7 %“/„19 %“ hinter dem Betrag lassen keine Zeile wegfallen; aus „B“ wird keine 8", () => {
  for (const [roh, text, m, b] of [["Döner Kebab 43 344,00A", "Döner Kebab", 43, 344], ["Cola 0,33 l 30 75,00B", "Cola 0,33 l", 30, 75], ["Ayran 0,25 l 14 28,00*", "Ayran 0,25 l", 14, 28],
    ["Döner Kebab 43 344,00 7%", "Döner Kebab", 43, 344], ["Pommes 18 63,00 19 %", "Pommes", 18, 63], ["Döner Kebab 43 344,00 A 7%", "Döner Kebab", 43, 344], ["Lahmacun 10 55,00 1", "Lahmacun", 10, 55]]) {
    const r = zb.zbonZeileLesen(roh); assert.equal(r?.art, "artikel", roh); assert.equal(r.text, text, roh); assert.equal(r.menge, m, roh); assert.equal(r.betrag, b, roh);
  }
  assert.equal(zb.zbonZeileLesen("Cola 0,33 l 30 75,00").betrag, 75, "ohne Kennzeichen unverändert");
});

// ---------- M4 ----------
test("M4: Gerichtnamen mit „Bar…“, „Kunden…“, „Total …“, „Ecke …“ sind Artikel; echte Summen- und Zahlungszeilen bleiben Summen", () => {
  for (const roh of ["Barbecue Pizza 5 62,50", "Kunden-Menü 3 27,00", "Total Menü 2 15,00", "Ecke Döner 3 21,00", "Kunden Döner 1 7,00", "Visacola 2 5,00", "Karten-Spezial 2 18,00", "Bar Burger 2 19,00"])
    assert.equal(zb.zbonZeileLesen(roh)?.art, "artikel", roh);
  for (const roh of ["Bar 1.234,50", "Bar 85 1.234,50", "BAR 419,00", "Kunden 57", "Kunden: 57 419,00", "Total 419,00", "Total Speisen 12 99,00", "EC-Karte 12 180,00", "EC 180,00", "Karte 3 45,00", "Kartenzahlung 180,00",
    "Summe 419,00", "Gesamt 419,00", "MwSt 19% 12,34", "Visa 2 30,00", "Mastercard 1 15,00", "Bargeld 200,00", "Barzahlung 239,00", "Anzahl Kunden 57", "Kundenanzahl 57"])
    assert.equal(zb.zbonZeileLesen(roh)?.art, "summe", roh);
});

// ---------- M5 ----------
test("M5: Uhrzeit in eigener Zeile – Bon nach Mitternacht zählt für den Vortag (gleich in jeder Zeitzone)", () => {
  const k = zb.zbonKopf("Z-Bon Nr. 12\nDatum: 17.10.2026\nZeit: 00:45\nDöner 10 80,00\nSumme 80,00", { heuteTag: H });
  assert.equal(k.datum, "2026-10-16"); assert.equal(k.vortag, true);
  assert.equal(zb.zbonKopf("Z-Bon 12\nDatum 17.10.2026\nUhrzeit 01:58 Uhr\nDöner 10 80,00", { heuteTag: H }).datum, "2026-10-16");
  assert.equal(zb.zbonKopf("Z-Bon 12\nDatum 17.10.2026\n00:45\nDöner 10 80,00", { heuteTag: H }).datum, "2026-10-16", "Zeile nur mit Uhrzeit");
  assert.equal(zb.zbonKopf("Z-Bon 12\nDatum 17.10.2026\nZeit: 22:10\nDöner 10 80,00", { heuteTag: H }).datum, "2026-10-17", "abends: gleicher Tag");
  assert.equal(zb.zbonKopf("Z-Bon 12\nDatum 17.10.2026\nDöner 10 80,00\nCola 2 5,00\nZeit 00:30", { heuteTag: H }).datum, "2026-10-17", "Uhrzeit weiter unten zählt nicht");
  assert.equal(zb.zbonKopf("von 16.10.2026\nZeit 10:02\nbis 17.10.2026 01:58\nDöner 10 80,00", { heuteTag: H }).datum, "2026-10-16");
});

// ---------- N1 ----------
test("N1: Leerzeichen mitten im Betrag – die Zeile wird zum Prüfen markiert statt still eine falsche Zahl zu liefern", () => {
  const r = zb.zbonZeileLesen("Döner Kebab  43  3 44,00"); assert.equal(r.art, "artikel"); assert.ok(r.gruende.includes("menge"));
  const l = zb.zbonLesen("Datum 16.10.2026\nDöner Kebab  43  3 44,00\nSumme 344,00", { heuteTag: H }); assert.equal(l.zeilen[0].unsicher, true); assert.equal(l.pruefung, "abweichung");
  assert.deepEqual(zb.zbonZeileLesen("Döner Kebab 43 344,00").gruende, [], "normale Zeile bleibt unmarkiert");
  assert.deepEqual(zb.zbonZeileLesen("Cola 0,5 l 10 30,00").gruende, []);
});

// ---------- N2 ----------
test("N2: Getränk von „offen“ auf Dose umgestellt – das Rezept zieht nicht mehr aus dem Großgebinde ab, sondern zählt Dosen", () => {
  const b = st.leererBetrieb(); b.phase = "app"; b.betrieb.name = "T"; const s = st.migrierenBetrieb(b);
  assert.equal(G.getraenkAnlegen(s, { vorlage: "Cola offen 0,4 l", preis: 3.5, schankverlust: 0.1 }).ok, true);
  const g = s.gerichte.find((x) => x.name === "Cola offen 0,4 l"); const gross = g.getraenk.quelle; assert.ok(gross);
  assert.equal(G.getraenkSetzen(s, g.id, { gebinde: "dose" }).ok, true);
  assert.equal(g.getraenk.quelle, null); assert.equal(g.zutaten.some((z) => z.name === gross), false, "kein Großgebinde mehr im Rezept");
  assert.deepEqual(g.zutaten.find((z) => z.name === g.name), { name: g.name, menge: 1, einheit: "stk" });
  assert.ok(s.artikel.some((a) => a.name === g.name && a.einheit === "stk"), "Stück-Artikel angelegt");
  // zurück auf offen: wieder Großgebinde
  assert.equal(G.getraenkSetzen(s, g.id, { gebinde: "offen", quelle: gross, menge: 0.4 }).ok, true); assert.equal(g.zutaten.find((z) => z.name === gross)?.menge, 400);
});

// ---------- N3 ----------
test("N3: umbenannter und neu angelegter Lieferant gleichen Namens – nach dem Zusammenführen einer, Waren zeigen auf ihn", () => {
  const basis = beispielLaden(H); st.abgleichGrundlage(basis);
  const C = structuredClone(basis), D = structuredClone(basis);
  const m = L.lieferantAnlegen(C, { name: "Metro" }, { jetzt: "2026-10-18T08:00:00.000Z" }).lieferant; L.lieferantSetzen(C, m.id, { name: "Großmarkt", tage: [2, 5] }, { jetzt: "2026-10-18T08:30:00.000Z" });
  const g = L.lieferantAnlegen(D, { name: "Großmarkt", kundennummer: "K-7" }, { jetzt: "2026-10-18T09:00:00.000Z" }).lieferant;
  const ware = D.artikel.find((a) => a.herkunft !== "selbst").name; assert.equal(L.artikelLieferantSetzen(D, ware, { haupt: g.id }), true);
  const N = st.verschmelzen(C, D, { jetzt: Date.parse("2026-10-18T10:00:00Z") });
  const gm = L.lieferantenAktiv(N).filter((l) => l.name === "Großmarkt"); assert.equal(gm.length, 1);
  assert.equal(gm[0].id, m.id, "der zuerst angelegte bleibt"); assert.deepEqual(gm[0].tage, [2, 5]); assert.equal(gm[0].kundennummer, "K-7", "Leeres aufgefüllt");
  assert.ok(gm[0].namen.includes("Metro"));
  assert.equal(N.artikel.find((a) => a.name === ware).lieferantId, m.id, "Ware zeigt auf den bleibenden");
  assert.equal(L.lieferantenEntdoppeln(N), 0, "idempotent");
  assert.equal(L.lieferantenAktiv(st.migrierenBetrieb(structuredClone(N))).filter((l) => l.name === "Großmarkt").length, 1);
});

// ---------- N4 ----------
test("N4: das Rechenwerk lehnt eine Aktion unter Wareneinsatz und bei Verbrauchsdatum selbst ab", () => {
  const s = beispielLaden(H); s.aktionen = [];
  const g = s.gerichte.find((x) => x.klasse === "haupt" && x.preis > 0);
  const vs = AP.aktionVorschlag(s, { art: "abverkauf", gerichte: [g.id], preis: 0.05 }, { heuteTag: H }); assert.equal(vs.grund, "lohnt");
  assert.equal(T.aktionUebernehmen(s, { art: "abverkauf", gerichte: [g.id], preis: 0.05 }, { heuteTag: H }), null);
  assert.equal(s.aktionen.length, 0);
  assert.ok(T.aktionUebernehmen(s, { art: "abverkauf", gerichte: [g.id], preis: g.preis * 0.9 }, { heuteTag: H }), "lohnende Aktion geht weiter");
});

// ---------- N5 ----------
test("N5: zwei Kassen ohne Z-Nummer – „Kasse 2“ wird als Merkmal gespeichert; ein neues Foto ersetzt nur die gewählte Kasse", () => {
  const s = laden(); const d = "2026-10-16";
  const k1 = zb.zbonLesen("Datum 16.10.2026\nDöner Kebab 10 80,00\nSumme 80,00", { heuteTag: H });
  const k2 = zb.zbonLesen("Datum 16.10.2026\nDöner Kebab 5 40,00\nSumme 40,00", { heuteTag: H });
  zb.zbonUebernehmen(s, k1, { jetzt: "2026-10-18T10:00:00.000Z" });
  const v2 = zb.zbonVorschau(s, zb.zbonAendern(k2, null, "zweite", true)); assert.equal(v2.addiert, true); assert.equal(v2.ziel, "Z-K2");
  const r2 = zb.zbonUebernehmen(s, zb.zbonAendern(k2, null, "zweite", true), { jetzt: "2026-10-18T10:01:00.000Z" }); assert.equal(r2.kasse, "Z-K2");
  assert.equal(menge(s, d), 15);
  assert.deepEqual(zb.zbonKassen(s, d).map((k) => [k.key, k.nr]), [[null, 1], ["Z-K2", 2]]);
  // Kasse 1 neu fotografiert (11 statt 10): ohne Wahl muss der Bildschirm fragen
  const k1b = zb.zbonLesen("Datum 16.10.2026\nDöner Kebab 11 88,00\nSumme 88,00", { heuteTag: H });
  assert.equal(zb.zbonVorschau(s, k1b).mussWaehlen, true);
  const w1 = zb.zbonAendern(k1b, null, "kasse", { art: "ersetzt", key: null }); assert.equal(zb.zbonVorschau(s, w1).mussWaehlen, false);
  zb.zbonUebernehmen(s, w1, { jetzt: "2026-10-18T10:02:00.000Z" }); assert.equal(menge(s, d), 16, "nur Kasse 1 ersetzt, Kasse 2 bleibt");
  zb.zbonUebernehmen(s, zb.zbonAendern(zb.zbonLesen("Datum 16.10.2026\nDöner Kebab 6 48,00", { heuteTag: H }), null, "kasse", { art: "ersetzt", key: "Z-K2" }), { jetzt: "2026-10-18T10:03:00.000Z" });
  assert.equal(menge(s, d), 17, "nur Kasse 2 ersetzt");
  // zwei Handys mit derselben „Kasse 2“: ein Schlüssel, zählt einmal
  const A = laden(), B = laden();
  for (const [X, j] of [[A, "08"], [B, "09"]]) { zb.zbonUebernehmen(X, k1, { jetzt: `2026-10-18T${j}:00:00.000Z` }); zb.zbonUebernehmen(X, zb.zbonAendern(k2, null, "zweite", true), { jetzt: `2026-10-18T${j}:01:00.000Z` }); }
  assert.equal(menge(st.verschmelzen(A, B, { jetzt: Date.parse("2026-10-18T10:00:00Z") }), d), 15);
});

// ---------- Feiertage ----------
test("Feiertage: Ostern (Gauß/Meeus), bundesweite und geprüfte Landes-Feiertage; ungeprüfte Länder nur bundesweit", () => {
  for (const [j, o] of [[2024, "2024-03-31"], [2025, "2025-04-20"], [2026, "2026-04-05"], [2027, "2027-03-28"], [2028, "2028-04-16"], [2038, "2038-04-25"], [2049, "2049-04-18"], [2100, "2100-03-28"]]) assert.equal(F.ostersonntag(j), o, String(j));
  assert.deepEqual(F.feiertageJahr(2027).map((f) => f.datum), ["2027-01-01", "2027-03-26", "2027-03-29", "2027-05-01", "2027-05-06", "2027-05-17", "2027-10-03", "2027-12-25", "2027-12-26"]);
  assert.equal(F.feiertagAm("2027-01-06", "BW"), "dreikoenige"); assert.equal(F.feiertagAm("2027-01-06", null), null); assert.equal(F.feiertagAm("2027-01-06", "NW"), null);
  assert.equal(F.feiertagAm("2027-05-27", "NW"), "fronleichnam"); assert.equal(F.feiertagAm("2026-11-01", "BY"), "allerheiligen");
  assert.equal(F.feiertagAm("2027-08-15", "BY"), null, "Mariä Himmelfahrt nur in einzelnen Gemeinden – nicht landesweit");
  assert.equal(F.feiertagAm("2027-01-06", "HE"), null, "ungeprüftes Land: nur bundesweit"); assert.equal(F.landGeprueft("HE"), false); assert.equal(F.BUNDESLAENDER.length, 16);
  assert.equal(F.feiertagAm("2026-10-03", "HE"), "einheit");
});
function lieferLaden() {
  const s = st.leererBetrieb(); s.phase = "app"; s.betrieb.name = "Testladen"; s.kuehl.ruhetage = [0];
  s.lieferungen.push({ id: "l1", datum: "2026-10-05", erfasst: "2026-10-05T09:00:00.000Z", lieferant: "Metro", zeilen: [], storniert: false });
  return st.migrierenBetrieb(s);
}
test("Feiertage: Lieferanten liefern nicht an Feiertagen (Bestellvorschlag springt weiter); Laden an Feiertagen: Standard offen, eigene Einstellung „zu“", () => {
  const s = lieferLaden(); const lf = L.lieferantSetzen(s, L.lieferantZuName(s, "Metro").id, { tage: [2, 5], uhr: "18:00", tageVorher: 1 }).lieferant;
  assert.deepEqual(L.liefertermine(s, lf, { jetzt: um("2026-12-21", 12) }).map((x) => x.tag), ["2026-12-22", "2026-12-29", "2027-01-05"], "Fr 25.12. und Fr 01.01. fallen weg");
  assert.equal(L.liefertAm(s, lf, "2026-12-25"), false); assert.equal(L.liefertAm(s, lf, "2026-12-22"), true);
  const ab = L.lieferantSetzen(s, lf.id, { modus: "abholung", tage: [5] }).lieferant; assert.equal(L.liefertermine(s, ab, { jetzt: um("2026-12-21", 12) })[0].tag, "2027-01-08", "auch Abholung nicht am Feiertag");
  // Bundesland: Mi 06.01.2027 nur in BW (u. a.) Feiertag
  const mi = L.lieferantSetzen(s, lf.id, { modus: "lieferung", tage: [3] }).lieferant;
  assert.equal(L.liefertermine(s, mi, { jetzt: um("2027-01-04", 9) })[0].tag, "2027-01-06");
  assert.equal(F.feiertagSetzen(s, "land", "BW"), true); assert.equal(L.liefertermine(s, mi, { jetzt: um("2027-01-04", 9) })[0].tag, "2027-01-13");
  assert.equal(st.migrierenBetrieb(structuredClone(s)).betrieb.bundesland, "BW", "Einstellung übersteht das Laden");
  // Laden am Feiertag: Standard wie Wochentag (Fr 25.12. zählt), Einstellung „zu“ → kein Bedarf an dem Tag
  assert.equal(tagGewicht(s, "2026-12-25"), 1);
  assert.equal(F.feiertagSetzen(s, "offen", false), true); assert.equal(tagGewicht(s, "2026-12-25"), 0); assert.equal(tagGewicht(s, "2026-12-24"), 1);
  assert.equal(st.migrierenBetrieb(structuredClone(s)).betrieb.feiertagOffen, false);
  assert.equal(F.feiertagSetzen(s, "offen", true), true); assert.equal("feiertagOffen" in s.betrieb, false);
  assert.equal(F.feiertagSetzen(s, "land", "XX"), true); assert.equal(s.betrieb.bundesland, undefined, "unbekanntes Land = nur bundesweit");
});
test("Feiertage: Büro „Lieferanten“ zeigt Bundesland und Schalter; Anzeigen schreibt nicht; Personal gesperrt", async () => {
  const S = await import("../js/screens/lieferanten.js"); const { personalGesperrt } = await import("../js/modus.js");
  const s = lieferLaden(); const vorher = JSON.stringify(s); S.lieferantenZuruecksetzen();
  const html = S.lieferantenView(s); assert.equal(JSON.stringify(s), vorher);
  for (const w of ['data-f="lf-land"', 'data-a="lf-feiertag-zu"', "Feiertage", "Baden-Württemberg", "Nächster Feiertag"]) assert.ok(html.includes(w), w);
  assert.equal(S.lieferantenEingabe("lf-land", "BY", s), "speichern"); assert.equal(s.betrieb.bundesland, "BY");
  assert.deepEqual(S.lieferantenAktion("lf-feiertag-zu", { dataset: {} }, s), { speichern: true }); assert.equal(s.betrieb.feiertagOffen, false);
  S.lieferantenEingabe("lf-land", "HE", s); assert.ok(S.lieferantenView(s).includes("nur die bundesweiten"));
  assert.equal(personalGesperrt("lf-feiertag-zu", null, H), true); assert.equal(personalGesperrt("vk-zb-kasse", null, H), true); assert.equal(personalGesperrt("vk-zb-teil", null, H), true);
});
test("Z-Bon-Bildschirm: Wahl der Kasse bei mehreren Z-Bons, Menü-Teile mit Knopf; ohne Wahl kein Übernehmen", async () => {
  const sc = await import("../js/screens/verkauf.js");
  const s = laden(); const d = "2026-10-16";
  zb.zbonUebernehmen(s, zb.zbonLesen("Z-Nr. 100\nDatum 16.10.2026\nDöner Kebab 10 80,00", { heuteTag: H }), { jetzt: "2026-10-18T10:00:00.000Z" });
  zb.zbonUebernehmen(s, zb.zbonLesen("Z-Nr. 101\nDatum 16.10.2026\nDöner Kebab 5 40,00", { heuteTag: H }), { jetzt: "2026-10-18T10:01:00.000Z" });
  sc.verkaufZbonText("Datum 16.10.2026\nMenü Döner 2 20,00\n  Döner Kebab 2 0,00\nSumme 20,00", null, null, s);
  const vorher = JSON.stringify(s); let h = sc.verkaufView(s); assert.equal(JSON.stringify(s), vorher);
  for (const w of ['data-a="vk-zb-kasse"', "Ersetzt Z-Nr. 100", "Ersetzt Z-Nr. 101", "Weitere Kasse (Kasse 2)", "Teil eines Menüs", 'data-a="vk-zb-teil"', "Bitte zuerst wählen"]) assert.ok(h.includes(w), w);
  assert.ok(/data-a="vk-zb-uebernehmen" disabled/.test(h));
  assert.equal(sc.verkaufAktion("vk-zb-uebernehmen", { dataset: {} }, s, null).speichern, false);
  sc.verkaufAktion("vk-zb-kasse", { dataset: { wert: "k:Z-101" } }, s, null);
  assert.equal(sc.verkaufAktion("vk-zb-uebernehmen", { dataset: {} }, s, null).speichern, true);
  assert.equal(menge(s, d), 10, "Z-101 ersetzt, Z-100 bleibt; Menü-Teil zählt nicht, das Menü ist nicht zugeordnet");
});
test("Feiertage: Bestellvorschlag – nächste Lieferung nach Fr 25.12. ist Di 29.12.; Bedarf bis dahin (Laden offen: 25./26.12. zählen, „zu“: nicht)", async () => {
  const b = await import("../js/bestand.js"); const inv = await import("../js/inventur.js");
  const s0 = st.leererBetrieb(); s0.phase = "app"; s0.betrieb.name = "T"; s0.kuehl.ruhetage = [0];
  s0.gerichte = [{ id: "g1", name: "Teller", preis: 12, klasse: "haupt", zutaten: [{ name: "Fleisch", menge: 200, einheit: "g" }] }];
  s0.artikel = [{ name: "Fleisch", gruppe: "fleisch", einheit: "kg", packung: { menge: 10, einheit: "kg" }, gebinde: { art: "karton", zwischen: null }, preis: 80, preisBasis: "netto" }];
  s0.lieferungen.push({ id: "l1", datum: "2026-12-01", erfasst: "2026-12-01T09:00:00.000Z", lieferant: "Metro", zeilen: [{ artikel: "Fleisch", menge: 1, inhaltMenge: 10, inhaltEinheit: "kg", netto: 80 }], storniert: false });
  const s = st.migrierenBetrieb(s0);
  for (let d = 8; d <= 19; d++) { if (new Date(2026, 11, d).getDay() === 0) continue; vk.handVerkaufSetzen(s, `2026-12-${String(d).padStart(2, "0")}`, "g1", 10); }
  const i = inv.inventurStarten(s, { datum: "2026-12-20", jetzt: "2026-12-20T19:00:00.000Z" }); inv.mengeSetzen(i, "Fleisch", 0.3); inv.inventurAbschliessen(s, i, { datum: "2026-12-20", jetzt: "2026-12-20T19:30:00.000Z" });
  L.lieferantSetzen(s, L.lieferantZuName(s, "Metro").id, { tage: [2, 5], uhr: "18:00", tageVorher: 1 });
  const v = b.bestellVorschlag(s, { heuteTag: "2026-12-21", jetzt: um("2026-12-21", 12) });
  assert.equal(v.gruppen[0].termin.tag, "2026-12-22"); assert.equal(v.gruppen[0].termin.naechste, "2026-12-29", "Fr 25.12. übersprungen");
  // Mo 21. bis Mo 28. ohne So = 7 Öffnungstage × 2 kg + 2 Tage Puffer = 18 kg
  assert.ok(Math.abs(v.zeilen[0].bedarf - 18000) < 1e-6, v.zeilen[0].bedarf);
  F.feiertagSetzen(s, "offen", false);
  const z = b.bestellVorschlag(s, { heuteTag: "2026-12-21", jetzt: um("2026-12-21", 12) }).zeilen[0];
  assert.ok(Math.abs(z.bedarf - 14000) < 1e-6, "25. und 26.12. zu: 5 Öffnungstage + Puffer = " + z.bedarf);
});
