// 27.10.2026 (Baris): „Bis null“ ist fest + beweglich und bewegt sich jeden Tag; Laden und Büro zeigen dieselbe Rechnung.
import test from "node:test";
import assert from "node:assert/strict";
import { beispielLaden } from "../js/beispiel.js";
import { zaehler, monatsZiel } from "../js/zaehler.js";
import { heuteZiel } from "../js/laden_zahlen.js";
import { teamTagSetzen } from "../js/stamm.js";
import { tagesnotizSetzen } from "../js/engine.js";

test("Mitarbeiter heute bewegt bis null (Brutto × Arbeitgeberanteil)", () => {
  const s = beispielLaden("2026-10-26"); const H = "2026-10-26";
  const vor = monatsZiel(s, zaehler(s, { datum: H }), H).nullpunkt;
  teamTagSetzen(s, H, [{ person: null, name: "X", stunden: 16, satz: 20, art: "angestellt" }]);
  const z = zaehler(s, { datum: H }); const nach = monatsZiel(s, z, H).nullpunkt;
  assert.ok(z.lohnEchtTage === 1);
  assert.notEqual(Math.round(vor), Math.round(nach));
});

test("Laden-Stufe = Monatsziel-Stufe (keine zwei Wahrheiten)", () => {
  const s = beispielLaden("2026-10-26");
  for (const H of ["2026-10-05", "2026-10-15", "2026-10-22", "2026-10-26"]) {
    const z = zaehler(s, { datum: H }); const m = monatsZiel(s, z, H); const w = heuteZiel(s, z, H);
    assert.equal(w.stufe, m.stufe, H);
    if (w.stufe === "bisNull") assert.ok(Math.abs(w.zahl - m.fehltNull) < 1e-6, H);
  }
});

test("Vergessene erste Tage sparen keine festen Kosten", () => {
  const s = beispielLaden("2026-10-26"); s.angelegt = "2026-09-01T08:00:00Z";
  const mit = zaehler(s, { datum: "2026-10-20" });
  s.tagesnotizen = s.tagesnotizen.filter((x) => x.datum > "2026-10-05");
  const ohne = zaehler(s, { datum: "2026-10-20" });
  assert.equal(ohne.start, "2026-10-01");
  assert.ok(Math.abs(ohne.kosten - mit.kosten) < 1e-6);
});

test("Umsatz senkt bis null", () => {
  const s = beispielLaden("2026-10-26"); const H = "2026-10-08";
  const a = monatsZiel(s, zaehler(s, { datum: H }), H).fehltNull;
  tagesnotizSetzen(s, H, 5000); // der Tag war ≈ 900 €, jetzt deutlich mehr
  const b = monatsZiel(s, zaehler(s, { datum: H }), H).fehltNull;
  assert.ok(a > 0 && b < a);
});

test("Gegenprüfung 27.10.: ein Mitarbeiter-Eintrag wird nicht auf den Monat hochgerechnet", () => {
  const s = beispielLaden("2026-10-26"); const H = "2026-10-15";
  const vor = monatsZiel(s, zaehler(s, { datum: H }), H).fehltNull;
  teamTagSetzen(s, H, [{ name: "A", stunden: 10, satz: 15 }, { name: "B", stunden: 10, satz: 15 }]);
  const z = zaehler(s, { datum: H }); const nach = monatsZiel(s, z, H).fehltNull;
  const anteil = z.tageskostenPrognose - z.tageskostenFest; // anteiliger Lohn je Öffnungstag
  const echt = z.tage.find((t) => t.datum === H).lohn;
  const erwartet = (echt - anteil) / (1 - z.quoteEff) * (1 + z.steuer);
  assert.ok(Math.abs((nach - vor) - erwartet) < 1, `${nach - vor} statt ${erwartet}`);
});

test("Gegenprüfung 27.10.: Eintrag ohne Stundenlohn zählt nicht als 0 €", () => {
  const s = beispielLaden("2026-10-26"); const H = "2026-10-15";
  const vor = monatsZiel(s, zaehler(s, { datum: H }), H).fehltNull;
  teamTagSetzen(s, H, [{ name: "A", stunden: 8, satz: null }]);
  const nach = monatsZiel(s, zaehler(s, { datum: H }), H).fehltNull;
  assert.ok(Math.abs(nach - vor) < 1e-6);
});

