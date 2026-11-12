import { idbAttrappe } from "../tests/hilfe/idb_attrappe.mjs";
import { fixBlob } from "./lib.mjs";
idbAttrappe(); const st = await import("../js/store.js"); await st.laden(); const zl = await import("../js/zip.js");
const es = await zl.zipLesen(fixBlob()); const t = new TextDecoder().decode(await es.find(e=>e.name==="gastrocalc-sicherung.json").bytes()); const roh = JSON.parse(t.slice(t.indexOf("\n")+1)).wurzel;
const A = await st.importSicherung(fixBlob());
let weg=0, imJournal=0, verloren=0, abweich=0;
roh.betriebe.forEach((b,i)=>{ const nb=A.wurzel.betriebe[i]; const mj=new Map(nb.messungen.map(m=>[m.id,m]));
  for (const r of b.rundgaenge) for (const m of r.messungen||[]) { weg++; const j=mj.get(m.id); if (j) { imJournal++; if (JSON.stringify(j)!==JSON.stringify(m)) abweich++; } else verloren++; } });
console.log({ rundgangMessungenEntfernt:weg, davonImMessJournal:imJournal, verloren, inhaltlichAbweichend:abweich });
const sz=new Set(); roh.betriebe.forEach(b=>b.tagesnotizen.forEach(n=>{ if(n.sitzung) sz.add(n.sitzung)})); console.log("tagesnotizen.sitzung Werte:", [...sz]);
import { diff } from "./lib.mjs";
{ const b=roh.betriebe[0], nb=A.wurzel.betriebe[0]; const r=b.rundgaenge.find(r=>r.messungen?.length); const m=r.messungen[0]; const j=nb.messungen.find(x=>x.id===m.id); console.log("Beispiel Abweichung:", diff(m,j).join(" | ")); console.log("Rundgang-Keys:", Object.keys(r).join(","), "geraet/lfd rund:", r.geraet, r.lfd);
 const nr=A.wurzel.betriebe[0].rundgaenge.find(x=>x.id===r.id); console.log("nach Einlesen Rundgang messungen:", nr.messungen.length); }
