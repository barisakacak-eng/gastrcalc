// Trennung 2 (17.10.2026): je neue reine Funktion im Rechenwerk mindestens ein kleiner Test.
// Die Funktionen rechnen, was vorher mitten im HTML-Aufbau von js/screens/*.js stand; ein neues Frontend bekommt jede angezeigte Zahl darüber.
import test from "node:test";
import assert from "node:assert/strict";
const i18n = await import("../js/i18n.js");
i18n.setzeSprache("de");
const U = await import("../js/util.js");
const E = await import("../js/engine.js");
const Z = await import("../js/zaehler.js");
const A = await import("../js/anzeige_text.js");
const BI = await import("../js/bilder.js");
const GV = await import("../js/gerichte_vergleich.js");
const M = await import("../js/muell.js");
const P = await import("../js/personal.js");
const LZ = await import("../js/laden_zahlen.js");
const L = await import("../js/lieferung.js");
const BL = await import("../js/beleg.js");
const KB = await import("../js/kostenbeleg.js");
const INV = await import("../js/inventur.js");
const KL = await import("../js/karte_lesen.js");
const D = await import("../js/deal.js");
const OT = await import("../js/ordner_text.js");
const { beispielLaden } = await import("../js/beispiel.js");
const H = U.heuteGeschaeft();
const laden = () => beispielLaden(H, { jetzt: new Date().toISOString() });

// ---------- anzeige_text.js ----------
test("anzeige_text: Datum, Monat, Wochentag, Uhrzeit", () => {
  assert.equal(A.datumLesbar("2026-10-17"), "17.10.2026");
  assert.equal(A.monatName("2026-10-01"), "Oktober");
  assert.match(A.tagLesbar("2026-10-17"), /Samstag/);
  assert.equal(A.zeitKurz("nix"), "–");
  assert.match(A.zeitKurz(new Date(2026, 9, 17, 7, 5).toISOString()), /^07:05$/);
});
test("anzeige_text: Name und Menge eines Schwund-Eintrags", () => {
  const s = { gerichte: [{ id: "g1", name: "Döner" }] };
  assert.equal(A.eintragName({ art: "verderb", ref: { typ: "gericht", id: "g1", name: "alt" } }, s), "Döner");
  assert.equal(A.eintragName({ art: "verderb", ref: { typ: "gericht", id: "weg", name: "Gemerkt" } }, s), "Gemerkt");
  assert.equal(A.eintragMenge({ art: "verderb", ref: { typ: "gericht" }, menge: 2 }), "2 Portionen");
  assert.match(A.eintragMenge({ art: "verderb", ref: { typ: "artikel" }, menge: 1.5, einheit: "kg" }), /^1,50 /);
});
test("anzeige_text: Gebinde-Satz, Inventur-Gebinde und Bruchzahl", () => {
  const a = { name: "Cola", packung: { menge: 6, einheit: "l" }, gebinde: { art: "kiste", zwischen: { art: "flasche", anzahl: 6 } } };
  assert.equal(typeof A.gebindeSatz(a), "string"); assert.ok(A.gebindeSatz(a).length > 3);
  assert.equal(A.gebindeZeile({ gebinde: "karton", artikel: null }), A.gebindeName({ gebinde: "karton" }));
  assert.equal(A.zahlText(1.5), "1 ½"); assert.equal(A.zahlText(0.75), "¾"); assert.equal(A.zahlText(null), "–"); assert.equal(A.zahlText(3), "3");
});

// ---------- engine.js ----------
test("engine: Sachbezug je Mahlzeit, ohne Mahlzeit Mittag", () => {
  assert.equal(E.sachbezugWert(2, "fruehstueck"), 2 * E.SVEV_2026.fruehstueck);
  assert.equal(E.sachbezugWert(1, undefined), E.SVEV_2026.mittag);
  assert.equal(E.sachbezugWert("x", "abend"), 0);
});
test("engine: Schwund-Liste eines Zeitraums, neueste zuerst", () => {
  const s = { schwund: [{ id: "a", datum: "2026-10-01" }, { id: "b", datum: "2026-10-05" }, { id: "c", datum: "2026-10-09" }] };
  assert.deepEqual(E.schwundEintraege(s, { von: "2026-10-02", bis: "2026-10-09" }).map((e) => e.id), ["c", "b"]);
  assert.equal(s.schwund[0].id, "a", "Liste selbst bleibt unverändert");
});

