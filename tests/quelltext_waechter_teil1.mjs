// Quelltext-Wächter (Teil 1): Verdrahtung in js/app.js (später auch js/bedienung/*.js), die sich in Node nicht ausführen lässt
// und für die es keinen Browser-Test gibt. KEINE Testdatei: sie exportiert nur die Liste WAECHTER.
// Eintrag: { name, dateien: [Datei oder Ordner, ...], muss: /regex/ } oder { ..., darfNicht: /regex/ }.
// Der Wächter liest alle .js-Dateien unter „dateien“ zusammen, damit ein Umzug von Code nach js/bedienung/ nichts rot macht.
import fs from "node:fs";

const APP = ["js/app.js", "js/bedienung"];

// Alle *Zuruecksetzen-Exporte aus js/screens müssen in app.js (Liste ZURUECKSETZER) vorkommen: Import plus Eintrag = mindestens zwei Treffer.
const zuruecksetzer = [];
try {
  const dir = new URL("../js/screens/", import.meta.url);
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".js")) continue;
    for (const m of fs.readFileSync(new URL(f, dir), "utf8").matchAll(/export (?:function|const) (\w+Zuruecksetzen)\b/g)) {
      zuruecksetzer.push({ name: `Ladenwechsel: ${m[1]} (${f}) steht in der Zurücksetzer-Liste`, dateien: APP, muss: new RegExp(`\\b${m[1]}\\b[\\s\\S]*\\b${m[1]}\\b`) });
    }
  }
} catch { /* ohne Ordner keine dynamischen Wächter */ }

export const WAECHTER = [
  { name: "Teilen allein zählt nicht als Sicherung: letzteSicherung wird in der Bedienung nie direkt gesetzt (nur über sicherungOrtSetzen)", dateien: APP, darfNicht: /letzteSicherung\s*=[^=]/ },
  { name: "Teilen allein zählt nicht als Sicherung: sicherungZaehler wird in der Bedienung nie direkt gesetzt", dateien: APP, darfNicht: /sicherungZaehler\s*=[^=]/ },
  { name: "Sicherung: „Ohne Fotos“ (mitAblage) wird an exportDatei durchgereicht", dateien: APP, muss: /exportDatei\([^)]*mitAblage/ },
  { name: "Sicherung: der Schalter „Ohne Fotos“ (ohneFotos) bestimmt mitAblage beim Teilen", dateien: APP, muss: /mitAblage[^\n]*ohneFotos/ },
  { name: "Putzplan: Vorschlag nach Laden-Art wird beim Betreten nur im Laden-Modus übernommen (planSicherstellen)", dateien: APP, muss: /putzplan[^\n]*laden[^\n]*planSicherstellen|planSicherstellen[^\n]*putzplan[^\n]*laden/ },
  { name: "Heute: Zeki spricht oben rechts mit allen Lagen (ZEKI_BILDSCHIRM nur für andere Bildschirme als start)", dateien: APP, muss: /["']start["'][^\n]*ZEKI_BILDSCHIRM/ },
  { name: "Update: controllerchange wird behandelt", dateien: APP, muss: /controllerchange/ },
  { name: "Update: fremde Fassung wird erst übernommen, wenn kein Formular offen ist (fremdeFassungUebernehmen, formularOffen)", dateien: APP, muss: /fremdeFassungUebernehmen[\s\S]*formularOffen|formularOffen[\s\S]*fremdeFassungUebernehmen/ },
  { name: "Update: erster Wechsel beim allerersten Besuch lädt nicht neu (ersteUebernahme)", dateien: APP, muss: /ersteUebernahme/ },
  { name: "Zwei Fenster: der Ereignis-Name FREMDER_STAND wird abgehört", dateien: APP, muss: /addEventListener\(\s*FREMDER_STAND/ },
  { name: "Ladenwechsel: bei anderem Laden werden alle Bildschirm-Zustände zurückgesetzt (alleZuruecksetzen)", dateien: APP, muss: /alleZuruecksetzen/ },
  { name: "Preis-Blatt: app.js tauscht die ganze Hülle .kl-bleibt-teil aus", dateien: APP, muss: /kl-bleibt-teil/ },
  ...zuruecksetzer,
];
