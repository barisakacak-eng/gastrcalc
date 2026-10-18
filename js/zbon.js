// Z-Bon per Foto (18.10.2026): dritter Weg in „Verkauf je Gericht“ neben Kassen-Export (DSFinV-K) und Handeingabe.
// Reine Funktionen, keine Oberfläche, kein Netz. Der Text kommt aus der vorhandenen Texterkennung (js/auswertung.js → js/ocr-worker.js,
// derselbe Weg wie Rechnungen); das Foto liegt wie jedes Belegfoto in der Ablage (js/ablage.js, Zweck "zbon").
//
// Gelesen wird der Artikelbericht (PLU-Bericht) eines Z-Bons: je Zeile Kassentext, Menge, Betrag – in vielen Schreibweisen:
//   „Döner Kebab   43   344,00“ · „12 x Cola 0,33   30,00“ · „PLU 101 Döner 43 344,00“ · „Ayran 20 Stk 40,00 €“ · „43 x 8,00 344,00“
// Komma oder Punkt, Tausenderpunkt (1.234,50), Leerzeichen-Spalten, typische Lesefehler in Zahlen (O→0, l/I/|→1, S→5, B→8).
// Summen- und Zahlungszeilen (Summe, Gesamt, Bar, Karte, MwSt, Netto, Storno gesamt …) sind keine Artikel. Storno-Zeilen ziehen ab.
// Plausibel: Summe der Positionen gegen die Bon-Summe – eine Abweichung wird gezeigt, nie still ausgeglichen. Unsichere Zeilen sind markiert.
//
// Wichtig (Entscheidung des Eigentümers): Verkaufszahlen aus dem Foto ersetzen keine Buchhaltung. Sie zählen nur für „Verkauf je Gericht“
// (Herkunft "zbon", Rangfolge Kasse vor Z-Bon vor Hand). Die Tagesumsätze im Steuer-Ordner bleiben „Notiz – kein Z-Bon“.
import { normKasse, zahlLesen, importVorschau, importUebernehmen, zuordnen } from "./verkauf.js";
import { verkaeufeEntdoppeln } from "./store.js"; // Prüfgremium 18.10.2026 (H2): dieselbe Regel wie beim Zusammenführen und Laden
import { tagPlus } from "./engine.js";
import { heute } from "./util.js";

// ---------- Zeichen und Zahlen ----------
// Lesefehler nur in Teilen, die schon eine Ziffer enthalten (sonst würde aus „Cola“ nichts, aus „SB“ aber „58“)
const OCR_ZEICHEN = /^[-+]?[0-9OoIl|!SsB.,]+-?$/;
function ocrZahl(tok) {
  if (!/\d/.test(tok) || !OCR_ZEICHEN.test(tok) || /^[-+]?[\d.,]+-?$/.test(tok)) return { tok, fix: false };
  const neu = tok.replace(/[Oo]/g, "0").replace(/[Il|!]/g, "1").replace(/[Ss]/g, "5").replace(/B/g, "8");
  return { tok: neu, fix: neu !== tok };
}
// Betrag: genau zwei Nachkommastellen, wahlweise Tausenderpunkt; Minus vorn oder hinten
const BETRAG = /^-?(\d{1,3}([.,]\d{3})+|\d+)[.,]\d{2}-?$/;
// Menge: ganze Zahl oder Gewicht mit drei Nachkommastellen (2,500 kg)
const MENGE = /^-?\d{1,5}([.,]\d{3})?-?$/;
const STK = /^(stk|stck|st|stück|stueck|x|×|\*|pcs)\.?$/i;
const PLU_WORT = /^(plu|nr|art|art\.?-?nr|artnr|artikel-?nr)\.?:?$/i;
const istBetrag = (t) => BETRAG.test(t);
const istMenge = (t) => MENGE.test(t);
const betragVon = (t) => { const n = zahlLesen(t.replace(/-$/, "").replace(/^-/, ""), ","); return n === null ? null : (/^-|-$/.test(t) ? -n : n); };
const mengeVon = (t) => { const neg = /^-|-$/.test(t); const x = t.replace(/^-|-$/g, ""); const n = /[.,]\d{3}$/.test(x) ? Number(x.replace(",", ".")) : Number(x); return Number.isFinite(n) ? (neg ? -n : n) : null; };
const rund = (x, n = 2) => { const f = 10 ** n; return Math.round(x * f) / f; };

