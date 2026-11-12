// Quelltext-Wächter, Teil 2. KEINE Testdatei: sie exportiert nur eine Liste, die ein gemeinsamer Wächter später abarbeitet.
// Jeder Eintrag: { name, dateien: [Dateien ODER Ordner], muss: /regex/ } oder { name, dateien, darfNicht: /regex/ }.
// Der Wächter liest alle Dateien unter `dateien` zusammen, damit ein Umzug von Code (z. B. js/app.js -> js/bedienung/) nichts rot macht.

const VERBOTENE_WOERTER = /revolutionär|disruptiv|marktführer|gobd-konform|betriebsprüfungsfest|steuersicher|rechtssicher/i;

export const WAECHTER = [
  // Verbotene Wörter (Projektregel) in den Dateien der Lieferanten-, Bestand-, Haltbarkeits-/Aktions- und Verkaufs-Bereiche und in allen Sprachtabellen.
  // (hinweis.js und hinweis_motor.js führen die Wörter bewusst als Sperrliste und sind darum nicht dabei.)
  { name: "Keine verbotenen Wörter in Lieferanten, Bestand, Aktionen, Beleg, Verkauf und Sprachtabellen",
    dateien: ["js/lieferant.js", "js/bestand.js", "js/haltbar.js", "js/deal.js", "js/verkauf.js", "js/screens/lieferanten.js", "js/screens/bestand.js", "js/screens/aktionen.js", "js/screens/beleg.js", "js/screens/verkauf.js", "js/lang"],
    darfNicht: VERBOTENE_WOERTER },

  // Verdrahtung ohne Browser-Test: beim Betreten des Lieferanten-Bildschirms wird dessen Zustand zurückgesetzt.
  { name: "Lieferanten-Bildschirm wird beim Betreten zurückgesetzt", dateien: ["js/app.js", "js/bedienung"], muss: /lieferantenZuruecksetzen/ },

  // Rettungscode: das Blatt „Code vergessen?“ nutzt die zentrale Regel aus rettung.js (kein Browser-Test für diese Verdrahtung).
  { name: "Zeki-Blatt (ebene.js) fragt rettungErlaubt aus rettung.js", dateien: ["js/screens"], muss: /rettungErlaubt\(/ },

  // Rundgang: Station 12 zeigt „Senden“ nur und löst es nie aus (Overlay braucht den Browser).
  { name: "Rundgang Station 12: nur zeigen, nie auslösen", dateien: ["js/screens/rundgang.js"], muss: /nurZeigen: true, umschlag: true/ },
  // Kommentare mit „//“ sind ausgenommen: die Zeile darf DATEV nur hinter einem „/“ nennen.
  { name: "Kein DATEV im Rundgang (außer in Kommentaren)", dateien: ["js/screens/rundgang.js"], darfNicht: /^[^/\n]*DATEV/m },

  // Arabisch: Richtungs-Pfeile werden in RTL gespiegelt (Funktion, kein Aussehen). css-Ordner, damit eine Neuordnung nichts rot macht.
  { name: "RTL spiegelt Richtungs-Pfeile (svg.sym.richtung)", dateien: ["css"], muss: /\[dir="rtl"\][^{]*svg\.sym\.richtung/ },

  // Türkisch: Zeki-Blatt hat kein festes „OK“, der Knopf kommt aus der Sprachdatei.
  { name: "Zeki-Blatt ohne festes „OK“", dateien: ["js/screens/ebene.js"], darfNicht: />OK</ },
];
