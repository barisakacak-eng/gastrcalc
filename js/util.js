// Kleine Helfer. Keine Abhängigkeiten.

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

const EURO_FMT = {}; const ZAHL_FMT = {};
export function fmtEuro(n, opts = {}) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "–";
  const d = opts.dezimal ?? 0; // Formatierer je Nachkommastellen nur einmal bauen (Stresstest 15.10.: kostete 50 ms je Seite)
  const f = EURO_FMT[d] ??= new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: d, minimumFractionDigits: d });
  return f.format(n);
}

export function fmtZahl(n, dezimal = 0) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "–";
  return (ZAHL_FMT[dezimal] ??= new Intl.NumberFormat("de-DE", { maximumFractionDigits: dezimal, minimumFractionDigits: dezimal })).format(n);
}

// Datum in Ortszeit (nicht UTC – sonst ist zwischen Mitternacht und zwei Uhr der Tag falsch).
export function heute(d = new Date()) {
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export function debounce(fn, ms) {
  let t;
  const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  d.abbrechen = () => clearTimeout(t);
  return d;
}

// Zahl für ein Eingabefeld: Komma statt Punkt, nichts bei null.
export const wertAnzeige = (n) => (n === null || n === undefined) ? "" : String(n).replace(".", ",");
