// Richtpreise (17.10.2026): Testdaten für Einkaufspreise – nie still, eigener Preis gewinnt immer.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { leererBetrieb } from "../js/store.js";
import { VORLAGEN } from "../js/data/katalog.js";
import { RICHTPREISE, RICHTPREIS_INDEX, STAND } from "../js/data/richtpreise.js";
import { richtpreiseAusCsv } from "../tools/richtpreise.mjs";
import { richtpreiseEinsetzen, richtpreiseEntfernen, richtpreiseAktiv, istRichtpreis } from "../js/richtpreise.js";
import { artikelAusGerichten, kalkulation, preisJeBasis, warenGericht, preisMerken } from "../js/engine.js";
import { gerichtAusVorlage } from "../js/screens/karte.js";
import { monatsZiel, wareneinsatzQuote } from "../js/screens/home.js";
import { einrichtungStand } from "../js/einrichtung.js";
import { warenQuote, zaehler } from "../js/zaehler.js";
import { preisAenderungen, preiseUebernehmen } from "../js/lieferung.js";
import * as I from "../js/inventur.js";

const CSV = new URL("../../audit/preise/richtpreise.csv", import.meta.url);
const vorlage = (name) => { for (const [bereich, l] of Object.entries(VORLAGEN)) { const v = l.find((x) => x.name === name); if (v) return { ...v, bereich }; } return null; };
const A = (name, gruppe, einheit, menge, preis, packEinheit = einheit) => ({ name, gruppe, einheit, packung: { menge, einheit: packEinheit }, gebinde: { art: "packung", zwischen: null }, preis, preisBasis: "netto", preisHistorie: [], status: preis === null ? "offen" : "bekannt" });
function laden() {
  const s = leererBetrieb(); s.betrieb.name = "Test"; s.betrieb.format = "imbiss"; s.betrieb.kuechen = ["doener"]; s.ladenArt = "doener";
  s.gerichte.push({ ...gerichtAusVorlage(vorlage("Döner Kebab")), preis: 7.5 });
  s.artikel = artikelAusGerichten(s); return s;
}
const art = (s, n) => s.artikel.find((a) => a.name === n);

test("Daten: generierte Datei passt zur CSV (69 Artikel mit Preis, gleiche Werte)", { skip: !fs.existsSync(CSV) && "CSV fehlt" }, () => {
  const ausCsv = richtpreiseAusCsv(fs.readFileSync(CSV, "utf8"));
  assert.equal(ausCsv.length, 69); assert.equal(RICHTPREISE.length, 69);
  assert.deepEqual(RICHTPREISE, ausCsv, "js/data/richtpreise.js neu erzeugen: node tools/richtpreise.mjs");
  assert.equal(STAND, "2026-10-17");
  for (const r of RICHTPREISE) { assert.ok(r.preis > 0 && ["kg", "l", "stk"].includes(r.einheit) && r.quellen.length >= 1 && r.methode && r.abruf, r.name); }
  assert.equal(RICHTPREIS_INDEX["Dönerspieß Kalb/Pute"].preis, 15.62);
  assert.ok(!RICHTPREIS_INDEX["Lammhackfleisch"], "Artikel ohne Preis nicht aufnehmen");
});

test("Einsetzen füllt nur leere Preise, eigene bleiben unangetastet", () => {
  const s = laden();
  Object.assign(art(s, "Tomaten"), { preis: 11.9, packung: { menge: 6, einheit: "kg" }, status: "bekannt" });
  const vorher = JSON.stringify(art(s, "Tomaten"));
  const r = richtpreiseEinsetzen(s, { datum: "2026-10-17" });
  assert.equal(JSON.stringify(art(s, "Tomaten")), vorher, "eigener Preis nie angefasst");
  assert.equal(r.uebersprungenEigen, 1);
  assert.deepEqual(r.ohneRichtpreis, ["Eisbergsalat"]);
  assert.equal(r.gesetzt, s.artikel.length - 2);
  const d = art(s, "Dönerspieß Kalb/Pute");
  assert.equal(d.status, "richtpreis"); assert.equal(d.preisBasis, "netto"); assert.ok(istRichtpreis(d));
  assert.deepEqual(d.packung, { menge: 1, einheit: "kg" }); assert.equal(d.preis, 15.62);
  assert.equal(d.preisHistorie.at(-1).herkunft, "richtpreis");
  // zweimal tippen setzt nichts doppelt
  const r2 = richtpreiseEinsetzen(s, { datum: "2026-10-17" });
  assert.equal(r2.gesetzt, 0); assert.equal(r2.schonRichtpreis, r.gesetzt);
  assert.equal(d.preisHistorie.length, 1);
  // Preis ohne Packung = vom Wirt getippt → nicht überschreiben
  const s2 = laden(); Object.assign(art(s2, "Zwiebeln"), { preis: 8.9 });
  richtpreiseEinsetzen(s2); assert.equal(art(s2, "Zwiebeln").preis, 8.9); assert.ok(!istRichtpreis(art(s2, "Zwiebeln")));
  // Preis 0 zählt als „kein Preis“ (Paket 3, M3) → wird gefüllt
  const s3 = laden(); Object.assign(art(s3, "Zwiebeln"), { preis: 0, packung: { menge: 10, einheit: "kg" } });
  richtpreiseEinsetzen(s3); assert.ok(istRichtpreis(art(s3, "Zwiebeln"))); assert.equal(art(s3, "Zwiebeln").preis, 6.43);
});

