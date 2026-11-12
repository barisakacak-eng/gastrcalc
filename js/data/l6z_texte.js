// Lauf 6, Etappe 5 (13.11.2026): zwei neue Sätze der Bedienschicht – de/tr/ar/en; alle anderen Sprachen fallen auf Englisch zurück
// (Muster wie js/data/frist_texte.js, aber mit Englisch als Rückfall). Keine Änderung an js/lang.
export const L6Z = {
  // Banner und Meldung, wenn das Gerät nicht mehr schreiben kann (Speicher voll)
  speicherVoll: {
    de: "Speicher voll. Bitte jetzt sichern und Platz schaffen.",
    tr: "Hafıza dolu. Lütfen şimdi yedekle ve yer aç.",
    ar: "الذاكرة ممتلئة. يرجى حفظ نسخة احتياطية الآن وتفريغ مساحة.",
    en: "Storage full. Please back up now and free up space.",
  },
  // Büro, Karte „Büro-Code“: ehrlich, was das Schloss kann
  schlossEhrlich: {
    de: "Schloss gegen neugierige Blicke, kein Tresor.",
    tr: "Meraklı gözlere karşı kilit, kasa değil.",
    ar: "قفل ضد العيون الفضولية، وليس خزنة.",
    en: "A lock against curious eyes, not a safe.",
  },
  // Schloss-Blatt nach 10 Fehlversuchen in Folge: nur noch der Rettungscode
  nurRettung: {
    de: "Zu viele Versuche. Es geht nur noch mit dem Rettungscode.",
    tr: "Çok fazla deneme. Artık sadece kurtarma koduyla olur.",
    ar: "محاولات كثيرة. لم يعد ممكنًا إلا برمز الإنقاذ.",
    en: "Too many tries. Only the rescue code works now.",
  },
};
export const l6z = (sprache, schluessel) => { const e = L6Z[schluessel]; return e ? (e[sprache] || e.en) : schluessel; };
