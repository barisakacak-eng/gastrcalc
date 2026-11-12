// Welle 3, 3.3 Monatsabschluss (Bau-Chat 03.11.2026): Monatsergebnis einfrieren, Vormonat und Vorjahr vergleichen.
// Eingefroren wird, was die App am Abschluss-Tag rechnet (Umsatz, Ware, Quoten, Ergebnis). Spätere Nachträge ändern den eingefrorenen Monat nicht;
// ein neuer Abschluss desselben Monats ersetzt ihn nur ausdrücklich (neu: true) und behält den alten als „ersetzt“ (nichts wird still überschrieben).
// stand.monatsabschluesse = [{ monat, eingefroren, umsatzBrutto, umsatzNetto, ware, quote, personal, personalQuote, ergebnis, geschaetzt, ersetzt? }]
import { monatsPosten, wasBleibtAus, prueferAus } from "./steuertopf.js";
import { plusMonate } from "./zeit.js";
import { rund2 } from "./geld.js";
import { umsatzEintrag } from "./engine.js";

const r4 = (n) => Math.round(n * 10000) / 10000;

export function monatsZahlen(stand, monat) {
  const p = monatsPosten(stand, monat); const w = wasBleibtAus(p, null); const q = prueferAus(p, null);
  return { monat, umsatzBrutto: p.umsatzBrutto, umsatzNetto: p.umsatzNetto, ware: p.ware, quote: q.quote, personal: p.personal,
    personalQuote: p.umsatzNetto > 0 ? r4(p.personal / p.umsatzNetto) : null, ergebnis: w.ergebnis, geschaetzt: !!p.geschaetzt };
}
// Lauf 6, E5 (B3): Fingerabdruck der Umsatzeinträge des Monats (je Tag der gültige, jüngste Eintrag: Tag, Betrag, Zeitpunkt). Er wird beim Einfrieren mitgeschrieben;
// kommen nach einem Abgleich Tage dazu oder ändert sich ein Betrag, passt er nicht mehr → abschlussVeraltet. Reine Funktion, ändert nichts.
export function umsatzAbdruck(stand, monat) {
  const tage = [...new Set((stand?.tagesnotizen || []).filter((n) => n && typeof n.datum === "string" && n.datum.startsWith(monat + "-")).map((n) => n.datum))].sort();
  const text = tage.map((d) => umsatzEintrag(stand, d)).filter(Boolean).map((n) => `${n.datum}|${n.umsatz}|${n.erfasst || ""}`).join("\n");
  let a = 5381, b = 0x811c9dc5; for (let i = 0; i < text.length; i++) { const c = text.charCodeAt(i); a = (Math.imul(a, 33) + c) | 0; b = Math.imul(b ^ c, 16777619); }
  return (a >>> 0).toString(36) + "." + (b >>> 0).toString(36) + "." + text.length;
}
// true, wenn die heutigen Umsatzeinträge des Monats einen anderen Fingerabdruck ergeben als beim Einfrieren. Alte Abschlüsse ohne Fingerabdruck: nie veraltet.
export function abschlussVeraltet(stand, monat) {
  const e = eingefroren(stand, monat);
  return !!e && typeof e.abdruck === "string" && e.abdruck !== umsatzAbdruck(stand, monat);
}
export const eingefroren = (stand, monat) => (stand?.monatsabschluesse || []).find((x) => x.monat === monat && !x.ersetzt) || null;

export function monatEinfrieren(stand, monat, { jetzt = new Date().toISOString(), neu = false } = {}) {
  stand.monatsabschluesse ??= [];
  const alt = eingefroren(stand, monat); if (alt && !neu) return alt;
  if (alt) alt.ersetzt = jetzt;
  const e = { ...monatsZahlen(stand, monat), eingefroren: jetzt, abdruck: umsatzAbdruck(stand, monat) };
  stand.monatsabschluesse.push(e); return e;
}
// Vergleich: dieser Monat (eingefroren, sonst live) gegen Vormonat und Vorjahresmonat. Differenzen in € bzw. Prozentpunkten.
export function monatVergleich(stand, monat) {
  const hol = (m) => eingefroren(stand, m) || (monatsZahlen(stand, m).umsatzBrutto > 0 ? monatsZahlen(stand, m) : null);
  const jetzt = hol(monat); const diff = (a, b) => !a || !b ? null : {
    umsatz: rund2(a.umsatzBrutto - b.umsatzBrutto), quotePunkte: a.quote !== null && b.quote !== null ? rund2((a.quote - b.quote) * 100) : null,
    personalPunkte: a.personalQuote !== null && b.personalQuote !== null ? rund2((a.personalQuote - b.personalQuote) * 100) : null, ergebnis: rund2(a.ergebnis - b.ergebnis) };
  const vm = hol(plusMonate(monat, -1)), vj = hol(plusMonate(monat, -12));
  return { monat, jetzt, vormonat: vm, vorjahr: vj, zumVormonat: diff(jetzt, vm), zumVorjahr: diff(jetzt, vj) };
}
