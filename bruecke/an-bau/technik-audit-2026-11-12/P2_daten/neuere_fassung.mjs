import { uhrStellen, fixBlob } from "./lib.mjs"; uhrStellen();
import { idbAttrappe } from "../tests/hilfe/idb_attrappe.mjs"; idbAttrappe();
const st = await import("../js/store.js"); await st.laden(); const zl = await import("../js/zip.js");
const es = await zl.zipLesen(fixBlob()); const t = new TextDecoder().decode(await es.find(e=>e.name==="gastrocalc-sicherung.json").bytes()); const d = JSON.parse(t.slice(t.indexOf("\n")+1));
d.fassung = "2099-01-01.1"; d.wurzel.neuesWurzelFeld = { x: 1 }; d.wurzel.betriebe[0].neuesLadenFeld = [1,2,3]; d.wurzel.betriebe[0].gerichte[0].neuesGerichtFeld = "kg"; d.wurzel.betriebe[0].tagesnotizen[0].neuesEintragFeld = 7;
const r = await st.importDatei(JSON.stringify({ typ: "gastrocalc-sicherung", schema: 6, wurzel: d.wurzel, ereignisse: [] }));
const w = r.wurzel, b = w.betriebe[0];
console.log("Datei mit fassung 2099 (gleiches Schema 6) eingelesen: ja");
console.log("Wurzel-Feld erhalten:", "neuesWurzelFeld" in w, "| Laden-Feld:", "neuesLadenFeld" in b, "| Gericht-Feld:", "neuesGerichtFeld" in b.gerichte[0], "| Eintrag-Feld:", "neuesEintragFeld" in b.tagesnotizen[0]);
// Kommt dasselbe beim Laden aus der DB (Altfassung oeffnet DB der Neufassung)?
await st.allesLoeschen(); const l = await st.laden(); const ziel = st.leereWurzel(); ziel.neuesWurzelFeld = { y: 2 }; st.zusammenfuehren(ziel, structuredClone(w)); ziel.neuesWurzelFeld = { y: 2 }; await st.sofortSpeichern(ziel);
const ge = await st.laden(); console.log("Wurzel-Feld nach Neustart aus IndexedDB (Altfassung liest Neufassungs-Stand):", "neuesWurzelFeld" in ge);
