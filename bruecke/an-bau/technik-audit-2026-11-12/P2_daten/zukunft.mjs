import { fixBlob } from "./lib.mjs";   // echte Uhr: 2026-11-12, Datei hat Daten 19.12.2026-01.01.2027
import { idbAttrappe } from "../tests/hilfe/idb_attrappe.mjs"; idbAttrappe();
const st = await import("../js/store.js"); await st.laden(); const R = await st.importSicherung(fixBlob());
const ziel = st.leereWurzel(); const z = st.zusammenfuehren(ziel, R.wurzel); const b = ziel.betriebe[0], q = R.wurzel.betriebe[0];
console.log("Handy-Datum:", new Date().toISOString().slice(0,10), "| Datei:", q.messungen.length, "Messungen,", q.putzlog.length, "Putz-Nachweise,", q.rundgaenge.length, "Rundgaenge,", q.abschluesse.length, "Abschluesse");
console.log("nach Einlesen auf dem Handy:", b.messungen.length, "/", b.putzlog.length, "/", b.rundgaenge.length, "/", b.abschluesse.length, "| bericht.zukunft =", z.bericht.zukunft);
