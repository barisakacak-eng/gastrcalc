// Salbei & Papier: Kopf „Bühne“ (js/buehne.js) – eine Figur, keine Sprechblase, Satz als Knopf nur mit Aktion, alles über esc().
import test from "node:test";
import assert from "node:assert/strict";
import { buehneHtml } from "../js/buehne.js";

const KOPF = '<button class="ikonknopf" aria-label="Zurück">‹</button><span>Heute</span>';
const alle = [
  buehneHtml({ kopf: KOPF, titel: "Kühlung prüfen", satz: "Erklär’s mir", satzAktion: "hilfe", schluessel: "start" }),
  buehneHtml({ kopf: KOPF, titel: "Was ist weg?", satz: "Zeig mir, wie", schluessel: "foto-auswahl" }),
  buehneHtml({ kopf: KOPF, titel: "Tag abgeschlossen", schluessel: "geschafft" }),
  buehneHtml({ kopf: KOPF, schluessel: "buero" }),
  buehneHtml({ kopf: KOPF, titel: "x", schluessel: "gibt-es-nicht", klasse: "gc-muell" }),
  buehneHtml(),
];

test("Aufbau: header gc-buehne, Kopfzeile, Innenbereich, genau eine Figur", () => {
  for (const h of alle) {
    assert.match(h, /^<header class="[^"]*\bgc-buehne\b[^"]*"><div class="gc-kopf">/); assert.match(h, /<div class="gc-buehne-innen">/); assert.ok(h.endsWith("</div></header>"));
    assert.equal((h.match(/class="gc-figur"/g) || []).length, 1, "genau ein Zeki"); assert.equal((h.match(/<img /g) || []).length, 1); assert.match(h, /alt=""/);
  }
  assert.ok(alle[0].includes(`<div class="gc-kopf">${KOPF}</div>`), "Kopfzeile des Aufrufers unverändert");
  assert.match(alle[4], /^<header class="gc-muell gc-buehne">/); assert.match(alle[0], /^<header class="gc-buehne">/);
});

test("Titel als h1, Satz als Zeile; als Knopf nur mit Aktion; keine Sprechblase", () => {
  assert.match(alle[0], /<h1>Kühlung prüfen<\/h1>/); assert.match(alle[0], /<button type="button" class="gc-satz" data-a="hilfe">Erklär’s mir<\/button>/); assert.doesNotMatch(alle[0], /<p class="gc-satz"/);
  assert.match(alle[1], /<p class="gc-satz">Zeig mir, wie<\/p>/); assert.doesNotMatch(alle[1], /<button type="button" class="gc-satz"|data-a=/);
  assert.doesNotMatch(alle[2], /gc-satz/); assert.doesNotMatch(alle.join(""), /blase/i);
  assert.equal(buehneHtml({ titel: "a", satzAktion: "hilfe", schluessel: "start" }).includes("data-a"), false, "Aktion ohne Satz: kein leerer Knopf");
});

test("Ohne Satz und ohne Titel bleibt der Innenbereich niedrig", () => {
  for (const i of [3, 5]) { assert.match(alle[i], /\bgc-buehne-niedrig\b/); assert.doesNotMatch(alle[i], /gc-buehne-text|<h1>|<p/); }
  for (const i of [0, 1, 2, 4]) assert.doesNotMatch(alle[i], /gc-buehne-niedrig/);
});

test("Alles über esc(); falscher Schlüssel: ruhige Haltung; RTL setzt kein dir (macht das CSS)", () => {
  const h = buehneHtml({ titel: '<img src=x onerror=1>', satz: '"><script>x</script>', satzAktion: 'a"b', schluessel: '"><b>', klasse: 'k" onclick="1' });
  assert.doesNotMatch(h, /<script|<img src=x|onerror=1>|<b>/); assert.doesNotMatch(h, /onclick="1/); assert.match(h, /&lt;img src=x onerror=1&gt;/); assert.match(h, /data-a="a&quot;b"/);
  assert.match(h, /data-zeki-buehne="intro"/);
  for (const x of [...alle, buehneHtml({ titel: "ا", schluessel: "start", rtl: true })]) assert.doesNotMatch(x, /\bdir=/);
  assert.match(buehneHtml({ titel: "ا", schluessel: "start", rtl: true }), /data-gespiegelt="1"/);
});
