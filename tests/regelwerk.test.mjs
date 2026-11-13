// Regelwerk (js/data/regelwerk.js): Aufbau der Einträge, Zeiträume, Warnung vor Ablauf, Stichtag Jahreswechsel 2026/2027 und
// „Kein Fachwert außerhalb des Regelwerks“ (Suche in js/ nach den Zahlen, die dort einmal standen).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REGELN, regel, wert, laeuftAus } from "../js/data/regelwerk.js";
import { mindestlohnAm } from "../js/data/mindestlohn.js";
import { svevAm, sachbezugWert } from "../js/engine.js";
import { lohnAufschlag } from "../js/data/lohnkosten.js";

const TAG = /^\d{4}-\d{2}-\d{2}$/;

test("jeder Eintrag hat wert, ab, quelle, url, abgerufen und einen gültigen status", () => {
  for (const [id, liste] of Object.entries(REGELN)) {
    assert.ok(Array.isArray(liste) && liste.length > 0, id + ": leere Liste");
    for (const r of liste) {
      assert.ok(r.wert !== undefined && r.wert !== null, id + ": wert fehlt");
      assert.match(r.ab, TAG, id + ": ab");
      assert.ok(r.bis === null || TAG.test(r.bis), id + ": bis");
      assert.ok(typeof r.quelle === "string" && r.quelle.trim().length > 5, id + ": quelle");
      assert.match(r.url, /^https:\/\/\S+$/, id + ": url");
      assert.match(r.abgerufen, TAG, id + ": abgerufen");
      assert.ok(["beschlossen", "geplant", "setzung"].includes(r.status), id + ": status " + r.status);
    }
  }
});

test("Zeiträume je Wert: aufsteigend, ohne Überlappung, nur der letzte ohne Ende", () => {
  for (const [id, liste] of Object.entries(REGELN)) {
    liste.forEach((r, i) => {
      if (r.bis) assert.ok(r.ab <= r.bis, `${id}: ab nach bis (${r.ab} > ${r.bis})`);
      if (i === 0) return;
      const v = liste[i - 1];
      assert.ok(v.bis !== null, `${id}: Eintrag vor ${r.ab} hat kein Ende, aber es folgt ein weiterer`);
      assert.ok(v.ab < r.ab && v.bis < r.ab, `${id}: Überlappung oder falsche Reihenfolge (${v.ab}…${v.bis} / ${r.ab})`);
    });
  }
});

test("laeuftAus: findet, was zum Jahresende ohne Nachfolger ausläuft (Warnung, kein Fehler)", () => {
  const l = laeuftAus("2026-11-12", 60);
  const ids = l.map((x) => x.id).sort();
  const erwartet = ["abgaben_minijob", "abgaben_angestellt", "umlagen_angestellt", "eigenverbrauch_pauschale", "gema_radio_jahr"].sort();
  if (l.length) console.warn("Regelwerk: läuft in 60 Tagen aus, ohne Nachfolger – bitte nachtragen: " + l.map((x) => `${x.id} (bis ${x.bis})`).join(", "));
  assert.deepEqual(ids, erwartet);
  assert.ok(l.every((x) => x.bis === "2026-12-31"));
  assert.deepEqual(laeuftAus("2026-06-01", 60), [], "im Sommer läuft nichts aus");
});

test("Stichtag 31.12.2026 / 01.01.2027: Mindestlohn, Minijob, Sachbezug, veraltet", () => {
  assert.equal(wert("mindestlohn", "2026-12-31"), 13.90); assert.equal(wert("mindestlohn", "2027-01-01"), 14.60);
  assert.equal(wert("minijob_grenze", "2026-12-31"), 603); assert.equal(wert("minijob_grenze", "2027-01-01"), 633);
  assert.equal(wert("sachbezug_mittag", "2026-12-31"), 4.57); assert.equal(wert("sachbezug_mittag", "2027-01-01"), 4.70);
  assert.equal(regel("sachbezug_mittag", "2026-12-31").status, "beschlossen"); assert.equal(regel("sachbezug_mittag", "2027-01-01").status, "geplant");
  assert.equal(regel("abgaben_minijob", "2026-12-31").veraltet, undefined);
  assert.equal(regel("abgaben_minijob", "2027-01-01").veraltet, true, "ohne Eintrag für 2027: letzter Wert mit veraltet");
  assert.equal(regel("abgaben_minijob", "2027-01-01").wert, 0.3117);
  // die Leser liefern dasselbe
  assert.deepEqual([mindestlohnAm("2026-12-31").satz, mindestlohnAm("2026-12-31").minijob], [13.90, 603]);
  assert.deepEqual([mindestlohnAm("2027-01-01").satz, mindestlohnAm("2027-01-01").minijob], [14.60, 633]);
  assert.equal(svevAm("2026-12-31").mittag, 4.57); assert.equal(svevAm("2026-12-31").geplant, undefined);
  assert.equal(svevAm("2027-01-01").mittag, 4.70); assert.equal(svevAm("2027-01-01").geplant, true);
  assert.equal(svevAm("2027-01-01").tag, 11.83); assert.equal(svevAm("2026-12-31").tag, 11.5);
  assert.equal(sachbezugWert(1, "mittag", "2026-12-31"), 4.57); assert.equal(sachbezugWert(1, "mittag", "2027-01-01"), 4.70);
  assert.equal(lohnAufschlag("minijob", "2027-01-01").satz, lohnAufschlag("minijob", "2026-12-31").satz, "veraltet: derselbe Wert");
});

