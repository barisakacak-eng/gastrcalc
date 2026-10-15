// Etappe 5: Belege übernehmen – aus dem zerlegten Text (js/beleg.js) wird eine Lieferung im Journal,
// die Preise der zugeordneten Artikel werden nachgezogen, und „Preise gestiegen" lässt sich daraus lesen.
// Datenschutz: Es wird nur gespeichert, was die App braucht – Artikel, Menge, Preis, Händlername, Datum. Kein Kundenname, keine Kundennummer, keine Adresse.
import { uid, heute } from "./util.js";
import { EINHEITEN, inBasis } from "./data/katalog.js";
import { preisMerken, preisJeBasis, preisNettoGebinde } from "./engine.js";
import { preisJeEinheit } from "./beleg.js";

// Belegeinheit → App-Einheit für packung.einheit
const EINHEIT_APP = { kg: "kg", g: "g", l: "l", ml: "ml", cl: "ml", stk: "stk" };
// Gebindekürzel des Zerlegers → Gebindearten der App (Review Etappe 5, Punkt 12)
const GEBINDE_APP = { karton: "karton", kiste: "kiste", kasten: "kiste", beutel: "beutel", packung: "packung", kanister: "kanister", fass: "kanister", eimer: "eimer", sack: "sack", netz: "sack", flasche: "flasche", glas: "flasche", dose: "dose", tray: "packung", laib: "packung", palette: "packung", display: "karton" };
export const gebindeArtApp = (g) => GEBINDE_APP[g] || "packung";

// Eine Zeile des Zerlegers in eine Journalzeile: nur Zahlen und Namen, netto gerechnet.
export function journalZeile(z, belegBasis) {
  const basis = belegBasis === "brutto" ? "brutto" : "netto";
  const je = preisJeEinheit(z, basis);
  const satz = typeof z.steuersatz === "number" ? z.steuersatz : null;
  const netto = z.gesamt === null ? null : basis === "brutto" ? (satz === null ? null : z.gesamt / (1 + satz)) : z.gesamt;
  const inhaltEinheit = z.inhalt?.einheit ? EINHEIT_APP[z.inhalt.einheit] || "stk" : null;
  const inhaltMenge = z.inhalt?.groesse !== null && z.inhalt?.groesse !== undefined ? (z.inhalt.anzahl ?? 1) * z.inhalt.groesse * (z.inhalt.einheit === "cl" ? 10 : 1) : (z.inhalt?.anzahl ?? null);
  return { name: z.name, artikel: z.bekannt || null, menge: z.menge, gebinde: z.gebinde || null, inhaltMenge, inhaltEinheit, inhaltAnzahl: z.inhalt?.anzahl ?? null,
    einzelpreis: z.einzelpreis, jeKg: !!z.jeKg, gesamt: z.gesamt, netto, steuersatz: satz, jeEinheit: je.preis, jeEinheitEinheit: je.einheit, sicher: !!z.sicher };
}

export function lieferungAnlegen(stand, beleg, { zeilen, datum = null, geraet = null, basis = null, alleZeilen = true } = {}) {
  const b = basis || (beleg.basis === "brutto" ? "brutto" : "netto");
  const jz = zeilen.map((z) => journalZeile(z, b));
  const pfand = (beleg.pfand || []).reduce((s, p) => s + (Number(p.betrag) || 0), 0);
  const zeilenNetto = jz.reduce((s, z) => s + (z.netto || 0), 0);
  // Einkaufssumme: Fußzeile nur, wenn sie zu den Zeilen passt und alle Zeilen übernommen wurden; sonst die übernommenen Zeilen (ohne Pfand)
  const fuss = typeof beleg.summeNetto === "number" && beleg.summeStimmt && alleZeilen ? Math.max(0, beleg.summeNetto - pfand) : null;
  const H = heute(); let d = datum || beleg.datum || H; if (d > H) d = H; // ein Zahlungsziel in der Zukunft ist kein Lieferdatum
  const l = { id: uid(), datum: d, erfasst: new Date().toISOString(), geraet, lieferant: (beleg.lieferant || "").slice(0, 40), typ: beleg.typ || "unklar", basis: b, quelle: "text",
    summeNetto: fuss !== null ? fuss : (zeilenNetto > 0 ? zeilenNetto : null), summeBrutto: typeof beleg.summeBrutto === "number" ? beleg.summeBrutto : null, pfand, zeilen: jz, storniert: false, abdruck: belegAbdruck(beleg) };
  stand.lieferungen.push(l); return l;
}
// Gibt es diesen Beleg schon? Gleicher Händler, gleiches Datum, gleiche Summe (±0,05) – dann fragt die App nach (Nachtest Etappe 5, Punkt 2).
// Fingerabdruck eines Belegs: Zeilen (Name und Betrag) – derselbe Beleg zweimal eingelesen ergibt denselben Abdruck (Prüfung 15.10.)
export const belegAbdruck = (beleg) => (beleg.zeilen || []).map((z) => `${(z.roh || z.name || "").replace(/\s+/g, " ").trim().toLowerCase()}|${z.gesamt ?? ""}`).sort().join("\n");
export function lieferungDoppelt(stand, beleg, datum) {
  const summe = typeof beleg.summeNetto === "number" ? beleg.summeNetto : beleg.zeilenSumme;
  const abdruck = belegAbdruck(beleg);
  return (stand.lieferungen || []).find((l) => !l.storniert && (l.datum === datum && ((abdruck && l.abdruck === abdruck) || ((l.lieferant || "") === (beleg.lieferant || "") && l.summeNetto !== null && typeof summe === "number" && Math.abs((l.summeNetto + (l.pfand || 0)) - summe) < 0.05)))) || null;
}

