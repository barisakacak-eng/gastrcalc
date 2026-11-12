import { uhrStellen } from "./lib.mjs"; uhrStellen();
import { idbAttrappe } from "../tests/hilfe/idb_attrappe.mjs";
import { fixBlob } from "./lib.mjs";
idbAttrappe(); const st = await import("../js/store.js"); await st.laden(); const zl = await import("../js/zip.js");
const { zaehler, monatsZiel } = await import("../js/zaehler.js");
const es = await zl.zipLesen(fixBlob()); const t0 = new TextDecoder().decode(await es.find(e=>e.name==="gastrocalc-sicherung.json").bytes()); const ROH = JSON.parse(t0.slice(t0.indexOf("\n")+1));
let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const pick = (a) => a[Math.floor(rnd()*a.length)];
const WERTE = [null, undefined, "x", "", 0, -1, 1e308, NaN, true, false, [], {}, [null], {a:1}, "2027-13-45", "9999-99-99", [1,2], -0.0001, 1e-320];
function pfade(o, p = [], out = []) { if (o && typeof o === "object") for (const k of Object.keys(o)) { out.push([...p,k]); if (out.length < 200000) pfade(o[k], [...p,k], out); } return out; }
const alle = pfade(ROH.wurzel);
const stat = { n:0, einlesenAbgewiesen:0, mergeCrash:0, zahlenCrash:0, rundreiseCrash:0, nanImCockpit:0 }; const faelle = [];
for (let i=0;i<400;i++) {
  const d = structuredClone(ROH); const k = 1 + Math.floor(rnd()*3); const geaendert=[];
  for (let j=0;j<k;j++) { const p = pick(alle); let o = d.wurzel; for (const s of p.slice(0,-1)) { if (o == null || typeof o !== "object") { o=null; break; } o = o[s]; } if (o && typeof o === "object") { const w = pick(WERTE); if (w === undefined) delete o[p.at(-1)]; else o[p.at(-1)] = w; geaendert.push(p.map(x=>/^\d+$/.test(x)?"#":x).join(".")); } }
  stat.n++; let text; try { text = JSON.stringify({ typ:"gastrocalc-sicherung", schema:6, wurzel:d.wurzel, ereignisse:[] }); } catch { continue; }
  let r; try { r = await st.importDatei(text); } catch (e) { stat.einlesenAbgewiesen++; continue; }
  const ziel = (await st.importDatei(JSON.stringify({ typ:"gastrocalc-sicherung", schema:6, wurzel:ROH.wurzel, ereignisse:[] }))).wurzel;
  try { st.zusammenfuehren(ziel, r.wurzel); } catch (e) { stat.mergeCrash++; faelle.push(["MERGE", e.message.slice(0,70), geaendert.join(" + ")]); continue; }
  try { for (const b of ziel.betriebe) { const z = zaehler(b, { datum: "2027-01-01" }); const m = monatsZiel(b, z, "2027-01-01"); if (![z.stand].every(Number.isFinite)) { stat.nanImCockpit++; faelle.push(["NaN", "stand="+z.stand, geaendert.join(" + ")]); } } } catch (e) { stat.zahlenCrash++; faelle.push(["ZAHLEN", e.message.slice(0,70), geaendert.join(" + ")]); }
  try { const e = await st.exportDatei(r.wurzel); await st.importSicherung(e.blob); } catch (e) { stat.rundreiseCrash++; faelle.push(["ROUNDTRIP", e.message.slice(0,70), geaendert.join(" + ")]); }
}
console.log(stat); const gez = new Map(); for (const f of faelle) { const k=f[0]+"|"+f[1]; if(!gez.has(k)) gez.set(k,f); } for (const f of [...gez.values()].slice(0,25)) console.log(f.join(" || "));
