// Paket 7 (16.10.2026): verbotene Wörter in den Sprachdateien de, tr, en.
// Verboten sind nur die zusammengesetzten Wörter der Liste; „HACCP“ allein und „Nachweis“ allein sind erlaubt.
// Geprüft wird der Quelltext der Datei (alle Texte, auch Funktionen mit Platzhaltern), ohne Groß-/Kleinschreibung.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HIER = path.dirname(fileURLToPath(import.meta.url));
const LANG = path.join(HIER, "..", "js", "lang");
export const VERBOTEN = ["revolutionär", "disruptiv", "Marktführer", "GoBD-konform", "betriebsprüfungsfest", "steuersicher", "rechtssicher",
  "HACCP-konform", "zertifiziert", "lückenlos", "manipulationssicher"];

function treffer(datei) {
  const zeilen = readFileSync(path.join(LANG, datei), "utf8").split("\n");
  const t = [];
  zeilen.forEach((z, i) => { const k = z.toLowerCase(); for (const v of VERBOTEN) if (k.includes(v.toLowerCase())) t.push(`${datei} Zeile ${i + 1}: „${v}“ – ${z.trim().slice(0, 90)}`); });
  return t;
}

for (const datei of ["de.js", "tr.js", "en.js"]) {
  test(`${datei}: keines der verbotenen Wörter`, () => {
    const t = treffer(datei);
    assert.deepEqual(t, [], "Treffer:\n" + t.join("\n"));
  });
}

test("Prüfung schlägt bei einem verbotenen Wort an (Selbsttest)", () => {
  const k = "Die Liste ist HACCP-konform und lückenlos.".toLowerCase();
  assert.ok(VERBOTEN.some((v) => k.includes(v.toLowerCase())));
  const erlaubt = "HACCP-Grundreinigung als Nachweis für die Kontrolle".toLowerCase();
  assert.ok(!VERBOTEN.some((v) => erlaubt.includes(v.toLowerCase())));
});
