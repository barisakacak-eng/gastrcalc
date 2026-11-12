import { uhrStellen, fixBlob } from "./lib.mjs"; uhrStellen();
import { idbAttrappe } from "../tests/hilfe/idb_attrappe.mjs"; idbAttrappe();
const st = await import("../js/store.js"); await st.laden(); const ab = await import("../js/ablage.js");
const R = await st.importSicherung(fixBlob()); const w = R.wurzel;
const rnd = (n) => { const u = new Uint8Array(n); for (let i = 0; i < n; i += 65536) crypto.getRandomValues(u.subarray(i, Math.min(n, i + 65536))); return u; };
const orig = {}; for (const n of [1, 1000, 3e6, 14.9e6]) { const b = new Blob([rnd(n)], { type: "image/jpeg" }); const m = await ab.ablegen(b, { name: "f" + n }); orig[m.id] = new Uint8Array(await b.arrayBuffer()); }
console.log("abgelegt:", Object.keys(orig).length);
const e = await st.exportDatei(w); console.log("Export: Dateien", e.dateien, "Groesse MB", (e.groesse / 1e6).toFixed(1));
await ab.ablageLeeren(); console.log("nach Leeren:", (await ab.ablageKennungen()).length);
const ein = await st.importSicherung(e.blob); const r1 = await st.ablageAusSicherung(ein.ablage, ab.ablageZuruecklegen); const r2 = await st.ablageAusSicherung(ein.ablage, ab.ablageZuruecklegen);
let gleich = 0; for (const [id, bytes] of Object.entries(orig)) { const b = await ab.ablageLesen(id); const u = b ? new Uint8Array(await b.arrayBuffer()) : null; if (u && u.length === bytes.length && Buffer.compare(Buffer.from(u), Buffer.from(bytes)) === 0) gleich++; }
console.log("1. Einlesen:", JSON.stringify(r1), "| 2. Einlesen (doppelt):", JSON.stringify(r2), "| Bytes identisch:", gleich + "/" + Object.keys(orig).length);
// Foto im ZIP manipuliert
const zl = await import("../js/zip.js"); const es = await zl.zipLesen(e.blob); const buf = new Uint8Array(await e.blob.arrayBuffer());
const x = es.find(q => q.name.startsWith("ablage/") && q.groesse > 1e6); const off = buf.indexOf ? 0 : 0;