// ---------- bilder.js ----------
test("bilder: Foto/Piktogramm je Gericht und Ware, ohne HTML", () => {
  assert.equal(BI.piktoName({ rezeptFamilie: "pizza" }), "g-pizza"); assert.equal(BI.piktoName({}), "g-teller");
  assert.deepEqual(BI.gerichtBildQuelle({ foto: "u1", rezeptFamilie: "doener" }), { eigen: "u1", pikto: "g-doener" });
  const q = BI.gerichtBildQuelle({ name: "Pizza Margherita", rezeptFamilie: "pizza" }); assert.ok(q.foto || q.pikto);
  assert.equal(typeof BI.fotoName({ name: "Unbekanntes XYZ" }), "object"); // null, wenn nichts passt
  const w = BI.wareBildQuelle({ name: "Tomaten", gruppe: "gemuese" }); assert.ok(w.foto || w.pikto); assert.ok(!JSON.stringify(w).includes("<"));
});

// ---------- gerichte_vergleich.js ----------
test("gerichteVergleich: DB = Netto − Ware, Marge = DB/Netto, sortiert, ohne Getränke", () => {
  const s = laden(); const v = GV.gerichteVergleich(s, "db");
  assert.ok(v.mit.length > 0);
  for (const x of v.mit) { assert.ok(Math.abs(x.db - (x.z.preisNetto - x.z.waren)) < 1e-9); assert.notEqual(x.z.klasse, "getraenk"); assert.ok(x.balken >= 0 && x.balken <= 100); }
  for (let i = 1; i < v.mit.length; i++) assert.ok(v.mit[i - 1].db >= v.mit[i].db);
  const m = GV.gerichteVergleich(s, "marge"); for (let i = 1; i < m.mit.length; i++) assert.ok(m.mit[i - 1].marge >= m.mit[i].marge);
});

// ---------- muell.js ----------
test("muell: Monatstonne, Suche „Andere“ und Werte der Detail-Eingabe", () => {
  assert.deepEqual(M.muellTonne({ monat: 50, vormonat: null }), { fuell: 0.5, linie: null });
  assert.deepEqual(M.muellTonne({ monat: 0, vormonat: null }), { fuell: 0, linie: null });
  const t = M.muellTonne({ monat: 100, vormonat: 100 }); assert.equal(t.fuell, 0.8); assert.equal(t.linie, 0.8);
  const s = laden();
  const r = M.muellSuche(s, "döner", H); assert.ok(r.length > 0 && r.length <= 24); assert.ok(r.every((x) => x.typ === "gericht" || x.typ === "artikel"));
  assert.ok(Array.isArray(M.muellSuche(s, "", H)));
  const g = s.gerichte.find((x) => x.klasse !== "getraenk");
  const f = M.muellFormWerte(s, { typ: "gericht", id: g.id, name: g.name, menge: 2, einheit: "portion", personal: true }, H, { mahlzeit: "mittag" });
  assert.equal(f.einheit, "portion"); assert.equal(f.personalWert, 2 * E.SVEV_2026.mittag);
  assert.equal(M.muellFormWerte(s, { typ: "eimer", menge: 0, einheit: "kg" }, H).wert, null);
  assert.equal(M.muellFormWerte(s, { typ: "gericht", id: g.id, menge: 1 }, H, { personal: true }).wert, null, "Personal-Modus ohne Euro");
});

// ---------- personal.js ----------
test("personalZahlen: offene Kühlung und Putzstand ohne Euro", () => {
  const z = P.personalZahlen(laden());
  assert.ok(z.kuehlOffen === null || Number.isInteger(z.kuehlOffen));
  assert.ok(!JSON.stringify(z).includes("€"));
  assert.deepEqual(P.personalZahlen({ kuehlstellen: [], messungen: [], personen: [] }).putzen, null);
});

