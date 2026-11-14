// Jedes ruhende Zeki-Bild hat zwei offene Augen (Übergabe Abschnitt 4, Regel 4).
// Die Messung macht tools/zeki_augen.py (Pillow) und schreibt assets/brand/zeki-buehne/augen.json; dieser Test liest sie und prüft
//  1. für jede Bilddatei in zeki-buehne/ (24) und zeki-mienen/ (12) gibt es einen Eintrag – und umgekehrt,
//  2. die Dateigröße passt zum Eintrag (ein ausgetauschtes Bild fällt auf: dann python3 tools/zeki_augen.py neu laufen lassen),
//  3. jeder Eintrag zeigt „offen: 2“.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const wurzel = join(dirname(fileURLToPath(import.meta.url)), "..");
const marken = join(wurzel, "assets/brand");
const ORDNER = ["zeki-buehne", "zeki-mienen"];
const augen = JSON.parse(readFileSync(join(marken, "zeki-buehne", "augen.json"), "utf8")).bilder;
const dateien = ORDNER.flatMap((o) => readdirSync(join(marken, o)).filter((f) => f.endsWith(".webp")).map((f) => `${o}/${f}`));

test("Es gibt 24 Bühnen-Bilder und 12 Mienen", () => {
  assert.equal(dateien.filter((d) => d.startsWith("zeki-buehne/")).length, 24);
  assert.equal(dateien.filter((d) => d.startsWith("zeki-mienen/")).length, 12);
});

test("Für jede Bilddatei steht ein Eintrag in augen.json (und kein Eintrag ohne Bild)", () => {
  const fehlt = dateien.filter((d) => !Object.hasOwn(augen, d));
  assert.deepEqual(fehlt, [], `ohne Messung: ${fehlt.join(", ")} – python3 tools/zeki_augen.py laufen lassen`);
  const uebrig = Object.keys(augen).filter((k) => !dateien.includes(k));
  assert.deepEqual(uebrig, [], `Eintrag ohne Bild: ${uebrig.join(", ")}`);
});

test("Die Dateigröße passt zum Eintrag (Bild nicht ausgetauscht)", () => {
  for (const d of dateien) {
    assert.equal(statSync(join(marken, d)).size, augen[d]?.bytes, `${d}: Bild geändert seit der Messung – python3 tools/zeki_augen.py neu laufen lassen`);
  }
});

for (const d of dateien) {
  test(`Ruhendes Bild ${d}: zwei offene Augen`, () => {
    const e = augen[d];
    assert.ok(e && !e.fehler, `${d}: ${e?.fehler || "keine Messung"}`);
    const beschr = (e.augen || []).map((g) => `${g.seite}: ${g.gefunden ? `${g.breite}×${g.hoehe} (${g.verhaeltnis})` : "kein Auge gefunden"}`).join("; ");
    assert.equal(e.offen, 2, `${d}: nicht zwei offene Augen – ${beschr}`);
  });
}

test("Hinweis: zusammengekniffene (halb offene) Augen werden ausgegeben, brechen den Test aber nicht", (t) => {
  const halb = dateien.filter((d) => augen[d]?.halb);
  if (halb.length) t.diagnostic(`zusammengekniffen: ${halb.join(", ")}`);
});
