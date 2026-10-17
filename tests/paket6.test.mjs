// Paket 6 (17.10.2026): Türkisch und Englisch vollständig – Artikelnamen, Putzplan-Begründungen, Kühlstellen-Namen.
// Grundsatz: übersetzt wird nur die Anzeige; gespeichert und exportiert wird der deutsche Name.
import test from "node:test";
import assert from "node:assert/strict";
import { leererBetrieb } from "../js/store.js";
import { KATALOG } from "../js/data/katalog.js";
import { ARTIKELNAMEN, artikelAnzeige } from "../js/data/artikelnamen.js";
import { AUFGABEN } from "../js/data/putzplan.js";
import { setzeSprache, artikelText } from "../js/i18n.js";
import { kuehlstelleAnzeige, standardNameErkennen, kuehlTypVon } from "../js/kuehlname.js";
import { kuehlAnzahlAendern } from "../js/screens/onboarding.js";
import { eintragName } from "../js/screens/tag.js";
import { rohwareWeg } from "../js/muell.js";
import * as A from "../js/export_amt.js";
import * as St from "../js/export_steuer.js";

const ALLE = [...new Set(Object.values(KATALOG).flatMap((b) => b.produkte.map((p) => p.n)))];

test("artikelAnzeige: tr, en, de, unbekannte Sprache, eigener Artikel", () => {
  assert.equal(artikelAnzeige("Knoblauchsauce", "tr"), "Sarımsaklı sos");
  assert.equal(artikelAnzeige("Knoblauchsauce", "en"), "Garlic sauce");
  assert.equal(artikelAnzeige("Knoblauchsauce", "de"), "Knoblauchsauce");
  assert.equal(artikelAnzeige("Dönerspieß Kalb/Pute", "tr"), "Döner eti (dana/hindi)");
  assert.equal(artikelAnzeige("Pizzateig", "tr"), "Pizza hamuru");
  // übrige 15 Sprachen: Rückfall auf Englisch
  assert.equal(artikelAnzeige("Knoblauchsauce", "pl"), "Garlic sauce");
  assert.equal(artikelAnzeige("Knoblauchsauce", "ar"), "Garlic sauce");
  // eigener Artikel des Wirts und leere Werte bleiben unverändert
  assert.equal(artikelAnzeige("Omas Spezialsoße", "tr"), "Omas Spezialsoße");
  assert.equal(artikelAnzeige("", "tr"), "");
  assert.equal(artikelAnzeige(undefined, "tr"), undefined);
  assert.equal(artikelAnzeige("Knoblauchsauce", undefined), "Knoblauchsauce");
});

test("artikelText folgt der aktiven Sprache", () => {
  setzeSprache("tr"); assert.equal(artikelText("Tomaten"), "Domates");
  setzeSprache("en"); assert.equal(artikelText("Tomaten"), "Tomatoes");
  setzeSprache("de"); assert.equal(artikelText("Tomaten"), "Tomaten");
});

test(`alle ${ALLE.length} Katalogartikel haben tr und en (neuer Artikel ohne Übersetzung = rot)`, () => {
  assert.ok(ALLE.length >= 429);
  const fehlt = ALLE.filter((n) => !(ARTIKELNAMEN[n]?.tr?.trim() && ARTIKELNAMEN[n]?.en?.trim()));
  assert.deepEqual(fehlt, [], "ohne Übersetzung: " + fehlt.join(", "));
  const zuviel = Object.keys(ARTIKELNAMEN).filter((n) => !ALLE.includes(n));
  assert.deepEqual(zuviel, [], "Schlüssel nicht im Katalog (Tippfehler?)");
});

test("Putzplan: jede Begründung in de, tr und en", () => {
  for (const a of AUFGABEN) for (const l of ["de", "tr", "en"]) assert.ok(a.warum?.[l]?.length > 3, a.id + " " + l);
  assert.equal(AUFGABEN.find((a) => a.id === "R04").warum.de, "Fett und Reste ziehen Schädlinge an");
  assert.notEqual(AUFGABEN.find((a) => a.id === "R04").warum.tr, AUFGABEN.find((a) => a.id === "R04").warum.de);
});