// Preise der zugeordneten Artikel nachziehen. Das Gebinde des Belegs wird zur Packung des Artikels (netto), der alte Preis wandert in den Verlauf.
// Liefert die Änderungen je Artikel (alt/neu je Basiseinheit) für „Preise gestiegen".
export function preiseUebernehmen(stand, lieferung) {
  const aenderungen = [];
  for (const z of lieferung.zeilen) {
    if (!z.artikel || z.jeEinheit === null || !(z.inhaltMenge > 0) || !z.inhaltEinheit) continue;
    if (!(z.menge > 0) || !(z.netto > 0)) continue; // Retoure oder Gutschrift ist kein Einkaufspreis (Review Etappe 5, Punkt 3)
    const a = (stand.artikel || []).find((x) => x.name === z.artikel); if (!a) continue;
    const basisAlt = EINHEITEN[a.packung?.einheit]?.basis, basisNeu = EINHEITEN[z.inhaltEinheit]?.basis;
    if (basisAlt && basisNeu && basisAlt !== basisNeu) continue; // kg gegen Stück: nicht umrechnen, lieber nichts tun
    const alt = preisJeBasis(a);
    preisMerken(a, lieferung.datum);
    const preisNetto = z.netto !== null && z.menge ? z.netto / Math.abs(z.menge) : null; if (preisNetto === null) continue;
    a.packung = { menge: z.inhaltMenge, einheit: z.inhaltEinheit };
    a.gebinde = { art: gebindeArtApp(z.gebinde), zwischen: z.inhaltAnzahl > 1 && z.inhaltMenge !== z.inhaltAnzahl ? { art: "packung", anzahl: z.inhaltAnzahl } : null };
    a.preis = Math.round(preisNetto * 100) / 100; a.preisBasis = "netto"; a.status = "bekannt"; a.preisDatum = lieferung.datum;
    const neu = preisJeBasis(a);
    if (alt !== null && neu !== null && Math.abs(neu - alt) > 1e-9) aenderungen.push({ name: a.name, alt, neu, prozent: alt > 0 ? (neu - alt) / alt : null, einheit: EINHEITEN[a.packung.einheit]?.basis || "stk", datum: lieferung.datum });
    else if (alt === null && neu !== null) aenderungen.push({ name: a.name, alt: null, neu, prozent: null, einheit: EINHEITEN[a.packung.einheit]?.basis || "stk", datum: lieferung.datum });
  }
  return aenderungen;
}

// Preisänderungen der letzten `tage` Tage aus dem Verlauf (für Zähler-Seite und Beleg-Bestätigung).
export function preisAenderungen(stand, { tage = 30, datum = heute() } = {}) {
  const grenze = new Date(Date.parse(datum) - tage * 86400e3).toISOString().slice(0, 10);
  const out = [];
  for (const a of stand.artikel || []) {
    const h = (a.preisHistorie || []).filter((x) => x.datum >= grenze);
    if (!h.length || !(a.preisDatum >= grenze)) continue;
    const letzter = h[h.length - 1];
    const altBasis = inBasis(letzter.menge, letzter.einheit); if (!(altBasis > 0)) continue;
    const altNetto = letzter.basis === "brutto" ? preisNettoGebinde({ ...a, preis: letzter.preis, preisBasis: "brutto" }) : letzter.preis;
    const alt = altNetto / altBasis; const neu = preisJeBasis(a);
    if (neu === null || !(alt > 0) || Math.abs(neu - alt) < 1e-9) continue;
    out.push({ name: a.name, alt, neu, prozent: (neu - alt) / alt, einheit: EINHEITEN[a.packung?.einheit]?.basis || "stk", datum: a.preisDatum });
  }
  return out.sort((x, y) => Math.abs(y.prozent) - Math.abs(x.prozent));
}

// Preis je Basiseinheit, den eine Belegzeile für einen Artikel ergeben würde – für die Rückfrage bei großen Sprüngen (Nachtest Etappe 5, Punkt 8).
export function preisSprung(stand, z, belegBasis) {
  const a = (stand.artikel || []).find((x) => x.name === z.bekannt); if (!a) return null;
  const jz = journalZeile(z, belegBasis); if (!(jz.menge > 0) || !(jz.netto > 0) || !(jz.inhaltMenge > 0) || !jz.inhaltEinheit) return null;
  const alt = preisJeBasis(a); if (!(alt > 0)) return null;
  const neu = preisJeBasis({ ...a, packung: { menge: jz.inhaltMenge, einheit: jz.inhaltEinheit }, preis: jz.netto / jz.menge, preisBasis: "netto" }); if (neu === null) return null;
  return { alt, neu, prozent: (neu - alt) / alt, einheit: EINHEITEN[jz.inhaltEinheit]?.basis || "stk" };
}
