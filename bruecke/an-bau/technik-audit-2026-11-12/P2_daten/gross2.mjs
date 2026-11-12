import { uhrStellen } from "./lib.mjs"; uhrStellen();
import { idbAttrappe } from "../tests/hilfe/idb_attrappe.mjs";
import { fixBlob } from "./lib.mjs";
idbAttrappe(); const st = await import("../js/store.js"); await st.laden(); const zl = await import("../js/zip.js");
const es = await zl.zipLesen(fixBlob()); const tx = new TextDecoder().decode(await es.find(e=>e.name==="gastrocalc-sicherung.json").bytes()); const d = JSON.parse(tx.slice(tx.indexOf("\n")+1));
const b = d.wurzel.betriebe[0]; const proto = b.messungen; 
for (const N of [1000]) { const gross=[]; for (let i=0;i<N;i++) gross.push({ ...proto[i%proto.length], id: "g"+i }); b.messungen = gross;
 const r = await st.importDatei(JSON.stringify({typ:"gastrocalc-sicherung",schema:6,wurzel:d.wurzel,ereignisse:[]}));
 console.log("rein", N, "nach Einlesen", r.wurzel.betriebe[0].messungen.length);
 const eigen = st.leereWurzel(); st.zusammenfuehren(eigen, r.wurzel); console.log("nach Merge in leere Wurzel", eigen.betriebe[0].messungen.length, "Laeden", eigen.betriebe.length); }
console.log(JSON.stringify(proto[0]));
