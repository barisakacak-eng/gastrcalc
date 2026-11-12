import { uhrStellen } from "./lib.mjs"; uhrStellen();
import { idbAttrappe } from "../tests/hilfe/idb_attrappe.mjs";
import { fixBlob } from "./lib.mjs";
idbAttrappe(); const st = await import("../js/store.js"); await st.laden(); const zl = await import("../js/zip.js");
const { zaehler, monatsZiel } = await import("../js/zaehler.js");
const es = await zl.zipLesen(fixBlob()); const t0 = new TextDecoder().decode(await es.find(e=>e.name==="gastrocalc-sicherung.json").bytes()); const ROH = JSON.parse(t0.slice(t0.indexOf("\n")+1));
const alsDatei = (d, extra={}) => JSON.stringify({ typ: "gastrocalc-sicherung", schema: 6, ...extra, wurzel: d.wurzel ?? d, ereignisse: [] });
const zahlen = (b) => { const z = zaehler(b, { datum: "2027-01-01" }); const m = monatsZiel(b, z, "2027-01-01"); return { stand: z.stand, stufe: m.stufe, fehlt: m.fehltNull ?? m.fehlt }; };
const zeilen = [];
async function versuch(name, mut, { roh = false, text = null } = {}) {
  const d = structuredClone(ROH); if (mut) mut(d.wurzel);
  let r; const out = { name };
  try {
    r = await st.importDatei(text ?? alsDatei(d)); out.einlesen = "ok";
  } catch (e) { out.einlesen = "abgewiesen:" + (e.grund || e.message); zeilen.push(out); return; }
  try {
    const ziel = st.leereWurzel(); const ersterLaden = (await st.importDatei(alsDatei(ROH))).wurzel; st.zusammenfuehren(ziel, ersterLaden);
    st.zusammenfuehren(ziel, r.wurzel); out.merge = "ok";
    const b = ziel.betriebe[0]; const z = zahlen(b); out.zahlen = JSON.stringify(z, (k,v)=> typeof v==="number" && !Number.isFinite(v) ? String(v) : v);
    const bad = JSON.stringify(z).includes("null") ; if (bad) out.warn = "nicht-endliche Zahl im Cockpit";
  } catch (e) { out.merge = "ABSTURZ: " + e.message.slice(0,80); }
  try { const e = await st.exportDatei(r.wurzel); const r2 = await st.importSicherung(e.blob); out.rundreise = r2.pruefsumme; } catch (e) { out.rundreise = "ABSTURZ: " + e.message.slice(0,80); }
  zeilen.push(out);
}
const b0 = (w) => w.betriebe[0];
await versuch("basis (unveraendert)", null);
await versuch("betriebe[0].messungen = 'x' (String)", (w)=>{ b0(w).messungen = "x"; });
await versuch("messungen = [null,5,'a',{}]", (w)=>{ b0(w).messungen = [null,5,"a",{}]; });
await versuch("tagesnotizen.umsatz als String", (w)=>{ b0(w).tagesnotizen.forEach(n=>n.umsatz = String(n.umsatz)); });
await versuch("tagesnotizen.umsatz = 1e308", (w)=>{ b0(w).tagesnotizen.forEach(n=>n.umsatz = 1e308); });
await versuch("tagesnotizen.umsatz = null", (w)=>{ b0(w).tagesnotizen.forEach(n=>n.umsatz = null); });
await versuch("tagesnotizen.umsatz = -5000", (w)=>{ b0(w).tagesnotizen.forEach(n=>n.umsatz = -5000); });
await versuch("tagesnotizen.datum='2027-13-45'", (w)=>{ b0(w).tagesnotizen.forEach(n=>n.datum = "2027-13-45"); });
await versuch("tagesnotizen = Objekt statt Liste", (w)=>{ b0(w).tagesnotizen = {a:1}; });
await versuch("kosten.betrag = 'abc'", (w)=>{ b0(w).kosten.forEach(k=>k.betrag = "abc"); });
await versuch("gerichte.preis = 'x'/-3", (w)=>{ (b0(w).gerichte||[]).forEach((g,i)=>g.preis = i%2 ? "x" : -3); });
await versuch("betrieb = null (Pflichtfeld weg)", (w)=>{ b0(w).betrieb = null; });
await versuch("betrieb.name = Objekt", (w)=>{ b0(w).betrieb.name = {a:1}; });
await versuch("betrieb.name 5 MB", (w)=>{ b0(w).betrieb.name = "A".repeat(5e6); });
await versuch("id = Zahl 7", (w)=>{ b0(w).id = 7; });
await versuch("id fehlt", (w)=>{ delete b0(w).id; });
await versuch("zwei Laeden gleiche id", (w)=>{ w.betriebe[1].id = w.betriebe[0].id; });
await versuch("alle Journale entfernt", (w)=>{ for (const k of st.JOURNALE) delete b0(w)[k]; });
await versuch("Journal-ids doppelt (messungen)", (w)=>{ const m = b0(w).messungen; m.forEach(x=>x.id = "dup"); });
await versuch("__proto__ Pollution", null, { text: alsDatei(ROH).replace('"betriebe":[', '"__proto__":{"verseucht":1},"betriebe":[') });
await versuch("wurzel.betriebe = []", (w)=>{ w.betriebe = []; });
await versuch("wurzel.betriebe fehlt (-> Schema1-Pfad)", (w)=>{ delete w.betriebe; });
await versuch("aktiv = unbekannt", (w)=>{ w.aktiv = "nix"; });
await versuch("lfd = 'x' / -5", (w)=>{ w.lfd = -5; });
await versuch("messungen.wert Strings", (w)=>{ b0(w).messungen.forEach(m=>m.wert = "3,5"); });
await versuch("messungen.zeit Zukunft 2099", (w)=>{ b0(w).messungen.forEach(m=>{ m.zeit = "2099-01-01T00:00:00.000Z"; }); });
console.table(zeilen.map(z=>({...z, zahlen: (z.zahlen||"").slice(0,60)})));
// Schema-Versionen
const schemaFaelle = { "newer 7": 7, "newer 99": 99, "0": 0, "-1": -1, "'abc'": "abc", "null": null, "fehlt": undefined, "5": 5, "4": 4, "3": 3, "2": 2 };
for (const [n, s] of Object.entries(schemaFaelle)) {
  const d = structuredClone(ROH); d.wurzel.schema = s; if (s === undefined) delete d.wurzel.schema;
  for (const variante of ["kopf-schema=6,wurzel.schema="+n, "kopf-schema="+n]) {
    const text = variante.startsWith("kopf-schema=6") ? alsDatei(d) : JSON.stringify({ typ: "gastrocalc-sicherung", schema: s, wurzel: d.wurzel, ereignisse: [] });
    try { const r = await st.importDatei(text); console.log(n.padEnd(10), variante.padEnd(34), "-> eingelesen, Laeden:", r.wurzel.betriebe.length, "Eintr.:", r.wurzel.betriebe[0].messungen.length); } catch (e) { console.log(n.padEnd(10), variante.padEnd(34), "-> abgewiesen:", e.grund || e.message); }
  }
}
