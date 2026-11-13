// Welle 3 (Masterauftrag „Gehirn“ 3.1, 3.4, 3.5 – Lauf 2, 31.10.2026): Steuer-Topf, „Was bleibt dir“ und Prüfer-Blick.
// Reine Rechnungen, keine Oberfläche, keine Speicherung. Goldwerte: „GastroCash Prüfpaket Welle 3 Goldwerte 28.10.2026“, Teil A.
// Alles hier ist eine SCHÄTZUNG aus den Tagesumsätzen und Belegen der App – keine Voranmeldung, keine Steuerberatung.
import { wert as regelWert } from "./data/regelwerk.js";
import { umsatzEintrag, umsatzSteuerSatz, fixkosten, monatsLast } from "./engine.js";
import { belege, monatVon, monatPlus } from "./export_steuer.js";
import { warenQuote, wareNettoAusBelegen } from "./zaehler.js";
import { wert } from "./data/regelwerk.js";
import { plusTage } from "./zeit.js";
import { heute } from "./util.js";
import { rund2, mwst, nettoVonBrutto } from "./geld.js";

const rund4 = (n) => Math.round(n * 10000) / 10000;
// Die beiden Sätze kommen aus dem Regelwerk (geld.mwst), am Tag des Umsatzes; ohne Tag am heutigen.
const SATZ_7 = (tag = heute()) => mwst("ermaessigt", tag), SATZ_19 = (tag = heute()) => mwst("voll", tag);

// Anteil des Tagesumsatzes, der zu 19 % besteuert wird (Getränke, Außer-Haus-Getränke …), aus dem Mischsatz der App:
// Mischsatz s = s7·(1−a) + s19·a  →  a = (s − s7) / (s19 − s7) (Sätze aus dem Regelwerk). Eigener Satz im Büro = nicht geschätzt; Karte/Standard = Schätzung.
export function anteil19(stand, tag = heute()) {
  const s = umsatzSteuerSatz(stand); const s7 = SATZ_7(tag), s19 = SATZ_19(tag);
  const a = Math.min(1, Math.max(0, (s.satz - s7) / (s19 - s7)));
  return { anteil: a, geschaetzt: s.geschaetzt, quelle: s.quelle };
}

// Umsatzsteuer, die in einem Brutto-Tagesumsatz steckt (ungerundet; gerundet wird erst, wo gezeigt wird)
export function ustImUmsatz(brutto, a19, tag = heute()) {
  const b19 = brutto * a19, b7 = brutto - b19; const s7 = SATZ_7(tag), s19 = SATZ_19(tag);
  return { ust7: b7 * s7 / (1 + s7), ust19: b19 * s19 / (1 + s19) };
}

export const kleinunternehmer = (stand) => !!stand?.betrieb?.kleinunternehmer;

// Grenzprüfung für Kleinunternehmer (§ 19 Abs. 1 UStG, Grenzen aus dem Regelwerk): Umsatz des Vorjahres und des laufenden Jahres aus den
// Tagesumsätzen des Ladens. Nur ein Hinweis – die App schaltet nichts um. Rückgabe null, wenn der Schalter aus ist.
export function kleinunternehmerPruefung(stand, tag) {
  if (!kleinunternehmer(stand)) return null;
  const jahr = tag.slice(0, 4), vorjahr = String(Number(jahr) - 1); let laufend = 0, vor = 0;
  for (const n of stand.tagesnotizen || []) { if (!n || n.storniert || typeof n.umsatz !== "number") continue; if (n.datum.startsWith(jahr)) laufend += n.umsatz; else if (n.datum.startsWith(vorjahr)) vor += n.umsatz; }
  const gV = regelWert("kleinunternehmer_vorjahr", tag), gL = regelWert("kleinunternehmer_laufend", tag);
  return { laufend, vorjahr: vor, grenzeVorjahr: gV, grenzeLaufend: gL, ueberVorjahr: vor > gV, ueberLaufend: laufend > gL };
}

