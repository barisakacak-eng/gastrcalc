// Lauf 5 (12.11.2026): L15b live, Abgaben-Satz je Mitarbeiterart (Baris 11.11. 23:14)
import { test } from "node:test";
import assert from "node:assert/strict";

// Goldwert von Hand (js/data/lohnkosten.js, Stand 2026):
// Angestellt: 21,15 % + 2,69 % + BGN 1,04 % = 24,88 %   Minijob: 31,17 % + 1,04 % = 32,21 %
// Tag 1: Angestellt 16 h × 14 € = 224 € Brutto → 224 × 0,2488 = 55,7312 €
// Tag 2: Minijob 10 h × 13 € = 130 € Brutto → 130 × 0,3221 = 41,873 €
// gewichtet: (55,7312 + 41,873) / 354 = 97,6042 / 354 = 0,275718… → „≈ 28 %“
test("Abgaben: Angestellte ≈ 25 %, Minijob ≈ 32 %, gemischt gewichtet ≈ 28 %", async () => {
  const { abgabenSatz } = await import("../js/stamm.js");
  const tag = (datum, art, stunden, satz) => ({ datum, keine: false, eintraege: [{ person: null, kompakt: true, personen: 1, stunden, satz, art }] });
  const a = { teamTage: [tag("2026-11-02", "angestellt", 16, 14)] }, m = { teamTage: [tag("2026-11-03", "minijob", 10, 13)] };
  assert.deepEqual([Math.round(abgabenSatz(a, "2026-11-01", "2026-11-30").satz * 100), abgabenSatz(a, "2026-11-01", "2026-11-30").art], [25, "angestellt"]);
  assert.deepEqual([Math.round(abgabenSatz(m, "2026-11-01", "2026-11-30").satz * 100), abgabenSatz(m, "2026-11-01", "2026-11-30").art], [32, "minijob"]);
  const g = abgabenSatz({ teamTage: [...a.teamTage, ...m.teamTage] }, "2026-11-01", "2026-11-30");
  assert.equal(g.art, "gemischt"); assert.ok(Math.abs(g.satz - 97.6042 / 354) < 1e-9); assert.equal(Math.round(g.satz * 100), 28);
  assert.equal(abgabenSatz({ teamTage: [] }, "2026-11-01", "2026-11-30"), null, "nur Monats-Lohnsumme: kein Satz (Abgaben schon drin)");
  assert.equal(abgabenSatz({ teamTage: [tag("2026-10-30", "minijob", 10, 13)] }, "2026-11-01", "2026-11-30"), null, "Vormonat zählt nicht");
});
test("Kurze Laden-Sätze kommen aus der Sprachdatei (l15b): Kühl-Alarm und Abgaben", async () => {
  const { t, setzeSprache } = await import("../js/i18n.js"); setzeSprache("de");
  assert.equal(t("l15b.warm", "Kühlschrank 1"), "Kühlschrank 1 zu warm. Gleich nachsehen.");
  assert.equal(t("l15b.abgaben", "28", "gemischt"), "Mit ≈ 28 % Abgaben des Arbeitgebers (Angestellte und Minijob, gewichtet).");
});

// P1 D5: Döner-Laden ohne Müll-Verlauf – Spieß, Pommes, Cola vorne (nur angelegte Waren)
test("Müll-Kacheln Döner: Spieß, Pommes, Cola vorne", async () => {
  const { haeufigsteMuell } = await import("../js/muell.js");
  const art = (name, gruppe) => ({ name, gruppe, einheit: "kg", benutzt: true });
  const s = { betrieb: { kuechen: ["doener", "pizza"] }, gerichte: [], schwund: [],
    artikel: [art("Pizzateig", "teig"), art("Knoblauchsauce", "sauce"), art("Ayran 0,25 l", "getraenk"), art("Cola 0,33 l", "getraenk"), art("Pommes frites", "teig"), art("Dönerspieß Kalb/Pute", "fleisch")] };
  const namen = haeufigsteMuell(s, { datum: "2026-11-12", max: 10000 }).filter((x) => x.typ === "artikel").slice(0, 3).map((x) => x.name);
  assert.deepEqual(namen, ["Dönerspieß Kalb/Pute", "Pommes frites", "Cola 0,33 l"]);
  s.betrieb.kuechen = ["pizza"];
  assert.equal(haeufigsteMuell(s, { datum: "2026-11-12", max: 10000 })[0].name, "Pizzateig", "ohne Döner bleibt die alte Reihenfolge");
});

// P1 D5: Einrichtung schlug für Döner keine Kühlstellen vor (alle 0)
test("Einrichtung Döner: Vorschlag Kühlschrank, Getränkekühlschrank, Tiefkühler", async () => {
  const { leererStand } = await import("../js/store.js").catch(() => ({}));
  const { SCHNELL } = await import("../js/screens/onboarding.js");
  const k = SCHNELL.find((x) => x.id === "kuehl-schnell");
  const s = { betrieb: { kuechen: ["doener"] }, kuehlstellen: [], kuehl: {} };
  assert.match(k.view(s), /data-a="s2-kuehl-vorschlag"/);
  assert.equal(k.aktion("s2-kuehl-vorschlag", { dataset: {} }, s), true);
  assert.deepEqual(s.kuehlstellen.map((x) => [x.typ, x.art]), [["kuehlschrank", "kuehl"], ["getraenke", "kuehl"], ["tiefkuehler", "tk"]]);
  assert.ok(s.kuehlstellen.every((x) => x.min === null && x.max === null), "keine eigenen Grenzwerte – es gilt der Standard je Art");
  assert.doesNotMatch(k.view(s), /s2-kuehl-vorschlag/, "nach dem Übernehmen kein Vorschlag mehr");
  assert.doesNotMatch(k.view({ betrieb: { kuechen: ["pizza"] }, kuehlstellen: [], kuehl: {} }), /s2-kuehl-vorschlag/);
});

// P1 D5: Schicht „Speichern“ ohne Bestätigung, Karte klappte zu
test("Schicht speichern: kurze Bestätigung, Karte bleibt offen", async () => {
  const { leererBetrieb } = await import("../js/store.js"); const g = await import("../js/screens/geld3.js");
  const s = leererBetrieb(); s.betrieb = { ...s.betrieb, name: "T", format: "imbiss", ustRhythmus: "monat" }; s.personen = [{ id: "p", kuerzel: "AB", aktiv: true }];
  g.geld3Eingabe("g3-s-von", "11:00", s); g.geld3Eingabe("g3-s-bis", "19:00", s);
  assert.equal(g.geld3Aktion("g3-schicht", { dataset: {} }, s), true); assert.equal((s.schichten || []).length, 1);
  const html = g.geld3View(s).match(/data-g3="schicht"[\s\S]*?<\/details>/)[0];
  assert.match(html, /data-klapp="g3-schicht" open/); assert.match(html, /role="status">Eingetragen\./);
  g.geld3Eingabe("g3-s-von", "12:00", s); assert.doesNotMatch(g.geld3View(s), /role="status">Eingetragen\./, "neue Eingabe: Bestätigung weg");
});
