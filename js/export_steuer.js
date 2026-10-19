// Büro-Ordner „Steuerberater“ und „Buchhalter“ (Drei Ebenen, 15.10.2026): das Monatspaket als reine Daten und als CSV.
// Keine Oberfläche, keine Texte – die Ansicht (screens/ordner.js) übersetzt. Alles wird aus den vorhandenen Journalen gelesen,
// nichts neu gerechnet, was schon eine Stelle rechnet: Umsatz über umsatzEintrag (nur brutto, ohne Steuer), Schwund über schwundAuswertung,
// Belege über lieferungTeile, Inventur über den festgehaltenen Wert. Arbeitsunterlagen zur Vorbereitung – kein Kassenbuch, keine Buchführung.
//
// CSV für Excel in Deutschland: Semikolon als Trenner, Dezimalkomma, Datum TT.MM.JJJJ, UTF-8 mit BOM (sonst zeigt Excel Umlaute falsch),
// Zeilenende CRLF. Textzellen, die mit = + - @ beginnen, bekommen ein Hochkomma davor (sonst führt Excel sie als Formel aus).
import { umsatzEintrag, schwundAuswertung, wertEintrag, SCHWUND_ARTEN, SVEV_2026, tagPlus } from "./engine.js";
import { lieferungTeile, istBetriebsmittel } from "./betriebsmittel.js";
import { inventurWert, inventurKurz } from "./inventur.js"; // W2-D: inventurKurz
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
// Kürzel ausgeschiedener Mitarbeiter (18.10.2026): alte Personalessen zeigen das Kürzel weiter, gekennzeichnet mit dem Austrittsdatum
const personAus = (stand, id) => { const p = (stand.personen || []).find((x) => x.id === id); return p && (p.entfernt || p.aktiv === false) ? { personAus: true, personAusAm: p.ausgeschieden || null } : { personAus: false, personAusAm: null }; };

// ---------- Teile des Pakets ----------
// Tagesumsätze (W2-T, Prüfung p04 Nr. 1–3): nur die getippte Brutto-Notiz je Tag, keine Umsatzsteuer aus einem geschätzten Mischsatz.
// Die Ansicht kennzeichnet jede Zeile mit „Notiz – kein Z-Bon, nicht für die Buchung“. Wurde der Wert geändert, steht der Vorwert dabei.
export function tagesumsaetze(stand, z) {
  const zeilen = [];
  for (let d = z.von; d <= z.bis; d = tagPlus(d, 1)) {
    const e = umsatzEintrag(stand, d); if (!e) continue;
    const vor = (stand.tagesnotizen || []).filter((x) => x.ersetzt === e.id && typeof x.umsatz === "number").sort((x, y) => String(x.erfasst || "").localeCompare(String(y.erfasst || ""))).pop() || null;
    zeilen.push({ datum: d, brutto: e.umsatz, nacherfasst: !!e.nacherfasst, geaendert: vor ? vor.umsatz : null, geaendertZeit: vor?.storniertZeit || null });
  }
  return { zeilen, summe: { brutto: rund2(zeilen.reduce((s, x) => s + x.brutto, 0)) }, tage: zeilen.length, geaendert: zeilen.filter((x) => x.geaendert !== null).length };
}

