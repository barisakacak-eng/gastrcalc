// Kostenbelege – Rechnungen, die keine Ware sind (Miete, Strom, Versicherung …). Etappe 6a, Baris 14.10.2026:
// „Rechnungen hochladen, gleichzeitig zuweisen, für welche Stelle sie gedacht ist und wie sie sich auf den Monat aufteilt."
//
// Verteilung (vom Wirt gewählt, nie still):
//   monatlich – kommt jeden Monat so: setzt den Kostenposten (Betrag je Monat). Die Rechnung ist der Nachweis.
//   jaehrlich – kommt einmal im Jahr: setzt den Kostenposten als Jahresbetrag (die App rechnet ein Zwölftel je Monat).
//   einmalig  – nur in diesem Monat: zählt im Zähler dieses Monats zusätzlich (Reparatur, Nachzahlung).
//   verteilt  – auf N Monate ab dem Rechnungsmonat (z. B. Versicherung für das Quartal).
// Neue Rechenregel mit Go des Kapitäns vom 14.10. (Zähler: Sonderkosten des Monats kommen zur Monatslast dazu).

import { uid, heute } from "./util.js";
import { basisStandard } from "./data/kosten.js";
import { POSTEN } from "./data/kosten.js";

export const VERTEILUNGEN = ["monatlich", "jaehrlich", "einmalig", "verteilt"];

// Welche Kostenstellen die Auswahl zeigt (Reihenfolge = Häufigkeit in kleinen Läden), "ware" führt in den Wareneingang.
export const STELLEN = ["ware", "miete", "strom", "gas", "wasser", "versicherungen", "internet", "kasse", "steuerberater", "leasing", "muell", "werbung", "sonstiges"];

const HINWEISE = [
  ["ware", /(metro|selgros|transgourmet|chefs\s?culinar|handelshof|edeka|kaufland|lidl|aldi|rewe|netto|penny|gro(ß|ss)handel|lieferschein|artikel|menge|kiste|karton|döner|doener|fleisch|gemüse|getränke|getraenke)/i],
  ["miete", /(miete|mietvertrag|pacht|kaltmiete|warmmiete|vermieter)/i],
  ["strom", /(strom|kwh|stadtwerke|enbw|e\.on|eon\b|vattenfall|rwe|stromverbrauch|zählerstand|zaehlerstand)/i],
  ["gas", /(\bgas\b|erdgas|gasverbrauch)/i],
  ["wasser", /(wasser|abwasser|trinkwasser)/i],
  ["versicherungen", /(versicherung|beitrag\s+zur|police|haftpflicht|allianz|axa|ergo|huk|signal\s?iduna)/i],
  ["internet", /(telekom|vodafone|o2|telefonica|1&1|internet|dsl|glasfaser|mobilfunk)/i],
  ["kasse", /(kassensystem|ready2order|orderbird|sumup|lightspeed|gastrofix|tse)/i],
  ["steuerberater", /(steuerberat|buchhaltung|lohnabrechnung|jahresabschluss)/i],
  ["leasing", /(leasing|ratenzahlung)/i],
  ["muell", /(entsorgung|abfall|müll|muell|remondis|alba|veolia|fettabscheider|speisereste)/i],
  ["werbung", /(werbung|flyer|anzeige|google\s?ads|druckerei)/i],
];

// Kostenstelle aus dem Text raten – nur als Vorauswahl, der Wirt bestätigt.
export function stelleRaten(text) {
  const t = String(text || "");
  let best = null;
  for (const [stelle, re] of HINWEISE) { const n = (t.match(new RegExp(re.source, "gi")) || []).length; if (n && (!best || n > best.n)) best = { stelle, n }; }
  return best ? best.stelle : null;
}

// Betrag: 1.250,00 oder 119,00 – kein Leerzeichen als Tausendertrenner (sonst wird „2026 119,00" zu 26.119,00, Review 6a)
const ZAHL = /(?<![\d.,])(\d{1,3}(?:\.\d{3})+|\d+),(\d{2})(?!\d)/g;
const zahl = (m) => Number(m[1].replace(/\./g, "")) + Number(m[2]) / 100;
const DATUM = /(?<!\d)(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2})(?!\d)/g;
function isoAus(m) { const j = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]); if (j < 2000 || j > 2100 || Number(m[2]) < 1 || Number(m[2]) > 12 || Number(m[1]) < 1 || Number(m[1]) > 31) return null; return `${j}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`; }

// Betrag und Datum aus dem Text (für die Vorbelegung). Gesucht wird zuerst nach „Gesamt/Rechnungsbetrag/zu zahlen", dann nach netto.
export function kostenbelegLesen(text) {
  const zeilen = String(text || "").split(/\r?\n/);
  // der letzte Betrag der Zeile hinter dem Stichwort („Rechnungsbetrag fällig am 15.11.2026 119,00 €" → 119,00)
  const finde = (re) => { for (const z of zeilen) if (re.test(z)) { const ms = [...z.slice(z.search(re)).matchAll(ZAHL)]; if (ms.length) return zahl(ms[ms.length - 1]); } return null; };
  const brutto = finde(/(gesamtbetrag|rechnungsbetrag|zu\s+zahlen|endbetrag|gesamt\s*(brutto)?|summe\s+brutto|bruttobetrag|total)/i);
  const netto = finde(/(netto(betrag)?|summe\s+netto|zwischensumme)/i);
  const mwst = finde(/(mwst|ust|umsatzsteuer)\b[^\n]*?(?<!\d)(19|7)\s?%/i);
  // Datum: zuerst hinter „Rechnungsdatum/Datum/vom", sonst das jüngste Datum, das nicht in der Zukunft liegt (nicht den Abrechnungszeitraum-Beginn)
  let datum = null; const T = String(text || "");
  const stich = T.match(/(rechnungsdatum|belegdatum|datum|vom)\D{0,15}(\d{1,2}\.\d{1,2}\.(?:\d{4}|\d{2}))(?!\d)/i);
  if (stich) { const m = [...stich[2].matchAll(DATUM)][0]; if (m) datum = isoAus(m); }
  if (!datum) { const alle = [...T.matchAll(DATUM)].map(isoAus).filter((d) => d && d <= heute()).sort(); datum = alle.pop() || null; }
  let satz = null; const s = T.match(/(?<!\d)(19|7)\s?%/); if (s) satz = Number(s[1]) / 100;
  return { brutto, netto: netto !== null && brutto !== null && netto > brutto ? null : netto, mwst, satz, datum };
}

