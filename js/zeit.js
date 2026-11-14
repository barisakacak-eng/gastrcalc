// Zeit aus einer Quelle. Der Laden steht in Deutschland: jeder Tag wird in der Zeitzone Europe/Berlin bestimmt – egal, wie das Handy
// eingestellt ist (ein Handy auf Istanbul-Zeit darf den Tag nicht eine Stunde früher wechseln).
// Zwei Arten von „heute“:
//   Kalendertag (isoTag): wechselt um 00:00 Berliner Zeit. Für Kühlmessungen, Putzplan, Belege, Export fürs Amt.
//   Geschäftstag (geschaeftstag): wechselt erst um 04:00 Berliner Zeit. Was zwischen 00:00 und 03:59 passiert, gehört zum Vortag.
//     Für Umsatz, Müll, Tagesabschluss, Zähler.
// Ein Tag ist überall der Text "JJJJ-MM-TT". Rechnen mit Tagen (plusTage, tageZwischen, wochentag) geschieht rein auf diesem Text,
// ohne Uhrzeit und ohne Zeitzone – darum gibt es keine Fehler an den Tagen der Zeitumstellung.
// Kein anderes Modul darf toISOString().slice(0, 10) benutzen (das ist der Tag in UTC, zwischen 00:00 und 02:00 Uhr der falsche).
const ZEITZONE = "Europe/Berlin";
export const GESCHAEFTSTAG_BIS_STUNDE = 4;

const FMT = new Intl.DateTimeFormat("en-CA", { timeZone: ZEITZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
// Datum und Uhrzeit eines Zeitpunkts in Berlin: { tag: "JJJJ-MM-TT", stunde, minute }
export function berlin(d = new Date()) {
  const t = {}; for (const p of FMT.formatToParts(d)) t[p.type] = p.value;
  return { tag: `${t.year}-${t.month}-${t.day}`, stunde: Number(t.hour), minute: Number(t.minute) };
}
// Kalendertag in Berlin
export const isoTag = (d = new Date()) => berlin(d).tag;
// Geschäftstag in Berlin (bis 04:00 zählt der Vortag)
export function geschaeftstag(d = new Date()) { const b = berlin(d); return b.stunde < GESCHAEFTSTAG_BIS_STUNDE ? plusTage(b.tag, -1) : b.tag; }

const z2 = (n) => String(n).padStart(2, "0");
const utc = (tag) => { const [j, m, t] = tag.split("-").map(Number); return Date.UTC(j, m - 1, t); };
const text = (ms) => { const x = new Date(ms); return `${x.getUTCFullYear()}-${z2(x.getUTCMonth() + 1)}-${z2(x.getUTCDate())}`; };
const TAG_MS = 86400000;
export const gueltigerTag = (tag) => typeof tag === "string" && /^\d{4}-\d{2}-\d{2}$/.test(tag) && text(utc(tag)) === tag;
// Tag plus n Tage (n darf negativ sein)
export const plusTage = (tag, n) => text(utc(tag) + n * TAG_MS);
// Ganze Tage von a bis b (b später → positiv; gleicher Tag → 0)
export const tageZwischen = (a, b) => Math.round((utc(b) - utc(a)) / TAG_MS);
// Wochentag: 0 = Sonntag … 6 = Samstag
export const wochentag = (tag) => new Date(utc(tag)).getUTCDay();
// Monat "JJJJ-MM" eines Tages, erster und letzter Tag eines Monats, Monat plus n
export const monatVon = (tag) => tag.slice(0, 7);
export const monatsErster = (monat) => `${monat}-01`;
export const monatsLetzter = (monat) => { const [j, m] = monat.split("-").map(Number); return text(Date.UTC(j, m, 0)); };
export const plusMonate = (monat, n) => { const [j, m] = monat.split("-").map(Number); const x = j * 12 + (m - 1) + n; return `${Math.floor(x / 12)}-${z2((x % 12) + 1)}`; };
// Lauf 6, Etappe 4 – kleine Helfer für die übrigen Module (nichts Vorhandenes geändert)
// Tag aus Jahr, Monat, Tag (Zahlen) als Text: tagVon(2026, 3, 9) = "2026-03-09"
export const tagVon = (j, m, d) => `${j}-${z2(m)}-${z2(d)}`;
// Zahl der Tage eines Monats: tageImMonat(2028, 2) = 29
export const tageImMonat = (j, m) => Number(monatsLetzter(`${j}-${z2(m)}`).slice(8));
// Uhrzeit eines Zeitpunkts in Berlin als "HH:MM" und als Dezimalstunde (14:30 = 14.5)
export const uhr = (d = new Date()) => { const b = berlin(d); return `${z2(b.stunde)}:${z2(b.minute)}`; };
export const stundeBruch = (d = new Date()) => { const b = berlin(d); return b.stunde + b.minute / 60; };
// Tag plus n Monate; ist der Zieltag im Zielmonat nicht vorhanden, gilt der letzte Tag des Zielmonats (29.02. → 28.02.)
export const tagPlusMonate = (tag, n) => { const m = plusMonate(tag.slice(0, 7), n); const [j, mm] = m.split("-").map(Number); return tagVon(j, mm, Math.min(Number(tag.slice(8)), tageImMonat(j, mm))); };
// Zeitpunkt (Date) einer Berliner Uhrzeit an einem Tag: berlinZeitpunkt("2026-10-25", 22, 0) = 22:00 Berliner Zeit (Sommer- oder Winterzeit je nach Tag).
// Zeiten, die es am Umstellungstag nicht gibt, landen eine Stunde später; doppelte auf der Sommerzeit-Seite.
export function berlinZeitpunkt(tag, stunde = 0, minute = 0) {
  const ziel = utc(tag) + (stunde * 60 + minute) * 60000; let t = ziel;
  const wandVon = (ms) => { const b = berlin(new Date(ms)); return utc(b.tag) + (b.stunde * 60 + b.minute) * 60000; };
  for (let i = 0; i < 4; i++) { const diff = ziel - wandVon(t); if (!diff) break; t += diff; }
  // Lauf 6, E11 (C2): doppelte Stunde (Ende der Sommerzeit, 02:00–02:59): die Wanduhr zeigt sie zweimal; es gilt das erste Mal (Sommerzeit-Seite), wie oben beschrieben.
  if (wandVon(t) === ziel && wandVon(t - 3600000) === ziel) t -= 3600000;
  return new Date(t);
}
