// „Einrichtung kürzen“ (28.10.2026, Befund Prüfer): Rechtsform nicht mehr in der Einrichtung, ein Wort für den Büro-Zugang,
// „Später“ bei der Karte wird respektiert, Vorlage „Döner & Grill“ nur mit passenden Gerichten, keine Fachwörter in der Einrichtung.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { leererBetrieb } from "../js/store.js";
import { SCHNELL, SCHRITTE } from "../js/screens/onboarding.js";
import { vorlagenSortiert } from "../js/profil.js";
import { VORLAGEN } from "../js/data/katalog.js";
import { hinweiseFuer } from "../js/hinweis.js";
import { offenImBuero } from "../js/offen.js";
import { rechtsform, rechtsformSetzen } from "../js/rechtsform.js";
import { SPRACHEN } from "../js/i18n.js";
import { kostenPostenUmschalten } from "../js/stamm.js";

const schritt = (id) => SCHNELL.find((s) => s.id === id);
const laden = (art = "doener") => { const s = leererBetrieb(); s.phase = "onboarding"; s.weg = "schnell"; s.ladenArt = art; Object.assign(s.betrieb, { format: "imbiss", kuechen: ["doener"] }); return s; };

// ---------- 1 Rechtsform ----------
test("Rechtsform steht in keiner Einrichtung mehr, im Büro bleibt die Auswahl", () => {
  assert.ok(!SCHRITTE.some((s) => s.id === "rechtsform"), "genauer Weg");
  assert.ok(!SCHNELL.some((s) => s.id === "rechtsform"), "Schnellweg");
  const s = laden(); s.ladenArt = "doener";
  for (const st of [...SCHRITTE, ...SCHNELL]) {
    let html = ""; try { html = st.view(s) || ""; } catch { continue; } // Schritte mit Browser-Zustand (Foto) überspringen
    assert.ok(!html.includes('data-a="rechtsform"'), st.id + " zeigt Rechtsform");
    assert.ok(!/GbR|OHG|haftungsbeschränkt/.test(html), st.id + " zeigt Rechtsformnamen");
  }
  assert.ok(fs.readFileSync(new URL("../js/screens/home.js", import.meta.url), "utf8").includes('data-a="rechtsform"'), "Büro (Einstellungen) bietet die Auswahl");
});

test("ohne Rechtsform: Steuer-Hinweise für alle laufen, Büro meldet „Rechtsform fehlt“, Setzen im Büro wirkt", () => {
  const s = laden(); s.phase = "app"; for (let i = 1; i <= 5; i++) s.abschluesse.push({ id: "a" + i, datum: "2026-10-0" + i });
  const w = { betriebe: [s], aktiv: s.id };
  assert.equal(rechtsform(s), "unbekannt");
  const ids = hinweiseFuer(s).map((h) => h.id);
  assert.ok(ids.includes("steuer_sieben"), "Karten für alle bleiben");
  assert.ok(!ids.includes("sachentnahme") && !ids.includes("gmbh_bilanz"), "Karten nach Rechtsform erst nach der Wahl");
  assert.ok(offenImBuero(s, w).some((o) => o.id === "rechtsform"), "Erinnerung im Büro");
  assert.equal(rechtsformSetzen(s, "einzel"), true);
  assert.ok(hinweiseFuer(s).map((h) => h.id).includes("sachentnahme"));
});

// ---------- 2 Ein Wort: Code ----------
test("Büro-Zugang heißt überall „Code“: kein „PIN“ in keiner Sprache", async () => {
  const pruefe = (o, pfad, out) => { for (const [k, v] of Object.entries(o)) { const p = pfad + "." + k; if (typeof v === "string") { if (/\bPIN\b|ПИН|ПІН/.test(v)) out.push(p + ": " + v); } else if (v && typeof v === "object") pruefe(v, p, out); } };
  const out = [];
  for (const l of SPRACHEN) pruefe((await import(`../js/lang/${l}.js`)).default, l, out);
  assert.deepEqual(out, []);
  const de = (await import("../js/lang/de.js")).default, tr = (await import("../js/lang/tr.js")).default, en = (await import("../js/lang/en.js")).default;
  assert.equal(de.schnell2.pin, "Büro-Code festlegen");
  assert.match(tr.schnell2.pin, /kod/i); assert.match(en.schnell2.pin, /code/i);
  assert.ok(!/şifre/i.test(JSON.stringify(tr.pin)) && !/šifr/i.test(JSON.stringify((await import("../js/lang/bs.js")).default.pin)), "ein Wort je Sprache (tr, bs)");
});

// ---------- 3 „Später“ bei der Karte ----------
test("Karte „Später“: am Ende nur „Los geht's“, kein Zwang in die Karte", () => {
  const karte = schritt("karte-foto"), fertig = schritt("fertig-schnell");
  const s = laden();
  karte.beimVerlassen(s); // „Später“ = weiter ohne Gerichte
  assert.equal(s.karteWeg, "spaeter");
  const fuss = fertig.fuss(s);
  assert.ok(fuss.includes('data-ziel="start"'), "Hauptknopf Start");
  assert.ok(!fuss.includes("kartefoto") && !fuss.includes("vorlagen"), "kein Weg zurück in die Karte");
});

