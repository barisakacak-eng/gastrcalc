// Gremium 1 (24.10.2026): Nach dem Erststart zeigten 8 von 10 Döner-Gerichten „–“, weil eine Zutat (Eisbergsalat) keinen Richtpreis hatte.
// Wächter: Jede Zutat der Pilot-Vorlagen (Döner, Smashburger) hat einen Richtpreis – direkt oder, bei selbst gemachten Teilen, über alle
// Zutaten des Zwischenrezepts. So hat jedes Vorlagen-Gericht am ersten Tag einen Wareneinsatz (als Schätzung ≈), nie „–“.
import test from "node:test";
import assert from "node:assert/strict";
import { VORLAGEN } from "../js/data/katalog.js";
import { ZWISCHENREZEPTE } from "../js/data/zwischen.js";
import { richtpreisFuer } from "../js/richtpreise.js";

test("Pilot-Vorlagen Döner und Smashburger: jede Zutat hat einen Richtpreis (direkt oder über das Zwischenrezept)", () => {
  const fehlt = [];
  for (const laden of ["doener", "burger"]) for (const v of VORLAGEN[laden]) for (const [name] of v.zutaten) {
    if (richtpreisFuer(name)) continue;
    const r = ZWISCHENREZEPTE.find((z) => z.name === name);
    if (!r) { fehlt.push(`${laden}/${v.name}: ${name}`); continue; }
    for (const z of r.zutaten) if (!richtpreisFuer(z.name)) fehlt.push(`${laden}/${v.name}: ${name} → ${z.name}`);
  }
  assert.deepEqual(fehlt, []);
});

// Ende-zu-Ende wie der Test-Wirt: Dönerladen, alle Vorlagen, „selbst gemacht“ wie die Vorauswahl, Richtpreise → jedes Gericht hat Selbstkosten
test("Dönerladen aus Vorlagen mit Richtpreisen: kein Gericht ohne Wareneinsatz", async () => {
  const { leererBetrieb } = await import("../js/store.js");
  const { gerichtAusVorlageAnlegen, artikelAbgleichen } = await import("../js/karte_daten.js");
  const { selbstAnwenden } = await import("../js/selbst.js");
  const { vorauswahlFuer } = await import("../js/data/zwischen.js");
  const { richtpreiseEinsetzen } = await import("../js/richtpreise.js");
  const { kalkulation } = await import("../js/engine.js");
  for (const [laden, art] of [["doener", "doener"], ["burger", "imbiss"]]) {
    const s = leererBetrieb(); s.betrieb.name = "Test"; s.betrieb.format = "imbiss"; s.ladenArt = art;
    for (const v of VORLAGEN[laden]) gerichtAusVorlageAnlegen(s, v);
    artikelAbgleichen(s); selbstAnwenden(s, vorauswahlFuer(art)); artikelAbgleichen(s);
    richtpreiseEinsetzen(s, { datum: "2026-10-24" });
    const k = kalkulation(s);
    const ohne = k.zeilen.filter((z) => z.waren === null).map((z) => `${z.name}: ${(z.warenFehlt || []).join(",")}`);
    assert.deepEqual(ohne, [], `${laden}: Gerichte ohne Wareneinsatz`);
  }
});
