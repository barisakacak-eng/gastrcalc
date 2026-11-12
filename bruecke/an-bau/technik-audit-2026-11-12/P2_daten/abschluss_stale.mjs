import { uhrStellen, fixBlob } from "./lib.mjs"; uhrStellen("2027-02-01T10:00:00Z");
import { idbAttrappe } from "../tests/hilfe/idb_attrappe.mjs"; idbAttrappe();
const st = await import("../js/store.js"); await st.laden(); const ma = await import("../js/monatsabschluss.js"); const eng = await import("../js/engine.js");
const R = await st.importSicherung(fixBlob()); const base = R.wurzel.betriebe[0];
const A = structuredClone(base), B = structuredClone(base); const M = "2026-12";
const abs = ma.monatEinfrieren(A, M, { jetzt: "2027-02-01T09:00:00.000Z" });  // Handy A schliesst Dezember ab, OHNE B's Eintraege zu kennen
eng.tagesnotizSetzen(B, "2026-12-20", 5000, { geraet: "gerB" }); eng.tagesnotizFestschreiben(B, "2026-12-20", "gerB");   // Handy B korrigiert einen Tag nach (fremde Kasse, Nachtrag)
const m = st.verschmelzen(structuredClone(A), structuredClone(B));
const live = ma.monatsZahlen(m, M), eing = ma.eingefroren(m, M);
console.log("Dezember: eingefroren (Handy A)", eing.umsatzBrutto, "€ | live nach Abgleich", live.umsatzBrutto, "€ | Abschluss erkennt Abweichung?", "nein: Felder des Abschlusses:", Object.keys(eing).join(","));
