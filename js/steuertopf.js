// Welle 3 (Masterauftrag „Gehirn“ 3.1, 3.4, 3.5 – Lauf 2, 31.10.2026): Steuer-Topf, „Was bleibt dir“ und Prüfer-Blick.
// Reine Rechnungen, keine Oberfläche, keine Speicherung. Goldwerte: „GastroCash Prüfpaket Welle 3 Goldwerte 28.10.2026“, Teil A.
// Alles hier ist eine SCHÄTZUNG aus den Tagesumsätzen und Belegen der App – keine Voranmeldung, keine Steuerberatung.
import { umsatzEintrag, umsatzSteuerSatz, fixkosten, monatsLast } from "./engine.js";
import { belege, monatVon, monatPlus } from "./export_steuer.js";
import { warenQuote } from "./zaehler.js";

const rund2 = (n) => Math.round(n * 100) / 100;
const SATZ_7 = 0.07, SATZ_19 = 0.19;

// Anteil des Tagesumsatzes, der zu 19 % besteuert wird (Getränke, Außer-Haus-Getränke …), aus dem Mischsatz der App:
// Mischsatz s = 0,07·(1−a) + 0,19·a  →  a = (s − 0,07) / 0,12. Eigener Satz im Büro = nicht geschätzt; Karte/Standard = Schätzung.
export function anteil19(stand) {
  const s = umsatzSteuerSatz(stand);
  const a = Math.min(1, Math.max(0, (s.satz - SATZ_7) / (SATZ_19 - SATZ_7)));
  return { anteil: a, geschaetzt: s.geschaetzt, quelle: s.quelle };
}

// Umsatzsteuer, die in einem Brutto-Tagesumsatz steckt (ungerundet; gerundet wird erst, wo gezeigt wird)
export function ustImUmsatz(brutto, a19) {
  const b19 = brutto * a19, b7 = brutto - b19;
  return { ust7: b7 * SATZ_7 / (1 + SATZ_7), ust19: b19 * SATZ_19 / (1 + SATZ_19) };
}

export const kleinunternehmer = (stand) => !!stand?.betrieb?.kleinunternehmer;

