// Vorab-Prüfung 03.11.2026, C1: In ar.js stand „منيوك“ (gemeint „deine Karte“) – in mehreren arabischen Dialekten eine grobe Beleidigung.
// Ersetzt durch „قائمتك“ / „قائمة الطعام“ (Übersetzung Zoro/Bau-Chat, Muttersprachler prüft gegen). Dieser Test hält die Liste missverständlicher
// Wörter je Sprache; ein Fund schlägt fehl. Liste erweitern, wenn das Gegenlesen weitere Wörter findet.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const VERBOTEN = { ar: [/منيو(?!م)/u], fa: [/منیوک/u] }; // „منيو…“ außer in „ألمنيوم“ (Aluminium)
test("C1: keine missverständlichen Lautumschriften in den Sprachdateien und Katalognamen", () => {
  const funde = [];
  for (const [sp, muster] of Object.entries(VERBOTEN)) {
    const texte = [fs.readFileSync(new URL(`../js/lang/${sp}.js`, import.meta.url), "utf8"), fs.readFileSync(new URL("../js/data/namen_mehr.js", import.meta.url), "utf8")];
    for (const re of muster) for (const tx of texte) { const m = tx.match(new RegExp(re.source, "gu")); if (m) funde.push(`${sp}: ${m.length}× ${re}`); }
  }
  assert.deepEqual(funde, []);
});