// ---------- Zeilen, die keine Artikel sind ----------
// Anfang des Kassentexts (nach einem möglichen „Storno“): Summen, Zahlungsarten, Steuer, Kopf- und Fußzeilen des Bons
const SUMME_ANFANG = /^(zw\.?\s*-?summe|zwischensumme|summe\w*|ges(amt|\.)\w*|total\b|endsumme|umsatz\w*|netto\w*|brutto\w*|mwst\w*|m\.?w\.?st\.?|ust\w*|steuer\w*|bar\b|barzahlung\w*|bargeld\w*|karte\b|karten(zahlung|umsatz|summe)\w*|ec\b|ec-?(karte|cash|zahlung)\w*|girocard|kredit(karte)?\w*|visa\b|master\s?card|maestro|amex|paypal|sumup|zahlung\w*|rabatt\w*|nachlass\w*|trinkgeld\w*|wechselgeld|r(ü|ue)ckgeld|gegeben|kassenbestand|bestand|anzahl\w*|kunden\b|kunden-?(anzahl|zahl)\b|bons?\b|belege?\b|tse\b|signatur\w*|seriennr\w*|z[\s-]*(bon|nr|bericht|abschluss)\w*|abschluss\w*|tagesabschluss\w*|datum|uhrzeit|zeit\b|kasse\b|kassen-?nr\w*|bediener\w*|kellner\w*|einlage\w*|entnahme\w*|gutschein\w*|saldo|differenz|soll\b|ist\b|retoure\w*|storno\w*\s*(gesamt|summe)|warengruppe\w*|gruppe\b|au(ß|ss)er\s*haus|im\s*haus|seite\b|tel\b|telefon|st\.?-?nr|steuer-?nr|ust-?id)/i;
// Mehrdeutige Summen-Wörter (können auch ein Gerichtname beginnen) und typische Wörter, die auf Bons nach einem Summen-Wort stehen (M4)
const SUMME_MEHRDEUTIG = /^(bar|kunden|total|ec|karte|visa|master|maestro|gutschein|rabatt|nachlass|ist|soll|bestand|kasse|seite|zeit|gruppe|tel|saldo|differenz|anzahl)/i;
const BON_WORT = /^(summe\p{L}*|gesamt\p{L}*|zahlung\p{L}*|anzahl|brutto|netto|umsatz\p{L}*|betrag|euro|eur|mwst|ust|steuer\p{L}*|karten?|kasse|bons?|belege?|speisen|getr(ä|ae)nke|gruppe|warengruppe|artikel|positionen|tag|tages\p{L}*|heute|gegeben|zur(ü|ue)ck|r(ü|ue)ckgeld|einnahmen|ausgaben|storno\p{L}*|cash|geld|bargeld|kunden?|bediener|kellner|vorg(ä|ae)nge|transaktionen|uhr|haus|au(ß|ss)er|zahl|nr|nummer|anz)$/iu;
// Pfand und Leergut: Geld, aber kein Gericht (wie beim Kassen-Export)
const PFAND = /^(pfand|leergut|einweg|mehrweg)\b/i;
const STORNO = /^(storno|stornos|storniert|str\.|sto\.|void|korrektur|retour)\b[:.]?/i;
// Abschnitte eines Z-Bons: im Artikelbericht wird gelesen, in Warengruppen-, Finanz-, Steuer-, Bediener- und Stundenbericht nicht (sonst doppelt)
const KOPF_ARTIKEL = /^(artikel|plu|produkt|warenumsatz\s*je\s*artikel)\w*\b/i;
const KOPF_ANDERS = /^(warengruppe|gruppenbericht|hauptgruppe|finanz|zahlungsart|zahlarten|zahlungsmittel|mwst|steuer|bediener|kellner|stunden|zeitbericht|kassenbericht)\w*/i;
const STUNDE = /^\d{1,2}[:.]?\d{0,2}\s*(-|bis)\s*\d{1,2}[:.]?\d{0,2}\s*(uhr)?\b/i;

