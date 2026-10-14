// Etappe 6, Punkt 9: Laden-Profile und Datenregister
import test from "node:test";
import assert from "node:assert/strict";
import { leererBetrieb } from "../js/store.js";
import { KATALOG, VORLAGEN } from "../js/data/katalog.js";
import { PROFILE, PAKETE, STUFEN, GRUNDBEDARF, NUR_ANDERE, ladenArtenFuer } from "../js/data/register.js";
import { profilFuer, profilAusKarte, bereicheSortiert, vorlagenSortiert, zutatenSuchen, ladenArtVon } from "../js/profil.js";
import { BEREICH_JE_FAMILIE, GRUNDREZEPTE } from "../js/rezept_baukasten.js";
import { LADEN_ARTEN } from "../js/screens/onboarding.js";
import { vorschlaegeAusText } from "../js/karte_lesen.js";

const laden = (art) => { const s = leererBetrieb(); const a = LADEN_ARTEN.find((x) => x.id === art); s.ladenArt = a.id; s.betrieb.format = a.format; s.betrieb.kuechen = [...a.kuechen]; return s; };

test("jede Laden-Art im Schnellstart hat ein Profil", () => {
  for (const a of LADEN_ARTEN) assert.ok(PROFILE[a.id], a.id);
});

test("Register: jeder Katalog- und Vorlagen-Bereich und jede Baukasten-Familie hat Laden-Arten", () => {
  for (const b of new Set([...Object.keys(KATALOG), ...Object.keys(VORLAGEN)])) assert.ok(ladenArtenFuer(b).length, `Bereich ${b} ohne Laden-Art`);
  for (const g of GRUNDREZEPTE) { const b = BEREICH_JE_FAMILIE[g.id]; assert.ok(b, `Familie ${g.id} ohne Bereich`); assert.ok(ladenArtenFuer(b).length, `Familie ${g.id}`); }
  for (const b of NUR_ANDERE) assert.ok(KATALOG[b], b);
});

test("Register: jedes Paket mit Laden-Arten, Stufe, Quelle und Sichtbarkeit", () => {
  const ids = new Set();
  for (const p of PAKETE) {
    assert.ok(!ids.has(p.id), "doppelt " + p.id); ids.add(p.id);
    assert.ok(p.laden_arten?.length && p.laden_arten.every((a) => a === "alle" || PROFILE[a]), p.id);
    assert.ok(STUFEN.includes(p.stufe), p.id); assert.ok(p.quelle, p.id);
    assert.ok(["oeffentlich", "privat"].includes(p.sichtbarkeit), p.id);
    if (p.sichtbarkeit === "privat") assert.equal(p.datei, null, "privat liegt nie im Repo: " + p.id);
  }
});

test("Dönerladen: keine Burger-Vorlagen im Kern, Burger unter „Oft dabei“", () => {
  const s = laden("doener"); const v = vorlagenSortiert(s);
  assert.ok(v.kern.some((x) => x.bereich === "doener"));
  assert.ok(!v.kern.some((x) => x.bereich === "burger"));
  assert.ok(v.oft.some((x) => x.bereich === "burger"));
  assert.ok(!v.kern.some((x) => x.bereich === "asia") && !v.oft.some((x) => x.bereich === "asia"));
});

test("Burgerladen: keine Döner-Vorlagen im Kern", () => {
  const v = vorlagenSortiert(laden("imbiss"));
  assert.ok(v.kern.some((x) => x.bereich === "burger"));
  assert.ok(!v.kern.some((x) => x.bereich === "doener"));
});

test("alle Bereiche genau einmal, Grundbedarf immer im Kern", () => {
  for (const a of Object.keys(PROFILE)) {
    const s = a === "anders" ? (() => { const x = leererBetrieb(); x.ladenArt = "anders"; return x; })() : laden(a);
    const b = bereicheSortiert(s); const alle = [...b.kern, ...b.oft, ...b.weitere];
    assert.equal(alle.length, new Set(alle).size, a); assert.equal(alle.length, Object.keys(KATALOG).length, a);
    for (const g of GRUNDBEDARF) assert.ok(b.kern.includes(g), `${a}: ${g}`);
  }
});

test("Karte mit 13 Pizzen rückt Pizza beim Asia-Imbiss in „Oft dabei“", () => {
  const s = laden("asia");
  assert.ok(!profilFuer(s).oft.includes("pizza"));
  for (let i = 0; i < 13; i++) s.gerichte.push({ id: "p" + i, name: "Pizza " + i, bereich: "pizza", klasse: "haupt", zutaten: [] });
  for (let i = 0; i < 20; i++) s.gerichte.push({ id: "a" + i, name: "Wok " + i, bereich: "asia", klasse: "haupt", zutaten: [] });
  assert.ok(profilAusKarte(s).includes("pizza"));
  const p = profilFuer(s); assert.ok(p.oft.includes("pizza")); assert.equal(p.quelle, "karte");
});

test("„Etwas anderes“: ohne Karte alles, mit Karte bestimmt die Karte", () => {
  const s = leererBetrieb(); s.ladenArt = "anders";
  assert.equal(bereicheSortiert(s).weitere.length, 0);
  for (let i = 0; i < 10; i++) s.gerichte.push({ id: "b" + i, name: "Burger " + i, bereich: "burger", klasse: "haupt", zutaten: [] });
  const b = bereicheSortiert(s); assert.ok(b.kern.includes("burger")); assert.ok(b.weitere.includes("doener"));
});

test("Wirt kann Bereiche hochholen und wegklappen", () => {
  const s = laden("doener"); s.profilWirt = { hoch: ["asia"], weg: ["burger"] };
  const p = profilFuer(s); assert.ok(p.kern.includes("asia")); assert.ok(!p.oft.includes("burger")); assert.equal(p.quelle, "wirt");
});

test("alte Einrichtung (Format + Küche) bekommt ein Profil", () => {
  const s = leererBetrieb(); s.betrieb.format = "restaurant"; s.betrieb.kuechen = ["doener"]; assert.equal(ladenArtVon(s), "doener");
  const c = leererBetrieb(); c.betrieb.format = "cafe"; assert.equal(ladenArtVon(c), "cafe");
});

test("Zutatensuche „Patty“ im Dönerladen zeigt den Bereich, im Burgerladen nicht", () => {
  const d = zutatenSuchen(laden("asia"), "patty");
  assert.ok(d.length && d.every((x) => x.aus === "burger"), JSON.stringify(d));
  const b = zutatenSuchen(laden("imbiss"), "patty");
  assert.ok(b.length && b.every((x) => x.aus === null));
  assert.ok(zutatenSuchen(laden("doener"), "dönerspieß").every((x) => x.aus === null));
});

test("Kartenerkennung: Vorlage aus dem Profil gewinnt bei ähnlichem Treffer", () => {
  const s = laden("doener");
  const [v] = vorschlaegeAusText("Döner Kebab ⋯ 7,50", s);
  assert.equal(v.bereich, "doener");
});