test("regel() verlangt einen Tag und kennt nur eingetragene Werte", () => {
  assert.throws(() => regel("mindestlohn"), /Tag/);
  assert.throws(() => regel("gibt_es_nicht", "2026-01-01"), /unbekannt/);
});

// ---------- Kein Fachwert außerhalb des Regelwerks ----------
const WURZEL = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "js");
// Reine Daten ohne Fachbezug (Namen, Preise je Artikel, Fotos …) – dort stehen Zahlen, die zufällig gleich aussehen
const AUSGENOMMEN = new Set(["data/regelwerk.js", "data/katalog.js", "data/richtpreise.js", "data/richtpreise_nachtrag.js", "data/namen_mehr.js", "data/artikelnamen.js", "data/suchnamen.js",
  "data/fotos.js", "data/zwischen.js", "data/burger_ergaenzung.js", "data/kuechen.js", "data/branchenwerte.js"]);
const MUSTER = ["12,82", "12.82", "13,90", "13.90", "14,60", "14.60", "603", "633", "345", "355", "2,37", "2.37", "4,57", "4.57", "2,43", "2.43", "4,70", "4.70", "4001", "4.001",
  "18,36", "18.36", "6,12", "6.12", "24500", "24.500", "31,17", "0.3117", "0.2115", "0.0269", "0.0104", "395,90", "395.90", "30.000", "50.000"];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// eigenständige Zahl: davor kein Wort-/Zahlzeichen, Punkt oder Komma; danach keine Ziffer und kein Punkt/Komma mit Ziffer
const alsZahl = (m) => new RegExp(`(?<![\\w.,])${esc(m)}(?![\\w]|[.,]\\d)`, "g");
const REGEXE = [...MUSTER.map((m) => [m, alsZahl(m)]), ["25.000 €", /(?<![\w.,])25\.000 €/g]];
// Ausnahmen mit Begründung: [Datei (relativ zu js/), Muster, Grund]
const AUSNAHMEN = [
  ["symbole.js", "2.37", "SVG-Pfad der Ikone „sandwich“ (m2.37 11.223 …), keine Fachzahl"],
];
const ausgenommen = (datei, m) => AUSNAHMEN.some(([d, p]) => d === datei && (p === "*" || p === m));
function dateien(dir, out = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) dateien(p, out); else if (f.name.endsWith(".js")) out.push(p);
  }
  return out;
}
test("Kein Fachwert außerhalb des Regelwerks (auch nicht in Kommentaren)", () => {
  const funde = [];
  for (const datei of dateien(WURZEL)) {
    const rel = path.relative(WURZEL, datei).split(path.sep).join("/");
    if (AUSGENOMMEN.has(rel)) continue;
    const text = fs.readFileSync(datei, "utf8");
    for (const [m, re] of REGEXE) {
      if (ausgenommen(rel, m)) continue;
      for (const x of text.matchAll(re)) {
        const von = Math.max(0, x.index - 30);
        funde.push(`${rel}: „${m}“ …${text.slice(von, x.index + m.length + 20).replace(/\s+/g, " ")}…`);
      }
    }
  }
  assert.deepEqual(funde, [], "Fachwerte gehören ins Regelwerk (js/data/regelwerk.js), im Code nur als Platzhalter oder Leser:\n" + funde.join("\n"));
});
test("die Ausnahmeliste verweist auf Dateien, die es gibt", () => {
  for (const [d] of AUSNAHMEN) assert.ok(fs.existsSync(path.join(WURZEL, d)), d);
  for (const d of AUSGENOMMEN) assert.ok(fs.existsSync(path.join(WURZEL, d)), d);
});
