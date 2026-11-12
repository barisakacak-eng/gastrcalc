// Zeit aus einer Quelle. Der Laden steht in Deutschland: jeder Tag wird in der Zeitzone Europe/Berlin bestimmt – egal, wie das Handy
// eingestellt ist (ein Handy auf Istanbul-Zeit darf den Tag nicht eine Stunde früher wechseln).
// Zwei Arten von „heute“:
//   Kalendertag (isoTag): wechselt um 00:00 Berliner Zeit. Für Kühlmessungen, Putzplan, Belege, Export fürs Amt.
//   Geschäftstag (geschaeftstag): wechselt erst um 04:00 Berliner Zeit. Was zwischen 00:00 und 03:59 passiert, gehört zum Vortag.
//     Für Umsatz, Müll, Tagesabschluss, Zähler.
// Ein Tag ist überall der Text "JJJJ-MM-TT". Rechnen mit Tagen (plusTage, tageZwischen, wochentag) geschieht rein auf diesem Text,
// ohne Uhrzeit und ohne Zeitzone – darum gibt es keine Fehler an den Tagen der Zeitumstellung.
// Kein anderes Modul darf toISOString().slice(0, 10) benutzen (das ist der Tag in UTC, zwischen 00:00 und 02:00 Uhr der falsche).
export const ZEITZONE = "Europe/Berlin";
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