// ---------- laden_zahlen.js ----------
test("heuteZiel: große Zahl, Balken und Tempo passen zu monatsZiel", () => {
  const s = laden(); const z = Z.zaehler(s, { datum: H }); const w = LZ.heuteZiel(s, z, H); const m = Z.monatsZiel(s, z, H);
  assert.ok(["bisNull", "bisZiel", "ueberZiel"].includes(w.stufe));
  if (m.ziel !== null) assert.equal(w.zahl, m.stufe === "bisNull" ? m.fehltNull : m.stufe === "bisZiel" ? m.fehlt : m.darueber);
  assert.ok(w.anteil >= 0 && w.anteil <= 1);
  assert.ok(w.tempo === null || ["gut", "knapp"].includes(w.tempo.art));
});
test("heuteKachelZahlen: Umsatz, Müll, Kühl- und Putzstand als Zahlen", () => {
  const s = laden(); const ks = E.kuehlStatus(s); const k = LZ.heuteKachelZahlen(s, ks, H);
  assert.ok(k.umsatz === null || typeof k.umsatz === "number");
  assert.ok(k.kuehl === null || ["abweichung", "ok", "offen"].includes(k.kuehl.art));
  assert.equal(LZ.heuteKachelZahlen({ ...s, putzplan: null }, { eingerichtet: false }, H).kuehl, null);
});
test("abschlussHaken und tagesBilanz: Zahlen für „Tag abschließen“", () => {
  const s = laden(); const hk = LZ.abschlussHaken(s, H);
  assert.equal(typeof hk.kuehl.fertig, "boolean"); assert.equal(typeof hk.muell.anzahl, "number");
  const b = LZ.tagesBilanz(s, H, U.heute());
  assert.equal(b.besser, b.nach - b.vor);
  assert.ok(["gleich", "besser", "schlechter", "kein"].includes(b.vergleich.art)); assert.ok(b.vergleich.wochentag >= 0 && b.vergleich.wochentag <= 6);
  assert.ok(b.tonne === null || ["gleich", "mehr", "weniger"].includes(b.tonne.art));
  const g = LZ.tagesBilanz(s, E.tagPlus(H, -1));
  assert.ok(g.vergleich.art === "kein" || g.vergleich.differenz >= 0);
});

// ---------- zaehler.js ----------
test("zaehler: brutto/netto am Umsatzfeld, Strecke, Monatsstreifen", () => {
  assert.equal(Z.umsatzAnzeigeWert(107, "netto", 0.07), 100); assert.equal(Z.umsatzAnzeigeWert(107, "brutto", 0.07), 107); assert.equal(Z.umsatzAnzeigeWert(null, "netto", 0.07), null);
  assert.equal(Z.umsatzAusEingabe(100, "netto", 0.07), 107); assert.equal(Z.umsatzAusEingabe(100, "brutto", 0.07), 100);
  const s = laden(); const z = Z.zaehler(s, { datum: H }); const sk = Z.zaehlerStrecke(z);
  if (sk) { assert.ok(sk.heute >= 0 && sk.heute <= 100 && sk.null >= 0 && sk.null <= 100); assert.equal(sk.bringt, z.bleibtVon(1000)); }
  assert.equal(Z.zaehlerStrecke({ keinUmsatz: true }), null);
  assert.equal(Z.monatTagStatus({ status: "vorher" }, z), "offen"); assert.equal(Z.monatTagStatus({ status: "heute", gewicht: 0 }, z), "frei");
  assert.equal(Z.monatTagStatus({ status: "zukunft", gewicht: 1, stand: 5 }, z), "ziel"); assert.equal(Z.monatTagStatus({ status: "zukunft", gewicht: 1, stand: -5 }, z), "zukunft");
  assert.equal(Z.wochentagSpalte("2026-10-12"), 1); assert.equal(Z.wochentagSpalte("2026-10-18"), 7);
});

