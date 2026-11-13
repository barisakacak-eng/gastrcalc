// Verhalten (a): Zutaten-Blatt (Rezept-Blatt, Weg vom „Abwiegen“-Knopf) bietet die Portionsprüfung an: mit eigenem Rezept immer, bei geschätztem Rezept sobald es eine bepreiste Hauptzutat gibt (Aussehen-Reste, Punkt 8).
// Das Preis-Blatt behält seine Regel: eigenes Rezept → „Portion prüfen“, sonst „Abwiegen“.
import test from "node:test";
import assert from "node:assert/strict";
import { beispielLaden } from "../js/beispiel.js";
import { hatEigenesRezept } from "../js/rezept_quelle.js";
import { karteLadenRezeptBlatt, karteLadenBlatt, karteLadenZuruecksetzen } from "../js/screens/karte_laden.js";

test("Rezept-Blatt: Portion prüfen auch bei geschätztem Rezept (mit bepreister Hauptzutat), Preis-Blatt bleibt bei der Regel", () => {
  const s = beispielLaden("2026-10-26");
  const speisen = s.gerichte.filter((g) => g.klasse !== "getraenk" && g.zutaten?.length);
  const schaetz = speisen.find((g) => !hatEigenesRezept(g)); const eigen = speisen.find((g) => g !== schaetz);
  eigen.rezeptQuelle = "eigen"; delete eigen.vorlage; // Chef hat das Rezept selbst eingegeben
  assert.ok(hatEigenesRezept(eigen) && schaetz);
  karteLadenZuruecksetzen(); assert.ok(karteLadenRezeptBlatt(s, eigen.id));
  const h = karteLadenBlatt(s);
  assert.match(h, new RegExp(`data-a="nav" data-wert="portion" data-id="${eigen.id}"`));
  if (schaetz) {
    karteLadenZuruecksetzen(); karteLadenRezeptBlatt(s, schaetz.id);
    assert.match(karteLadenBlatt(s), new RegExp(`data-wert="portion" data-id="${schaetz.id}"`)); // Rezept-Blatt: Weg zur Portionsprüfung auch ohne eigenes Rezept
  }
  karteLadenZuruecksetzen();
});
