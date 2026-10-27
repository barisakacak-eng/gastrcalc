// Datenschutz in der App (Baris 27.10.2026: Verantwortlicher als Platzhalter bis zur Firma).
// Entwurf, nicht anwaltlich geprüft – Grundlage: Code-Prüfung main (keine Server-Abrufe, kein Tracking), Doc „GastroCash Datenschutz-Entwurf“.
// Quelle Hosting: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages (Abruf 27.10.2026).
// Fehlt eine Sprache, zeigt die App Englisch.
const VERANTWORTLICH = { de: "Verantwortlich: wird vor dem Pilotstart ergänzt (Name und Anschrift).", en: "Controller: will be added before the pilot starts (name and address)." };
export const DATENSCHUTZ = {
  de: { titel: "Datenschutz", stand: "Entwurf, Stand 27.10.2026", abschnitte: [
    ["Kurz gesagt", "Deine Daten bleiben auf diesem Handy. GastroCash hat keinen eigenen Server und sieht deine Zahlen nicht."],
    ["Was gespeichert wird", "Laden-Name, Gerichte, Preise, Rezepte, Einkäufe, Umsätze, Müll, Kühl- und Putzlisten, Namen von Mitarbeitern (wenn du sie einträgst) und Fotos von Karte und Belegen – nur im Speicher dieses Handys. Schütze das Büro mit einem Büro-Code."],
    ["Zeki und deine Fragen", "Was du Zeki fragst und wie du in der Führung antwortest, speichert die App auf diesem Handy (höchstens 1.000 Einträge), damit Zeki später besser helfen kann. Nichts wird verschickt. Du kannst den Verlauf hier löschen."],
    ["Face ID / Fingerabdruck", "Die App nutzt die Entsperrung deines Handys. Gesicht oder Finger bleiben im Handy, die App bekommt nur ein „Ja“."],
    ["Fotos", "Karte und Belege werden auf dem Handy gelesen, nicht hochgeladen. Vom Beleg bleiben nur Artikel, Mengen, Preise, Händler und Datum."],
    ["Wenn du etwas verschickst", "Sicherungen, Listen für Amt, Steuerberater und Buchhalter und E-Mails verschickst du selbst – über dein Handy oder dein Mail-Programm. Dann gelten die Regeln des Dienstes, den du wählst. Sicherungen kannst du mit Passwort verschlüsseln."],
    ["Hosting", "Die App kommt über GitHub Pages (GitHub, Inc., USA). Beim Laden speichert GitHub laut eigener Angabe die IP-Adresse aus Sicherheitsgründen. Danach läuft die App offline."],
    ["Keine Cookies, kein Tracking", "Die App setzt keine Werbe- oder Analyse-Cookies."],
    ["Deine Rechte", "Du kannst jederzeit alles löschen: Einstellungen → „Alles löschen“. Beschweren kannst du dich bei einer Datenschutz-Aufsichtsbehörde, in Baden-Württemberg beim LfDI (baden-wuerttemberg.datenschutz.de)."],
  ], verantwortlich: VERANTWORTLICH.de, zekiLoeschen: "Zeki-Verlauf löschen", zekiGeloescht: "Zeki-Verlauf gelöscht", zekiLeer: "Kein Zeki-Verlauf gespeichert" },
  en: { titel: "Privacy", stand: "Draft, as of 27 Oct 2026", abschnitte: [
    ["In short", "Your data stays on this phone. GastroCash has no server of its own and does not see your numbers."],
    ["What is stored", "Shop name, dishes, prices, recipes, purchases, sales, waste, cooling and cleaning lists, staff names (if you enter them) and photos of menu and receipts – only in this phone's storage. Protect the office with an office code."],
    ["Zeki and your questions", "What you ask Zeki and how you answer in the tour is stored on this phone (at most 1,000 entries) so Zeki can help you better later. Nothing is sent. You can delete the history here."],
    ["Face ID / fingerprint", "The app uses your phone's unlock. Face or finger stay in the phone; the app only gets a “yes”."],
    ["Photos", "Menu and receipts are read on the phone, not uploaded. From a receipt only items, quantities, prices, supplier and date are kept."],
    ["When you send something", "Backups, lists for authorities, tax adviser and bookkeeper, and emails are sent by you – via your phone or your mail app. The rules of the service you choose then apply. Backups can be encrypted with a password."],
    ["Hosting", "The app is delivered via GitHub Pages (GitHub, Inc., USA). According to GitHub, the IP address is logged for security purposes when loading. After that the app runs offline."],
    ["No cookies, no tracking", "The app sets no advertising or analytics cookies."],
    ["Your rights", "You can delete everything at any time: Settings → “Delete everything”. You can complain to a data protection authority; in Baden-Württemberg the LfDI (baden-wuerttemberg.datenschutz.de)."],
  ], verantwortlich: VERANTWORTLICH.en, zekiLoeschen: "Delete Zeki history", zekiGeloescht: "Zeki history deleted", zekiLeer: "No Zeki history stored" },
};
export const datenschutzText = (sprache) => DATENSCHUTZ[sprache] || DATENSCHUTZ.en;