// ---------- lieferung.js ----------
test("lieferung: Preis je kg/l/Stück, neue Ware aus Belegzeile, Zeilen vorbereiten", () => {
  assert.deepEqual(L.preisAnzeige({ alt: 0.002, neu: 0.003, einheit: "g" }), { alt: 2, neu: 3, einheit: "kg" });
  assert.deepEqual(L.preisAnzeige({ alt: null, neu: 1.2, einheit: "stk" }), { alt: null, neu: 1.2, einheit: "stk" });
  assert.equal(L.neuArtikelAngaben({ name: "Etwas", inhalt: { einheit: "ml" } }).einheit, "l");
  assert.equal(L.neuArtikelAngaben({ name: "Etwas", inhalt: { einheit: "g" } }).gruppe, "gewuerz");
  const beleg = { basis: "netto", zeilen: [{ name: "A", bekannt: "Tomaten" }, { name: "B", bekannt: "Tomaten" }, { name: "C", bekannt: null }] };
  const z = L.belegZeilenVorbereiten({ artikel: [] }, beleg);
  assert.equal(z[0].bekannt, null); assert.equal(z[0].vorschlag, "Tomaten"); assert.equal(z[1].vorschlag, "Tomaten");
  assert.equal(beleg.zeilen[0].bekannt, "Tomaten", "Beleg bleibt unverändert");
});

// ---------- beleg.js ----------
test("beleg: Kandidaten, Lieferschein, Datum und Prüfstand", () => {
  const s = { artikel: [{ name: "Tomaten frisch" }, { name: "Gurken" }, { name: "Tomatenmark" }] };
  assert.deepEqual(BL.belegKandidaten(s, "TOMATEN 5kg"), ["Tomaten frisch", "Tomatenmark"]);
  assert.equal(BL.belegIstLieferschein({ typ: "rechnung" }, [{ gesamt: null }]), true);
  assert.equal(BL.belegIstLieferschein({ typ: "rechnung" }, [{ gesamt: 3 }]), false);
  assert.equal(BL.belegDatumVon({ datum: "2026-10-01" }, null, "2026-10-17"), "2026-10-01");
  assert.equal(BL.belegDatumVon({ datum: "2026-10-30" }, null, "2026-10-17"), "2026-10-17");
  assert.equal(BL.belegDatumVon({ datum: "2026-10-01" }, "heute", "2026-10-17"), "2026-10-17");
  const beleg = { basis: "unklar", pfand: [{ betrag: 1.5 }], summeNetto: 10, summeBrutto: 11.9 };
  const zeilen = [{ gesamt: 4, bekannt: "Gurken" }, { gesamt: 5, bekannt: null }];
  const p = BL.belegPruefStand(beleg, zeilen, {}, null);
  assert.equal(p.nFragen, 2); assert.equal(p.kannUebernehmen, false); assert.equal(p.summe, 10.5); assert.equal(p.sicherSumme, 4); assert.equal(p.summeBeleg, 10);
  const q = BL.belegPruefStand(beleg, zeilen, { 1: "neu" }, "brutto"); assert.equal(q.nFragen, 0); assert.equal(q.kannUebernehmen, true); assert.equal(q.summeBeleg, 11.9);
});

// ---------- kostenbeleg.js ----------
test("kostenZuweisungVorschlag: Stelle, Betrag, Basis, Datum, Verteilung, Lieferant", () => {
  const v = KB.kostenZuweisungVorschlag("Stadtwerke Muster\nStrom Abschlag\nGesamt 119,00 EUR", { id: "u1" }, "2026-10-17");
  assert.equal(typeof v.stelle, "string"); assert.equal(v.lieferant, "Stadtwerke Muster"); assert.equal(v.monate, 3); assert.ok(v.datum <= "2026-10-17");
  assert.deepEqual(v.upload, { id: "u1" }); assert.ok(["monatlich", "jaehrlich"].includes(v.verteilung));
});

// ---------- inventur.js ----------
test("inventur: Liste je Lagerort mit Summe, Suche und Karte", () => {
  const s = laden(); const inv = INV.inventurStarten(s, { datum: H });
  const l = INV.inventurListe(s, inv);
  assert.ok(l.gruppen.length > 0); for (const g of l.gruppen) assert.ok(Math.abs(g.summe - g.zeilen.reduce((x, z) => x + (z.wert || 0), 0)) < 1e-9);
  assert.ok(l.fortschritt >= 0 && l.fortschritt <= 100);
  assert.equal(INV.inventurSuche(s, l.liste, ""), null);
  const t = INV.inventurSuche(s, l.liste, "salz"); assert.ok(Array.isArray(t) && t.length <= 8); assert.ok(t.every((x) => typeof x.lagerort === "string"));
  const k = INV.inventurKarte(s, inv, l.liste[0].name); assert.equal(k.index, 1); assert.equal(k.gesamt, l.liste.length); assert.ok(k.imOrt >= 1 && k.imOrt <= k.ortGesamt);
  assert.equal(INV.inventurKarte(s, inv, "gibt es nicht"), null);
  assert.equal(typeof INV.lagerortVonName(s, "Salz"), "string");
});