test("Kühlstellen: Standardname folgt der Sprache, umbenannter Name bleibt", () => {
  setzeSprache("de");
  const s = leererBetrieb(); s.kuehl = { takt: 1, ruhetage: [], eingerichtet: false, seit: null };
  kuehlAnzahlAendern(s, "kuehlschrank", 1); kuehlAnzahlAendern(s, "kuehlschrank", 1); kuehlAnzahlAendern(s, "tiefkuehler", 1);
  assert.deepEqual(s.kuehlstellen.map((k) => k.name), ["Kühlschrank", "Kühlschrank 2", "Tiefkühler"]);
  assert.deepEqual(s.kuehlstellen.map((k) => k.typ), ["kuehlschrank", "kuehlschrank", "tiefkuehler"]);
  setzeSprache("tr");
  assert.deepEqual(s.kuehlstellen.map(kuehlstelleAnzeige), ["Buzdolabı", "Buzdolabı 2", "Derin dondurucu"]);
  setzeSprache("en");
  assert.equal(kuehlstelleAnzeige(s.kuehlstellen[1]), "Fridge 2");
  // umbenannt → bleibt
  s.kuehlstellen[0].name = "Getränke hinten";
  setzeSprache("tr"); assert.equal(kuehlstelleAnzeige(s.kuehlstellen[0]), "Getränke hinten");
  // alte Daten ohne Typ, in einer anderen Sprache angelegt
  assert.equal(kuehlstelleAnzeige({ name: "Buzdolabı 3", art: "kuehl" }), "Buzdolabı 3");
  setzeSprache("de");
  assert.equal(kuehlstelleAnzeige({ name: "Buzdolabı 3", art: "kuehl" }), "Kühlschrank 3");
  assert.equal(kuehlstelleAnzeige({ name: "Fridge", art: "kuehl" }), "Kühlschrank");
  assert.equal(kuehlstelleAnzeige({ name: "Saladet", art: "kuehl" }), "Saladette");
  assert.equal(kuehlstelleAnzeige({ name: "Hot holding", art: "warm" }), "Warmhalter"); // alter Einrichten-Schritt
  assert.equal(kuehlTypVon({ name: "Saladette", art: "kuehl" }), "saladette");
  assert.equal(standardNameErkennen("Kühlschrank Getränke"), null);
});

test("Export bleibt deutsch, auch wenn die App auf Türkisch läuft", () => {
  setzeSprache("tr");
  const s = leererBetrieb(); s.phase = "app"; s.betrieb.name = "Test";
  s.kuehl = { takt: 1, ruhetage: [], eingerichtet: true, seit: "2026-10-01" };
  s.kuehlstellen = [{ id: "k", name: "Kühlschrank", art: "kuehl", typ: "kuehlschrank", min: null, max: null, reihe: 0, archiviert: false }];
  s.messungen.push({ id: "m1", stelle: "k", datum: "2026-10-05", zeit: "2026-10-05T09:00:00", wert: 4, min: null, max: 7, abweichung: false, massnahmen: [], nachkontrolle: null, von: null, nacherfasst: false, storniert: false });
  const z = A.zeitraumFuer("monat", { datum: "2026-10-07" });
  const csv = A.amtCsv(A.ordnerAmt(s, z, { datum: "2026-10-07" }), "kuehl", ["D", "U", "S", "W", "Mi", "Ma", "Ab", "M", "N", "Na", "Nt", "NA", "L", "St"], { ja: () => "ja", massnahme: (x) => x, nachkontrolle: (x) => x.nachkontrolle });
  assert.match(csv, /;Kühlschrank;/); assert.doesNotMatch(csv, /Buzdolabı/);
  // Müll: gespeichert und exportiert wird der deutsche Katalogname, angezeigt der türkische
  const a = { name: "Knoblauchsauce", gruppe: "sauce", einheit: "kg", packung: { menge: 1, einheit: "kg" }, preis: 5, preisBasis: "netto" };
  s.artikel = [a];
  const e = rohwareWeg(s, a, { datum: "2026-10-05", menge: 0.2, einheit: "kg" });
  assert.equal(e.ref.name, "Knoblauchsauce");
  assert.equal(eintragName(e, s), "Sarımsaklı sos");
  const p = St.schwund(s, z);
  assert.equal(p.zeilen[0].name, "Knoblauchsauce");
  setzeSprache("de");
});
