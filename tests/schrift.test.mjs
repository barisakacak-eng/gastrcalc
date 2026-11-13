// Salbei & Papier: Jedes Zeichen der App-Texte steht in der Teilmenge der passenden Schrift (fonts/zeichen.json, erzeugt von tools/schrift_teilmenge.py).
// Der Test braucht kein fontTools: er liest nur die Liste der Codepunkte und die Quelltexte.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const W = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const Z = JSON.parse(fs.readFileSync(path.join(W, "fonts", "zeichen.json"), "utf8"));
const latein = new Set(Z.latein), arabisch = new Set(Z.arabisch), system = new Set(Z.systemschrift);
const ARAB = [[0x600, 0x6ff], [0x750, 0x77f], [0xfb50, 0xfdff], [0xfe70, 0xfeff]];
const istArab = (cp) => ARAB.some(([a, b]) => cp >= a && cp <= b);
const steuer = (ch) => /^[\p{Cc}\p{Cf}]$/u.test(ch);
const dateien = () => [
  ...fs.readdirSync(path.join(W, "js/lang")).filter((f) => f.endsWith(".js")).map((f) => "js/lang/" + f),
  ...fs.readdirSync(path.join(W, "js/data")).filter((f) => f.endsWith("_texte.js")).map((f) => "js/data/" + f),
];

test("Zeichenliste: Dateien vorhanden, Latein und Arabisch nicht leer", () => {
  assert.ok(latein.size > 500 && arabisch.size > 200);
  for (const n of ["NotoSans-Regular", "NotoSans-Bold", "NotoSansArabic-Regular", "NotoSansArabic-Bold"]) assert.ok(fs.statSync(path.join(W, "fonts", n + ".woff2")).size > 10000, n);
  assert.ok(fs.existsSync(path.join(W, "fonts", "Noto-LIZENZ.txt")), "Lizenztext liegt bei den Schriften");
});

test("jedes Zeichen aus js/lang/*.js und js/data/*_texte.js ist in der passenden Schrift (arabische Schrift: Arabic-Liste, sonst Latein-Liste)", () => {
  const fehlt = new Map();
  for (const f of dateien()) {
    for (const ch of new Set(fs.readFileSync(path.join(W, f), "utf8"))) {
      const cp = ch.codePointAt(0);
      if (cp < 0x20 || cp === 0x7f || steuer(ch)) continue;
      const liste = istArab(cp) ? arabisch : latein;
      if (liste.has(cp) || system.has(cp)) continue;
      fehlt.set(cp, (fehlt.get(cp) || "") + " " + f.replace(/^js\//, ""));
    }
  }
  assert.deepEqual([...fehlt].map(([cp, f]) => `U+${cp.toString(16).toUpperCase()} ${String.fromCodePoint(cp)}:${f}`), []);
});

test("Systemschrift nur für Symbole, nie für Buchstaben oder Ziffern", () => {
  for (const cp of system) assert.ok(!/[\p{L}\p{M}\p{N}]/u.test(String.fromCodePoint(cp)), "Buchstabe ohne Glyph: U+" + cp.toString(16));
  assert.ok(system.size <= 20);
});

test("Sprachen: Deutsch, Türkisch, Polnisch, Rumänisch, Vietnamesisch, Kyrillisch, Griechisch, Kurdisch stehen in der Latein-Liste", () => {
  for (const ch of "äöüßğışçĞİŞąęłńśźżĂăÂâÎîȘșȚțơưẠạỆệỵêîûÇЁёЄєІіЇїҐґЖжЩщЮюЯяΆάΩωςϊΰ") assert.ok(latein.has(ch.codePointAt(0)), ch);
  for (const ch of "ءآأؤإئابةتثجحخدذرزسشصضطظعغفقكلمنهوىيپچژکگی۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩،؛؟") assert.ok(arabisch.has(ch.codePointAt(0)), ch);
  for (const ch of "€–„“”›‹«»·…") assert.ok(latein.has(ch.codePointAt(0)), ch);
});
