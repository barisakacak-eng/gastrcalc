import { uhrStellen } from "./lib.mjs"; uhrStellen();
import { idbAttrappe } from "../tests/hilfe/idb_attrappe.mjs";
import { fixBlob, FIX } from "./lib.mjs";
import fs from "node:fs";
idbAttrappe(); const st = await import("../js/store.js"); await st.laden(); const zl = await import("../js/zip.js");
const buf = fs.readFileSync(FIX);
const B = (u8, type="application/zip") => new Blob([u8], { type });
async function t(name, blob, opt) { const t0=performance.now(); try { const r = await st.importSicherung(blob, opt); console.log(name.padEnd(46), "-> eingelesen: pruefsumme", r.pruefsumme, "Laeden", r.wurzel?.betriebe?.length, r.passwortNoetig?"(passwort)":"", Math.round(performance.now()-t0)+"ms"); } catch (e) { console.log(name.padEnd(46), "-> abgewiesen grund="+e.grund, "|", String(e.message).slice(0,50), Math.round(performance.now()-t0)+"ms"); } }
await t("leere Datei (0 Byte)", B(new Uint8Array(0)));
await t("1 Byte", B(new Uint8Array([0x50])));
await t("Zufall 1 MB", B(crypto.getRandomValues(new Uint8Array(1<<16)).slice(0,65536)));
await t("PK-Kopf + Muell", B(new Uint8Array([0x50,0x4b,3,4,...new Uint8Array(500)])));
await t("ZIP abgeschnitten (50%)", B(buf.slice(0, buf.length>>1)));
await t("ZIP letzte 30 Byte fehlen", B(buf.slice(0, buf.length-30)));
{ const c = Uint8Array.from(buf); c[200]^=0xff; await t("ZIP 1 Byte im JSON gekippt (CRC)", B(c)); }
{ const c = Uint8Array.from(buf); const i = new TextDecoder("latin1").decode(c).indexOf("\n"); c[i+80]= c[i+80]===0x31?0x32:0x31; await t("JSON-Zeichen geaendert (sha/CRC)", B(c)); }
await t("Windows-ZIP mit Deflate", B(fs.readFileSync("_audit/zips/deflate.zip")));
await t("ZIP mit Ordner-Praefix", B(fs.readFileSync("_audit/zips/ordner.zip")));
await t("Python ZIP_STORED (ok-Referenz)", B(fs.readFileSync("_audit/zips/store_ok.zip")));
await t("nackte JSON-Datei (Text)", B(new TextEncoder().encode(new TextDecoder().decode(await (await zl.zipLesen(fixBlob())).find(e=>e.name.endsWith(".json")&&e.name.startsWith("gastro")).bytes())), "application/json"));
await t("JSON mit BOM davor", B(Uint8Array.from([0xEF,0xBB,0xBF,...new TextEncoder().encode(new TextDecoder().decode(await (await zl.zipLesen(fixBlob())).find(e=>e.name==="gastrocalc-sicherung.json").bytes()))])));
await t("Text 'hallo'", B(new TextEncoder().encode("hallo"), "text/plain"));
await t("JSON {}", B(new TextEncoder().encode("{}"), "application/json"));
await t("JSON []", B(new TextEncoder().encode("[]"), "application/json"));
await t("JSON 'null'", B(new TextEncoder().encode("null"), "application/json"));
// 50 MB: gueltige Struktur, aufgeblaeht durch Tagesnotizen
{ const es = await zl.zipLesen(fixBlob()); const tx = new TextDecoder().decode(await es.find(e=>e.name==="gastrocalc-sicherung.json").bytes()); const d = JSON.parse(tx.slice(tx.indexOf("\n")+1));
  const b = d.wurzel.betriebe[0]; const proto = b.messungen; const n = Math.ceil(50e6 / JSON.stringify(proto[0]).length); const gross = []; for (let i=0;i<n;i++) gross.push({ ...proto[i%proto.length], id: "g"+i });
  b.messungen = gross; const text = JSON.stringify({ typ:"gastrocalc-sicherung", schema:6, wurzel: d.wurzel, ereignisse: [] }); console.log("grosse Datei MB:", (text.length/1e6).toFixed(1), "Messungen:", n);
  const m0 = process.memoryUsage().rss; const t0 = performance.now(); const r = await st.importDatei(text); console.log("importDatei 50MB:", Math.round(performance.now()-t0), "ms; RSS +", Math.round((process.memoryUsage().rss-m0)/1e6), "MB");
  const ziel = (await st.importDatei(JSON.stringify({ typ:"gastrocalc-sicherung", schema:6, wurzel:d.wurzel, ereignisse:[] }).slice(0,0) || "{}").catch(()=>null));
  const eigen = st.leereWurzel(); const t1 = performance.now(); st.zusammenfuehren(eigen, r.wurzel); st.zusammenfuehren(eigen, r.wurzel); console.log("2x zusammenfuehren 50MB:", Math.round(performance.now()-t1), "ms; Eintraege", eigen.betriebe[0].messungen.length); }