test("Einheiten: g/kg und Stück werden richtig umgerechnet, kg gegen Stück nicht geraten", () => {
  const s = leererBetrieb();
  s.artikel = [A("Dönerspieß Kalb/Pute", "fleisch", "kg", 15, null), A("Sonnenblumenöl", "gewuerz", "l", 500, null, "ml"), A("Dönertüte", "verpackung", "stk", 1000, null),
    A("Dönerbrot / Fladen", "teig", "stk", null, null), A("Tomaten", "gemuese", "stk", 12, null)];
  const r = richtpreiseEinsetzen(s);
  assert.equal(art(s, "Dönerspieß Kalb/Pute").preis, 234.3, "15-kg-Spieß × 15,62 €/kg");
  assert.equal(art(s, "Sonnenblumenöl").preis, 1.49, "500 ml × 2,98 €/l");
  assert.equal(art(s, "Dönertüte").preis, 14.9, "1000 Stück × 0,0149 €");
  assert.deepEqual(art(s, "Dönerbrot / Fladen").packung, { menge: 1, einheit: "stk" });
  assert.ok(Math.abs(preisJeBasis(art(s, "Dönerspieß Kalb/Pute")) - 0.01562) < 1e-9, "je g");
  assert.ok(Math.abs(preisJeBasis(art(s, "Sonnenblumenöl")) - 0.00298) < 1e-9, "je ml");
  assert.ok(Math.abs(preisJeBasis(art(s, "Dönertüte")) - 0.0149) < 1e-9);
  assert.deepEqual(r.ohneRichtpreis, ["Tomaten"], "Tomaten in Stück gegen Richtpreis je kg: nicht rechnen");
  assert.equal(art(s, "Tomaten").preis, null);
});

test("Gericht mit Richtpreis: Wareneinsatz geschätzt (≈), Quote geschätzt, Cockpit zeigt Richtwert-Zeile", () => {
  const s = laden();
  Object.assign(art(s, "Eisbergsalat"), { preis: 13.5, packung: { menge: 10, einheit: "kg" }, status: "bekannt" }); // Wirt-Preis
  const idx = () => Object.fromEntries(s.artikel.map((a) => [a.name, a]));
  assert.equal(warenGericht(s.gerichte[0], idx()).vollstaendig, false);
  richtpreiseEinsetzen(s);
  const w = warenGericht(s.gerichte[0], idx());
  assert.ok(w.vollstaendig && w.waren > 3 && w.waren < 5, String(w.waren));
  assert.equal(w.geschaetzt, true); assert.equal(w.richtpreis, true);
  const k = kalkulation(s); assert.equal(k.zeilen[0].warenRichtpreis, true); assert.equal(k.geschaetzt, true);
  const q = warenQuote(s); assert.equal(q.quelle, "karte"); assert.equal(q.geschaetzt, true); assert.equal(q.richtpreis, true);
  const z = zaehler(s, { datum: "2026-10-17" }); assert.equal(z.quoteRichtpreis, true); assert.equal(z.geschaetzt, true);
  const m = monatsZiel(s, z, "2026-10-17"); assert.equal(m.geschaetzt, true); assert.equal(m.richtwertWare, true, "Zeile „Richtwert · Preise eintragen ›“");
  assert.equal(wareneinsatzQuote(s, z).richtpreis, true);
});

