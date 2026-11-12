import { idbAttrappe } from "../tests/hilfe/idb_attrappe.mjs"; idbAttrappe();
const st = await import("../js/store.js"); await st.laden();
const b = st.leererBetrieb(); const keys = Object.keys(b);
const inBereich = new Set(Object.values(st.BEREICHE).flat());
const speziell = new Set(["schwund","tagesnotizen","messungen","lieferungen","abschluesse","uploads","kostenbelege","putzlog","belehrungen","verkaeufe","rundgaenge","inventuren","monatsabschluesse","geaendert","stammZeit","abgleich","abgleichHinweis","phase","rueckkehr","id"]);
const frei = keys.filter(k => !inBereich.has(k) && !speziell.has(k));
console.log("Alle Felder leererBetrieb():", keys.length);
console.log("Von verschmelzen NICHT zusammengefuehrt (eigenes Handy gewinnt, fremder Stand geht verloren):\n ", frei.join(", "));
// zusaetzlich Felder, die erst per Code gesetzt werden (nicht in leererBetrieb): aus dem Pruefstand
import { fixBlob } from "./lib.mjs"; const R = await st.importSicherung(fixBlob());
const extra = new Set(); for (const bb of R.wurzel.betriebe) for (const k of Object.keys(bb)) if (!keys.includes(k)) extra.add(k);
console.log("Felder im Pruefstand, nicht in leererBetrieb():", [...extra].join(", "));
