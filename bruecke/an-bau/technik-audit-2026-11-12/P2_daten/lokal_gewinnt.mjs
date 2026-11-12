import { uhrStellen } from "./lib.mjs"; uhrStellen();
import { idbAttrappe } from "../tests/hilfe/idb_attrappe.mjs"; idbAttrappe();
const st = await import("../js/store.js"); await st.laden(); const sm = await import("../js/stamm.js"); const sc = await import("../js/schichten.js");
const base = st.leererBetrieb(); base.id = "L1"; base.betrieb = { name: "T", format: "imbiss" }; base.phase = "app";
base.personen = [{ id: "p1", kuerzel: "AB", aktiv: true, entfernt: false }];
const A = structuredClone(base), B = structuredClone(base);
sm.teamTagSetzen(A, "2027-01-02", [{ person: "p1", name: "AB", stunden: 8, satz: 14 }]);
sm.teamTagSetzen(B, "2027-01-03", [{ person: "p1", name: "AB", stunden: 9, satz: 14 }]);
sc.schichtEintragen(A, { datum: "2027-01-02", person: "p1", von: "10:00", bis: "18:00" });
sc.schichtEintragen(B, { datum: "2027-01-03", person: "p1", von: "10:00", bis: "19:00" });
B.chef = { stundenMonat: 200 };
const m = st.verschmelzen(structuredClone(A), structuredClone(B));
console.log("teamTage  A:", A.teamTage.map(x=>x.datum), "B:", B.teamTage.map(x=>x.datum), "-> A<-B:", m.teamTage.map(x=>x.datum));
console.log("schichten A:", A.schichten.length, "B:", B.schichten.length, "-> A<-B:", m.schichten.length, "(Tag", m.schichten.map(x=>x.datum), ")");
console.log("chef (B: 200 h) -> A<-B:", JSON.stringify(m.chef ?? null));
// Schichten-ID-Kollision: beide Handys tragen am selben Tag dieselbe Person ein (id aus Laenge)
const A2 = structuredClone(base), B2 = structuredClone(base);
sc.schichtEintragen(A2, { datum: "2027-01-02", person: "p1", von: "10:00", bis: "18:00" }); sc.schichtEintragen(B2, { datum: "2027-01-02", person: "p1", von: "12:00", bis: "20:00" });
console.log("Schicht-IDs A2/B2 gleich?", A2.schichten[0].id === B2.schichten[0].id, A2.schichten[0].id);
// Malformed teamTage nach dem Einlesen
const w = { schema: 6, betriebe: [{ ...base, teamTage: [{ datum: 5, eintraege: "x" }] }] };
const r = await st.importDatei(JSON.stringify({ typ: "gastrocalc-sicherung", schema: 6, wurzel: w, ereignisse: [] }));
try { sm.stundenJeTag(r.wurzel.betriebe[0], "p1", "2027-01"); console.log("stundenJeTag ok"); } catch (e) { console.log("stundenJeTag bei kaputtem teamTage ->", e.constructor.name + ":", e.message); }
console.log("teamTage im Laden nach Einlesen (ungeprueft durchgereicht):", JSON.stringify(r.wurzel.betriebe[0].teamTage));