test("Wirt-Preis ersetzt den Richtpreis: Kennzeichnung weg, keine Preisänderung gemeldet", () => {
  const s = laden(); richtpreiseEinsetzen(s, { datum: "2026-10-10" });
  const t = art(s, "Tomaten"); assert.ok(istRichtpreis(t));
  preisMerken(t, "2026-10-17"); t.preis = 2.4; t.preisDatum = "2026-10-17"; // wie die Eingabe in Einkaufspreise
  assert.equal(istRichtpreis(t), false);
  assert.equal(t.preisHistorie.length, 1, "Richtpreis nicht doppelt im Verlauf");
  assert.deepEqual(preisAenderungen(s, { datum: "2026-10-17" }).map((x) => x.name), [], "Richtpreis → echter Preis ist keine Preisänderung");
  // Lieferschein ersetzt einen Richtpreis: neuer Preis, keine „alt“-Zahl
  const z = art(s, "Zwiebeln"); assert.ok(istRichtpreis(z));
  const aend = preiseUebernehmen(s, { datum: "2026-10-17", zeilen: [{ artikel: "Zwiebeln", jeEinheit: 0.89, inhaltMenge: 10, inhaltEinheit: "kg", menge: 1, netto: 8.9, gebinde: "sack" }] });
  assert.equal(z.preis, 8.9); assert.equal(z.status, "bekannt"); assert.equal(z.richtpreis, undefined); assert.equal(istRichtpreis(z), false);
  assert.deepEqual(aend.map((x) => [x.name, x.alt]), [["Zwiebeln", null]]);
  // Gericht nur noch mit eigenen Preisen → nicht mehr geschätzt (Rezept-Startwerte zählen dort nicht)
  const s2 = laden(); richtpreiseEinsetzen(s2);
  for (const a of s2.artikel) if (istRichtpreis(a)) a.preis = a.preis + 0.01; Object.assign(art(s2, "Eisbergsalat"), { preis: 13.5, packung: { menge: 10, einheit: "kg" } });
  const w = warenGericht(s2.gerichte[0], Object.fromEntries(s2.artikel.map((a) => [a.name, a])));
  assert.equal(w.richtpreis, false); assert.equal(richtpreiseAktiv(s2), 0);
});

test("Entfernen nimmt nur unveränderte Richtpreise zurück", () => {
  const s = laden();
  Object.assign(art(s, "Weißkohl"), { packung: { menge: 10, einheit: "kg" } }); // Packung ohne Preis: bleibt nach dem Entfernen
  richtpreiseEinsetzen(s);
  assert.equal(art(s, "Weißkohl").preis, 7);
  art(s, "Tomaten").preis = 2.5; // vom Wirt geändert
  const r = richtpreiseEntfernen(s);
  assert.equal(r.behalten, 1); assert.equal(r.entfernt, s.artikel.length - 2, "alle außer Eisbergsalat (kein Richtpreis) und Tomaten (geändert)");
  assert.equal(art(s, "Tomaten").preis, 2.5); assert.equal(art(s, "Tomaten").richtpreis, undefined);
  const d = art(s, "Dönerspieß Kalb/Pute"); assert.equal(d.preis, null); assert.equal(d.status, "offen"); assert.equal(d.richtpreis, undefined);
  assert.ok(!d.preisHistorie.some((h) => h.herkunft === "richtpreis"));
  assert.deepEqual(art(s, "Weißkohl").packung, { menge: 10, einheit: "kg" });
  assert.equal(richtpreiseAktiv(s), 0);
});

test("Einrichtung: Richtpreise zählen beim Schritt Einkaufspreise nicht als erledigt", () => {
  const s = laden();
  const schritt = () => einrichtungStand(s).schritte.find((x) => x.id === "einkauf");
  assert.equal(schritt().anteil, 0);
  richtpreiseEinsetzen(s);
  assert.equal(schritt().anteil, 0, "nur Richtpreise: 0 %"); assert.equal(schritt().fertig, false);
  Object.assign(art(s, "Eisbergsalat"), { preis: 13.5, packung: { menge: 10, einheit: "kg" } });
  const n = s.artikel.filter((a) => a.benutzt !== false).length;
  assert.equal(schritt().anteil, 1 / n, "nur der eigene Preis zählt"); assert.equal(schritt().rest, n - 1);
});

test("Inventur: Wert mit Richtpreis ist ≈ und bleibt nach dem Abschluss markiert", () => {
  const s = laden(); richtpreiseEinsetzen(s);
  const inv = I.inventurStarten(s, { datum: "2026-10-17" });
  I.mengeSetzen(inv, "Dönerspieß Kalb/Pute", 2);
  const w = I.inventurWert(s, inv);
  assert.ok(Math.abs(w.summe - 31.24) < 1e-9, String(w.summe)); assert.deepEqual(w.richtpreis, ["Dönerspieß Kalb/Pute"]);
  I.inventurAbschliessen(s, inv, { datum: "2026-10-17" });
  assert.deepEqual(inv.richtpreise, ["Dönerspieß Kalb/Pute"]);
  art(s, "Dönerspieß Kalb/Pute").preis = 99; // späterer Wirt-Preis ändert die abgeschlossene Inventur nicht
  assert.deepEqual(I.inventurWert(s, inv).richtpreis, ["Dönerspieß Kalb/Pute"]);
});