const monatVon = (iso) => iso.slice(0, 7);
const monatPlus = (m, n) => { const [j, mo] = m.split("-").map(Number); const d = new Date(j, mo - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };

// Legt den Kostenbeleg an (Journal stand.kostenbelege, nur anhängen) und setzt bei monatlich/jährlich den Kostenposten.
// betrag ist der Betrag, wie er auf der Rechnung steht; basis "netto" | "brutto".
export function kostenbelegAnlegen(stand, { stelle, betrag, basis = null, datum = heute(), verteilung = "monatlich", monate = 3, upload = null, lieferant = "", satz = null }) {
  if (!POSTEN.some((p) => p.id === stelle)) throw new Error("unbekannte Kostenstelle");
  if (!(betrag > 0)) throw new Error("Betrag fehlt");
  if (!VERTEILUNGEN.includes(verteilung)) verteilung = "monatlich";
  const b = basis === "netto" || basis === "brutto" ? basis : basisStandard(stelle);
  const n = verteilung === "verteilt" ? Math.min(24, Math.max(2, Math.round(Number(monate) || 3))) : verteilung === "einmalig" ? 1 : null;
  const e = { id: uid(), erfasst: new Date().toISOString(), datum: datum > heute() ? heute() : datum, stelle, betrag, basis: b, satz, verteilung, monate: n, ab: monatVon(datum > heute() ? heute() : datum), upload, lieferant: String(lieferant || "").slice(0, 60), storniert: false };
  stand.kostenbelege.push(e);
  if (verteilung === "monatlich" || verteilung === "jaehrlich") {
    const p = POSTEN.find((x) => x.id === stelle);
    let k = stand.kosten.find((x) => x.posten === stelle);
    if (!k) { k = { id: uid(), posten: stelle, kategorie: p.kat, status: "aus", betrag: null, periode: "monat" }; stand.kosten.push(k); }
    e.vorher = { betrag: k.betrag ?? null, status: k.status || "aus", periode: k.periode || "monat", basis: k.basis || b, sammel: k.sammel || null }; // für die Rücknahme
    Object.assign(k, { betrag, status: "bekannt", periode: verteilung === "jaehrlich" ? "jahr" : "monat", basis: b, beleg: e.id });
    delete k.sammel;
  }
  return e;
}

// Gleicher Beleg schon da? (gleiche Stelle, gleicher Betrag, gleiches Datum, nicht storniert) – dann fragt die App nach.
export function kostenbelegDoppelt(stand, { stelle, betrag, datum }) {
  return (stand.kostenbelege || []).some((e) => !e.storniert && e.stelle === stelle && Math.abs(e.betrag - betrag) < 0.005 && e.datum === datum);
}

// Was steht für diese Stelle schon als fester Posten drin? Für den Hinweis vor dem Ersetzen.
export function postenVorher(stand, stelle) {
  const k = stand.kosten.find((x) => x.posten === stelle && x.status !== "aus" && typeof x.betrag === "number");
  const sammel = stelle === "gas" ? stand.kosten.find((x) => x.posten === "strom" && x.sammel === "strom-gas" && x.status !== "aus") : null;
  return { posten: k || null, sammel: sammel || null };
}

// Netto-Anteil eines Kostenbelegs für einen Monat "JJJJ-MM" (nur einmalig/verteilt; monatlich/jährlich laufen über den Kostenposten).
export function anteilImMonat(e, monat, vorsteuer = 0.19) {
  if (e.storniert || !(e.verteilung === "einmalig" || e.verteilung === "verteilt")) return 0;
  const netto = e.basis === "brutto" ? e.betrag / (1 + (typeof e.satz === "number" ? e.satz : vorsteuer)) : e.betrag;
  const n = e.monate || 1;
  for (let i = 0; i < n; i++) if (monatPlus(e.ab, i) === monat) return netto / n;
  return 0;
}

// Sonderkosten eines Monats für den Zähler: { summe, belege: [{ e, anteil }] }
export function sonderkostenImMonat(stand, monat) {
  const belege = (stand.kostenbelege || []).map((e) => ({ e, anteil: anteilImMonat(e, monat) })).filter((x) => x.anteil > 0);
  return { summe: belege.reduce((s, x) => s + x.anteil, 0), belege };
}

export function kostenbelegStornieren(stand, id) {
  const e = (stand.kostenbelege || []).find((x) => x.id === id); if (!e || e.storniert) return false;
  e.storniert = true; e.storniertZeit = new Date().toISOString();
  // Hat dieser Beleg einen festen Posten gesetzt, kommt der vorherige Wert zurück (Review 6a)
  const k = stand.kosten.find((x) => x.beleg === id);
  if (k) { delete k.beleg; if (e.vorher) { Object.assign(k, { betrag: e.vorher.betrag, status: e.vorher.status, periode: e.vorher.periode, basis: e.vorher.basis }); if (e.vorher.sammel) k.sammel = e.vorher.sammel; } }
  return true;
}
