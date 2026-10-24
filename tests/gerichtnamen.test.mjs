// Gremium 2 (24.10.2026): GERICHTNAMEN, gerichtAnzeige, fotoName mit vorlageName und gerichteVergleich hatten keine Tests.
import test from "node:test";
import assert from "node:assert/strict";
import { GERICHTNAMEN, gerichtAnzeige } from "../js/data/artikelnamen.js";
import { VORLAGEN } from "../js/data/katalog.js";
import { fotoName } from "../js/bilder.js";
import { leererBetrieb } from "../js/store.js";
import { gerichtAusVorlageAnlegen, artikelAbgleichen } from "../js/karte_daten.js";
import { richtpreiseEinsetzen } from "../js/richtpreise.js";
import { gerichteVergleich } from "../js/gerichte_vergleich.js";
import { AMPEL_GRENZEN } from "../js/engine.js";

test("gerichtAnzeige: Pilot-Vorlagen in tr und en, unbekannter Name und Deutsch unverändert", () => {
  for (const laden of ["doener", "burger"]) for (const v of VORLAGEN[laden]) {
    const x = GERICHTNAMEN[v.name]; assert.ok(x && x.tr && x.en, `${v.name}: Übersetzung fehlt`);
    assert.equal(gerichtAnzeige(v.name, "tr"), x.tr); assert.equal(gerichtAnzeige(v.name, "en"), x.en);
    assert.equal(gerichtAnzeige(v.name, "de"), v.name);
  }
  assert.equal(gerichtAnzeige("Gibt es nicht", "tr"), "Gibt es nicht");
  assert.equal(gerichtAnzeige("Döner Kebab", "xx"), GERICHTNAMEN["Döner Kebab"].en, "Sprache ohne Eintrag → Englisch, wie bei Artikelnamen");
  for (const [n, x] of Object.entries(GERICHTNAMEN)) assert.ok(x.tr && x.en, n);
});

test("fotoName: übersetztes Gericht findet sein Foto über vorlageName", () => {
  const de = fotoName({ name: "Döner Kebab" });
  assert.ok(de, "deutscher Name hat ein Foto");
  assert.equal(fotoName({ name: "Ekmek arası döner", vorlageName: "Döner Kebab" }), de);
  assert.equal(fotoName({ name: "Mein eigenes Gericht XY" }), null);
});

test("gerichteVergleich: Gewinn und Quote nach allen Kosten stimmen mit der Ampel überein", () => {
  const s = leererBetrieb(); s.betrieb.name = "T"; s.betrieb.format = "imbiss"; s.ladenArt = "doener"; s.phase = "app";
  s.kosten.push({ id: "k1", kategorie: "miete", posten: "miete", betrag: 1500, status: "bekannt", periode: "monat", basis: "netto" });
  for (const v of VORLAGEN.doener.slice(0, 5)) { const g = gerichtAusVorlageAnlegen(s, v); g.preis = 7.5; }
  artikelAbgleichen(s); richtpreiseEinsetzen(s, { datum: "2026-10-24" });
  const v = gerichteVergleich(s); const zeilen = [...v.mit, ...v.ohne];
  assert.ok(zeilen.length >= 5);
  for (const x of zeilen) {
    if (x.gewinn === null) { assert.equal(x.ampel, "grau"); continue; }
    assert.ok(Math.abs(x.gewinn * 100 - Math.round(x.gewinn * 100)) < 1e-6, "centgerundet");
    const erwartet = x.quote < AMPEL_GRENZEN.rot - 1e-9 ? "rot" : x.quote < AMPEL_GRENZEN.gruen - 1e-9 ? "gelb" : "gruen";
    assert.equal(x.ampel, erwartet, `${x.g.name}: Quote ${x.quote} → ${x.ampel}`);
  }
});
