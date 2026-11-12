import { uhrStellen, uhr, fixBlob, stabil } from "./lib.mjs"; uhrStellen("2027-01-01T19:00:00Z");
import { idbAttrappe } from "../tests/hilfe/idb_attrappe.mjs";
const att = idbAttrappe(); const st = await import("../js/store.js"); const eng = await import("../js/engine.js");
const { zaehler } = await import("../js/zaehler.js");
await st.laden();
const R = await st.importSicherung(fixBlob());
const klon = (x) => structuredClone(x);
async function handy(name, geraet, fn) {
  await st.allesLoeschen(); let w = await st.laden(); w = st.leereWurzel(); w.geraet = geraet;
  st.zusammenfuehren(w, klon(R.wurzel)); w.geraet = geraet; w.aktiv = w.betriebe[0].id;
  await st.sofortSpeichern(w, { stempel: false });           // Basislinie
  uhr.plus(5); fn(w, w.betriebe[0]); uhr.plus(1); await st.sofortSpeichern(w);   // Änderung + Stempel
  return klon(w);
}
const T = "2027-01-02";
// ---- S2 Tagesumsatz: beide Handys tragen offline denselben Tag ein
uhr.set("2027-01-02T12:00:00Z");
const A = await handy("A", "gerA", (w,b) => { eng.tagesnotizSetzen(b, T, 600, { geraet: "gerA" }); eng.tagesnotizFestschreiben(b, T, "gerA"); b.gerichte[0].preis = 11.11; });
uhr.set("2027-01-02T13:00:00Z");
const B = await handy("B", "gerB", (w,b) => { eng.tagesnotizSetzen(b, T, 400, { geraet: "gerB" }); eng.tagesnotizFestschreiben(b, T, "gerB"); b.gerichte[1].preis = 22.22; });
const mAB = klon(A); const rAB = st.zusammenfuehren(mAB, klon(B)); const mBA = klon(B); const rBA = st.zusammenfuehren(mBA, klon(A));
const um = (w) => eng.umsatzEintrag(w.betriebe[0], T)?.umsatz;
console.log("S2 Tagesumsatz: A=600, B=400 | A<-B:", um(mAB), " B<-A:", um(mBA), "| echter Tag (beide Kassen):", 1000, "| Hinweis A<-B:", JSON.stringify(mAB.betriebe[0].abgleichHinweis ?? null), "bericht", JSON.stringify(rAB.bericht));
console.log("   beide Eintraege nicht storniert im Journal:", mAB.betriebe[0].tagesnotizen.filter(n=>n.datum===T && !n.storniert).map(n=>n.umsatz));
// ---- S3 Stammdaten: A aendert Gericht[0], B aendert Gericht[1]
const p = (w,i) => w.betriebe[0].gerichte[i].preis;
const pre = [R.wurzel.betriebe[0].gerichte[0].preis, R.wurzel.betriebe[0].gerichte[1].preis];
console.log("S3 Preise vorher:", pre, "| A:", [p(A,0),p(A,1)], "B:", [p(B,0),p(B,1)], "| A<-B:", [p(mAB,0),p(mAB,1)], "B<-A:", [p(mBA,0),p(mBA,1)], "beide-Hinweis:", JSON.stringify(mAB.betriebe[0].abgleichHinweis?.bereiche ?? mAB.betriebe[0].abgleichHinweis ?? null));
// ---- S1 doppeltes Einlesen / Kommutativitaet / Rundreise
const tot = (w) => JSON.stringify(Object.fromEntries(st.JOURNALE.map(j => [j, (w.betriebe[0][j]||[]).length])));
const x1 = klon(mAB); st.zusammenfuehren(x1, klon(B)); st.zusammenfuehren(x1, klon(B)); st.zusammenfuehren(x1, klon(A));
console.log("S1 Journale nach 1x:", tot(mAB)); console.log("   nach 3 weiteren Einlesen (B,B,A):", tot(x1)); console.log("   Journale gleich (stabil)?", stabil(st.JOURNALE.map(j=>mAB.betriebe[0][j])) === stabil(st.JOURNALE.map(j=>x1.betriebe[0][j])));
const kom = (j) => stabil((mAB.betriebe[0][j]||[]).map(e=>e.id).sort()) === stabil((mBA.betriebe[0][j]||[]).map(e=>e.id).sort());
console.log("   Kommutativ (ids gleich A<-B vs B<-A):", st.JOURNALE.filter(j=>!kom(j)).join(",") || "alle Journale");
console.log("   Cockpit stand A<-B:", zaehler(mAB.betriebe[0], {datum:T}).stand, " B<-A:", zaehler(mBA.betriebe[0], {datum:T}).stand);


// S3b: zweite Runde – tauschen beide Handys noch einmal, kommt je ein Stand heraus?
const A2 = klon(mAB), B2 = klon(mBA); st.zusammenfuehren(A2, klon(B2)); st.zusammenfuehren(B2, klon(A2));
console.log("S3b nach 2. Austausch: A:", [p(A2,0),p(A2,1)], " B:", [p(B2,0),p(B2,1)], " -> konvergiert?", stabil(A2.betriebe[0].gerichte) === stabil(B2.betriebe[0].gerichte));
// S2b: nur Journal-Aenderungen (keine Stammdaten): gleiche Zahlen auf beiden?
uhr.set("2027-01-03T12:00:00Z");
const A3 = await handy("A", "gerA", (w,b) => { eng.tagesnotizSetzen(b, T, 600, { geraet: "gerA" }); eng.tagesnotizFestschreiben(b, T, "gerA"); });
uhr.set("2027-01-03T13:00:00Z");
const B3 = await handy("B", "gerB", (w,b) => { eng.tagesnotizSetzen(b, T, 400, { geraet: "gerB" }); eng.tagesnotizFestschreiben(b, T, "gerB"); });
const a3 = klon(A3), b3 = klon(B3); st.zusammenfuehren(a3, klon(B3)); st.zusammenfuehren(b3, klon(A3));
console.log("S2b ohne Stammdaten: stand A<-B:", zaehler(a3.betriebe[0], {datum:T}).stand, " B<-A:", zaehler(b3.betriebe[0], {datum:T}).stand, "Hinweis:", JSON.stringify(a3.betriebe[0].abgleichHinweis ?? null));
// S5: HACCP-Messung gleiche ID, anderer Wert (Manipulation / zwei Handys)
const A4 = await handy("A","gerA",(w,b)=>{ b.messungen[0].wert = 5.0; }); const B4 = await handy("B","gerB",(w,b)=>{ b.messungen[0].wert = 7.9; });
const m4 = klon(A4); const r4 = st.zusammenfuehren(m4, klon(B4)); const id0 = R.wurzel.betriebe[0].messungen[0].id;
console.log("S5 Messung gleiche id: lokal 5.0 vs fremd 7.9 -> Eintraege mit id:", m4.betriebe[0].messungen.filter(m=>String(m.id).startsWith(id0)).map(m=>[m.id.slice(-8), m.wert, m.quelle]), "konflikte:", r4.bericht.konflikte);