// ---------- Kopf: Datum, Uhrzeit, Z-Nummer ----------
const DATUM_DE = /(?<!\d)(\d{1,2})\s?[.\/]\s?(\d{1,2})\s?[.\/]\s?(\d{4}|\d{2})(?!\d)/;
const DATUM_ISO = /(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/;
const UHR = /(?<!\d)([01]?\d|2[0-3])[:.]([0-5]\d)(?![\d.,])/;
function isoDatum(j, m, d) {
  const jj = j < 100 ? 2000 + j : j;
  if (jj < 2000 || jj > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const iso = `${jj}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const x = new Date(jj, m - 1, d); return x.getMonth() === m - 1 ? iso : null;
}
// Datum des Geschäftstags: das Datum auf dem Bon; steht eine Uhrzeit vor 4 Uhr dabei, gehört der Bon zum Vortag (Geschäftstag bis 4 Uhr).
// Bevorzugt die Zeile mit „Datum“, „Z-Bon“ oder „Abschluss“, sonst das erste gültige Datum. Nie in der Zukunft.
export function zbonKopf(text, { heuteTag = heute() } = {}) {
  const zeilen = String(text || "").split(/\r?\n/);
  const kand = [];
  zeilen.forEach((z0, i) => {
    const z = z0.replace(/[Oo](?=\d)|(?<=\d)[Oo]/g, "0");
    let m = DATUM_DE.exec(z), iso = null;
    if (m) iso = isoDatum(Number(m[3]), Number(m[2]), Number(m[1]));
    if (!iso && (m = DATUM_ISO.exec(z))) iso = isoDatum(Number(m[1]), Number(m[2]), Number(m[3]));
    if (!iso) return;
    const rest = z.replace(m[0], " "); let u = UHR.exec(rest);
    // Prüfgremium 18.10.2026 (M5): Uhrzeit in einer eigenen Zeile („Datum: 17.10.2026“ / „Zeit: 00:45“) – höchstens zwei Zeilen tiefer,
    // nur eine Zeile mit „Zeit/Uhrzeit/Uhr“ oder eine Zeile, die nur eine Uhrzeit ist; nie eine Zeile mit eigenem Datum
    if (!u) for (const n of [zeilen[i + 1], zeilen[i + 2]]) {
      if (typeof n !== "string") break; const zn = n.replace(/[Oo](?=\d)|(?<=\d)[Oo]/g, "0");
      if (DATUM_DE.test(zn) || DATUM_ISO.test(zn)) break;
      if (/(uhr)?zeit\b|\buhr\b/i.test(zn) || /^\s*([01]?\d|2[0-3])[:.][0-5]\d([:.][0-5]\d)?\s*(uhr)?\s*$/i.test(zn)) { u = UHR.exec(zn); if (u) break; }
    }
    const stich = /(datum|z[\s-]*(bon|bericht|nr|abschluss)|abschluss|tagesabschluss|bis\b|ende)/i.test(z) ? 0 : 1;
    kand.push({ iso, stunde: u ? Number(u[1]) : null, stich, i });
  });
  const ok = kand.filter((k) => k.iso <= heuteTag || (k.stunde !== null && k.stunde < 4 && tagPlus(k.iso, -1) <= heuteTag));
  ok.sort((a, b) => a.stich - b.stich || a.i - b.i);
  const k = ok[0] || null;
  let datum = k?.iso || null, vortag = false;
  if (k && k.stunde !== null && k.stunde < 4) { datum = tagPlus(k.iso, -1); vortag = true; }
  if (datum && datum > heuteTag) datum = null;
  let zNr = null;
  for (const z of zeilen) {
    const m = /\bz[\s-]*(?:bon|bericht|abschluss)?[\s-]*(?:nr|nummer|no|#)\.?\s*:?\s*([0-9OoIl]{1,8})\b/i.exec(z) || /\b(?:abschluss|tagesabschluss)[\s-]*(?:nr|nummer|no|#)\.?\s*:?\s*([0-9OoIl]{1,8})\b/i.exec(z) || /^\s*z[\s-]*(?:bon|bericht)\s*:?\s*#?\s*(\d{1,8})\s*$/i.exec(z);
    if (m) { zNr = ocrZahl(m[1]).tok.replace(/\D/g, "") || null; if (zNr) break; }
  }
  return { datum, vortag, zNr, datumGefunden: !!k };
}

// ---------- eine Zeile ----------
// Rückgabe: null (keine Zahl) | { art: "artikel"|"summe"|"pfand"|"stornoSumme"|"leer", text, plu, menge, betrag, einzel, storno, gruende[] }
export function zbonZeileLesen(roh) {
  let s = String(roh || "").replace(/\t/g, " ").replace(/[€]/g, " ").replace(/\b(eur|euro)\b/gi, " ")
    .replace(/(\d)\s*([.,])\s+(\d{2})(?!\d)/g, "$1$2$3").replace(/(\d)\s+([.,])(\d{2})(?!\d)/g, "$1$2$3") // „344 ,00“ / „344, 00“
    .replace(/[_=~]{2,}|\.{3,}|-{3,}/g, " ") // Füllzeichen zwischen Spalten
    .replace(/(\d)\s*([xX×*])(?=\s|[A-ZÄÖÜ]|\d)\s*/g, "$1 $2 ").replace(/(\d)(stk|stck|st)\b\.?/gi, "$1 $2") // „12x Cola“, „43Stk“
    .replace(/\s+/g, " ").trim();
  // Prüfgremium 18.10.2026 (M3): Steuerkennzeichen und Steuersatz hinter dem Betrag abtrennen, BEVOR Lesefehler korrigiert werden
  // („344,00A“, „75,00B“ – sonst wird aus B eine 8 –, „28,00*“, „344,00 7%“, „63,00 19 %“, „344,00 A 7%“)
  for (let k = 0; k < 3; k++) { const s2 = s.replace(/(\d[.,]\d{2}(?:\s?[A-D*])?)\s?\d{1,2}(?:[.,]\d{1,2})?\s?%$/i, "$1").replace(/(\d[.,]\d{2})\s?[A-D*]$/i, "$1"); if (s2 === s) break; s = s2; }
  s = s.trim();
  if (!s) return null;
  const gruende = new Set();
  let tok = s.split(" ").map((t) => { const o = ocrZahl(t); if (o.fix) gruende.add("ocr"); return o.tok; });
  // Steuerkennzeichen hinter dem Betrag („344,00 A“, „344,00 1“) weg
  if (tok.length >= 2 && /^[A-D12*]$/i.test(tok[tok.length - 1]) && istBetrag(tok[tok.length - 2])) tok = tok.slice(0, -1);
  if (!tok.some((t) => /\d/.test(t))) return null;
  // Storno vorn?
  let storno = false;
  if (STORNO.test(tok[0])) { storno = true; tok = tok.slice(1); }
  // von rechts: Betrag, evtl. Einzelpreis, Menge mit „Stk“/„x“
  let betrag = null, einzel = null, menge = null, i = tok.length - 1;
  if (i >= 0 && istBetrag(tok[i])) { betrag = betragVon(tok[i]); i -= 1; }
  if (betrag !== null && i >= 0) {
    // „43 x 8,00 344,00“ oder „43 8,00 344,00“ (Einzelpreis nur, wenn Menge × Preis den Betrag ergibt)
    const e = istBetrag(tok[i]) ? betragVon(tok[i]) : null;
    if (e !== null) {
      let j = i - 1; if (j >= 0 && STK.test(tok[j])) j -= 1;
      const q = j >= 0 && istMenge(tok[j]) ? mengeVon(tok[j]) : null;
      if (q !== null && Math.abs(Math.abs(q * e) - Math.abs(betrag)) < 0.015) { einzel = Math.abs(e); menge = q; i = j - 1; }
    }
  }
  if (menge === null && i >= 0) {
    let j = i; if (STK.test(tok[j])) j -= 1;
    if (j >= 0 && istMenge(tok[j]) && j > 0) { menge = mengeVon(tok[j]); i = j - 1; }
    else if (j >= 0 && istMenge(tok[j]) && j === 0 && betrag === null) { menge = mengeVon(tok[j]); i = j - 1; }
  }
  let rest = tok.slice(0, i + 1);
  // von links: PLU / Artikelnummer, „12 x“ / „12 Stk“
  let plu = null;
  if (rest.length >= 2 && PLU_WORT.test(rest[0]) && /^\d{1,8}$/.test(rest[1])) { plu = rest[1]; rest = rest.slice(2); }
  if (rest.length >= 2 && /^\d+([.,]\d{3})?$/.test(rest[0]) && STK.test(rest[1])) {
    const q = mengeVon(rest[0]); if (menge === null) { menge = q; rest = rest.slice(2); } else if (!plu) { plu = rest[0]; rest = rest.slice(2); gruende.add("menge"); }
  } else if (rest.length >= 2 && /^\d{1,8}$/.test(rest[0]) && /\p{L}/u.test(rest[1])) {
    if (menge !== null && !plu) { plu = rest[0]; rest = rest.slice(1); }           // „101 Döner 43 344,00“: vorn Nummer, hinten Menge
    else if (menge === null && !plu) { if (rest[0].length >= 3) gruende.add("mengeVorn"); menge = Number(rest[0]); rest = rest.slice(1); } // „43 Döner 344,00“ (dreistellig vorn: vielleicht eine Nummer)
  }
  // „12 x Cola 2,50 30,00“: Menge vorn, Einzelpreis hinten am Namen
  if (einzel === null && menge !== null && betrag !== null && rest.length >= 2 && istBetrag(rest[rest.length - 1])) {
    const e = betragVon(rest[rest.length - 1]); if (Math.abs(Math.abs(menge * e) - Math.abs(betrag)) < 0.015) { einzel = Math.abs(e); rest = rest.slice(0, -1); }
  }
  if (rest.length && STORNO.test(rest[0])) { storno = true; rest = rest.slice(1); }
  let text = rest.join(" ").replace(/^[\s:.*#-]+|[\s:.*#-]+$/g, "").trim();
  // Liter hinter einer Füllmenge liest die Erkennung oft als 1, I oder | („Cola 0,33 1“ → „Cola 0,33 l“)
  { const t2 = text.replace(/(\d[.,]\d{1,3})\s?[1I|](?=\s|$)/g, "$1 l"); if (t2 !== text) { text = t2; gruende.add("name"); } }
  if (menge !== null && menge < 0) storno = true;
  if (betrag !== null && betrag < 0) storno = true;
  // Prüfgremium 18.10.2026 (N1): Leerzeichen mitten im Betrag („43  3 44,00“) – dann endet der Kassentext auf einer Zahl und davor steht eine
  // kurze „Menge“. Nicht raten (es kann auch „Menü 2“ heißen): die Zeile wird zum Prüfen markiert, die Summenprüfung zeigt den Rest.
  const luecke = menge !== null && betrag !== null && !einzel && Number.isInteger(menge) && Math.abs(menge) < 1000 && /(^|\s)\d{1,4}$/.test(text) && !/[.,]\d{3}/.test(s);
  // Art der Zeile
  const textOhne = text.replace(/\d+[.,]?\d*\s*%?/g, " ").trim();
  // Prüfgremium 18.10.2026 (M4): Ein Summen-Wort am Anfang macht eine Zeile nur dann zur Summenzeile, wenn danach kein Gerichtname folgt.
  // Mehrdeutige Wörter (Bar, Kunden, Total, EC, Karte …) mit Menge, Betrag und einem weiteren Wort, das kein typisches Bon-Wort ist
  // („Kunden-Menü 3 27,00“, „Total Menü 2 15,00“), sind Artikel. „Bar 85 1.234,50“, „Kunden 57“, „Total Speisen 99,00“ bleiben Summen.
  const sm = SUMME_ANFANG.exec(text) || SUMME_ANFANG.exec(textOhne);
  if (sm || STUNDE.test(text)) {
    const quelle = SUMME_ANFANG.test(text) ? text : textOhne;
    const nachWort = sm ? quelle.slice(sm[0].length).split(/[^\p{L}]+/u).filter((w) => w.length >= 3) : [];
    const gericht = !!sm && menge !== null && betrag !== null && SUMME_MEHRDEUTIG.test(sm[0]) && nachWort.some((w) => !BON_WORT.test(w));
    if (!gericht) return { art: "summe", text, betrag, menge, storno, roh: String(roh) };
  }
  if (PFAND.test(text)) return { art: "pfand", text, betrag, menge, storno, roh: String(roh) };
  if (!/\p{L}{2,}/u.test(text)) return { art: storno ? "stornoSumme" : "leer", text, betrag, menge, storno, roh: String(roh) };
  if (betrag === null && menge === null) return null;
  // Plausibilität je Zeile
  if (menge === null && betrag !== null) { menge = 1; gruende.add("menge"); }
  if (betrag !== null && menge) { const ep = Math.abs(betrag / menge); if (ep > 80 || ep < 0.1) gruende.add("preis"); }
  if (menge !== null && !Number.isInteger(menge) && !/[.,]\d{3}/.test(s)) gruende.add("menge");
  if (luecke) gruende.add("menge");
  if (text.replace(/[^\p{L}]/gu, "").length < 3 || /[^\p{L}\p{N}\s.,()&+\/'%-]/u.test(text)) gruende.add("name");
  if (storno) { if (menge !== null) menge = -Math.abs(menge); if (betrag !== null) betrag = -Math.abs(betrag); }
  return { art: "artikel", text: text.slice(0, 120), plu, menge, betrag, einzel, storno, gruende: [...gruende], roh: String(roh) };
}

// ---------- ganzer Bon ----------
// Bon-Summe: „Summe/Gesamt/Total“ (nicht Netto, MwSt, Bar, Karte) – die erste nach dem ersten Artikel, sonst die erste überhaupt.
const BON_SUMME = /^(summe\w*|ges(amt|\.)\w*|total\w*|endsumme|umsatz\s*brutto|brutto\s*umsatz|bruttoumsatz|umsatz\s*gesamt|gesamtumsatz)/i;
const NICHT_SUMME = /(netto|mwst|m\.?w\.?st|ust|steuer|bar\b|karte|ec\b|storno|rabatt|anzahl|kunden|bons?\b|warengruppe|gruppe)/i;

// Prüfgremium 18.10.2026 (M2): Viele Kassen drucken unter einem Menü dessen Teile mit 0,00 € („Menü Döner 5 57,50“ / „  Döner Kebab 5 0,00“ …).
// Diese Zeilen sind Bestandteile, keine Verkäufe: Sie zählen nicht und stehen in der Vorschau abgewählt (der Wirt kann sie wieder dazunehmen).
// Erkannt nur, wenn die Zeile darüber (mit Betrag) ein Menü ist: Wort „Menü/Kombi/Combo/Spar…“, ein gelerntes Kassen-Menü (stand, js/verkauf.js
// kassenKombis) oder die 0,00-Zeile ist weiter eingerückt. Sonst bleibt eine 0,00-Zeile ein eigener, markierter Posten (Grund „preis“) und wird
// nie mit einer gleichnamigen bezahlten Zeile zusammengezählt.
const MENUE_WORT = /(^|[^\p{L}])(men(ü|ue|u)s?|kombi\p{L}*|combo\p{L}*|spar-?\p{L}*|angebot\p{L}*|deal|mittagstisch)([^\p{L}]|$)/iu;
const einzug = (r) => /^[\t ]*/.exec(String(r || ""))[0].replace(/\t/g, "    ").length;
const istNull = (x) => typeof x.betrag === "number" && Math.abs(x.betrag) < 0.005;
function bestandteileMarkieren(zeilen, stand) {
  let eltern = null; let menue = false;
  for (const x of zeilen) {
    if (!istNull(x) || x.storno) { eltern = typeof x.betrag === "number" && x.betrag > 0.004 ? x : null; menue = false;
      if (eltern) menue = MENUE_WORT.test(eltern.text) || !!(stand && zuordnen(stand, { plu: eltern.plu, text: eltern.text }).kombi); continue; }
    if (!eltern) continue;
    if (menue || einzug(String(x.roh).split(" / ").pop()) > einzug(String(eltern.roh).split(" / ").pop())) {
      x.bestandteil = true; x.teilVon = eltern.id; x.gruende = x.gruende.filter((g) => g !== "preis"); x.unsicher = x.gruende.length > 0;
    }
  }
  return zeilen;
}

export function zbonLesen(text, { heuteTag = heute(), stand = null } = {}) {
  const kopf = zbonKopf(text, { heuteTag });
  const rohZeilen = String(text || "").replace(/\f/g, "\n").split(/\r?\n/);
  const zeilen = []; const ignoriert = []; const summen = []; let abschnitt = "frei"; let nr = 0; let warte = null; let hatArtikelKopf = false;
  for (let k = 0; k < rohZeilen.length; k++) {
    const roh = rohZeilen[k]; const z = roh.trim(); if (!z) continue;
    const ohneZahl = !/\d/.test(z);
    if (ohneZahl && KOPF_ARTIKEL.test(z.replace(/[-=*_]+/g, " ").trim())) { abschnitt = "artikel"; hatArtikelKopf = true; warte = null; continue; }
    if (ohneZahl && KOPF_ANDERS.test(z.replace(/[-=*_]+/g, " ").trim())) { abschnitt = "anders"; warte = null; continue; }
    // Name in einer Zeile, Zahlen in der nächsten (Texterkennung bricht lange Zeilen um)
    let r = zbonZeileLesen(z); let geteilt = false;
    if (!r && ohneZahl && /\p{L}{3,}/u.test(z) && !SUMME_ANFANG.test(z)) { warte = z; continue; }
    if (r && warte && !/\p{L}{2,}/u.test(r.text || "") && (r.art === "leer" || r.art === "stornoSumme") && r.betrag !== null) { const r2 = zbonZeileLesen(warte + " " + z); if (r2 && r2.art === "artikel") { r = r2; geteilt = true; } }
    warte = null;
    if (!r) continue;
    if (r.art === "summe") { summen.push({ text: z, betrag: r.betrag, nachArtikel: zeilen.length > 0, roh }); ignoriert.push({ roh, art: "summe", betrag: r.betrag }); continue; }
    if (abschnitt === "anders") { ignoriert.push({ roh, art: "abschnitt", betrag: r.betrag ?? null }); continue; }
    if (r.art !== "artikel") { ignoriert.push({ roh, art: r.art, betrag: r.betrag ?? null }); continue; }
    nr += 1;
    zeilen.push({ id: "z" + nr, roh: geteilt ? warteRoh(rohZeilen, k) : roh, text: r.text, plu: r.plu, menge: r.menge, betrag: r.betrag, einzel: r.einzel, storno: r.storno,
      gruende: geteilt ? [...r.gruende, "geteilt"] : r.gruende, unsicher: r.gruende.length > 0 || geteilt, abschnitt });
  }
  // Steht ein Artikelbericht-Kopf da, zählen nur seine Zeilen (davor stehen oft Warengruppen ohne eigenen Kopf)
  let artikel = hatArtikelKopf && zeilen.some((x) => x.abschnitt === "artikel") ? zeilen.filter((x) => { if (x.abschnitt !== "artikel") { ignoriert.push({ roh: x.roh, art: "abschnitt", betrag: x.betrag }); return false; } return true; }) : zeilen;
  // Zeilen ohne Betrag („Hauptstr. 12“) zählen nur, wenn der ganze Bericht keine Beträge hat (reiner Stückzahl-Bericht) – dann unsicher
  const nurMengen = !artikel.some((x) => typeof x.betrag === "number");
  for (let q = artikel.length - 1; q >= 0; q--) { const x = artikel[q]; if (x.betrag !== null) continue;
    if (nurMengen) { if (!x.gruende.includes("ohneBetrag")) x.gruende.push("ohneBetrag"); x.unsicher = true; } else { ignoriert.push({ roh: x.roh, art: "ohneBetrag", betrag: null }); artikel.splice(q, 1); } }
  const s = summen.filter((x) => x.betrag !== null && BON_SUMME.test(x.text) && !NICHT_SUMME.test(x.text));
  const bon = s.find((x) => x.nachArtikel) || s[0] || null;
  const pfand = rund(ignoriert.filter((x) => x.art === "pfand" && typeof x.betrag === "number").reduce((t, x) => t + x.betrag, 0));
  const stornoSumme = ignoriert.filter((x) => x.art === "stornoSumme" && x.betrag !== null).reduce((t, x) => t + Math.abs(x.betrag), 0);
  const fertig = bestandteileMarkieren(artikel.map(({ abschnitt: _a, ...x }, n) => ({ ...x, id: "z" + (n + 1) })), stand);
  return { ...kopf, zeilen: fertig, ignoriert, bonSumme: bon ? Math.abs(bon.betrag) : null, summeZeile: bon?.roh || null, stornoSumme: rund(stornoSumme), pfand, ...plausibel(artikel, bon ? Math.abs(bon.betrag) : null, pfand) };
}
function warteRoh(z, k) { let j = k - 1; while (j >= 0 && !z[j].trim()) j -= 1; return (j >= 0 ? z[j].trim() + " / " : "") + z[k].trim(); }

// Plausibilität: Summe der Positionen (Storno abgezogen) gegen die Bon-Summe. Abweichung zeigen, nie raten.
// Pfand steht oft in der Bon-Summe, ist aber kein Gericht: passt es nur mit Pfand, heißt das „passtMitPfand“.
export function plausibel(zeilen, bonSumme, pfand = 0) {
  const mitBetrag = (zeilen || []).filter((z) => typeof z.betrag === "number");
  const summe = rund(mitBetrag.reduce((t, z) => t + z.betrag, 0));
  const ohneBetrag = (zeilen || []).length - mitBetrag.length;
  if (bonSumme === null || bonSumme === undefined) return { summePositionen: summe, abweichung: null, pruefung: "ohneSumme", ohneBetrag };
  const abw = rund(summe - bonSumme);
  const pruefung = Math.abs(abw) <= 0.05 ? "passt" : pfand && Math.abs(abw + pfand) <= 0.05 ? "passtMitPfand" : "abweichung";
  return { summePositionen: summe, abweichung: abw, pruefung, ohneBetrag };
}

// ---------- Vorschau bearbeiten (rein: gibt eine neue Lesung zurück) ----------
// feld: "text" | "menge" | "betrag" | "weg" | "datum" | "bonSumme" | "neu" | "teil" (Menü-Bestandteil an/aus) | "kasse" (Wahl der Kasse) | "zweite" (alt: Ja/Nein)
// Prüfgremium 18.10.2026 (N5): „kasse“ – wert { art: "ersetzt", key } (ersetzt genau diesen Z-Bon des Tages; key null = der erste ohne Merkmal)
// oder { art: "neu" } (weitere Kasse, wird als „Kasse 2, 3 …“ gespeichert) oder null (keine Wahl). „zweite“ true = { art: "neu" }.
const kasseWahlSauber = (w) => (!w || typeof w !== "object" ? null : w.art === "neu" ? { art: "neu" } : w.art === "ersetzt" ? { art: "ersetzt", key: typeof w.key === "string" && w.key ? w.key.slice(0, 50) : null } : null);
export function zbonAendern(lesung, id, feld, wert) {
  if (!lesung) return lesung;
  const neu = { ...lesung, zeilen: (lesung.zeilen || []).map((z) => ({ ...z, gruende: [...(z.gruende || [])] })) };
  if (feld === "datum") { neu.datum = /^\d{4}-\d{2}-\d{2}$/.test(String(wert)) ? String(wert) : null; neu.datumVonHand = true; return neu; }
  if (feld === "zweite") { neu.zweite = !!wert; neu.kasseWahl = wert ? { art: "neu" } : null; delete neu.zweiteKey; return neu; }
  if (feld === "kasse") { neu.kasseWahl = kasseWahlSauber(wert); neu.zweite = neu.kasseWahl?.art === "neu"; delete neu.zweiteKey; return neu; }
  if (feld === "bonSumme") { const n = zahlLesen(String(wert ?? "").replace(/[€\s]/g, ""), ","); neu.bonSumme = n === null ? null : Math.abs(n); return { ...neu, ...plausibel(neu.zeilen, neu.bonSumme, neu.pfand || 0) }; }
  if (feld === "neu") { const n = (neu.zeilen.reduce((m, z) => Math.max(m, Number(String(z.id).slice(1)) || 0), 0) || 0) + 1; neu.zeilen.push({ id: "z" + n, roh: "", text: "", plu: null, menge: 1, betrag: null, einzel: null, storno: false, gruende: ["neu"], unsicher: true }); return { ...neu, ...plausibel(neu.zeilen, neu.bonSumme, neu.pfand || 0) }; }
  const z = neu.zeilen.find((x) => x.id === id); if (!z) return lesung;
  if (feld === "teil") { if (wert) z.bestandteil = true; else { delete z.bestandteil; delete z.teilVon; } z.geaendert = true; return { ...neu, ...plausibel(neu.zeilen, neu.bonSumme, neu.pfand || 0) }; }
  if (feld === "weg") neu.zeilen = neu.zeilen.filter((x) => x.id !== id);
  else if (feld === "text") { z.text = String(wert ?? "").trim().slice(0, 120); z.gruende = z.gruende.filter((g) => g !== "name"); }
  else if (feld === "menge") { const n = zahlLesen(String(wert ?? "").replace(/\s/g, ""), ","); z.menge = n === null ? null : (z.storno ? -Math.abs(n) : n); z.gruende = z.gruende.filter((g) => g !== "menge" && g !== "mengeVorn"); }
  else if (feld === "betrag") { const n = zahlLesen(String(wert ?? "").replace(/[€\s]/g, ""), ","); z.betrag = n === null ? null : (z.storno ? -Math.abs(n) : n); z.gruende = z.gruende.filter((g) => g !== "preis"); }
  else return lesung;
  if (feld !== "weg") { z.gruende = z.gruende.filter((g) => g !== "ocr" && g !== "geteilt" && g !== "neu"); z.unsicher = z.gruende.length > 0; z.geaendert = true; }
  return { ...neu, ...plausibel(neu.zeilen, neu.bonSumme, neu.pfand || 0) };
}

// ---------- Kassen eines Tages (Ersetzungsschlüssel) ----------
// Schlüssel (Feld „kasse“, wie Z_KASSE_ID beim Export):
//   Z-Nummer erkannt → "Z-<Nr>": gleicher Tag + gleiche Nummer ersetzt (erneutes Foto), andere Nummer addiert (zweite Kasse/zweiter Abschluss).
//   ohne Nummer, erster Bon des Tages → null („Kasse 1“).
//   ohne Nummer, weiterer Bon: der Wirt wählt, welchen er ersetzt (dessen Schlüssel) oder „weitere Kasse“ → "Z-K<n>" (Kasse 2, 3 …) –
//   ein Merkmal, kein Zufall: dieselbe Kasse auf zwei Handys ergibt denselben Schlüssel (Prüfgremium 18.10.2026, N5). Ältere Stände mit "Z-?<id>" bleiben gültig.
// Zusammenführen und Laden: verkaeufeEntdoppeln (store.js) – gleicher Schlüssel zählt einmal; ein Bon ohne Nummer, der einem Bon mit Nummer am selben Tag
// gleicht (gleiches Foto, gleiche Summe oder gleiche Positionen), gilt als derselbe Abschluss (Prüfgremium 18.10.2026, H2).
const aktivZbon = (stand, datum) => (stand.verkaeufe || []).filter((v) => !v.storniert && v.herkunft === "zbon" && v.datum === datum);
const KASSE_NR = /^Z-K(\d{1,3})$/;
// [{ key, art: "kasse" | "zNr", nr }] – Kasse 1 (null), Kasse 2 … (Z-K2 …, alte "Z-?…" der Reihe nach), dann Z-Nummern
export function zbonKassen(stand, datum) {
  if (!stand || !datum) return [];
  const keys = [...new Set(aktivZbon(stand, datum).map((v) => (typeof v.kasse === "string" && v.kasse ? v.kasse : null)))];
  const belegt = new Set(keys.map((k) => (k === null ? 1 : KASSE_NR.test(k) ? Number(KASSE_NR.exec(k)[1]) : null)).filter((n) => n !== null));
  const frei = () => { let n = 2; while (belegt.has(n)) n += 1; belegt.add(n); return n; };
  const out = keys.map((key) => key === null ? { key, art: "kasse", nr: 1 } : KASSE_NR.test(key) ? { key, art: "kasse", nr: Number(KASSE_NR.exec(key)[1]) }
    : /^Z-\d/.test(key) ? { key, art: "zNr", nr: key.slice(2) } : { key, art: "kasse", nr: null });
  for (const k of out) if (k.nr === null) k.nr = frei();
  return out.sort((a, b) => (a.art === b.art ? (a.art === "kasse" ? a.nr - b.nr : String(a.nr).localeCompare(String(b.nr))) : a.art === "kasse" ? -1 : 1));
}
const neueKasseNr = (kassen) => { const b = new Set(kassen.filter((k) => k.art === "kasse").map((k) => k.nr)); let n = 2; while (b.has(n)) n += 1; return n; };
// Wohin gehört dieser Bon? { kasse, modus: "zNr" | "leer" | "ersetzt" | "neu" | "alle", kassen, neuNr }
//   "alle": ohne Nummer, ohne Wahl und mehrere Z-Bons am Tag – wie bisher „Nein“: alle Z-Bons des Tages werden ersetzt. Der Bildschirm lässt hier
//   erst wählen (mussWaehlen), damit nicht zu viel ersetzt wird.
export function zbonZiel(stand, lesung) {
  const kassen = zbonKassen(stand, lesung?.datum); const neuNr = neueKasseNr(kassen);
  if (lesung?.zNr) return { kasse: ("Z-" + String(lesung.zNr)).slice(0, 50), modus: "zNr", kassen, neuNr };
  if (!kassen.length) return { kasse: null, modus: "leer", kassen, neuNr };
  const w = kasseWahlSauber(lesung?.kasseWahl) || (lesung?.zweite ? { art: "neu" } : null);
  if (w?.art === "ersetzt" && kassen.some((k) => k.key === w.key)) return { kasse: w.key, modus: "ersetzt", kassen, neuNr };
  if (w?.art === "neu") return { kasse: "Z-K" + neuNr, modus: "neu", kassen, neuNr };
  if (kassen.length === 1) return { kasse: kassen[0].key, modus: "ersetzt", kassen, neuNr };
  return { kasse: null, modus: "alle", kassen, neuNr };
}
// Ohne Bestand: nur aus der Lesung (Z-Nummer) – für Aufrufer ohne Laden; mit Laden wie zbonZiel
export const zbonSchluessel = (lesung, stand = null) => (stand ? zbonZiel(stand, lesung).kasse : lesung?.zNr ? ("Z-" + String(lesung.zNr)).slice(0, 50) : null);

// ---------- in den Aufbau der Kassen-Daten (wie dsfinvkLesen) ----------
// Gleicher Kassentext (oder gleiche Nummer) wird zusammengezählt; eine Storno-Zeile zieht beim gleichnamigen Artikel ab
// (gleicher Text, sonst der eine Artikel, dessen Text den Storno-Text enthält oder umgekehrt), sonst steht sie als eigene Minus-Position da.
// Prüfgremium 18.10.2026 (M2): Menü-Bestandteile (bestandteil) zählen nicht; eine 0,00-Zeile wird nie mit einer bezahlten gleichen Namens zusammengezählt.
export function zbonErgebnis(lesung, datum = lesung?.datum, { kasse = zbonSchluessel(lesung) } = {}) {
  const bericht = { zbon: true, zNr: lesung?.zNr || null, zeilen: (lesung?.zeilen || []).length, stornoZeilen: 0, ohneMenge: 0, ohneText: 0, bestandteile: 0, pruefung: lesung?.pruefung || null, abweichung: lesung?.abweichung ?? null, fehler: [] };
  if (!datum || !/^\d{4}-\d{2}-\d{2}$/.test(datum)) { bericht.fehler.push("datum"); return { positionen: [], tage: [], bericht, fingerabdruck: null }; }
  const gruppen = new Map(); const schluessel = (z) => (istNull(z) && !z.storno ? "0|" : "") + (z.plu ? "#" + z.plu : normKasse(z.text));
  const gueltig = (lesung?.zeilen || []).filter((z) => { if (z.bestandteil) { bericht.bestandteile += 1; return false; } if (!normKasse(z.text)) { bericht.ohneText += 1; return false; } if (typeof z.menge !== "number" || !Number.isFinite(z.menge)) { bericht.ohneMenge += 1; return false; } return true; });
  for (const z of gueltig.filter((x) => !x.storno)) {
    const k = schluessel(z); const g = gruppen.get(k) || { datum, kasse, plu: z.plu || null, text: z.text, menge: 0, umsatzBrutto: 0, umsatzFehlt: false, zeilen: 0 };
    g.menge += z.menge; if (typeof z.betrag === "number") g.umsatzBrutto += z.betrag; else g.umsatzFehlt = true; g.zeilen += 1; gruppen.set(k, g);
  }
  for (const z of gueltig.filter((x) => x.storno)) {
    bericht.stornoZeilen += 1;
    const q = normKasse(z.text); let g = gruppen.get(schluessel(z)) || [...gruppen.values()].find((x) => normKasse(x.text) === q);
    if (!g) { const passend = [...gruppen.values()].filter((x) => { const n = normKasse(x.text); return n.includes(q) || q.includes(n); }); if (passend.length === 1) g = passend[0]; }
    if (!g) { g = { datum, kasse, plu: z.plu || null, text: z.text, menge: 0, umsatzBrutto: 0, umsatzFehlt: false, zeilen: 0 }; gruppen.set("storno|" + schluessel(z), g); }
    g.menge += z.menge; if (typeof z.betrag === "number") g.umsatzBrutto += z.betrag; g.zeilen += 1;
  }
  const positionen = [...gruppen.values()].map((g) => ({ datum, kasse, plu: g.plu, text: g.text, menge: rund(g.menge, 3), umsatzBrutto: g.umsatzFehlt ? null : rund(g.umsatzBrutto, 2), zeilen: g.zeilen }))
    .filter((p) => Math.abs(p.menge) > 1e-9 || (p.umsatzBrutto !== null && Math.abs(p.umsatzBrutto) > 0.004))
    .sort((a, b) => a.text.localeCompare(b.text, "de") || (a.umsatzBrutto ?? 0) - (b.umsatzBrutto ?? 0));
  return { positionen, tage: positionen.length ? [datum] : [], bericht, fingerabdruck: "zbon-" + datum + "-" + (lesung?.zNr || "x") };
}

// Gleicher Bon? (H2) Summe der Positionen oder Positionen gleich – Vergleich der Vorschau mit vorhandenen Z-Bons ohne Nummer am Tag
const summeVon = (l) => rund(l.reduce((t, p) => t + (typeof p.umsatzBrutto === "number" ? p.umsatzBrutto : 0), 0));
const abdruckVon = (l) => l.map((p) => [normKasse(p.text || p.name), rund(p.menge, 3), p.umsatzBrutto ?? ""].join("|")).sort().join("\n");
function gleicherBonOhneNr(stand, datum, positionen, upload = null) {
  const s = summeVon(positionen), a = abdruckVon(positionen); const out = new Set();
  const je = new Map(); for (const v of aktivZbon(stand, datum)) { if (typeof v.kasse === "string" && /^Z-\d/.test(v.kasse)) continue; const k = v.importId || v.id; if (!je.has(k)) je.set(k, []); je.get(k).push(v); }
  for (const [k, l] of je) if ((upload && l.some((v) => v.upload === upload)) || (s > 0.004 && Math.abs(summeVon(l) - s) <= 0.005) || abdruckVon(l) === a) out.add(k);
  return out;
}

// Vorschau für den Bildschirm: Zuordnung (wie beim Kassen-Export, gleiche Lern-Logik), ersetzt/gleich für den Tag
export function zbonVorschau(stand, lesung) {
  const ziel = zbonZiel(stand, lesung);
  const erg = zbonErgebnis(lesung, lesung?.datum, { kasse: ziel.kasse });
  const v = importVorschau(stand, erg, { herkunft: "zbon" });
  // Kassen-Daten für denselben Tag zählen vor dem Z-Bon (Rangfolge): das sagt die Vorschau vorher
  const kasseDa = !!lesung?.datum && (stand.verkaeufe || []).some((x) => !x.storniert && x.datum === lesung.datum && (x.herkunft === "dsfinvk" || x.herkunft === "kasse"));
  const frage = !lesung?.zNr && ziel.kassen.length > 0;
  const gleichOhneNr = ziel.modus === "zNr" && lesung?.datum ? gleicherBonOhneNr(stand, lesung.datum, erg.positionen).size : 0;
  const andere = ziel.kassen.filter((k) => k.key !== ziel.kasse).length - (gleichOhneNr ? 1 : 0);
  const extra = ziel.modus === "alle" ? 1 : gleichOhneNr;
  const mussWaehlen = frage && ziel.kassen.length >= 2 && !kasseWahlSauber(lesung?.kasseWahl) && !lesung?.zweite;
  return { ...v, ergebnis: erg, kasseDa, frage, zweite: ziel.modus === "neu", andere: Math.max(0, andere), ersetzt: v.ersetzt + extra,
    addiert: ziel.modus === "neu" || (ziel.modus === "zNr" && andere > 0), kassen: ziel.kassen, ziel: ziel.kasse, modus: ziel.modus, neuNr: ziel.neuNr, mussWaehlen };
}

// Übernehmen: Herkunft "zbon" für den Tag. Gleicher Tag erneut ersetzt den vorigen Z-Bon-Stand (nicht doppelt; importUebernehmen).
// Jeder Eintrag merkt sich das Foto (upload) und die Z-Nummer – nachvollziehbar für Amt und Steuerberater. Die Tagesnotiz wird nicht berührt.
export function zbonUebernehmen(stand, lesung, { upload = null, jetzt = new Date().toISOString(), geraet = null } = {}) {
  const ziel = zbonZiel(stand, lesung);
  const erg = zbonErgebnis(lesung, lesung?.datum, { kasse: ziel.kasse });
  if (!erg.positionen.length) return { importId: null, neu: 0, ersetzt: 0, gleich: 0, tage: 0, fehler: erg.bericht.fehler.length ? erg.bericht.fehler : ["leer"] };
  const vorher = new Set((stand.verkaeufe || []).map((v) => v.id));
  let extra = 0;
  if (ziel.modus === "alle") for (const v of aktivZbon(stand, lesung.datum)) if ((v.kasse ?? null) !== null) { v.storniert = true; v.storniertZeit = jetzt; v.ersetzt = "zbon-" + lesung.datum; extra += 1; } // ohne Wahl = alle ersetzen (wie bisher „Nein“)
  const r0 = importUebernehmen(stand, erg, { herkunft: "zbon", jetzt, geraet });
  const uid = upload && typeof upload === "object" ? upload.id : typeof upload === "string" ? upload : null;
  for (const v of stand.verkaeufe || []) if (!vorher.has(v.id)) { if (uid) v.upload = uid; if (lesung.zNr) v.zNr = String(lesung.zNr).slice(0, 20); }
  // H2: Mit Z-Nummer – ein vorher übernommenes Foto desselben Bons ohne lesbare Nummer gilt als derselbe Abschluss (dieselbe Regel wie beim Zusammenführen)
  if (ziel.modus === "zNr") { const a0 = aktivZbon(stand, lesung.datum).length; stand.verkaeufe = verkaeufeEntdoppeln(stand.verkaeufe, { nur: "zbon" }); extra += a0 - aktivZbon(stand, lesung.datum).length; }
  if (uid) { const u = (stand.uploads || []).find((x) => x.id === uid); if (u) { u.status = "uebernommen"; u.ergebnis = { zbon: lesung.datum, zNr: lesung.zNr || null, positionen: erg.positionen.length }; } }
  return { ...r0, ersetzt: r0.ersetzt + extra, kasse: ziel.kasse, fehler: [] };
}
