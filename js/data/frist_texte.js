// Lauf 3, Phase 6 (09.11.2026): Frist-Erinnerung auf Heute – ein Satz (≤ 15 Wörter), Zeki sagt ihn höchstens einmal am Tag.
// de/tr/en/ar; übrige Sprachen Deutsch (wie js/data/hinweis_texte.js). Namen der Termine aus „w3.termine.art“ der jeweiligen Sprache.
const FRIST_SATZ = {
  de: (arten, datum) => `${arten} am ${datum} fällig.`,
  tr: (arten, datum) => `${arten}: son gün ${datum}.`,
  en: (arten, datum) => `${arten} due on ${datum}.`,
  ar: (arten, datum) => `${arten}: الموعد ${datum}.`,
};
export const fristSatz = (sprache, arten, datum) => (FRIST_SATZ[sprache] || FRIST_SATZ.de)(arten, datum);
