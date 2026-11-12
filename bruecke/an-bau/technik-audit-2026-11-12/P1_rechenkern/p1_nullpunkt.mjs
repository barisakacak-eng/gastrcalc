// Zwei Definitionen von "null": laufender Stand (zaehler.imPlus / nullTag) vs Umsatz >= Nullpunkt (monatsZiel / heuteZiel)
import { property, ri, pick, cents } from "./lib.mjs";
import { beispielLaden } from "../js/beispiel.js";
import * as Z from "../js/zaehler.js";
import { heuteZiel } from "../js/laden_zahlen.js";
import { ladenKennzahlen } from "../js/eigentuemer.js";
const V = beispielLaden("2026-11-11");
for (const H of ["2026-11-03", "2026-11-10", "2026-11-20"]) {
  const s = structuredClone(V); s.tagesnotizen = s.tagesnotizen.filter((n) => n.datum >= "2026-11-01" && n.datum <= H); const z = Z.zaehler(s, { datum: H }); const m = Z.monatsZiel(s, z, H); const h = heuteZiel(s, z, H);
  console.log(`Stichtag ${H}: Zähler imPlus=${z.imPlus} (Stand ${z.stand.toFixed(0)} €, nullTag ${z.nullTag}) | Laden-Zahl stufe=${h.stufe}, Zahl=${h.zahl?.toFixed(0)} €, nullAm=${m.nullAm}, Umsatz ${m.umsatz.toFixed(0)} von Nullpunkt ${m.nullpunkt.toFixed(0)}`);
}
let widerspruch = 0, n = 0; const r = (() => { let a = 7; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; })();
for (let i = 0; i < 400; i++) { const s = structuredClone(V); const H = `2026-11-${String(ri(r, 5, 28)).padStart(2, "0")}`; s.tagesnotizen = s.tagesnotizen.filter((x) => x.datum <= H); for (const t of s.tagesnotizen) t.umsatz = cents(r, 120000); const z = Z.zaehler(s, { datum: H }); const m = Z.monatsZiel(s, z, H); n++; if (z.imPlus !== (m.umsatz >= m.nullpunkt)) widerspruch++; }
console.log(`Zufallsläden: ${widerspruch} von ${n} Fällen, in denen 'im Plus' (Zähler) und 'Umsatz über Nullpunkt' (Laden-Zahl) verschieden antworten`);
{ const s = structuredClone(V); const H = "2026-11-10"; const z = Z.zaehler(s, { datum: H }); const m = Z.monatsZiel(s, z, H); const h = heuteZiel(s, z, H);
  const c = ladenKennzahlen(s, { von: "2026-11-04", bis: H }, { H, K: H });
  console.log(`Eigentümer-Blick (laeden.js:86 <- eigentuemer.js:107) "bis null": Stand ${c.bisNull.stand.toFixed(0)} € (imPlus=${c.bisNull.imPlus}) | Laden "Heute" (home.js:34 <- laden_zahlen.js:34) "bis null": fehlen ${h.zahl.toFixed(0)} € -> zwei verschiedene Zahlen für denselben Laden am selben Tag`); }
