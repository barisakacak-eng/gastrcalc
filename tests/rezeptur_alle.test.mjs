// Pilotfest P2 (30.10.2026): Jede Zutat jedes Gerichts ist im Büro-Rezept änderbar – Menge (Feld), Einheit (Knöpfe), löschen, dazu „Zutat hinzufügen“.
// Für alle 144 Vorlagen aller 17 Familien. Außerdem: die Laden-Mengenfrage fragt Hauptzutaten (bis 3) – das ist gewollt, aber kein Ersatz.
import { test } from "node:test";
import assert from "node:assert/strict";
import { VORLAGEN } from "../js/data/katalog.js";
import { gerichtAusVorlage } from "../js/karte_daten.js";
import { leererBetrieb } from "../js/store.js";
import { rezepte } from "../js/screens/karte.js";
import { setzeSprache } from "../js/i18n.js";

test("Rezept-Editor: je Zutat ein Mengenfeld, Einheiten-Knöpfe und Löschen; Zutat hinzufügen vorhanden – alle Vorlagen", async () => {
  await new Promise((r) => setzeSprache("de", r));
  const fehler = [];
  for (const [familie, liste] of Object.entries(VORLAGEN)) for (const v of liste) {
    const s = leererBetrieb(); const g = gerichtAusVorlage(v); s.gerichte.push(g); s.phase = "onboarding";
    rezepte.aktion("rezept-auf", { dataset: { id: g.id } }, s, {});
    const html = rezepte.view(s);
    const felder = (html.match(/data-f="zutat:\d+"/g) || []).length;
    const einheiten = (html.match(/data-a="einheit"/g) || []).length;
    const weg = (html.match(/data-a="zutat-weg"/g) || []).length;
    if (felder !== g.zutaten.length || weg !== g.zutaten.length || einheiten < g.zutaten.length) fehler.push(`${familie}/${v.name}: ${g.zutaten.length} Zutaten, ${felder} Felder, ${weg} Löschen, ${einheiten} Einheiten`);
    if (!/data-f="zutat-suche"/.test(html)) fehler.push(`${familie}/${v.name}: kein Suchfeld für neue Zutaten`);
    rezepte.aktion("rezept-zu", { dataset: {} }, s, {});
  }
  assert.deepEqual(fehler, []);
});