// Rücknahmen und Korrekturen des Monats (W2-T, Prüfung p04 Nr. 3): Tagesnotizen, Warenbelege, Kostenbelege – nichts verschwindet still.
// vorgang "ersetzt" (neuer Wert steht dabei) oder "storniert" (zurückgenommen); zeit = Zeitpunkt der Änderung (ISO).
export function aenderungen(stand, z) {
  const zeilen = []; const notizen = stand.tagesnotizen || [];
  for (const n of notizen) {
    if (!n.storniert || typeof n.umsatz !== "number" || !imZeitraum(n.datum, z)) continue;
    const nach = typeof n.ersetzt === "string" ? notizen.find((x) => x.id === n.ersetzt && typeof x.umsatz === "number") : null;
    zeilen.push({ datum: n.datum, art: "notiz", vorgang: nach ? "ersetzt" : "storniert", text: "", alt: n.umsatz, neu: nach ? nach.umsatz : null, basis: "brutto", zeit: n.storniertZeit || null });
  }
  for (const l of stand.lieferungen || []) {
    if (!l.storniert || !imZeitraum(l.datum, z)) continue;
    const br = typeof l.summeBrutto === "number";
    zeilen.push({ datum: l.datum, art: "lieferung", vorgang: "storniert", text: [l.rechnungNr, l.lieferant].filter(Boolean).join(" · "), alt: br ? l.summeBrutto : (typeof l.summeNetto === "number" ? l.summeNetto : null), neu: null, basis: br ? "brutto" : "netto", zeit: l.storniertZeit || null });
  }
  for (const k of stand.kostenbelege || []) {
    if (!k.storniert || !imZeitraum(k.datum, z)) continue;
    zeilen.push({ datum: k.datum, art: "kosten", vorgang: "storniert", text: [k.rechnungNr, k.lieferant].filter(Boolean).join(" · "), stelle: k.stelle, alt: k.betrag, neu: null, basis: k.basis === "brutto" ? "brutto" : "netto", zeit: k.storniertZeit || null });
  }
  zeilen.sort((a, b) => String(a.datum).localeCompare(String(b.datum)) || String(a.zeit || "").localeCompare(String(b.zeit || "")));
  return { zeilen, anzahl: zeilen.length };
}