// ---------- karte_lesen.js ----------
test("karte_lesen: Zahlen der Prüfliste und Startwert-Zutaten ohne Verpackung", () => {
  const v = [{ an: true, getraenk: true, name: "Cola", gruppe: "erkannt" }, { an: false, name: "X", gruppe: "pruefen" }, { an: true, name: "Y", vorlage: null, gruppe: "pruefen" }];
  const z = KL.kartePruefZahlen(v); assert.equal(z.an, 2); assert.equal(z.mitRezept, 0); assert.equal(z.zutaten, 1); assert.equal(z.pruefen.length, 2); assert.equal(z.erkannt.length, 1);
  assert.deepEqual(KL.baukastenZutatenOhneVerpackung({ zutaten: [{ name: "Fladenbrot" }, { name: "Dönertüte" }, { name: "Alufolie" }] }).map((x) => x.name), ["Fladenbrot"]);
});

// ---------- deal.js ----------
test("deal: Kombi-Teile sortiert (Haupt, Kleinigkeit, Getränk) und Auswahl bereinigt", () => {
  const s = laden(); const t = D.kombiTeileSortiert(s);
  const rang = { haupt: 0, gross: 0, kleinigkeit: 1, getraenk: 2 };
  for (let i = 1; i < t.length; i++) assert.ok((rang[t[i - 1].klasse] ?? 1) <= (rang[t[i].klasse] ?? 1));
  assert.deepEqual(D.kombiAuswahlBereinigt(["a", "weg"], [{ id: "a" }]), ["a"]);
});

// ---------- ordner_text.js ----------
test("ordner_text: Zeitraum, Kachelstand, Zeilen-Texte, Hinweis, Druckmodelle, CSV", () => {
  const s = laden();
  assert.equal(OT.amtZeitraumVon(undefined, "2026-10-17").art, "monat");
  assert.equal(OT.paketZeitVon({}, "steuer", "2026-10-17").monat, "2026-09");
  assert.equal(OT.paketZeitVon({ steuer: "2026-07" }, "steuer", "2026-10-17").monat, "2026-07");
  assert.equal(OT.monatLang("2026-10-01"), "Oktober 2026");
  assert.match(OT.zeitraumText({ art: "frei", von: "2026-10-01", bis: "2026-10-05" }), /01\.10\.2026 – 05\.10\.2026/);
  const k = OT.ordnerKachelStand(s, { datum: H }); for (const x of ["amt", "steuer", "buch"]) assert.ok(["gruen", "gelb", "rot", "grau"].includes(k[x].farbe), x);
  const E2 = amtVon(s);
  assert.equal(typeof OT.amtHinweis(E2), "string"); assert.equal(typeof OT.amtUnter("kuehl", E2.teile.kuehl), "string");
  assert.ok(OT.amtDokument(s, E2).abschnitte.length >= 5);
  assert.match(OT.beispielKopf(s), /BEISPIEL/); assert.equal(OT.beispielKopf({}), null);
  assert.match(OT.dateiName({ betrieb: { name: "Döner Ünal" } }, "kuehl", { von: "2026-10-01", bis: "2026-10-31" }), /^Doner_Unal_kuehl_2026-10-01_2026-10-31\.csv$/);
  const d = OT.csvDateien(s, "ordner-steuer", null, { paketMonat: { steuer: H.slice(0, 7) } }); assert.ok(d.length > 0 && d.every((f) => f.name.includes(H.slice(0, 7))));
  assert.match(OT.dokumentFuer(s, "ordner-buch"), /<html/i);
  assert.equal(typeof OT.paketUnter("belege", { belege: { anzahl: 0 } }), "string");
});
import { ordnerAmt, zeitraumFuer } from "../js/export_amt.js";
function amtVon(s) { return ordnerAmt(s, zeitraumFuer("monat", { datum: H }), { datum: H }); }