// Steuer-Topf eines Monats: USt aus allen Tagesumsätzen minus Vorsteuer aus den Belegen des Monats (ust7/ust19 je Beleg aus export_steuer).
// Rückgabe null für Kleinunternehmer (§ 19 UStG: keine Umsatzsteuer, kein Topf). Tage: je Öffnungstag mit Umsatz eine Zeile.
export function steuerTopf(stand, monat) {
  if (kleinunternehmer(stand)) return null;
  const z = monatVon(monat + "-01"); const { anteil, geschaetzt } = anteil19(stand, z.von);
  const b = belege(stand, z);
  const vorsteuerJeTag = {}; for (const x of b.zeilen) { const v = (x.ust7 || 0) + (x.ust19 || 0); vorsteuerJeTag[x.datum] = (vorsteuerJeTag[x.datum] || 0) + v; }
  // Tageszeilen kumuliert gerundet (03.11.2026): jede Zeile = gerundete Summe bis heute − gerundete Summe bis gestern.
  // So ist die Summe der Tageszeilen auf den Cent gleich der Monatszahl (Prüfpaket A: „Summe über den Monat = Monatszahl“);
  // einzelne Tage weichen dafür um 1 Cent ab (Nov-Test: 92,70 € und 92,69 €).
  const tage = []; let ust7 = 0, ust19 = 0, umsatz = 0, bisher = 0;
  for (let d = z.von; d <= z.bis; d = plusTage(d, 1)) {
    const e = umsatzEintrag(stand, d); const vs = vorsteuerJeTag[d] || 0;
    if (!e && !vs) continue;
    const u = e ? ustImUmsatz(e.umsatz, anteil, d) : { ust7: 0, ust19: 0 };
    ust7 += u.ust7; ust19 += u.ust19; umsatz += e ? e.umsatz : 0;
    const ustTag = rund2(rund2(ust7 + ust19) - bisher); bisher = rund2(ust7 + ust19);
    tage.push({ datum: d, umsatz: e ? e.umsatz : 0, ust: ustTag, vorsteuer: rund2(vs), topf: rund2(ustTag - vs) });
  }
  const vorsteuer = rund2(b.ust7 + b.ust19);
  const ustGesamt = ust7 + ust19;
  // ust7 und ust19 ergeben zusammen genau ust (auf den Cent): der 19-%-Teil ist der Rest, wie bei aufteilen() in js/geld.js. Zahllast und ust bleiben wie sie waren.
  const ustR = rund2(ustGesamt), ust7R = rund2(ust7);
  return { monat, umsatzBrutto: rund2(umsatz), ust7: ust7R, ust19: rund2(ustR - ust7R), ust: ustR, vorsteuer, zahllast: rund2(ustGesamt - vorsteuer),
    anteil19: anteil, geschaetzt, tage, oeffnungstage: tage.filter((t) => t.umsatz > 0).length, hinweis: "schaetzung" };
}
// „Heute ≈ x € in den Steuer-Topf“: USt des Tages minus Vorsteuer der an diesem Tag erfassten Belege
export function steuerTopfTag(stand, datum) {
  if (kleinunternehmer(stand)) return null;
  const t = steuerTopf(stand, datum.slice(0, 7)); if (!t) return null;
  return t.tage.find((x) => x.datum === datum) || { datum, umsatz: 0, ust: 0, vorsteuer: 0, topf: 0 };
}

// ---------- 3.4 Was bleibt dir ----------
// Umsatz netto − Ware netto − Putzmittel & Betriebsmittel − Energie netto − Miete − Personal − Sonstiges = Ergebnis; − Tilgung; ÷ Chef-Stunden.
// chefStunden: Stunden des Chefs im Monat (Eingabe im Büro, stand.chef.stundenMonat), tilgung: Kreditrate (kosten „kredit“) oder Angabe.
// Muss-Satz daneben (Text in den Sprachtabellen): „vor Einkommensteuer und deiner eigenen Kranken- und Rentenversicherung“.
// Reine Rechnung (Goldwert-Test): posten { umsatzNetto, ware, putzmittel (optional), energie, miete, personal, sonstiges, tilgung }, chefStunden oder null
export function wasBleibtAus(p, chefStunden = null) {
  const ergebnisVorTilgung = p.umsatzNetto - p.ware - (p.putzmittel || 0) - p.energie - p.miete - p.personal - p.sonstiges; // Lauf 6 (P1 B3): Putzmittel als eigene Zeile, nicht im Wareneinsatz
  const ergebnis = ergebnisVorTilgung - (p.tilgung || 0); const std = Number(chefStunden) > 0 ? Number(chefStunden) : null;
  return { ergebnisVorTilgung: rund2(ergebnisVorTilgung), tilgung: rund2(p.tilgung || 0), ergebnis: rund2(ergebnis), chefStunden: std, jeStunde: std ? rund2(ergebnis / std) : null };
}
export function wasBleibt(stand, monat, { chefStunden = null, tilgung = null, posten = null } = {}) {
  const p = { ...(posten || monatsPosten(stand, monat)) }; if (tilgung !== null) p.tilgung = tilgung;
  const std = chefStunden ?? (Number(stand?.chef?.stundenMonat) > 0 ? stand.chef.stundenMonat : null);
  return { monat, ...p, ...wasBleibtAus(p, std), geschaetzt: p.geschaetzt };
}