// Rechnungsnummer aus dem gelesenen Text (W2-T): nur hinter „Rechnungs-Nr“, „Rechnungsnummer“, „Rg.-Nr“, „Beleg-Nr“, „Invoice No“ – nie Kundennummern.
// null, wenn keine erkannt. Wird beim Übernehmen am Beleg gespeichert (rechnungNr).
export function rechnungsNummerLesen(text) {
  for (const zeile of String(text || "").split(/\r?\n/)) {
    if (/kunde|kd\.?-?nr/i.test(zeile)) continue;
    const m = zeile.match(/\b(?:rechnungs?\s*-?\s*(?:nr|nummer|no)|rg\.?\s*-?\s*nr|re\.?\s*-?\s*nr|beleg\s*-?\s*(?:nr|nummer)|invoice\s*(?:no|nr|number))\.?\s*[:#]?\s*([A-Za-z0-9][A-Za-z0-9\-\/.]{1,24})/i);
    if (m && /\d/.test(m[1])) return m[1].replace(/[.\-\/]+$/, "");
  }
  return null;
}

// Personalessen mit amtlichem Sachbezugswert (SvEV 2026) je Mahlzeit, dazu je Person (wenn der Eintrag eine Person trägt)
export function personalessen(stand, z) {
  const zeilen = (stand.schwund || []).filter((e) => !e.storniert && e.art === "personal" && imZeitraum(e.datum, z)).sort(nachDatum).map((e) => {
    const je = SVEV_2026[e.mahlzeit] ?? SVEV_2026.mittag; const menge = Number(e.menge) || 0;
    return { datum: e.datum, gericht: e.ref?.name || "", mahlzeit: e.mahlzeit || "mittag", menge, je, sachbezug: rund2(menge * je), waren: schwundWert(e, stand), person: personName(stand, e.von), ...personAus(stand, e.von) };
  });
  const jePerson = {};
  for (const x of zeilen) { const k = x.person || ""; jePerson[k] ??= { anzahl: 0, sachbezug: 0 }; jePerson[k].anzahl += x.menge; jePerson[k].sachbezug += x.sachbezug; }
  return { zeilen, jePerson, anzahl: zeilen.reduce((s, x) => s + x.menge, 0), sachbezug: zeilen.reduce((s, x) => s + x.sachbezug, 0), ohnePerson: zeilen.filter((x) => !x.person).length };
}

// Müll und Schwund (Vorgang 1, Warenwert netto zum Einkaufspreis) und Eigenverbrauch (Vorgang 3), Summen aus schwundAuswertung
export function schwund(stand, z) {
  const a = schwundAuswertung(stand, z);
  const zeilen = (stand.schwund || []).filter((e) => !e.storniert && imZeitraum(e.datum, z) && (SCHWUND_ARTEN[e.art] || 1) !== 2).sort(nachDatum)
    .map((e) => ({ datum: e.datum, art: e.art, name: e.art === "eimer" ? (e.ref?.name || "") : (e.ref?.name || ""), menge: Number(e.menge) || 0, einheit: e.einheit || "", wert: schwundWert(e, stand), vorgang: SCHWUND_ARTEN[e.art] || 1, grund: e.grund || "" }));
  return { zeilen, jeArt: a.jeArt, muellwert: a.muellwert, ohneWert: a.ohneWert, eigen: a.eigen };
}

// Belege (W2-T, Prüfung p04 Nr. 5 und 6): eingelesene Lieferungen und Kostenbelege. Keine erfundene Vorsteuer:
// Umsatzsteuer steht nur da, wo der Steuersatz auf dem Beleg erkannt wurde, getrennt nach 7 % und 19 %. Pfand ist eine eigene Spalte,
// so dass Netto + USt 7 % + USt 19 % + Pfand = Brutto. Ohne erkannten Satz bleibt der eingegebene Betrag stehen, wie er ist (netto
// oder brutto, je nach Eingabe), ohne Aufschlag. hinweis: null | "ohneSatz" | "ohneBrutto" | "pruefen".
const SAETZE = [0.07, 0.19];
function lieferungSteuer(l, netto, pfand) {
  const brutto = typeof l.summeBrutto === "number" ? l.summeBrutto : null;
  const zl = (l.zeilen || []).filter((r) => typeof r.netto === "number" && Math.abs(r.netto) > 0.004);
  const ust = { 0.07: null, 0.19: null };
  if (brutto === null) return { brutto, ust, hinweis: "ohneBrutto" };
  if (!zl.length || zl.some((r) => !SAETZE.includes(r.steuersatz))) return { brutto, ust, hinweis: "ohneSatz" };
  const gesamt = rund2(brutto - netto - pfand); if (gesamt < -0.005) return { brutto, ust, hinweis: "pruefen" };
  const saetze = [...new Set(zl.map((r) => r.steuersatz))];
  // Ein Satz auf dem Beleg: die Steuer ist Brutto − Netto − Pfand, genau wie auf der Rechnung
  if (saetze.length === 1) { ust[saetze[0]] = gesamt; return { brutto, ust, hinweis: null }; }
  const u7 = rund2(zl.filter((r) => r.steuersatz === 0.07).reduce((s, r) => s + r.netto, 0) * 0.07), u19 = rund2(zl.filter((r) => r.steuersatz === 0.19).reduce((s, r) => s + r.netto, 0) * 0.19);
  if (Math.abs(u7 + u19 - gesamt) > 0.05) return { brutto, ust, hinweis: "pruefen" }; // passt nicht zum Beleg: nicht raten
  ust[0.07] = u7; ust[0.19] = rund2(gesamt - u7); // Rundungscent in den 19-%-Teil, damit die Zeile aufgeht
  return { brutto, ust, hinweis: null };
}
export function belege(stand, z) {
  const zeilen = [];
  for (const l of stand.lieferungen || []) {
    if (l.storniert || !imZeitraum(l.datum, z)) continue;
    const teile = lieferungTeile(l);
    const netto = rund2(typeof l.summeNetto === "number" ? l.summeNetto : teile.ware + teile.betriebsmittel); const pfand = rund2(Number(l.pfand) || 0);
    const st = lieferungSteuer(l, netto, pfand);
    zeilen.push({ datum: l.datum, quelle: "lieferung", rechnungNr: l.rechnungNr || null, lieferant: l.lieferant || "", stelle: "ware", netto, ust7: st.ust[0.07], ust19: st.ust[0.19], pfand, brutto: st.brutto, betriebsmittel: rund2(teile.betriebsmittel), hinweis: st.hinweis, id: l.id });
  }
  for (const k of stand.kostenbelege || []) {
    if (k.storniert || !imZeitraum(k.datum, z)) continue;
    // Versicherungen tragen Versicherungsteuer, keine Umsatzsteuer: ein „19 %“ im Text ist dort kein Vorsteuersatz
    const satz = SAETZE.includes(k.satz) && k.stelle !== "versicherungen" ? k.satz : null;
    let netto = null, brutto = null, ust = null;
    if (satz === null) { if (k.basis === "brutto") brutto = rund2(k.betrag); else netto = rund2(k.betrag); }
    else if (k.basis === "brutto") { brutto = rund2(k.betrag); netto = rund2(k.betrag / (1 + satz)); ust = rund2(brutto - netto); }
    else { netto = rund2(k.betrag); ust = rund2(k.betrag * satz); brutto = rund2(netto + ust); }
    zeilen.push({ datum: k.datum, quelle: "kosten", rechnungNr: k.rechnungNr || null, lieferant: k.lieferant || "", stelle: k.stelle, netto, ust7: satz === 0.07 ? ust : null, ust19: satz === 0.19 ? ust : null, pfand: 0, brutto, betriebsmittel: 0, hinweis: satz === null ? "ohneSatz" : null, verteilung: k.verteilung, id: k.id });
  }
  zeilen.sort(nachDatum);
  // Paket C (19.10.2026): fortlaufende Beleg-Nr. je Monat (JJJJ-MM-001 …) – dieselbe Nummer schreibt der Inhaber auf den Beleg;
  // Kleinbetrag (Brutto bis 250 €, § 33 UStDV) wird markiert, weil dort weniger Rechnungsangaben genügen.
  zeilen.forEach((x, i) => { x.belegNr = `${String(z.von).slice(0, 7)}-${String(i + 1).padStart(3, "0")}`; x.klein = typeof x.brutto === "number" && x.brutto > 0 && x.brutto <= 250; });
  const sum = (f) => rund2(zeilen.reduce((s, x) => s + (typeof x[f] === "number" ? x[f] : 0), 0));
  return { zeilen, netto: sum("netto"), ust7: sum("ust7"), ust19: sum("ust19"), pfand: sum("pfand"), brutto: sum("brutto"), anzahl: zeilen.length,
    ohneBrutto: zeilen.filter((x) => x.brutto === null).length, ohneNetto: zeilen.filter((x) => x.netto === null).length, pruefen: zeilen.filter((x) => x.hinweis).length };
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

// Inventurwerte (W2-T, Prüfung p04 Nr. 9): abgeschlossene Zählungen im Zeitraum; ohne Zählung im Zeitraum die letzte davor (Stichtag Monatsanfang).
// Es zählt nur der beim Abschluss festgehaltene Wert, nie eine Neubewertung zu heutigen Preisen (wert null = nicht festgehalten).
export function inventurwerte(stand, z) {
  const fertig = (stand.inventuren || []).filter((i) => i.abgeschlossen && typeof i.datum === "string").sort((a, b) => a.datum.localeCompare(b.datum));
  const zeile = (i, vorher = false) => { const w = inventurKurz(i) || inventurWert(stand, i); return { datum: i.datum, wert: typeof i.wert === "number" ? rund2(i.wert) : null, gezaehlt: w.gezaehlt, ohnePreis: w.ohnePreis.length, richtpreise: Array.isArray(i.richtpreise) ? i.richtpreise.length : 0, vorher }; }; // Richtpreise (17.10.2026): Zahl der Posten zu Richtpreisen · W2-T Wert nur aus Abschluss, W2-D schneller Weg
  const drin = fertig.filter((i) => imZeitraum(i.datum, z)).map((i) => zeile(i));
  const davor = fertig.filter((i) => i.datum < z.von).pop();
  return { zeilen: davor ? [zeile(davor, true), ...drin] : drin, imZeitraum: drin.length };
}

// Feste Kosten für den Buchhalter (W2-T, Prüfung p04 Nr. 8): je Posten der Monatsbetrag wie eingetragen – ohne Umrechnung auf netto,
// ohne Saison-Hochrechnung und ohne deinen eigenen Lohn (der ist Kalkulation, keine Betriebsausgabe; er bleibt im Zähler).
// Bezug auf den gewählten Monat: Hat ein späterer Kostenbeleg den Posten geändert, gilt der Wert davor (e.vorher).
// Änderungen von Hand ohne Beleg sind nicht nachvollziehbar – dann steht der zuletzt eingetragene Wert da.
export function festeKosten(stand, z) {
  const spaeter = (stand.kostenbelege || []).filter((e) => !e.storniert && e.vorher && typeof e.datum === "string" && e.datum > z.bis).sort((a, b) => a.datum.localeCompare(b.datum) || String(a.erfasst || "").localeCompare(String(b.erfasst || "")));
  const zeilen = []; let offen = 0;
  for (const k of stand.kosten || []) {
    if (k.status === "aus" && !spaeter.some((x) => x.stelle === k.posten)) continue;
    const e = spaeter.find((x) => x.stelle === k.posten);
    const v = e ? { betrag: e.vorher.betrag, status: e.vorher.status, periode: e.vorher.periode, basis: e.vorher.basis } : { betrag: k.betrag, status: k.status, periode: k.periode, basis: k.basis || "netto" };
    if (v.status === "aus") continue;
    if (v.status === "offen" || typeof v.betrag !== "number") { offen += 1; continue; }
    zeilen.push({ posten: k.posten, kategorie: k.kategorie, betrag: v.betrag, periode: v.periode, basis: v.basis === "brutto" ? "brutto" : "netto", status: v.status, jeMonat: rund2(v.periode === "jahr" ? v.betrag / 12 : v.betrag), zurueck: !!e });
  }
  const l = stand.team?.lohnkosten;
  if (typeof l === "number" && l > 0) zeilen.push({ posten: "lohn", kategorie: "lohn", betrag: l, periode: "monat", basis: "lohn", status: "bekannt", jeMonat: rund2(l), zurueck: false });
  else if (l === null || l === undefined) offen += 1;
  const summe = (b) => rund2(zeilen.filter((x) => x.basis === b).reduce((s, x) => s + x.jeMonat, 0));
  return { zeilen, netto: summe("netto"), brutto: summe("brutto"), lohn: summe("lohn"), offen, geschaetzt: zeilen.filter((x) => x.status === "geschaetzt").length };
}

// ---------- Das Paket ----------
// art "steuer": was der Steuerberater zum Monatsende braucht; art "buch": was der Buchhalter verbucht.
// Vollständigkeit (W2-T, Prüfung p04 Nr. 2): nur Belege, Kosten und Listen zählen. Tagesumsätze sind Notizen (Stand "notiz"),
// maßgeblich ist die Kasse – sie machen den Ordner nie „vollständig“.
export const TEILE = { steuer: ["umsatz", "personal", "schwund", "belege", "inventur", "reinigung"], buch: ["umsatz", "belege", "kosten"] };
export function monatsPaket(stand, z, art = "steuer") {
  const teile = TEILE[art] || TEILE.steuer; const p = { art, zeitraum: { von: z.von, bis: z.bis }, teile };
  if (teile.includes("umsatz")) p.umsatz = tagesumsaetze(stand, z);
  if (teile.includes("personal")) p.personal = personalessen(stand, z);
  if (teile.includes("schwund")) p.schwund = schwund(stand, z);
  if (teile.includes("belege")) p.belege = belege(stand, z);
  if (teile.includes("inventur")) p.inventur = inventurwerte(stand, z);
  if (teile.includes("reinigung")) p.reinigung = reinigungsmittel(stand, z);
  if (teile.includes("kosten")) p.kosten = festeKosten(stand, z);
  p.aenderungen = aenderungen(stand, z);
  p.stand = Object.fromEntries(teile.map((t) => [t, teilStand(p, t)]));
  p.pruefTeile = teile.filter((t) => t !== "umsatz");
  p.vollstaendig = p.pruefTeile.filter((t) => p.stand[t] === "ok").length;
  return p;
}
// "ok" | "luecke" (fehlt) | "pruefen" (da, aber so nicht verwendbar) | "notiz" (nur Notiz, zählt nicht)
function teilStand(p, t) {
  if (t === "umsatz") return "notiz";
  if (t === "belege") return !p.belege.anzahl ? "luecke" : p.belege.pruefen ? "pruefen" : "ok";
  if (t === "inventur") { const l = p.inventur.zeilen.filter((x) => !x.vorher).pop(); return !l ? "luecke" : l.wert > 0 && l.ohnePreis === 0 ? "ok" : "pruefen"; }
  if (t === "schwund") return p.schwund.ohneWert ? "luecke" : "ok";
  if (t === "personal") return p.personal.ohnePerson ? "pruefen" : "ok";
  if (t === "kosten") return !p.kosten.zeilen.length ? "luecke" : p.kosten.offen || p.kosten.geschaetzt ? "pruefen" : "ok";
  return "ok"; // Reinigungsmittel: leer ist erlaubt
}

// CSV je Teil. kopf: übersetzte Spaltenköpfe (von der Ansicht), namen: Übersetzer für Kennungen (art, mahlzeit, stelle, quelle, kennung, hinweis …)
export function teilCsv(p, teil, kopf, namen = {}) {
  const n = (f, k) => (namen[f] ? namen[f](k) : k);
  if (teil === "umsatz") return csvText(kopf, p.umsatz.zeilen.map((x) => [datumDe(x.datum), x.brutto, x.nacherfasst ? n("ja", "x") : "", x.geaendert, n("kennung", "notiz")]));
  const wer = (x) => (!x.person ? "" : !x.personAus ? x.person : x.personAusAm && namen.ausgeschiedenAm ? namen.ausgeschiedenAm(x.person, x.personAusAm) : n("ausgeschieden", x.person)); // Kürzel ausgeschiedener Mitarbeiter (18.10.2026)
  if (teil === "personal") return csvText(kopf, p.personal.zeilen.map((x) => [datumDe(x.datum), wer(x), x.gericht, n("mahlzeit", x.mahlzeit), x.menge, x.je, x.sachbezug, x.waren]), { dezimal: [0, 0, 0, 0, 0, 2, 2, 2] });
  if (teil === "schwund") return csvText(kopf, p.schwund.zeilen.map((x) => [datumDe(x.datum), n("art", x.art), x.name, x.menge, x.einheit, x.wert, x.grund]), { dezimal: [0, 0, 0, 2, 0, 2] });
  if (teil === "belege") return csvText(kopf, p.belege.zeilen.map((x) => [x.belegNr, datumDe(x.datum), x.rechnungNr || "", x.lieferant, n("stelle", x.stelle), x.netto, x.ust7, x.ust19, x.pfand, x.brutto, x.betriebsmittel, x.hinweis ? n("hinweis", x.hinweis) : x.klein && namen.kleinbetrag ? namen.kleinbetrag() : ""]));
  if (teil === "inventur") return csvText(kopf, p.inventur.zeilen.map((x) => [datumDe(x.datum), x.wert, x.gezaehlt, x.ohnePreis]), { dezimal: [0, 2, 0, 0] });
  if (teil === "reinigung") return csvText(kopf, p.reinigung.zeilen.map((x) => [datumDe(x.datum), x.lieferant, x.artikel, x.netto]));
  if (teil === "kosten") return csvText(kopf, p.kosten.zeilen.map((x) => [n("posten", x.posten), x.betrag, n("periode", x.periode), n("basis", x.basis), x.jeMonat, n("pstatus", x.status)]));
  if (teil === "aenderungen") return csvText(kopf, p.aenderungen.zeilen.map((x) => [datumDe(x.datum), n("aart", x.art), n("vorgang", x.vorgang), x.art === "kosten" ? [n("stelle", x.stelle), x.text].filter(Boolean).join(" · ") : x.text, x.alt, x.neu, n("basis", x.basis), zeitDe(x.zeit)]));
  return csvText(kopf, []);
}
// Zeitpunkt einer Änderung, Ortszeit: TT.MM.JJJJ HH:MM
export const zeitDe = (iso) => { if (typeof iso !== "string" || isNaN(Date.parse(iso))) return ""; const d = new Date(iso); return `${datumDe(heute(d))} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
