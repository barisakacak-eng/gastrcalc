// Prüfstand für den Prüfungsausschuss (Freitag 06.11.2026), erzeugt am 02.11.2026:
// tests/fixtures/pruefstand/pruefstand_sicherung.zip = Sicherung zweier erfundener Beispiel-Läden (Döner-Grill und Burger-Truck, „(Probe)“)
// mit den 14 Geschäftstagen der Generalprobe (19.12.2026–01.01.2027), importierbar über Büro → Sicherung → Einlesen.
// pruefstand_soll.json = Sollwerte, im selben Lauf VOR dem Export aus dem Stand gerechnet (tests/hilfe/generalprobe.mjs --sicherung=…).
// Neu erzeugen: TZ=Europe/Berlin node tests/hilfe/generalprobe.mjs --leise --sicherung=tests/fixtures/pruefstand
// Beweis hier: Einlesen auf einem leeren Gerät (frische Speicher-Attrappe, leere Wurzel, wie app.js) → beide Läden da, alle 14 Tage da,
// Cockpit-Zahl und Zählerstand je Laden auf den Cent gleich wie vor dem Export, Einträge je Liste gleich viele; Speichern und erneutes Laden ändert nichts.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const RealDate = Date; const JETZT = RealDate.parse("2027-01-01T22:59:00Z"); // feste Uhr: Ende von Tag 14 (wie beim Export)
class FakeDate extends RealDate { constructor(...a) { if (a.length === 0) super(JETZT); else super(...a); } static now() { return JETZT; } }
globalThis.Date = FakeDate;
const ORT = new URL("./fixtures/pruefstand/", import.meta.url);
const soll = JSON.parse(fs.readFileSync(new URL("pruefstand_soll.json", ORT), "utf8"));
const datei = new Blob([fs.readFileSync(new URL("pruefstand_sicherung.zip", ORT))]);
const i18n = await import("../js/i18n.js"); i18n.setzeSprache("de");
const { idbAttrappe } = await import("./hilfe/idb_attrappe.mjs"); idbAttrappe();
const st = await import("../js/store.js"); const Z = await import("../js/zaehler.js"); const LZ = await import("../js/laden_zahlen.js");
const r2 = (x) => Math.round(x * 100) / 100;

function pruefen(wurzel, wo) {
  assert.equal(wurzel.betriebe.length, 2, `${wo}: zwei Läden`);
  for (const L of soll.laeden) {
    const b = wurzel.betriebe.find((x) => x.betrieb.name === L.name); assert.ok(b, `${wo}: Laden ${L.name} fehlt`);
    const tage = [...new Set((b.tagesnotizen || []).filter((n) => !n.storniert && typeof n.umsatz === "number").map((n) => n.datum))].sort();
    assert.deepEqual(tage, L.tage, `${wo}: Tage ${L.name}`); assert.equal(tage.length, 14);
    const z = Z.zaehler(b, { datum: soll.datum }); const hz = LZ.heuteZiel(b, z, soll.datum);
    assert.deepEqual({ stufe: hz.stufe, zahl: hz.zahl === null ? null : r2(hz.zahl) }, L.cockpit, `${wo}: Cockpit ${L.name}`);
    assert.equal(r2(z.stand), L.zaehlerStand, `${wo}: Zählerstand ${L.name}`);
    for (const [j, n] of Object.entries(L.eintraege)) assert.equal((b[j] || []).length, n, `${wo}: ${L.name} ${j}`);
  }
}

test("Prüfstand: Sicherung auf leerem Gerät einlesen → beide Läden, 14 Tage, Cockpit-Zahl wie vor dem Export", async () => {
  await st.laden(); const w = st.leereWurzel();
  const imp = await st.importSicherung(datei); assert.equal(imp.pruefsumme, "ok", "Prüfsumme der Datei");
  st.zusammenfuehren(w, imp.wurzel); pruefen(w, "nach dem Einlesen");
  await st.sofortSpeichern(w);
  const st2 = await import("../js/store.js?pruefstandNeu"); const geladen = await st2.laden(); pruefen(geladen, "nach Speichern und neuem Laden");
});

test("Prüfstand: Sollwerte sind echte Zahlen (kein leerer Laden, Cockpit hat eine Zahl)", () => {
  for (const L of soll.laeden) { assert.ok(L.cockpit.zahl > 0, L.name); assert.ok(L.eintraege.tagesnotizen >= 14 && L.eintraege.schwund > 0 && L.eintraege.messungen > 0, L.name); }
});
