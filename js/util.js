// Kleine Helfer. Einzige Abhängigkeit: js/zeit.js (Tage in Berlin).
import { isoTag, geschaeftstag as geschaeftstagText, GESCHAEFTSTAG_BIS_STUNDE } from "./zeit.js";

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
export const SITZUNG = uid(); // Kennung dieses App-Starts: eigene frische Einträge dürfen noch bearbeitet werden

// HTML-Escaping für alles, was aus Eingaben kommt.
export const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// Zahl aus einer Eingabe lesen. Deutsch zuerst: "1.234,50" -> 1234.5, "3.600" -> 3600, "12,5" -> 12.5.
// Ein einzelner Punkt gilt nur dann als Dezimalpunkt, wenn danach nicht genau drei Ziffern stehen ("12.5" -> 12.5, "3.600" -> 3600).
// Nur Ziffern, Punkt und Komma werden angenommen; Minus, Exponent und Hex werden verworfen (null).
// Obergrenze gegen Tippfehler: kein Betrag und keine Menge in dieser App ist größer als zehn Millionen.
export const MAX_ZAHL = 1e7;
export function parseZahl(v) {
  if (v === null || v === undefined) return null;
  let s = String(v).trim().replace(/\s/g, "").replace(/€|%/g, "");
  if (s === "" || !/^[0-9.,]+$/.test(s)) return null;
  const punkte = (s.match(/\./g) || []).length, kommas = (s.match(/,/g) || []).length;
  if (kommas > 1) return null;
  if (kommas === 1 && punkte >= 1) {
    // Beide Zeichen: das letzte ist das Dezimalzeichen ("1.234,56" deutsch, "1,234.56" englisch)
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else { if (!/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) return null; s = s.replace(/,/g, ""); }
  }
  else if (kommas === 1) s = s.replace(",", ".");                              // Komma ist Dezimal
  else if (punkte === 1) { if (/^[1-9]\d{0,2}\.\d{3}$/.test(s)) s = s.replace(".", ""); } // "3.600" Tausender, "12.5" und "0.250" Dezimal
  else if (punkte > 1) { if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ""); else return null; }
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n <= MAX_ZAHL ? n : null;
}

// Setzung (Lauf 2, 31.10.2026, Prüfung A2): Zahlen und Euro in ALLEN Sprachen im deutschen Format („7,50 €“, westliche Ziffern) – die App läuft nur in
// Deutschland, Kassenbon, Lieferschein und Steuerberater schreiben so; wer Englisch oder Arabisch wählt, soll dieselbe Zahl wie auf dem Bon sehen.
const EURO_FMT = {}; const ZAHL_FMT = {};
export function fmtEuro(n, opts = {}) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "–";
  const d = opts.dezimal ?? 0; // Formatierer je Nachkommastellen nur einmal bauen (Stresstest 15.10.: kostete 50 ms je Seite)
  const f = EURO_FMT[d] ??= new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: d, minimumFractionDigits: d });
  return f.format(Number(n.toFixed(d)) === 0 ? 0 : n); // Lauf 6, E11 (C1): ein Betrag, der auf die gezeigten Stellen 0 ergibt, zeigt „0 €“, nie „-0 €“
}

export function fmtZahl(n, dezimal = 0) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "–";
  return (ZAHL_FMT[dezimal] ??= new Intl.NumberFormat("de-DE", { maximumFractionDigits: dezimal, minimumFractionDigits: dezimal })).format(Number(n.toFixed(dezimal)) === 0 ? 0 : n); // nie „-0“ (Lauf 6, E11 C1)
}

// Zwei Arten von „heute“ – beide kommen aus js/zeit.js und gelten in der Zeitzone Europe/Berlin, egal wie das Gerät eingestellt ist:
//   heute(d)          Kalendertag, wechselt um 00:00 Berliner Zeit.
//   heuteGeschaeft(d) Geschäftstag, wechselt um 04:00 Berliner Zeit (Paket 3, 16.10.2026, M7 – Entscheidung Baris 15.10.2026):
//                     Was nach Mitternacht bis 03:59 Uhr passiert, gehört noch zum Vortag.
// Geschäftstag: Tagesumsatz, Müll und Personalessen, Tagesabschluss, Zählerstand und Monatsziel, Schwund-Zeiträume, Schicht im
//   Personal-Modus, „Jetzt dran“-Abschluss, „Waage-Vorschlag gesehen“ (Hinweis kommt nicht zweimal am selben Ladentag).
// Kalendertag: Kühlmessungen und Rundgänge, Putzplan, Belehrungen, Export und Ordner fürs Amt, Belege und Lieferungen (Rechnungsdatum),
//   Inventur, Preisverlauf, Sicherung – das Amt-Protokoll folgt dem Kalender, eine Messung um 01:30 steht beim echten Datum.
// Beide liefern den Text "JJJJ-MM-TT". `geschaeftstag(d)` ist derselbe Text wie heuteGeschaeft(d) (früher: ein Date).
export const heute = (d = new Date()) => isoTag(d);
export { GESCHAEFTSTAG_BIS_STUNDE };
export const geschaeftstag = (d = new Date()) => geschaeftstagText(d);
export const heuteGeschaeft = (d = new Date()) => geschaeftstagText(d);

export function debounce(fn, ms) {
  let t;
  const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  d.abbrechen = () => clearTimeout(t);
  return d;
}

// Zahl für ein Eingabefeld: Komma statt Punkt, nichts bei null.
// Gemeinsamer Helfer für geschätzte Euro-Zahlen (Masterauftrag „Gehirn“ 0.1, 28.10.2026): jede Zahl, die auf einem Richtwert,
// einer geschätzten Warenquote oder einem Startwert beruht, bekommt „≈ “ davor – an einer Stelle statt in jedem Bildschirm einzeln.
export const fmtEuroGeschaetzt = (n, geschaetzt, opts = {}) => (geschaetzt && n !== null && n !== undefined && Number.isFinite(n) ? "≈ " : "") + fmtEuro(n, opts);
export const wertAnzeige = (n) => (n === null || n === undefined) ? "" : String(n).replace(".", ",");

// Bildname aus einem Namen (17.10.2026, Bildliste für Sanji): „Dönerspieß Kalb/Pute“ → „doenerspiess-kalb-pute“.
// Gleiche Regel wie tools/bildliste.mjs – die App sucht foto/<präfix>-<fotoSlug(name)>.webp vor dem Sammelbild.
export const fotoSlug = (s) => String(s || "").toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
  .replace(/[çc]/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ş/g, "s").normalize("NFKD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Trennung (17.10.2026): aus js/screens/kuehl.js hierher (Eingabe lesen, unverändert).
// Temperaturen dürfen negativ sein (Tiefkühlung) – parseZahl nimmt kein Minus, deshalb hier getrennt.
export function parseTemperatur(v) {
  const s = String(v ?? "").trim().replace(/\s/g, "").replace("−", "-").replace("–", "-");
  if (s === "" || s === "-") return null;
  const neg = s.startsWith("-"); const n = parseZahl(neg ? s.slice(1) : s);
  if (n === null || n > 300 || (neg && n > 100)) return null; // Küche: −100 bis 300 °C
  return neg ? -n : n;
}
