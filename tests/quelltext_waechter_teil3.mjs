// Quelltext-Wächter (Teil 3). KEINE Testdatei – sie exportiert nur die Liste; ein Sammel-Test liest sie.
// Hier steht nur, was sich nicht als Verhalten prüfen lässt (Verbotenes, Verbindungen, Regeln für die Gestaltung als Regel – nicht als Aussehen).
// Jeder Eintrag: { name, dateien: [Datei oder Ordner, …], muss: /regex/ } oder { …, darfNicht: /regex/ }.
// Ordner zählen mit allen Dateien darunter zusammen. Aussehen (Farben, Maße, Klassen im CSS) wird hier bewusst NICHT festgeschrieben.

const VERBOTENE_WOERTER = /revolution(ä|ae)r|disruptiv|marktf(ü|ue)hrer|gobd-konform|betriebspr(ü|ue)fungsfest|steuersicher|rechtssicher/i;

export const WAECHTER = [
  // aus tafel.test.mjs: „Keine verbotenen Wörter in den neuen Dateien“ (Projektregel: verbotene Wörter)
  { name: "Menütafel: keine verbotenen Wörter", dateien: ["js/tafel.js", "js/screens/tafel.js", "js/bedienung", "js/lang"], darfNicht: VERBOTENE_WOERTER },
  // aus aktion_plan.test.mjs: dieselbe Regel für Aktionsplanung
  { name: "Aktionsplanung: keine verbotenen Wörter", dateien: ["js/aktion_plan.js", "js/screens/aktionen.js", "js/tafel.js", "js/bedienung", "js/lang"], darfNicht: VERBOTENE_WOERTER },
  // aus aktion_plan.test.mjs: Laufzeit einer Aktion ist immer variabel (Vorgabe des Eigentümers 18.10.2026), keine feste Konstante mehr
  { name: "Aktion: keine feste Laufzeit (KOMBI_LAUFZEIT_TAGE)", dateien: ["js/tafel.js"], darfNicht: /KOMBI_LAUFZEIT_TAGE/ },
  // aus gastrocash-brand.test.mjs: Markenpaket nutzt nur lokale Dateien, respektiert reduzierte Bewegung
  { name: "CSS: keine Fremdadressen und kein @import", dateien: ["css"], darfNicht: /@import|https?:\/\/(?!www\.w3\.org\/)/ },
  { name: "CSS: reduzierte Bewegung wird beachtet", dateien: ["css"], muss: /prefers-reduced-motion/ },
  { name: "index.html lädt das alte Marken-CSS nicht", dateien: ["index.html"], darfNicht: /css\/gastrocash-brand\.css/ },
  // aus gastrocash-brand.test.mjs: der Küchenhelfer sitzt in Navigation, Hilfe und Tagesabschluss
  { name: "Navigation zeigt den Küchenhelfer", dateien: ["js/screens", "js/bedienung"], muss: /mascotMarkup/ },
  { name: "Hilfe hat den Küchenhelfer", dateien: ["js/screens", "js/bedienung"], muss: /gc-help-bot/ },
  { name: "Tagesabschluss hat Küchenhelfer und wählt seinen Zustand nach der Lage", dateien: ["js/screens", "js/bedienung"], muss: /(?=[\s\S]*gc-ab-mascot)(?=[\s\S]*mascotResultState)/ },
  // aus u.test.mjs: Schrift wächst mit der Handy-Einstellung – keine festen px bei font-size/font/line-height
  { name: "CSS: keine festen px-Schriftgrößen", dateien: ["css"], darfNicht: /(?<![-\w])(?:font-size|font|line-height)\s*:\s*[^;}\n]*(?<![\w.])\d+(?:\.\d+)?px/ },
];