test("Karte: „Aus Vorlagen wählen“ und Foto-Weg bleiben wie bisher, spätere Wahl überschreibt die frühere", () => {
  const karte = schritt("karte-foto"), fertig = schritt("fertig-schnell");
  const s = laden();
  karte.aktion("karte-vorlagen", { dataset: {} }, s, { weiter: () => karte.beimVerlassen(s) });
  assert.equal(s.karteWeg, "vorlagen");
  assert.ok(fertig.fuss(s).includes('data-ziel="vorlagen"'));
  karte.beimVerlassen(s); // zurückgegangen, diesmal „Später“
  assert.equal(s.karteWeg, "spaeter");
  assert.ok(!fertig.fuss(s).includes("kartefoto"));
  const frisch = laden(); // Karte gar nicht verlassen: wie bisher Foto-Knopf
  assert.ok(fertig.fuss(frisch).includes('data-ziel="kartefoto"'));
  const mitGerichten = laden(); mitGerichten.gerichte.push({ id: "g1", name: "Döner" }); karte.beimVerlassen(mitGerichten);
  assert.equal(mitGerichten.karteWeg, undefined, "mit Gerichten kein Merker");
  assert.ok(fertig.fuss(mitGerichten).includes('data-ziel="start"'));
});

// ---------- 4 Vorlage „Döner & Grill“ ----------
const namen = (l) => l.map((v) => v.name);
test("Döner & Grill: Kern und „Auch oft dabei“ ohne Poke Bowl, Knödel, Spätzle & Co.", () => {
  const v = vorlagenSortiert(laden("doener"));
  const dabei = [...namen(v.kern), ...namen(v.oft)];
  for (const n of ["Döner Kebab", "Dürüm Döner", "Dönerteller", "Lahmacun", "Pide mit Käse", "Falafel-Teller", "Pommes frites (Beilage)", "Gemischter Salat klein", "Griechischer Salat", "Cola 0,33 l", "Pizza Margherita"]) assert.ok(dabei.includes(n), n + " fehlt");
  for (const n of ["Poke Bowl Lachs", "Kartoffelknödel (2 Stück)", "Spätzle (Beilage)", "Kartoffelsalat", "Couscous-Salat", "Wedges", "Chili-Cheese-Nuggets (6 Stück)", "Kroketten (Beilage)", "Gemischtes Gemüse", "Süßkartoffel-Pommes", "Spaghetti Bolognese", "Lasagne", "Penne Arrabiata", "Rinderbraten mit Klößen"]) assert.ok(!dabei.includes(n), n + " gehört nicht in Döner & Grill");
  assert.ok(namen(v.weitere).includes("Poke Bowl Lachs"), "bleibt unter „Weitere“ und per Suche erreichbar");
});

test("andere Laden-Arten unverändert, bei Döner & Grill geht nichts verloren", () => {
  const alle = Object.values(VORLAGEN).flat().length;
  for (const art of ["imbiss", "pizza", "asia", "foodtruck", "cafe", "baeckerei", "kiosk", "anders"]) {
    const v = vorlagenSortiert(laden(art));
    const roh = [...v.kern, ...v.oft, ...v.weitere];
    assert.equal(roh.length, alle, art + ": Gesamtzahl");
    const poke = v.kern.concat(v.oft).some((x) => x.name === "Poke Bowl Lachs");
    const salatImProfil = [...v.kern, ...v.oft].some((x) => x.bereich === "salat");
    assert.equal(poke, salatImProfil, art + ": Salat-Bereich vollständig, wenn im Profil");
  }
  const d = vorlagenSortiert(laden("doener")); assert.equal(d.kern.length + d.oft.length + d.weitere.length, alle);
  const knoedelNurOhneDoener = vorlagenSortiert(laden("imbiss"));
  assert.ok([...knoedelNurOhneDoener.kern, ...knoedelNurOhneDoener.oft].some((x) => x.name === "Kartoffelknödel (2 Stück)"), "Imbiss behält die Beilagen");
});

// ---------- 5 Fachwörter ----------
test("Einrichtung ohne Fachwörter: kein „Nettopreis“, kein „brutto“ im Lohn-Text, Steuer-Umschalter ohne netto/brutto", async () => {
  const de = (await import("../js/lang/de.js")).default;
  const s = JSON.stringify([de.verkauf, de.team, de.kosten.einleitung, de.format.hinweis, de.karte.hinweis, de.preise.hinweis, de.ergebnis.vomNetto, de.ergebnis.lesehilfe]);
  assert.ok(!/Nettopreis|[Bb]rutto|Netto\b|Arbeitgeber/.test(s), s.match(/Nettopreis|[Bb]rutto|Netto\b|Arbeitgeber/)?.[0]);
  const tr = (await import("../js/lang/tr.js")).default, en = (await import("../js/lang/en.js")).default;
  assert.ok(!/Net fiyat|brüt/.test(JSON.stringify([tr.verkauf, tr.team])), "tr");
  assert.ok(!/net price|gross/i.test(JSON.stringify([en.verkauf, en.team])), "en");
  const l = laden(); kostenPostenUmschalten(l, "miete", "miete", 1500);
  const html = SCHRITTE.find((x) => x.id === "kosten-miete").view(l);
  assert.ok(html.includes("basis-posten"), "Umschalter ist da");
  assert.ok(!/>netto<|>brutto<|Nettopreis/.test(html), "Kosten-Umschalter");
});
