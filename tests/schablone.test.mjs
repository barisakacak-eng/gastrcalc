// Schablone 27.10.2026: Preis-Plausibilität beim Karte-Lesen, Zeki-Log (Fragen für später), Führung, Kontakt-Mail, Büro-Zeitfenster
import test from "node:test";
import assert from "node:assert/strict";
import { preisAuffaellig } from "../js/karte_lesen.js";
import { zekiLogAnhaengen, rundgangAbschliessen, kontaktSetzen } from "../js/stamm.js";
import { BUERO_OFFEN_MS, bioSetzen, bioKennung } from "../js/modus.js";

test("Karte lesen: 48 € für Maccaroni ist auffällig, 7,50 € nicht; über 30 € immer", () => {
  const alle = [7, 8, 12.5, 7, 6, 8.5, 9.5, 48, 4, 2, 2.5].map((preis, i) => ({ id: "v" + i, preis, an: true }));
  assert.equal(preisAuffaellig(alle[7], alle), true);
  assert.equal(preisAuffaellig(alle[0], alle), false);
  assert.equal(preisAuffaellig({ preis: 31 }, []), true);
  assert.equal(preisAuffaellig({ preis: null }, alle), false);
});

test("Zeki-Log: Fragen bleiben lokal im Laden, höchstens 1000 Einträge; Führung wird mit Ergebnis gemerkt", () => {
  const s = {};
  assert.equal(zekiLogAnhaengen(s, { art: "frage-frei", inhalt: "Wie trage ich Personalessen ein?" }), 1);
  assert.equal(zekiLogAnhaengen(s, {}), 0, "ohne Art kein Eintrag"); assert.equal(s.zekiLog.length, 1);
  for (let i = 0; i < 1100; i++) zekiLogAnhaengen(s, { art: "frage-katalog", inhalt: "f" + i });
  assert.equal(s.zekiLog.length, 1000);
  assert.ok(s.zekiLog.every((e) => typeof e.t === "string"));
  rundgangAbschliessen(s, "verstanden"); assert.equal(s.fuehrung.ergebnis, "verstanden"); assert.equal(s.fuehrung.mal, 1);
  assert.equal(s.rundgang, undefined, "kein Konflikt mit dem Kühl-Rundgang");
});

test("Kontakt-Mail: freiwillig, nur gültige Adressen, leer löscht", () => {
  const s = { betrieb: {} };
  assert.equal(kontaktSetzen(s, "buch", "kein-mail"), false);
  assert.equal(kontaktSetzen(s, "buch", "stb@beispiel.de"), true); assert.equal(s.betrieb.kontakte.buch, "stb@beispiel.de");
  assert.equal(kontaktSetzen(s, "buch", ""), true); assert.equal(s.betrieb.kontakte.buch, undefined);
  assert.equal(kontaktSetzen(s, "amt", "x@y.de"), false);
});

test("Schloss: Büro bleibt 15 Minuten offen; Face-ID-Kennung wird nur als Kennung gespeichert", () => {
  assert.equal(BUERO_OFFEN_MS, 15 * 60 * 1000);
  const w = {}; bioSetzen(w, "abc123"); assert.equal(bioKennung(w), "abc123"); bioSetzen(w, null); assert.equal(bioKennung(w), null);
});
