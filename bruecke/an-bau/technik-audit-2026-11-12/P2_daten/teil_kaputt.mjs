import { uhrStellen } from "./lib.mjs"; uhrStellen("2027-01-01T19:00:00Z");
import { idbAttrappe } from "../tests/hilfe/idb_attrappe.mjs";
import { jahresStand } from "../tests/hilfe/jahr.mjs";
const a = idbAttrappe(); const st = await import("../js/store.js"); await st.laden();
const w = jahresStand(90); await st.sofortSpeichern(w); 
const teile = a.speicher("gastrocalc", "teile"); const keys = [...teile.keys()].filter(k => k.includes("|messungen|"));
console.log("Teile gesamt:", teile.size, "| messungen-Monate:", keys.map(k => k.split("|")[2]));
const n0 = w.betriebe[0].messungen.length; const opfer = keys[1]; const v = teile.get(opfer); const nOpfer = v.n; teile.set(opfer, { ...v, t: v.t.slice(0, v.t.length / 2) }); // Teil halb abgeschnitten
let l = await st.laden(); console.log("Laden mit kaputtem Teil:", opfer.split("|")[2], "| Messungen vorher", n0, "-> jetzt", l.betriebe[0].messungen.length, "(Monat hatte", nOpfer + ")", "| Bericht:", JSON.stringify(st.ladeProbleme().fehlt), "| wurzel.ladeFehler:", l.ladeFehler?.length);
l.betriebe[0].tagesnotizen.push({ id: "neu1", datum: "2027-01-01", umsatz: 5, erfasst: new Date().toISOString(), storniert: false }); await st.sofortSpeichern(l);
console.log("Nach naechstem Speichern: Teil noch in DB?", teile.has(opfer), "| kaputter Text noch da?", teile.get(opfer)?.t?.length);
l = await st.laden(); console.log("Neustart danach: Messungen", l.betriebe[0].messungen.length, "| Meldung ladeFehler bleibt:", l.ladeFehler?.length ?? 0, "| ladeProbleme.fehlt:", st.ladeProbleme().fehlt.length);