// Steuer-Topf eines Monats: USt aus allen Tagesumsätzen minus Vorsteuer aus den Belegen des Monats (ust7/ust19 je Beleg aus export_steuer).
// Rückgabe null für Kleinunternehmer (§ 19 UStG: keine Umsatzsteuer, kein Topf). Tage: je Öffnungstag mit Umsatz eine Zeile.
export function steuerTopf(stand, monat) {
  if (kleinunternehmer(stand)) return null;
  const z = monatVon(monat + "-01"); const { anteil, geschaetzt } = anteil19(stand);
  const b = belege(stand, z);
  const vorsteuerJeTag = {}; for (const x of b.zeilen) { const v = (x.ust7 || 0) + (x.ust19 || 0); vorsteuerJeTag[x.datum] = (vorsteuerJeTag[x.datum] || 0) + v; }
  const tage = []; let ust7 = 0, ust19 = 0, umsatz = 0;
  for (let d = z.von; d <= z.bis; d = naechsterTag(d)) {
    const e = umsatzEintrag(stand, d); const vs = vorsteuerJeTag[d] || 0;
    if (!e && !vs) continue;
    const u = e ? ustImUmsatz(e.umsatz, anteil) : { ust7: 0, ust19: 0 };
    ust7 += u.ust7; ust19 += u.ust19; umsatz += e ? e.umsatz : 0;
    tage.push({ datum: d, umsatz: e ? e.umsatz : 0, ust: rund2(u.ust7 + u.ust19), vorsteuer: rund2(vs), topf: rund2(u.ust7 + u.ust19 - vs) });
  }
  const vorsteuer = rund2(b.ust7 + b.ust19);
  const ustGesamt = ust7 + ust19;
  return { monat, umsatzBrutto: rund2(umsatz), ust7: rund2(ust7), ust19: rund2(ust19), ust: rund2(ustGesamt), vorsteuer, zahllast: rund2(ustGesamt - vorsteuer),
    anteil19: anteil, geschaetzt, tage, oeffnungstage: tage.filter((t) => t.umsatz > 0).length, hinweis: "schaetzung" };
}
// „Heute ≈ x € in den Steuer-Topf“: USt des Tages minus Vorsteuer der an diesem Tag erfassten Belege
export function steuerTopfTag(stand, datum) {
  if (kleinunternehmer(stand)) return null;
  const t = steuerTopf(stand, datum.slice(0, 7)); if (!t) return null;
  return t.tage.find((x) => x.datum === datum) || { datum, umsatz: 0, ust: 0, vorsteuer: 0, topf: 0 };
}
const naechsterTag = (iso) => { const [j, m, d] = iso.split("-").map(Number); const x = new Date(j, m - 1, d + 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };

// ---------- 3.4 Was bleibt dir ----------
// Umsatz netto − Ware netto − Energie netto − Miete − Personal − Sonstiges = Ergebnis; − Tilgung; ÷ Chef-Stunden.
// chefStunden: Stunden des Chefs im Monat (Eingabe im Büro, stand.chef.stundenMonat), tilgung: Kreditrate (kosten „kredit“) oder Angabe.
// Muss-Satz daneben (Text in den Sprachtabellen): „vor Einkommensteuer und deiner eigenen Kranken- und Rentenversicherung“.
export function wasBleibt(stand, monat, { chefStunden = null, tilgung = null, posten = null } = {}) {
  const p = posten || monatsPosten(stand, monat);
  const ergebnisVorTilgung = p.umsatzNetto - p.ware - p.energie - p.miete - p.personal - p.sonstiges;
  const til = tilgung ?? p.tilgung;
  const ergebnis = ergebnisVorTilgung - til;
  const std = chefStunden ?? (Number(stand?.chef?.stundenMonat) > 0 ? stand.chef.stundenMonat : null);
  return { monat, ...p, ergebnisVorTilgung: rund2(ergebnisVorTilgung), tilgung: rund2(til), ergebnis: rund2(ergebnis), chefStunden: std,
    jeStunde: std ? rund2(ergebnis / std) : null, geschaetzt: p.geschaetzt };
}

// Monatsposten aus der App: Umsatz netto aus den Tagesumsätzen (Mischsatz), Ware netto aus den Belegen, Kosten aus den festen Posten.
// Fehlen Belege, wird die Ware aus Umsatz × Warenquote geschätzt (≈).
export function monatsPosten(stand, monat) {
  const z = monatVon(monat + "-01"); const { anteil } = anteil19(stand);
  let brutto = 0, netto = 0;
  for (let d = z.von; d <= z.bis; d = naechsterTag(d)) { const e = umsatzEintrag(stand, d); if (!e) continue; const u = ustImUmsatz(e.umsatz, anteil); brutto += e.umsatz; netto += e.umsatz - u.ust7 - u.ust19; }
  const b = belege(stand, z);
  const wareBeleg = b.zeilen.filter((x) => x.quelle === "lieferung").reduce((s, x) => s + (x.netto || 0), 0);
  const kostenBeleg = (stelle) => b.zeilen.filter((x) => x.quelle === "kosten" && x.stelle === stelle).reduce((s, x) => s + (x.netto ?? x.brutto ?? 0), 0);
  const q = warenQuote(stand); const geschaetzt = !(wareBeleg > 0);
  const ware = wareBeleg > 0 ? wareBeleg : netto * q.quote;
  const fk = fixkosten(stand); const kat = (k) => fk.jeKategorie[k]?.summe || 0;
  const ml = monatsLast(stand, z.bis);
  const energie = kostenBeleg("energie") > 0 ? kostenBeleg("energie") : kat("energie");
  return { umsatzBrutto: rund2(brutto), umsatzNetto: rund2(netto), ware: rund2(ware), energie: rund2(energie), miete: rund2(kat("miete")), personal: rund2(ml.lohn || 0),
    sonstiges: rund2(fk.gesamt - kat("miete") - kat("energie") - kat("kredite")), tilgung: rund2(kat("kredite")), geschaetzt };
}

// ---------- 3.5 Prüfer-Blick ----------
// Richtsatzsammlung 2025 (BMF-Schreiben 25.06.2026), Zeile „Imbissstuben u. Ä.“, laut Wiedergabe (Original gesperrt): Rohgewinn I Mittel 68 %,
// Rohaufschlag Mittel 213 %. Nur Orientierung mit Quelle, nie Urteil. Quelle und Datum stehen hier, damit die Oberfläche sie zeigt.
export const RICHTSATZ_IMBISS = { rohgewinn1: 0.68, rohaufschlag: 2.13, quelle: "Richtsatzsammlung 2025, BMF 25.06.2026, Imbissstuben u. Ä. (Mittelwerte)", stand: "2026-06-25" };
export const NOTIZ_AB_PUNKTEN = 2; // Setzung Prüfpaket Welle 3 (28.10.2026): ab 2 Punkten Abweichung zum Vormonat ist die Notiz „Warum?“ Pflicht

export function prueferBlick(stand, monat, { posten = null, vormonat = null } = {}) {
  const p = posten || monatsPosten(stand, monat);
  if (!(p.umsatzNetto > 0) || !(p.ware > 0)) return { monat, quote: null, rohgewinn1: null, rohaufschlag: null, abweichung: null, notizPflicht: false, richtsatz: RICHTSATZ_IMBISS, geschaetzt: p.geschaetzt };
  const quote = p.ware / p.umsatzNetto;
  const vor = vormonat ?? vormonatsQuote(stand, monat);
  const abweichung = typeof vor === "number" ? (quote - vor) * 100 : null; // in Prozentpunkten
  return { monat, quote: rund4(quote), rohgewinn1: rund4(1 - quote), rohaufschlag: rund4((p.umsatzNetto - p.ware) / p.ware), abweichung: abweichung === null ? null : rund2(abweichung),
    notizPflicht: abweichung !== null && Math.abs(abweichung) >= NOTIZ_AB_PUNKTEN, richtsatz: RICHTSATZ_IMBISS, geschaetzt: p.geschaetzt };
}
const rund4 = (n) => Math.round(n * 10000) / 10000;
// Quote des Vormonats: aus dem eingefrorenen Abschluss (3.3), sonst live gerechnet
export function vormonatsQuote(stand, monat) {
  const vm = monatPlus(monat, -1);
  const a = (stand?.monatsabschluesse || []).find((x) => x.monat === vm);
  if (a && typeof a.quote === "number") return a.quote;
  const p = monatsPosten(stand, vm); return p.umsatzNetto > 0 && p.ware > 0 ? p.ware / p.umsatzNetto : null;
}
