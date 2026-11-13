// Lauf 6, Etappe 5 (13.11.2026): Sätze zu Abgleich, Einlesen und Sicherung. Das Rechenwerk (js/store.js) liefert Zahlen und Gründe,
// die Bedienschicht zeigt den Satz. Muster wie js/data/frist_texte.js: de/tr/ar/en, andere Sprachen fallen auf en (de ist Leitsprache).
// Wo welcher Satz erscheint, steht im Bericht der Etappe und in docs/vertraege.md Abschnitt 5.
const T = {
  // Einlesen einer Sicherung aus einer neueren App (importDatei wirft grund "neuer") – Büro, Blatt „Sicherung einlesen“
  neuer: {
    de: "Diese Sicherung stammt aus einer neueren App. Erst die App aktualisieren.",
    tr: "Bu yedek daha yeni bir uygulamadan geliyor. Önce uygulamayı güncelleyin.",
    ar: "هذه النسخة الاحتياطية من تطبيق أحدث. حدّث التطبيق أولاً.",
    en: "This backup comes from a newer app. Update the app first.",
  },
  // Monatsabschluss: die Einträge des Monats haben sich seit dem Einfrieren geändert (abschlussVeraltet) – Büro, Monatsabschluss
  abschlussVeraltet: {
    de: "Daten seit Abschluss geändert.",
    tr: "Kapanıştan sonra veriler değişti.",
    ar: "تغيّرت البيانات منذ الإقفال.",
    en: "Data changed since closing.",
  },
  // Blatt „Sicherung teilen“: Vollsicherung ohne Passwort
  ohnePasswort: {
    de: "Ohne Passwort ist die Sicherung nicht verschlüsselt. Wer die Datei hat, kann alles lesen.",
    tr: "Şifre olmadan yedek şifrelenmez. Dosyaya sahip olan herkes her şeyi okuyabilir.",
    ar: "بدون كلمة مرور لا تكون النسخة الاحتياطية مشفّرة. من يملك الملف يستطيع قراءة كل شيء.",
    en: "Without a password the backup is not encrypted. Anyone with the file can read everything.",
  },
  // Einlesen wurde zurückgenommen (zurueckholen) – Büro, nach dem Einlesen „Rückgängig“
  rueckgaengig: {
    de: "Einlesen rückgängig machen.",
    tr: "İçe aktarmayı geri al.",
    ar: "التراجع عن الاستيراد.",
    en: "Undo import.",
  },
  zurueckgeholt: {
    de: "Der Stand von vor dem Einlesen ist zurück.",
    tr: "İçe aktarmadan önceki durum geri geldi.",
    ar: "عادت الحالة التي كانت قبل الاستيراد.",
    en: "The state from before the import is back.",
  },
};
// Sätze mit Zahlen oder Werten (Funktionen)
const F = {
  // Eintrag auf beiden Handys verschieden geändert (bericht.eintraege): ein Satz je Eintrag, beide Werte kurz
  eintragUnterschied: {
    de: (was, a, b) => `${was}: dieses Handy ${a}, anderes Handy ${b}. Dieses Handy behält seinen Wert.`,
    tr: (was, a, b) => `${was}: bu telefon ${a}, diğer telefon ${b}. Bu telefon kendi değerini korur.`,
    ar: (was, a, b) => `${was}: هذا الهاتف ${a}، الهاتف الآخر ${b}. يحتفظ هذا الهاتف بقيمته.`,
    en: (was, a, b) => `${was}: this phone ${a}, other phone ${b}. This phone keeps its value.`,
  },
  // Bereich ohne Kennungen auf beiden Handys verschieden (abgleichHinweis.unterschiede)
  bereichUnterschied: {
    de: (was, a, b) => `${was} war auf beiden Handys verschieden (hier ${a}, dort ${b}). Hier gilt ${a}.`,
    tr: (was, a, b) => `${was} iki telefonda farklıydı (burada ${a}, orada ${b}). Burada ${a} geçerli.`,
    ar: (was, a, b) => `${was} كان مختلفاً على الهاتفين (هنا ${a}، هناك ${b}). هنا يسري ${a}.`,
    en: (was, a, b) => `${was} differed on the two phones (here ${a}, there ${b}). Here ${a} applies.`,
  },
  // Umsatz am selben Tag auf beiden Handys verschieden (bericht.umsatzKonflikte)
  umsatzKonflikt: {
    de: (tag, a, b) => `Umsatz am ${tag}: ${a} und ${b}. Der jüngere Eintrag gilt.`,
    tr: (tag, a, b) => `${tag} cirosu: ${a} ve ${b}. Daha yeni kayıt geçerli.`,
    ar: (tag, a, b) => `مبيعات ${tag}: ${a} و${b}. يسري الإدخال الأحدث.`,
    en: (tag, a, b) => `Sales on ${tag}: ${a} and ${b}. The newer entry applies.`,
  },
  // Beschädigter Teil gerettet (ladeFehler grund "gerettet")
  gerettet: {
    de: (n) => `Ein beschädigter Teil wurde gerettet: ${n} Einträge.`,
    tr: (n) => `Hasarlı bir bölüm kurtarıldı: ${n} kayıt.`,
    ar: (n) => `تم إنقاذ جزء تالف: ${n} إدخال.`,
    en: (n) => `A damaged part was rescued: ${n} entries.`,
  },
  // Einträge übersprungen (bericht.ungueltig)
  ungueltig: {
    de: (n) => `${n} ungültige Einträge wurden übersprungen.`,
    tr: (n) => `${n} geçersiz kayıt atlandı.`,
    ar: (n) => `تم تخطي ${n} إدخالات غير صالحة.`,
    en: (n) => `${n} invalid entries were skipped.`,
  },
  // Einträge mit Datum in der Zukunft übernommen und markiert (bericht.zukunft, datumPruefen)
  zukunftPruefen: {
    de: (n) => `${n} Einträge haben ein Datum in der Zukunft. Bitte das Datum prüfen.`,
    tr: (n) => `${n} kaydın tarihi gelecekte. Lütfen tarihi kontrol edin.`,
    ar: (n) => `${n} إدخالات بتاريخ في المستقبل. يرجى التحقق من التاريخ.`,
    en: (n) => `${n} entries have a date in the future. Please check the date.`,
  },
  // Bei „mehr als drei Zeilen“ im Büro-Hinweis nach dem Abgleich (Lauf 6, E5-Draht 7)
  weitere: {
    de: (n) => `… und ${n} weitere`,
    tr: (n) => `… ve ${n} tane daha`,
    ar: (n) => `… و${n} أخرى`,
    en: (n) => `… and ${n} more`,
  },
  // Wie eintragUnterschied, aber der Wert vom anderen Handy hat gewonnen (bericht.eintraege[].behalten === "fremd")
  eintragUnterschiedFremd: {
    de: (was, a, b) => `${was}: dieses Handy ${a}, anderes Handy ${b}. Der Wert vom anderen Handy gilt.`,
    tr: (was, a, b) => `${was}: bu telefon ${a}, diğer telefon ${b}. Diğer telefonun değeri geçerli.`,
    ar: (was, a, b) => `${was}: هذا الهاتف ${a}، الهاتف الآخر ${b}. تسري قيمة الهاتف الآخر.`,
    en: (was, a, b) => `${was}: this phone ${a}, other phone ${b}. The other phone's value applies.`,
  },
  // Wie bereichUnterschied, aber die Seite des anderen Handys gilt (abgleichHinweis.unterschiede[].gilt === "fremd")
  bereichUnterschiedFremd: {
    de: (was, a, b) => `${was} war auf beiden Handys verschieden (hier ${a}, dort ${b}). Dort gilt ${b}.`,
    tr: (was, a, b) => `${was} iki telefonda farklıydı (burada ${a}, orada ${b}). Orada ${b} geçerli.`,
    ar: (was, a, b) => `${was} كان مختلفاً على الهاتفين (هنا ${a}، هناك ${b}). هناك يسري ${b}.`,
    en: (was, a, b) => `${was} differed on the two phones (here ${a}, there ${b}). There ${b} applies.`,
  },
  // Datei zu groß
  zuGross: {
    de: (mb) => `Die Datei ist zu groß (mehr als ${mb} MB).`,
    tr: (mb) => `Dosya çok büyük (${mb} MB'tan fazla).`,
    ar: (mb) => `الملف كبير جداً (أكثر من ${mb} ميغابايت).`,
    en: (mb) => `The file is too large (more than ${mb} MB).`,
  },
};
export const l6yText = (schluessel, sprache = "de") => { const x = T[schluessel]; return x ? (x[sprache] ?? x.en ?? x.de) : ""; };
export const l6ySatz = (schluessel, sprache, ...args) => { const x = F[schluessel]; return x ? (x[sprache] ?? x.en ?? x.de)(...args) : ""; };
