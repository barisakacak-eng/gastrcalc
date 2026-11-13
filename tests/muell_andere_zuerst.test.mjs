// Verhalten (b): frischer Döner-Laden ohne Spieß/Pommes/Cola → „Andere“ steht prominent als erste Kachel; mit diesen Waren nicht. Jede Zeile/Kachel hat ein Bild.
import test from "node:test";
import assert from "node:assert/strict";
globalThis.document ??= { documentElement: {} };
import { leererBetrieb } from "../js/store.js";
import { muellView, muellZuruecksetzen, _andereZuerst } from "../js/screens/muell.js";

const frisch = (artikel) => {
  const s = leererBetrieb(); s.phase = "app"; s.betrieb.name = "Test"; s.betrieb.kuechen = ["doener"]; s.gerichte = []; s.schwund = [];
  s.artikel = artikel.map((name) => ({ name, gruppe: "fleisch", einheit: "kg", packung: { menge: 10, einheit: "kg" }, preis: 90, preisBasis: "netto", benutzt: true }));
  return s;
};

test("Döner-Laden ohne Spieß, Pommes, Cola: „Andere“ zuerst", () => {
  muellZuruecksetzen();
  const s = frisch(["Knoblauchsauce", "Fladenbrot"]);
  assert.equal(_andereZuerst(s), true);
  const h = muellView(s);
  assert.match(h, /class="muellraster andere-zuerst"/);
  assert.ok(h.indexOf("ware andere") > 0 && h.indexOf("ware andere") < h.indexOf('class="karte ware', h.indexOf("andere-zuerst") + 30) || (h.match(/ware andere/g) || []).length === 1);
  const raster = h.slice(h.indexOf("muellraster")); const ersterKnopf = raster.indexOf("<button");
  assert.ok(raster.slice(ersterKnopf, ersterKnopf + 200).includes("andere"), "erster Knopf im Raster ist „Andere“");
});

test("Mit Dönerspieß, Pommes oder Cola: normale Reihenfolge", () => {
  muellZuruecksetzen();
  for (const w of ["Dönerspieß", "Pommes", "Cola", "Hähnchenspieß"]) assert.equal(_andereZuerst(frisch([w])), false, w);
  const h = muellView(frisch(["Dönerspieß", "Knoblauchsauce"]));
  assert.doesNotMatch(h, /andere-zuerst/);
});

test("Müll-Raster: jede Kachel trägt ein Bild aus foto/ oder bilder/", () => {
  muellZuruecksetzen();
  for (const arts of [["Knoblauchsauce", "Fladenbrot"], ["Dönerspieß", "Pommes", "Cola"]]) {
    const h = muellView(frisch(arts)); const raster = h.slice(h.indexOf("muellraster"));
    const kacheln = raster.split(/<(?:div|button)[^>]*class="karte ware/).slice(1);
    assert.ok(kacheln.length >= 2);
    for (const k of kacheln) assert.match(k.split("</button>")[0], /<img[^>]+src="(foto|bilder)\//);
  }
});

import { beispielLaden } from "../js/beispiel.js";
import { karteLadenView, karteLadenZuruecksetzen } from "../js/screens/karte_laden.js";
import { kuehlView } from "../js/screens/kuehl.js";

test("Karte im Laden: jede Gericht-Zeile trägt ein Bild aus foto/ oder bilder/", () => {
  karteLadenZuruecksetzen();
  const h = karteLadenView(beispielLaden("2026-10-26"));
  const zeilen = h.split('class="kl-gericht kl-zeile').slice(1);
  assert.ok(zeilen.length >= 3);
  for (const z of zeilen) assert.match(z.split('class="kl-preis"')[0], /<img[^>]+src="(foto|bilder)\//);
});

test("Kühlung: Start-Ansicht des Beispiel-Ladens zeigt Bilder in den Zeilen", () => {
  const h = kuehlView(beispielLaden("2026-10-26"));
  assert.match(h, /<img[^>]+src="(foto|bilder)\//);
});