test("Fester Monatslohn zählt als feste Kosten mit Arbeitgeberanteil, nicht täglich", async () => {
  const { festPersonalMonat, kostenJeMonat } = await import("../js/data/lohnkosten.js");
  const { teamFrageNoetig } = await import("../js/screens/umsatz_laden.js");
  const s = beispielLaden("2026-10-26"); const H = "2026-10-15";
  for (const p of s.personen) { p.lohnModell = "monat"; p.monatsBrutto = 3000; p.lohnArt = "angestellt"; }
  assert.ok(Math.abs(festPersonalMonat(s) - 2 * kostenJeMonat(3000, "angestellt")) < 1e-6);
  assert.equal(teamFrageNoetig(s), false);
  const z = zaehler(s, { datum: H });
  assert.ok(z.tageskostenPrognose - z.tageskostenFest < 1e-6 || z.last.lohn > z.last.festPersonal);
  // „Nein, heute keiner da“ ändert bei festem Lohn nichts
  const vor = monatsZiel(s, z, H).fehltNull; teamTagSetzen(s, H, []);
  const nach = monatsZiel(s, zaehler(s, { datum: H }), H).fehltNull;
  assert.ok(Math.abs(nach - vor) < 1e-6 || z.last.lohn > z.last.festPersonal);
});

test("Urlaub/Krankheit am Monatsende: Tage × übliche Stunden × Brutto × Aufschlag bewegen bis null", async () => {
  const { abwesendSetzen } = await import("../js/stamm.js");
  const { abwesendFrageNoetig } = await import("../js/screens/umsatz_laden.js");
  const { kostenJeStunde } = await import("../js/data/lohnkosten.js");
  const s = beispielLaden("2026-10-26"); const p = s.personen[0]; p.stundenlohn = 14; p.lohnArt = "angestellt";
  assert.equal(abwesendFrageNoetig(s, "2026-10-29"), true); assert.equal(abwesendFrageNoetig(s, "2026-10-20"), false);
  const H = "2026-10-29"; const vor = zaehler(s, { datum: H }).kosten;
  abwesendSetzen(s, H, [{ person: p.id, name: p.kuerzel, tage: 2, stundenTag: 8, satz: 14, art: "angestellt" }]);
  const nach = zaehler(s, { datum: H }).kosten;
  assert.ok(Math.abs((nach - vor) - 2 * 8 * kostenJeStunde(14, "angestellt")) < 1e-6);
  assert.equal(abwesendFrageNoetig(s, "2026-10-30"), false); // einmal je Monat
});

test("Gegenprüfung F6: Stufe 3 mit Kartenquote zählt den Müll in der Monatsrechnung", () => {
  const s = beispielLaden("2026-10-26"); const H = "2026-10-26";
  const z = zaehler(s, { datum: H });
  if (z.stufe === 3 && !(z.quoteFenster >= z.quote)) assert.ok(z.muellPrognose >= 0);
  const m = monatsZiel(s, z, H);
  const erwartet = (z.kosten + z.tageskostenPrognose * z.gewichtZukunft + z.muell + (z.muellPrognose || 0) + (z.schwund || 0)) / (1 - z.quoteEff) * (1 + z.steuer);
  assert.ok(Math.abs(m.nullpunkt - erwartet) < 1e-6);
});

test("Prüfung L3: Schwund ohne Erklärung aus der Inventur zählt in Stufe 1/2 als Kosten", async () => {
  const { inventurenFertig, inventurVergleich } = await import("../js/inventur.js");
  const s = beispielLaden("2026-10-26"); const H = "2026-10-26"; const z = zaehler(s, { datum: H });
  const f = inventurenFertig(s); let erwartet = 0;
  for (let i = 1; i < f.length; i++) { const v = inventurVergleich(s, f[i], f[i - 1]); if (v && v.bis.startsWith("2026-10") && v.bis <= H) erwartet += v.ohneErklaerung || 0; }
  assert.ok(Math.abs(z.schwund - (z.stufe === 3 ? 0 : erwartet)) < 1e-6);
  const m = monatsZiel(s, z, H);
  const k = z.kosten + z.tageskostenPrognose * z.gewichtZukunft + z.muell + (z.muellPrognose || 0) + z.schwund;
  assert.ok(Math.abs(m.nullpunkt - k / (1 - z.quoteEff) * (1 + z.steuer)) < 1e-6);
});

