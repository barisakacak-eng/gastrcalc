// Lauf 4 (11.11.2026), Bildpaket L15b – Entwurf hinter window.__gcL15b (Klasse C, nichts live vor Baris' Ja).
// Kürzere Laden-Sätze für den vollen Laden. Nur de/tr/ar/en; jede andere Sprache behält ihren bisherigen Text (Rückgabe null).
const T = {
  de: { zwischenstand: (b) => `Alle festen Kosten zusammen: ${b} im Monat`, abgaben: (p, a) => `Mit ≈ ${p} % Abgaben des Arbeitgebers (${{ angestellt: "Angestellte", minijob: "Minijob", gemischt: "Angestellte und Minijob, gewichtet" }[a]}).`, warm: (k) => `${k} zu warm. Gleich nachsehen.`, kalt: (k) => `${k} zu kalt. Gleich nachsehen.`, rezeptFrage: "Chef, Rezepturen schon eingetragen?" },
  tr: { zwischenstand: (b) => `Tüm sabit giderler: ayda ${b}`, abgaben: (p, a) => `İşveren payı ≈ %${p} dahil (${{ angestellt: "çalışan", minijob: "minijob", gemischt: "çalışan ve minijob, ağırlıklı" }[a]}).`, warm: (k) => `${k} fazla sıcak. Hemen bak.`, kalt: (k) => `${k} fazla soğuk. Hemen bak.`, rezeptFrage: "Usta, tarifler girildi mi?" },
  ar: { zwischenstand: (b) => `كل التكاليف الثابتة معًا: ${b} شهريًا`, abgaben: (p, a) => `مع ≈ ${p} % مساهمات صاحب العمل (${{ angestellt: "موظفون", minijob: "ميني جوب", gemischt: "موظفون وميني جوب، مرجّح" }[a]}).`, warm: (k) => `${k} دافئة جدًا. تفقّدها فورًا.`, kalt: (k) => `${k} باردة جدًا. تفقّدها فورًا.`, rezeptFrage: "أدخلت وصفاتك؟" },
  en: { zwischenstand: (b) => `All fixed costs together: ${b} a month`, abgaben: (p, a) => `Includes ≈ ${p} % employer contributions (${{ angestellt: "employees", minijob: "mini-job", gemischt: "employees and mini-job, weighted" }[a]}).`, warm: (k) => `${k} too warm. Check now.`, kalt: (k) => `${k} too cold. Check now.`, rezeptFrage: "Chef, recipes entered yet?" },
};
// Baris Ja 11.11.2026 23:14 (Lauf 5): Bildpaket L15b ist Standard, der Schalter window.__gcL15b ist entfernt.
export const l15bAn = () => true;
export function l15b(sprache, key, ...args) { if (!l15bAn()) return null; const x = T[sprache]?.[key]; return x == null ? null : typeof x === "function" ? x(...args) : x; }
