import { beispielLaden } from "../js/beispiel.js";
import { kalkulation, monatsLast } from "../js/engine.js";
import { zaehler, monatsZiel } from "../js/zaehler.js";
const s = beispielLaden("2026-11-11");
const st = s.betriebe ? s.betriebe[0] : s;
console.log(Object.keys(s).slice(0,12));
const k = kalkulation(st); console.log(k.zeilen.length, monatsLast(st).gesamt);
const z = zaehler(st, { datum: "2026-11-10" }); console.log(z.stand, z.stufe, monatsZiel(st, z, "2026-11-10").nullpunkt);
