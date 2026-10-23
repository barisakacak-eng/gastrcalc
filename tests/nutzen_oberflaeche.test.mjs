// Anzeigevertrag: niemals Schätzungen als gemessenen Nutzen ausgeben.
import test from "node:test";
import assert from "node:assert/strict";
import { nutzenKarte, startView } from "../js/screens/home.js";
import { nutzenStand } from "../js/nutzen.js";
import { leererBetrieb } from "../js/store.js";
import { heuteGeschaeft, fmtEuro } from "../js/util.js";
import { setzeSprache, t } from "../js/i18n.js";
import { navKontext } from "../js/screens/nav.js";

globalThis.document ??= { documentElement: {} };
const text = (html) => html.replace(/<svg\b[\s\S]*?<\/svg>/g, "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const leer = { ab: "2026-10-01", tage: 4, leer: true, summe: 0, geschaetzt: 60,
  posten: [{ art: "papier", euro: 60, gemessen: false, quelle: "Schätzung", stand: "geschaetzt" }] };

test("ohne Messung bleibt ausschließlich der Messbeginn, auch bei vorhandener Schätzung", () => {
  for (const code of ["de", "tr", "en"]) {
    setzeSprache(code);
    const html = nutzenKarte(leer);
    assert.equal(text(html), t("nutzen.laueft", "01.10.2026"));
    assert.doesNotMatch(html, /€|h-nutzen-summe|h-nutzen-posten/);
  }
  setzeSprache("de");
  assert.equal(text(nutzenKarte({ ...leer, ab: null })), "Messung startet beim ersten Müll-Eintrag"); // Zoro 23.10.: kein „seit –“
});

test("groß steht nur die gelieferte Summe; geschätzte Posten bleiben separat mit ≈", () => {
  const html = nutzenKarte({ ...leer, leer: false, summe: 96, geschaetzt: 60 });
  assert.match(html, new RegExp(`h-nutzen-summe">${fmtEuro(96, { dezimal: 2 })}`));
  assert.ok(html.includes(`≈ ${fmtEuro(60, { dezimal: 2 })}`));
  assert.ok(!html.includes(fmtEuro(156, { dezimal: 2 })), "keine Addition im Bildschirm");
  assert.match(html, /h-nutzen-geschaetzt/);
});

test("Postenquelle wird maskiert und kann kein HTML einschleusen", () => {
  const html = nutzenKarte({ ...leer, leer: false, summe: 0, posten: [{ ...leer.posten[0], quelle: '<img src=x onerror="boom">' }] });
  assert.doesNotMatch(html, /<img|<script/);
  assert.match(html, /&lt;img/);
  assert.match(html, /h-nutzen-null/);
});

test("Heute bindet Zoros wirkliche Messwerte an Karte und Helfer, ohne den Stand zu verändern", () => {
  const s = leererBetrieb(); s.phase = "app";
  const H = heuteGeschaeft();
  const tag = (n) => { const d = new Date(`${H}T12:00:00`); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
  for (let i = -20; i <= 0; i++) s.schwund.push({ id: `test-${i}`, datum: tag(i), art: "rohware", wert: i < -6 ? 10 : 2, storniert: false });
  const w = { betriebe: [s], modus: "laden" }; navKontext(s, w);
  const vorher = JSON.stringify(s), n = nutzenStand(s, H);
  assert.ok(n.summe > 0);
  const html = startView(s, { wurzel: w });
  assert.ok(html.includes(fmtEuro(n.summe, { dezimal: 2 })));
  assert.match(html, /gc-bot--freundlich gc-motion--none/);
  assert.equal(JSON.stringify(s), vorher);
  s.schwund = []; s.betrieb.nutzen = { papierMinutenVorher: 120, stundensatz: 30 };
  const ohne = startView(s, { wurzel: w });
  assert.match(ohne, /gc-bot--neutral gc-motion--none/);
  assert.doesNotMatch(ohne, /h-nutzen-summe/);
});
