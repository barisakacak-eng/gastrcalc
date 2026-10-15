// Büro-Ordner „Steuerberater“ und „Buchhalter“ (Drei Ebenen, 15.10.2026): das Monatspaket als reine Daten und als CSV.
// Keine Oberfläche, keine Texte – die Ansicht (screens/ordner.js) übersetzt. Alles wird aus den vorhandenen Journalen gelesen,
// nichts neu gerechnet, was schon eine Stelle rechnet: Umsatz über umsatzEintrag/umsatzSteuerSatz, Schwund über schwundAuswertung,
// Belege über lieferungTeile, Inventur über inventurWert, Kostenposten über monatsLast.
//
// CSV für Excel in Deutschland: Semikolon als Trenner, Dezimalkomma, Datum TT.MM.JJJJ, UTF-8 mit BOM (sonst zeigt Excel Umlaute falsch),
// Zeilenende CRLF. Textzellen, die mit = + - @ beginnen, bekommen ein Hochkomma davor (sonst führt Excel sie als Formel aus).
import { umsatzEintrag, umsatzSteuerSatz, schwundAuswertung, wertEintrag, SCHWUND_ARTEN, SVEV_2026, tagPlus, monatsLast } from "./engine.js";
import { lieferungTeile, istBetriebsmittel } from "./betriebsmittel.js";
import { inventurWert } from "./inventur.js";
import { heute } from "./util.js";

