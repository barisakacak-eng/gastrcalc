import { idbAttrappe } from "../tests/hilfe/idb_attrappe.mjs";
import { fixBlob, diff, stabil } from "./lib.mjs";
import fs from "node:fs";
idbAttrappe();
const st = await import("../js/store.js");
await st.laden();
const zl = await import("../js/zip.js");
// 0) Rohdaten der Fixture vs. nach Migration (geht beim Einlesen etwas verloren?)
const eint = await zl.zipLesen(fixBlob());
const jt = new TextDecoder().decode(await eint.find(e=>e.name==="gastrocalc-sicherung.json").bytes());
const nl = jt.indexOf("\n"); const roh = JSON.parse(jt.slice(nl+1)); 
const A = await st.importSicherung(fixBlob());
console.log("Pruefsumme:", A.pruefsumme, "Laeden:", A.wurzel.betriebe.length, "schema roh:", roh.wurzel.schema);
console.log("== Roh -> migriert (Einlesen) ==");
const rohW = structuredClone(roh.wurzel); for (const k of ["bueroPin","pinSperre","rettungPin"]) delete rohW[k];
console.log(diff(rohW, A.wurzel).join("\n") || "(identisch)");
// 1) Rundreise: A -> export -> import -> B
const w = A.wurzel; w.geraet = w.geraet || "g1";
const e1 = await st.exportDatei(w); const B = await st.importSicherung(e1.blob);
console.log("== Rundreise 1 (A->ZIP->B) Pruefsumme", B.pruefsumme, "Bytes", e1.groesse);
console.log(diff(A.wurzel, B.wurzel).join("\n") || "(Wurzel identisch)");
// 2) zweite Runde, Byte-Vergleich der JSON im ZIP (ohne exportiert/ereignisse)
const e2 = await st.exportDatei(B.wurzel); 
async function inner(blob){ const es = await zl.zipLesen(blob); const t = new TextDecoder().decode(await es.find(e=>e.name==="gastrocalc-sicherung.json").bytes()); const d = JSON.parse(t.slice(t.indexOf("\n")+1)); return d; }
const d1 = await inner(e1.blob), d2 = await inner(e2.blob);
console.log("== Rundreise 2 Wurzel-Text gleich?", JSON.stringify(d1.wurzel) === JSON.stringify(d2.wurzel), " stabil gleich?", stabil(d1.wurzel) === stabil(d2.wurzel));
console.log("Ereignisse export1:", d1.ereignisse.length, "export2:", d2.ereignisse.length);
// 3) Soll-Datei
const soll = JSON.parse(fs.readFileSync(new URL("../tests/fixtures/pruefstand/pruefstand_soll.json", import.meta.url)));
for (const s of soll.laeden) { const b = B.wurzel.betriebe.find(x=>x.betrieb.name===s.name); const n = Object.fromEntries(Object.keys(s.eintraege).map(k=>[k,b[k].length])); console.log(s.name, JSON.stringify(n)===JSON.stringify(s.eintraege) ? "Eintragszahlen = Soll" : "ABWEICHUNG "+JSON.stringify(n)); }
