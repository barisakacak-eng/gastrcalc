// Verhalten (a): Zutaten-Blatt eines Gerichts mit eigenem Rezept bietet die Portionsprüfung an; ohne eigenes Rezept (nur Schätzung) nicht.
import test from "node:test";
import assert from "node:assert/strict";
import { beispielLaden } from "../js/beispiel.js";
import { hatEigenesRezept } from "../js/rezept_quelle.js";
import { karteLadenRezeptBlatt, karteLadenBlatt, karteLadenZuruecksetzen } from "../js/screens/karte_laden.js";

test("Rezept-Blatt: Portion prüfen nur bei eigenem Rezept", () => {
  const s = beispielLaden("2026-10-26");
  const speisen = s.gerichte.filter((g) => g.klasse !== "getraenk" && g.zutaten?.length);
  const schaetz = speisen.find((g) => !hatEigenesRezept(g)); const eigen = speisen.find((g) => g !== schaetz);
  eigen.rezeptQuelle = "eigen"; delete eigen.vorlage; // Chef hat das Rezept selbst eingegeben
  assert.ok(hatEigenesRezept(eigen) && schaetz);
  karteLadenZuruecksetzen(); assert.ok(karteLadenRezeptBlatt(s, eigen.id));
  const h = karteLadenBlatt(s);
  assert.match(h, new RegExp(`data-a="nav" data-wert="portion" data-id="${eigen.id}"`));
  if (schaetz) { karteLadenZuruecksetzen(); karteLadenRezeptBlatt(s, schaetz.id); assert.doesNotMatch(karteLadenBlatt(s), /data-wert="portion"/); }
  karteLadenZuruecksetzen();
});