// Monatsposten aus der App: Umsatz netto aus den Tagesumsätzen (Mischsatz), Ware netto aus den Belegen, Kosten aus den festen Posten.
// Fehlen Belege, wird die Ware aus Umsatz × Warenquote geschätzt (≈).
export function monatsPosten(stand, monat) {
  const z = monatVon(monat + "-01");
  // Umsatz netto = Brutto minus die Umsatzsteuer je Satz (dieselbe Aufteilung wie im Steuer-Topf: anteil19, ustImUmsatz). So gilt für jeden Monat
  // Umsatz netto + Umsatzsteuer des Steuer-Topfs = Umsatz brutto. Der Zähler im Laden rechnet dagegen als Schätzung mit Brutto ÷ (1 + Mischsatz);
  // das weicht um ≈ 0,1 % ab (Beispiel-Laden Oktober: 16.643,59 € genau gegen 16.629,62 € im Zähler) und ist dort mit ≈ gekennzeichnet.
  const { anteil } = anteil19(stand, z.von);
  let brutto = 0, netto = 0;
  for (let d = z.von; d <= z.bis; d = plusTage(d, 1)) { const e = umsatzEintrag(stand, d); if (!e) continue; const u = ustImUmsatz(e.umsatz, anteil, d); brutto += e.umsatz; netto += e.umsatz - u.ust7 - u.ust19; }
  const b = belege(stand, z);
  // Lauf 6 (P1 B3): Ware = dieselbe Funktion wie im Zähler (ohne Putzmittel); die Putzmittel stehen als eigene Zeile „putzmittel“
  const wb = wareNettoAusBelegen(stand, z.von, z.bis); const wareBeleg = rund2(wb.ware); const putzmittel = rund2(wb.betriebsmittel);
  const kostenBeleg = (stelle) => b.zeilen.filter((x) => x.quelle === "kosten" && x.stelle === stelle).reduce((s, x) => s + (x.netto ?? x.brutto ?? 0), 0);
  const q = warenQuote(stand); const geschaetzt = !(wareBeleg > 0);
  const ware = wareBeleg > 0 ? wareBeleg : netto * q.quote;
  const fk = fixkosten(stand, monat); const kat = (k) => fk.jeKategorie[k]?.summe || 0;
  const ml = monatsLast(stand, z.bis);
  const energie = kostenBeleg("energie") > 0 ? kostenBeleg("energie") : kat("energie");
  return { umsatzBrutto: rund2(brutto), umsatzNetto: rund2(netto), ware: rund2(ware), energie: rund2(energie), putzmittel, miete: rund2(kat("miete")), personal: rund2(ml.lohn || 0),
    sonstiges: rund2(fk.gesamt - kat("miete") - kat("energie") - kat("kredite")), tilgung: rund2(kat("kredite")), geschaetzt };
}

// ---------- 3.5 Prüfer-Blick ----------
// Richtsatzsammlung 2025 (BMF-Schreiben 25.06.2026), Zeile „Imbissstuben u. Ä.“, laut Wiedergabe (Original gesperrt): Rohgewinn I Mittel = 1 − Wareneinsatz,
// Rohaufschlag Mittel. Die Werte stehen im Regelwerk (richtsatz_wareneinsatz, richtsatz_rohaufschlag). Nur Orientierung mit Quelle, nie Urteil.
// Quelle und Datum stehen hier, damit die Oberfläche sie zeigt.
const RICHTSATZ_IMBISS = { rohgewinn1: rund4(1 - wert("richtsatz_wareneinsatz", "2026-12-31")), rohaufschlag: wert("richtsatz_rohaufschlag", "2026-12-31"), quelle: "Richtsatzsammlung 2025, BMF 25.06.2026, Imbissstuben u. Ä. (Mittelwerte)", stand: "2026-06-25" };
const NOTIZ_AB_PUNKTEN = 2; // Setzung Prüfpaket Welle 3 (28.10.2026): ab 2 Punkten Abweichung zum Vormonat ist die Notiz „Warum?“ Pflicht

// Reine Rechnung (Goldwert-Test): posten { umsatzNetto, ware }, Quote des Vormonats (0–1) oder null
export function prueferAus(p, vor = null) {
  if (!(p.umsatzNetto > 0) || !(p.ware > 0)) return { quote: null, rohgewinn1: null, rohaufschlag: null, abweichung: null, notizPflicht: false, richtsatz: RICHTSATZ_IMBISS };
  const quote = p.ware / p.umsatzNetto;
  const abweichung = typeof vor === "number" ? rund2(rund4(quote) * 100 - vor * 100) : null; // in Prozentpunkten, aus der gezeigten Quote
  return { quote: rund4(quote), rohgewinn1: rund4(1 - quote), rohaufschlag: rund4((p.umsatzNetto - p.ware) / p.ware), abweichung,
    notizPflicht: abweichung !== null && Math.abs(abweichung) >= NOTIZ_AB_PUNKTEN, richtsatz: RICHTSATZ_IMBISS };
}
export function prueferBlick(stand, monat, { posten = null, vormonat = null } = {}) {
  const p = posten || monatsPosten(stand, monat);
  return { monat, ...prueferAus(p, vormonat ?? vormonatsQuote(stand, monat)), geschaetzt: p.geschaetzt };
}
// Quote des Vormonats: aus dem eingefrorenen Abschluss (3.3), sonst live gerechnet
function vormonatsQuote(stand, monat) {
  const vm = monatPlus(monat, -1);
  const a = (stand?.monatsabschluesse || []).find((x) => x.monat === vm);
  if (a && typeof a.quote === "number") return a.quote;
  const p = monatsPosten(stand, vm); return p.umsatzNetto > 0 && p.ware > 0 ? p.ware / p.umsatzNetto : null;
}
