// Lauf 6, Kern (E5-X, 13.11.2026): wenige neue Sätze für Bildschirme, die das Rechenwerk jetzt aus einer Quelle speist.
// de/tr/ar/en; übrige Sprachen fallen auf en (wie js/data/frist_texte.js). Keine Änderung an js/lang.
const T = {
  de: {
    schichtGleich: "Beginn und Ende sind gleich. Bitte prüfen.",
    verlaufMonat: (monat) => `Stand im ${monat}`,
    bisNullFehlt: (betrag) => `Bis null fehlen ${betrag}`,
  },
  tr: {
    schichtGleich: "Başlangıç ve bitiş aynı. Lütfen kontrol edin.",
    verlaufMonat: (monat) => `${monat} ayı durumu`,
    bisNullFehlt: (betrag) => `Sıfıra ${betrag} eksik`,
  },
  ar: {
    schichtGleich: "البداية والنهاية متطابقتان. يرجى المراجعة.",
    verlaufMonat: (monat) => `الوضع في ${monat}`,
    bisNullFehlt: (betrag) => `ينقص ${betrag} للوصول إلى الصفر`,
  },
  en: {
    schichtGleich: "Start and end are the same. Please check.",
    verlaufMonat: (monat) => `Position in ${monat}`,
    bisNullFehlt: (betrag) => `${betrag} short of zero`,
  },
};
export function l6x(sprache, key, ...args) { const x = (T[sprache] || T.en)[key] ?? T.en[key]; return x == null ? null : typeof x === "function" ? x(...args) : x; }
