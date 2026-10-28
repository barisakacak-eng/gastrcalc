// Euro-Zähler „Weniger Verlust seit Start“ (Titel 24.10.2026 nach Gremium 3: keine Wirkungsbehauptung, § 5 UWG; vorher „Diesen Monat gebracht“) (Vertrag docs/vertraege.md Abschnitt 1, Zoro 23.10.2026).
// Rein: liest den Stand, schreibt nichts, gibt kein HTML zurück. Nur Gemessenes zählt in die Summe; nichts wird erfunden.
// Leitsatz: vorne wird verdient, hinten bleibt das Geld – der Zähler zeigt beides, aber nur mit Beleg.
import { heuteGeschaeft } from "./util.js";
import { eintragWert, SCHWUND_ARTEN } from "./engine.js";
import { inventurenFertig, inventurWert } from "./inventur.js";

export const AUSGANGSWERT_TAGE = 14; // Wochen 1–2 nach Messbeginn (Baris 21.10.2026)

const istMuell = (e) => e && !e.storniert && typeof e.datum === "string" && (SCHWUND_ARTEN[e.art] || 1) === 1;
const tagPlus = (iso, n) => { const [j, m, d] = iso.split("-").map(Number); const x = new Date(j, m - 1, d + n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
const tageZwischen = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const rund = (x) => Math.round(x * 100) / 100;

// Messbeginn: der früheste Müll-Eintrag oder Tagesabschluss. null ohne beides.
export function messbeginn(stand) {
  const daten = [];
  for (const e of stand.schwund || []) if (istMuell(e)) daten.push(e.datum);
  for (const a of stand.abschluesse || []) if (a && !a.storniert && typeof a.datum === "string") daten.push(a.datum);
  return daten.length ? daten.sort()[0] : null;
}

function muellWert(stand, von, bis) {
  let s = 0, n = 0, u = 0;
  for (const e of stand.schwund || []) {
    if (!istMuell(e) || e.datum < von || e.datum > bis) continue;
    const w = eintragWert(e, stand); if (w === null) { u += 1; continue; } // Gremium 2 (24.10.2026): unbewertete Einträge zählen nicht als Messung
    n += 1; s += w;
  }
  return { wert: s, anzahl: n, unbewertet: u };
}

// Posten Müll: Ausgangswert (Wochenmittel der ersten 14 Tage) gegen die letzte Woche. Gemessen erst mit vollem Ausgangswert.
export function postenMuell(stand, H, ab) {
  if (!ab) return { art: "muell", euro: null, gemessen: false, stand: "fehlt", quelle: "Noch kein Müll erfasst" };
  const tag = tageZwischen(ab, H) + 1; // Tag 1 = Messbeginn
  if (tag < AUSGANGSWERT_TAGE) return { art: "muell", euro: null, gemessen: false, stand: "laeuft", quelle: `Ausgangswert läuft, Tag ${tag} von ${AUSGANGSWERT_TAGE}` };
  const basisEnde = tagPlus(ab, AUSGANGSWERT_TAGE - 1);
  const basis = muellWert(stand, ab, basisEnde);
  const basisWoche = basis.wert / (AUSGANGSWERT_TAGE / 7);
  const woche = muellWert(stand, tagPlus(H, -6), H);
  if (basis.anzahl === 0) return { art: "muell", euro: null, gemessen: false, stand: "fehlt", quelle: "Ausgangswert ohne bewerteten Müll-Eintrag" }; // Gremium 2: Basis 0 € ist keine Messung
  if (tag < AUSGANGSWERT_TAGE + 7 || woche.anzahl === 0) return { art: "muell", euro: null, gemessen: false, stand: "laeuft", quelle: `Ausgangswert ${rund(basisWoche)} € je Woche, Vergleichswoche läuft` };
  const nutzen = Math.max(0, rund(basisWoche - woche.wert));
  return { art: "muell", euro: nutzen, gemessen: true, stand: "gemessen", quelle: `Müll je Woche: ${rund(basisWoche)} € am Anfang, ${rund(woche.wert)} € zuletzt` };
}

// Posten Lager: erste gegen letzte fertige Inventur. Gebundenes Geld ist kein Gewinn → nie gemessen, nie in der Summe.
export function postenLager(stand) {
  const fertig = inventurenFertig(stand);
  if (fertig.length < 2) return { art: "lager", euro: null, gemessen: false, stand: "fehlt", quelle: fertig.length ? "Zweite Inventur fehlt" : "Noch keine Inventur" };
  const erste = inventurWert(stand, fertig[0]); const letzte = inventurWert(stand, fertig[fertig.length - 1]);
  const w = (x) => (typeof x?.wert === "number" ? x.wert : typeof x?.summe === "number" ? x.summe : null);
  if (w(erste) === null || w(letzte) === null) return { art: "lager", euro: null, gemessen: false, stand: "fehlt", quelle: "Inventur ohne Preise" };
  const diff = rund(w(erste) - w(letzte));
  return { art: "lager", euro: Math.max(0, diff), gemessen: false, stand: "geschaetzt", quelle: diff > 0 ? `Weniger gebundenes Geld im Lager (${rund(w(erste))} € → ${rund(w(letzte))} €), kein Gewinn` : "Lagerwert nicht gesunken" };
}

// Posten Papierkram: nur mit der Vorher-Schätzung des Wirts (Minuten je Monat, Stundensatz). Bleibt eine Schätzung.
export function postenPapier(stand) {
  const n = stand.betrieb?.nutzen || {};
  const min = Number(n.papierMinutenVorher) || 0; const satz = Number(n.stundensatz) || 0;
  if (!(min > 0) || !(satz > 0)) return { art: "papier", euro: null, gemessen: false, stand: "fehlt", quelle: "Vorher-Schätzung des Wirts fehlt (Minuten je Monat, Stundensatz)" };
  return { art: "papier", euro: rund((min / 60) * satz), gemessen: false, stand: "geschaetzt", quelle: `≈ ${min} Minuten Papierkram je Monat vorher, Schätzung des Wirts` };
}

// Posten Preis (Masterauftrag 1.4, 28.10.2026): Preisrunden, die der Wirt im Preisrunden-Rechner übernommen hat (stand.preisRunden).
// Je Runde: (neu − alt) / (1 + MwSt) × Menge im Monat zum Zeitpunkt der Änderung = Mehr-Deckungsbeitrag im Monat, wenn alle Gäste bleiben.
// Immer ≈ geschätzt (nicht gemessen): ob Gäste weggeblieben sind, weiß die App nicht. Ohne Runde ehrlich „fehlt“.
export function postenPreis(stand) {
  const r = (stand?.preisRunden || []).filter((x) => x && x.neu > 0 && x.alt > 0 && x.mengeMonat > 0); // Senkungen zählen mit (Kanzlei-Test 28.10.2026)
  if (!r.length) return { art: "preis", euro: null, gemessen: false, stand: "fehlt", quelle: "Noch keine Preisrunde im Preisrunden-Rechner übernommen" };
  const monat = r.reduce((s, x) => s + (x.neu - x.alt) / (1 + (Number(x.mwst) || 0)) * x.mengeMonat, 0);
  // Je Woche wie die übrigen Posten („pro Woche“ auf Heute): Monat × 12 / 52
  return { art: "preis", euro: rund(Math.max(0, monat) * 12 / 52), gemessen: false, stand: "geschaetzt", quelle: `≈ ${r.length} Preisrunde(n), je Woche bei gleicher Menge` };
}

export function nutzenStand(stand, H = heuteGeschaeft()) {
  const ab = messbeginn(stand);
  const posten = [postenMuell(stand, H, ab), postenPreis(stand), postenLager(stand), postenPapier(stand)];
  const summe = rund(posten.filter((p) => p.gemessen && p.euro > 0).reduce((s, p) => s + p.euro, 0));
  const geschaetzt = rund(posten.filter((p) => !p.gemessen && typeof p.euro === "number" && p.euro > 0).reduce((s, p) => s + p.euro, 0));
  return { ab, tage: ab ? tageZwischen(ab, H) + 1 : 0, leer: !posten.some((p) => p.gemessen), summe, geschaetzt, posten };
}
