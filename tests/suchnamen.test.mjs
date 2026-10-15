// Suchnamen (15.10.2026): Türkisch und Englisch in der Müll- und Zutatensuche
import test from "node:test";
import assert from "node:assert/strict";
import { leererBetrieb } from "../js/store.js";
import { KATALOG, VORLAGEN } from "../js/data/katalog.js";
import { SUCHNAMEN, normalisieren, suchRang } from "../js/data/suchnamen.js";
import { zutatenSuchen } from "../js/profil.js";

const ALLE = new Set(Object.values(KATALOG).flatMap((b) => b.produkte.map((p) => p.n)));
const findet = (q) => [...ALLE].filter((n) => suchRang(n, normalisieren(q)) >= 0);

test("normalisieren faltet Türkisch und Umlaute", () => {
  for (const s of ["Soğan", "sogan", "SOGAN", "soğan"]) assert.equal(normalisieren(s), "sogan");
  assert.equal(normalisieren("KIYMA"), "kiyma");
  assert.equal(normalisieren("kıyma"), "kiyma");
  assert.equal(normalisieren("İçecek"), "icecek");
  assert.equal(normalisieren("Salça"), "salca");
  assert.equal(normalisieren("Dönerbrot"), "donerbrot");
  assert.equal(normalisieren("Weißkohl"), "weisskohl");
});

test("türkische und englische Begriffe finden den deutschen Artikel", () => {
  assert.ok(findet("domates").includes("Tomaten"));
  assert.ok(findet("sogan").includes("Zwiebeln"));
  assert.ok(findet("Soğan").includes("Zwiebeln"));
  assert.ok(findet("kiyma").includes("Hackfleisch gemischt"));
  assert.ok(findet("kıyma").includes("Lammhackfleisch"));
  assert.ok(findet("ekmek").includes("Dönerbrot / Fladen"));
  assert.ok(findet("tomato").includes("Tomaten"));
  assert.ok(findet("onion").includes("Zwiebeln"));
  assert.ok(findet("bread").includes("Dönerbrot / Fladen"));
  assert.ok(findet("ayran").includes("Ayran 0,25 l"));
  assert.ok(findet("peynir").includes("Hirtenkäse / Feta"));
  assert.ok(findet("marul").includes("Eisbergsalat"));
  assert.ok(findet("yogurt").includes("Joghurt natur"));
  assert.ok(findet("salça").includes("Tomatenmark"));
  assert.ok(findet("dana döner").includes("Dönerspieß Kalb/Pute"));
  assert.ok(findet("alüminyum folyo").includes("Alufolie-Bogen"));
  assert.ok(findet("dürüm lavaşı").includes("Yufka-Teigblatt"));
});

test("deutscher Name sucht wie bisher, mit und ohne Umlaut", () => {
  assert.ok(findet("Tomat").includes("Tomaten"));
  assert.ok(findet("doner").includes("Dönerbrot / Fladen"));
  assert.equal(suchRang("Tomaten", normalisieren("tomat")), 0);
  assert.equal(suchRang("Tomaten", normalisieren("domates")), 1);
  assert.equal(suchRang("Tomaten", normalisieren("xyz")), -1);
});

test("jeder Schlüssel in SUCHNAMEN steht so im Katalog (keine Tippfehler)", () => {
  for (const n of Object.keys(SUCHNAMEN)) assert.ok(ALLE.has(n), `nicht im Katalog: ${n}`);
  for (const [n, liste] of Object.entries(SUCHNAMEN)) {
    assert.ok(Array.isArray(liste) && liste.length, n);
    for (const b of liste) assert.equal(b, b.toLowerCase(), `klein schreiben: ${n} → ${b}`);
  }
  assert.ok(Object.keys(SUCHNAMEN).length >= 150);
});

test("alle Zutaten der Vorlagen haben Suchnamen (außer Namen, die schon international sind)", () => {
  const ohne = new Set(["Pulled Pork", "Mascarpone", "Gorgonzola", "Remoulade", "Chai-Pulver", "Spätzle", "Aperol", "Mini-Quiche", "Currywurstschale"]);
  const fehlt = [];
  for (const b of Object.values(VORLAGEN)) for (const v of b) for (const [n] of v.zutaten) if (!SUCHNAMEN[n] && !ohne.has(n)) fehlt.push(n);
  assert.deepEqual([...new Set(fehlt)], []);
});

test("Zutatensuche: „domates“ und „ekmek“ finden Katalogartikel, deutsche Treffer zuerst", () => {
  const s = leererBetrieb(); s.ladenArt = "doener";
  assert.ok(zutatenSuchen(s, "domates").some((x) => x.name === "Tomaten"));
  assert.ok(zutatenSuchen(s, "ekmek").some((x) => x.name === "Dönerbrot / Fladen"));
  assert.ok(zutatenSuchen(s, "SOGAN").some((x) => x.name === "Zwiebeln"));
  const r = zutatenSuchen(s, "tomat", { max: 50 }).map((x) => x.name);
  const ersterNurSuchname = r.findIndex((n) => suchRang(n, "tomat") === 1);
  if (ersterNurSuchname >= 0) assert.ok(r.slice(ersterNurSuchname).every((n) => suchRang(n, "tomat") === 1));
});
