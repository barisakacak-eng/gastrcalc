// Vorab-Prüfung 03.11.2026, Klasse D (04.11.2026): Sprach- und Bildreste, die sich ohne Browser prüfen lassen.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const { wareBildQuelle } = await import("../js/bilder.js");
const { sym } = await import("../js/symbole.js");
const i18n = await import("../js/i18n.js");
const src = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const ohneKommentar = (s) => s.split("\n").map((z) => z.replace(/(^|\s)\/\/ .*$/, "")).join("\n");

test("D tr: kein Ketchup-Foto für Kräutersauce (Otlu sos) und Pizzasoße; andere Soßen wie bisher", () => {
  for (const name of ["Kräutersauce", "Pizzasoße", "Tomatensauce"]) assert.notEqual(wareBildQuelle({ name, gruppe: "ware" }).foto, "r-ketchup-mayo", name);
  assert.equal(wareBildQuelle({ name: "Cocktailsauce", gruppe: "ware" }).foto, "r-ketchup-mayo");
  assert.equal(wareBildQuelle({ name: "Knoblauchsauce", gruppe: "ware" }).foto, "r-knoblauchsauce");
});
test("D ar: Richtungs-Pfeile tragen die Klasse „richtung“ (in RTL gespiegelt), andere Symbole nicht", () => {
  for (const n of ["chevron-right", "chevron-left"]) assert.match(sym(n), /class="sym richtung/);
  assert.doesNotMatch(sym("x"), /richtung/);
  assert.match(src("css/zielbild.css"), /\[dir="rtl"\] svg\.sym\.richtung[^{]*\{ scale: -1 1; \}/);
});
test("D tr/ar: keine deutschen Anführungszeichen „…“ in Texten; tr “…”, ar «…»", () => {
  assert.doesNotMatch(ohneKommentar(src("js/lang/tr.js")), /„/);
  const ar = ohneKommentar(src("js/lang/ar.js")); assert.doesNotMatch(ar, /„[^“\n]*[؀-ۿ$][^“\n]*“/);
});
test("D tr: Zeki-Blatt ohne festes „OK“, Knopf aus der Sprachdatei (tr „Tamam“)", async () => {
  assert.doesNotMatch(src("js/screens/ebene.js"), />OK</);
  await i18n.ladeSprache("tr"); i18n.setzeSprache("tr"); assert.equal(i18n.t("allgemein.ok"), "Tamam");
  assert.ok(i18n.t("teamTag.stdZusammen").includes(" "), "„sa. toplam“ bricht nicht um"); i18n.setzeSprache("de"); assert.equal(i18n.t("allgemein.ok"), "OK");
});
test("D: Personal-Kopf ohne Namen zeigt kein „?“-Rund; Fassung in der Versionszeile isoliert (bdi ltr)", () => {
  assert.doesNotMatch(src("js/screens/personal.js"), /name \|\| "\?"/);
  assert.match(src("js/screens/home.js"), /<bdi dir="ltr" class="fassung-nr">/);
});
