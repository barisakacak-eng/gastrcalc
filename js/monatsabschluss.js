// Welle 3, 3.3 Monatsabschluss (Bau-Chat 03.11.2026): Monatsergebnis einfrieren, Vormonat und Vorjahr vergleichen.
// Eingefroren wird, was die App am Abschluss-Tag rechnet (Umsatz, Ware, Quoten, Ergebnis). Spätere Nachträge ändern den eingefrorenen Monat nicht;
// ein neuer Abschluss desselben Monats ersetzt ihn nur ausdrücklich (neu: true) und behält den alten als „ersetzt“ (nichts wird still überschrieben).
// stand.monatsabschluesse = [{ monat, eingefroren, umsatzBrutto, umsatzNetto, ware, quote, personal, personalQuote, ergebnis, geschaetzt, ersetzt? }]
import { monatsPosten, wasBleibtAus, prueferAus } from "./steuertopf.js";

const r2 = (n) => Math.round(n * 100) / 100, r4 = (n) => Math.round(n * 10000) / 10000;
const monatPlus = (m, n) => { const [j, mm] = m.split("-").map(Number); const x = j * 12 + (mm - 1) + n; return `${Math.floor(x / 12)}-${String((x % 12) + 1).padStart(2, "0")}`; };

export function monatsZahlen(stand, monat) {
  const p = monatsPosten(stand, monat); const w = wasBleibtAus(p, null); const q = prueferAus(p, null);
  return { monat, umsatzBrutto: p.umsatzBrutto, umsatzNetto: p.umsatzNetto, ware: p.ware, quote: q.quote, personal: p.personal,
    personalQuote: p.umsatzNetto > 0 ? r4(p.personal / p.umsatzNetto) : null, ergebnis: w.ergebnis, geschaetzt: !!p.geschaetzt };
}
export const eingefroren = (stand, monat) => (stand?.monatsabschluesse || []).find((x) => x.monat === monat && !x.ersetzt) || null;

export function monatEinfrieren(stand, monat, { jetzt = new Date().toISOString(), neu = false } = {}) {
  stand.monatsabschluesse ??= [];
  const alt = eingefroren(stand, monat); if (alt && !neu) return alt;
  if (alt) alt.ersetzt = jetzt;
  const e = { ...monatsZahlen(stand, monat), eingefroren: jetzt };
  stand.monatsabschluesse.push(e); return e;
}
// Vergleich: dieser Monat (eingefroren, sonst live) gegen Vormonat und Vorjahresmonat. Differenzen in € bzw. Prozentpunkten.
export function monatVergleich(stand, monat) {
  const hol = (m) => eingefroren(stand, m) || (monatsZahlen(stand, m).umsatzBrutto > 0 ? monatsZahlen(stand, m) : null);
  const jetzt = hol(monat); const diff = (a, b) => !a || !b ? null : {
    umsatz: r2(a.umsatzBrutto - b.umsatzBrutto), quotePunkte: a.quote !== null && b.quote !== null ? r2((a.quote - b.quote) * 100) : null,
    personalPunkte: a.personalQuote !== null && b.personalQuote !== null ? r2((a.personalQuote - b.personalQuote) * 100) : null, ergebnis: r2(a.ergebnis - b.ergebnis) };
  const vm = hol(monatPlus(monat, -1)), vj = hol(monatPlus(monat, -12));
  return { monat, jetzt, vormonat: vm, vorjahr: vj, zumVormonat: diff(jetzt, vm), zumVorjahr: diff(jetzt, vj) };
}
