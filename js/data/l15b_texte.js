// Lauf 4 (11.11.2026), Bildpaket L15b – Entwurf hinter window.__gcL15b (Klasse C, nichts live vor Baris' Ja).
// Kürzere Laden-Sätze für den vollen Laden. Nur de/tr/ar/en; jede andere Sprache behält ihren bisherigen Text (Rückgabe null).
const T = {
  de: { warm: (k) => `${k} zu warm. Gleich nachsehen.`, kalt: (k) => `${k} zu kalt. Gleich nachsehen.`, rezeptFrage: "Chef, Rezepturen schon eingetragen?" },
  tr: { warm: (k) => `${k} fazla sıcak. Hemen bak.`, kalt: (k) => `${k} fazla soğuk. Hemen bak.`, rezeptFrage: "Usta, tarifler girildi mi?" },
  ar: { warm: (k) => `${k} دافئة جدًا. تفقّدها فورًا.`, kalt: (k) => `${k} باردة جدًا. تفقّدها فورًا.`, rezeptFrage: "أدخلت وصفاتك؟" },
  en: { warm: (k) => `${k} too warm. Check now.`, kalt: (k) => `${k} too cold. Check now.`, rezeptFrage: "Chef, recipes entered yet?" },
};
export const l15bAn = () => globalThis.__gcL15b === true;
export function l15b(sprache, key, ...args) { if (!l15bAn()) return null; const x = T[sprache]?.[key]; return x == null ? null : typeof x === "function" ? x(...args) : x; }