// ---------- CSV ----------
export const CSV_BOM = "﻿";
// Zahl mit Dezimalkomma, ohne Tausenderpunkt (Excel liest „1234,50“ sicher als Zahl, „1.234,50“ nicht immer)
export function zahlDe(n, dezimal = 2) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return "";
  const s = Number(n).toFixed(dezimal);
  return (s === "-0.00" || /^-0\.?0*$/.test(s) ? s.slice(1) : s).replace(".", ",");
}
export const datumDe = (iso) => { if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return ""; const [j, m, d] = iso.slice(0, 10).split("-"); return `${d}.${m}.${j}`; };
// Eine Zelle: Zahl (typeof number) → Dezimalkomma; Text → Formelschutz und Anführungszeichen, wenn nötig
export function csvZelle(v, dezimal = 2) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return zahlDe(v, dezimal);
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[";\r\n]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
// kopf: ["Datum", …]; zeilen: [[…], …]; dezimal je Spalte optional (Standard 2)
export function csvText(kopf, zeilen, { dezimal = [] } = {}) {
  const z = (r) => r.map((v, i) => csvZelle(v, dezimal[i] ?? 2)).join(";");
  return CSV_BOM + [z(kopf), ...zeilen.map(z)].join("\r\n") + "\r\n";
}

// ---------- Zeitraum ----------
export function monatVon(iso) {
  const [j, m] = iso.split("-").map(Number);
  const ende = new Date(j, m, 0);
  return { von: `${iso.slice(0, 7)}-01`, bis: heute(ende), monat: iso.slice(0, 7) };
}
export function monatPlus(monat, n) { const [j, m] = monat.split("-").map(Number); const d = new Date(j, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }

const imZeitraum = (d, { von, bis }) => typeof d === "string" && d >= von && d <= bis;
const nachDatum = (a, b) => String(a.datum).localeCompare(String(b.datum)) || String(a.zeit || a.erfasst || "").localeCompare(String(b.zeit || b.erfasst || ""));
// Wert eines Schwund-Eintrags: die beim Eintragen festgehaltene Momentaufnahme, wie in schwundAuswertung (engine.js)
const schwundWert = (e, stand) => ("wert" in e ? (typeof e.wert === "number" ? e.wert : null) : wertEintrag(e, stand));
const rund2 = (n) => Math.round(n * 100) / 100;
const personName = (stand, id) => (stand.personen || []).find((p) => p.id === id)?.kuerzel || null;

// ---------- Teile des Pakets ----------
// Tagesumsätze: der jüngste gültige Eintrag je Tag (brutto aus der Kasse), netto über den Mischsatz des Ladens
export function tagesumsaetze(stand, z) {
  const st = umsatzSteuerSatz(stand); const zeilen = [];
  for (let d = z.von; d <= z.bis; d = tagPlus(d, 1)) {
    const e = umsatzEintrag(stand, d); if (!e) continue;
    const brutto = e.umsatz; const netto = rund2(brutto / (1 + st.satz));
    zeilen.push({ datum: d, brutto, netto, steuer: rund2(brutto - netto), satz: st.satz, nacherfasst: !!e.nacherfasst });
  }
  const summe = zeilen.reduce((s, x) => ({ brutto: s.brutto + x.brutto, netto: s.netto + x.netto, steuer: s.steuer + x.steuer }), { brutto: 0, netto: 0, steuer: 0 });
  return { zeilen, summe, tage: zeilen.length, satz: st.satz, satzQuelle: st.quelle };
}

// Personalessen mit amtlichem Sachbezugswert (SvEV 2026) je Mahlzeit, dazu je Person (wenn der Eintrag eine Person trägt)
export function personalessen(stand, z) {
  const zeilen = (stand.schwund || []).filter((e) => !e.storniert && e.art === "personal" && imZeitraum(e.datum, z)).sort(nachDatum).map((e) => {
    const je = SVEV_2026[e.mahlzeit] ?? SVEV_2026.mittag; const menge = Number(e.menge) || 0;
    return { datum: e.datum, gericht: e.ref?.name || "", mahlzeit: e.mahlzeit || "mittag", menge, je, sachbezug: rund2(menge * je), waren: schwundWert(e, stand), person: personName(stand, e.von) };
  });
  const jePerson = {};
  for (const x of zeilen) { const k = x.person || ""; jePerson[k] ??= { anzahl: 0, sachbezug: 0 }; jePerson[k].anzahl += x.menge; jePerson[k].sachbezug += x.sachbezug; }
  return { zeilen, jePerson, anzahl: zeilen.reduce((s, x) => s + x.menge, 0), sachbezug: zeilen.reduce((s, x) => s + x.sachbezug, 0) };
}

// Müll und Schwund (Vorgang 1, Warenwert netto zum Einkaufspreis) und Eigenverbrauch (Vorgang 3), Summen aus schwundAuswertung
export function schwund(stand, z) {
  const a = schwundAuswertung(stand, z);
  const zeilen = (stand.schwund || []).filter((e) => !e.storniert && imZeitraum(e.datum, z) && (SCHWUND_ARTEN[e.art] || 1) !== 2).sort(nachDatum)
    .map((e) => ({ datum: e.datum, art: e.art, name: e.art === "eimer" ? (e.ref?.name || "") : (e.ref?.name || ""), menge: Number(e.menge) || 0, einheit: e.einheit || "", wert: schwundWert(e, stand), vorgang: SCHWUND_ARTEN[e.art] || 1, grund: e.grund || "" }));
  return { zeilen, jeArt: a.jeArt, muellwert: a.muellwert, ohneWert: a.ohneWert, eigen: a.eigen };
}

// Belege: eingelesene Lieferungen (Ware, Betriebsmittel getrennt) und Kostenbelege (Miete, Strom …)
export function belege(stand, z) {
  const zeilen = [];
  for (const l of stand.lieferungen || []) {
    if (l.storniert || !imZeitraum(l.datum, z)) continue;
    const teile = lieferungTeile(l);
    const netto = typeof l.summeNetto === "number" ? l.summeNetto : teile.ware + teile.betriebsmittel;
    zeilen.push({ datum: l.datum, quelle: "lieferung", lieferant: l.lieferant || "", stelle: "ware", netto: rund2(netto), brutto: typeof l.summeBrutto === "number" ? l.summeBrutto : null, betriebsmittel: rund2(teile.betriebsmittel), id: l.id });
  }
  for (const k of stand.kostenbelege || []) {
    if (k.storniert || !imZeitraum(k.datum, z)) continue;
    const satz = typeof k.satz === "number" ? k.satz : 0.19;
    const netto = k.basis === "brutto" ? k.betrag / (1 + satz) : k.betrag; const brutto = k.basis === "brutto" ? k.betrag : k.betrag * (1 + satz);
    zeilen.push({ datum: k.datum, quelle: "kosten", lieferant: k.lieferant || "", stelle: k.stelle, netto: rund2(netto), brutto: rund2(brutto), betriebsmittel: 0, verteilung: k.verteilung, id: k.id });
  }
  zeilen.sort(nachDatum);
  return { zeilen, netto: zeilen.reduce((s, x) => s + x.netto, 0), brutto: zeilen.reduce((s, x) => s + (x.brutto ?? x.netto), 0), anzahl: zeilen.length };
}

// Reinigungs- und Betriebsmittel aus den Belegzeilen (Putzmittel, Müllbeutel, Handschuhe …)
export function reinigungsmittel(stand, z) {
  const zeilen = [];
  for (const l of stand.lieferungen || []) {
    if (l.storniert || !imZeitraum(l.datum, z)) continue;
    for (const r of l.zeilen || []) if (typeof r.netto === "number" && istBetriebsmittel(r.artikel || r.name)) zeilen.push({ datum: l.datum, lieferant: l.lieferant || "", artikel: r.artikel || r.name || "", netto: r.netto });
  }
  zeilen.sort(nachDatum);
  return { zeilen, netto: zeilen.reduce((s, x) => s + x.netto, 0) };
}

// Inventurwerte: abgeschlossene Zählungen im Zeitraum; ohne Zählung im Zeitraum die letzte davor (Stichtag Monatsanfang)
export function inventurwerte(stand, z) {
  const fertig = (stand.inventuren || []).filter((i) => i.abgeschlossen && typeof i.datum === "string").sort((a, b) => a.datum.localeCompare(b.datum));
  const wert = (i) => (typeof i.wert === "number" ? i.wert : inventurWert(stand, i).summe);
  const zeile = (i, vorher = false) => { const w = inventurWert(stand, i); return { datum: i.datum, wert: rund2(wert(i)), gezaehlt: w.gezaehlt, ohnePreis: w.ohnePreis.length, vorher }; };
  const drin = fertig.filter((i) => imZeitraum(i.datum, z)).map((i) => zeile(i));
  const davor = fertig.filter((i) => i.datum < z.von).pop();
  return { zeilen: davor ? [zeile(davor, true), ...drin] : drin, imZeitraum: drin.length };
}

// Feste Kosten je Monat, wie der Zähler sie rechnet (netto)
export function festeKosten(stand) {
  const zeilen = (stand.kosten || []).filter((k) => k.status !== "aus" && typeof k.betrag === "number")
    .map((k) => ({ posten: k.posten, kategorie: k.kategorie, betrag: k.betrag, periode: k.periode, basis: k.basis || "netto", status: k.status }));
  const last = monatsLast(stand);
  return { zeilen, gesamt: last.gesamt, lohn: last.lohn ?? null, offen: last.offen };
}

// ---------- Das Paket ----------
// art "steuer": was der Steuerberater zum Monatsende braucht; art "buch": was der Buchhalter verbucht.
export const TEILE = { steuer: ["umsatz", "personal", "schwund", "belege", "inventur", "reinigung"], buch: ["umsatz", "belege", "kosten"] };
export function monatsPaket(stand, z, art = "steuer") {
  const teile = TEILE[art] || TEILE.steuer; const p = { art, zeitraum: { von: z.von, bis: z.bis }, teile };
  if (teile.includes("umsatz")) p.umsatz = tagesumsaetze(stand, z);
  if (teile.includes("personal")) p.personal = personalessen(stand, z);
  if (teile.includes("schwund")) p.schwund = schwund(stand, z);
  if (teile.includes("belege")) p.belege = belege(stand, z);
  if (teile.includes("inventur")) p.inventur = inventurwerte(stand, z);
  if (teile.includes("reinigung")) p.reinigung = reinigungsmittel(stand, z);
  if (teile.includes("kosten")) p.kosten = festeKosten(stand);
  // Vollständig je Teil: ehrlich, nicht schön – ein leerer Teil ist eine Lücke, außer er kann leer sein (Personal, Reinigung)
  p.stand = Object.fromEntries(teile.map((t) => [t, teilStand(p, t)]));
  p.vollstaendig = teile.filter((t) => p.stand[t] === "ok").length;
  return p;
}
function teilStand(p, t) {
  if (t === "umsatz") return p.umsatz.tage ? "ok" : "luecke";
  if (t === "belege") return p.belege.anzahl ? "ok" : "luecke";
  if (t === "inventur") return p.inventur.imZeitraum ? "ok" : "luecke";
  if (t === "schwund") return p.schwund.ohneWert ? "luecke" : "ok";
  if (t === "kosten") return p.kosten.zeilen.length && !p.kosten.offen ? "ok" : "luecke";
  return "ok"; // Personalessen, Reinigungsmittel: leer ist erlaubt
}

// CSV je Teil. kopf: übersetzte Spaltenköpfe (von der Ansicht), namen: Übersetzer für Kennungen (art, mahlzeit, stelle, quelle)
export function teilCsv(p, teil, kopf, namen = {}) {
  const n = (f, k) => (namen[f] ? namen[f](k) : k);
  if (teil === "umsatz") return csvText(kopf, p.umsatz.zeilen.map((x) => [datumDe(x.datum), x.brutto, x.netto, x.steuer, x.satz * 100, x.nacherfasst ? n("ja", "x") : ""]), { dezimal: [0, 2, 2, 2, 1] });
  if (teil === "personal") return csvText(kopf, p.personal.zeilen.map((x) => [datumDe(x.datum), x.person || "", x.gericht, n("mahlzeit", x.mahlzeit), x.menge, x.je, x.sachbezug, x.waren]), { dezimal: [0, 0, 0, 0, 0, 2, 2, 2] });
  if (teil === "schwund") return csvText(kopf, p.schwund.zeilen.map((x) => [datumDe(x.datum), n("art", x.art), x.name, x.menge, x.einheit, x.wert, x.grund]), { dezimal: [0, 0, 0, 2, 0, 2] });
  if (teil === "belege") return csvText(kopf, p.belege.zeilen.map((x) => [datumDe(x.datum), x.lieferant, n("stelle", x.stelle), x.netto, x.brutto, x.betriebsmittel]));
  if (teil === "inventur") return csvText(kopf, p.inventur.zeilen.map((x) => [datumDe(x.datum), x.wert, x.gezaehlt, x.ohnePreis]), { dezimal: [0, 2, 0, 0] });
  if (teil === "reinigung") return csvText(kopf, p.reinigung.zeilen.map((x) => [datumDe(x.datum), x.lieferant, x.artikel, x.netto]));
  if (teil === "kosten") return csvText(kopf, p.kosten.zeilen.map((x) => [n("posten", x.posten), x.betrag, n("periode", x.periode), n("basis", x.basis)]));
  return csvText(kopf, []);
}
