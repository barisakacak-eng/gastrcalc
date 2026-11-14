// Quelltext-Wächter: die EINE Datei, die Quelltext liest statt Verhalten zu prüfen.
// Hier steht nur, was sich in Node nicht als Verhalten prüfen lässt: Verdrahtung in der Bedienschicht ohne Browser-Test,
// Verbote (Wörter, Fremdadressen) und wenige Regeln fürs CSS. Alle anderen Tests importieren Module und prüfen Ergebnisse.
// Eintrag: { name, dateien: [Datei oder Ordner, …], muss: /regex/ } oder { …, darfNicht: /regex/ }.
// Ordner zählen mit allen Dateien darunter zusammen; fehlende Pfade (z. B. js/bedienung vor dem Zerlegen) werden übersprungen.
// So macht ein Umzug von Code zwischen den genannten Dateien nichts rot. Wird dieser Test rot, ist entweder die Regel verletzt
// oder der Code ist an einen Ort gezogen, den der Eintrag nicht nennt – dann den Eintrag anpassen, nicht die Regel streichen.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function lesen(p) {
  const voll = path.join(WURZEL, p); if (!fs.existsSync(voll)) return "";
  if (fs.statSync(voll).isFile()) return fs.readFileSync(voll, "utf8");
  return fs.readdirSync(voll).sort().map((e) => { const u = path.join(p, e); return fs.statSync(path.join(WURZEL, u)).isDirectory() || /\.(js|mjs|css|html)$/.test(e) ? lesen(u) : ""; }).join("\n");
}

// ───── Teil 1 ─────
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

const TEIL1 = [
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

// ───── Teil 2 ─────
const VERBOTEN2 = /revolutionär|disruptiv|marktführer|gobd-konform|betriebsprüfungsfest|steuersicher|rechtssicher/i;

const TEIL2 = [
  // Verbotene Wörter (Projektregel) in den Dateien der Lieferanten-, Bestand-, Haltbarkeits-/Aktions- und Verkaufs-Bereiche und in allen Sprachtabellen.
  // (hinweis.js und hinweis_motor.js führen die Wörter bewusst als Sperrliste und sind darum nicht dabei.)
  { name: "Keine verbotenen Wörter in Lieferanten, Bestand, Aktionen, Beleg, Verkauf und Sprachtabellen",
    dateien: ["js/lieferant.js", "js/bestand.js", "js/haltbar.js", "js/deal.js", "js/verkauf.js", "js/screens/lieferanten.js", "js/screens/bestand.js", "js/screens/aktionen.js", "js/screens/beleg.js", "js/screens/verkauf.js", "js/lang"],
    darfNicht: VERBOTEN2 },

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

// ───── Teil 3 ─────
const VERBOTEN3 = /revolution(ä|ae)r|disruptiv|marktf(ü|ue)hrer|gobd-konform|betriebspr(ü|ue)fungsfest|steuersicher|rechtssicher/i;

const TEIL3 = [
  // aus tafel.test.mjs: „Keine verbotenen Wörter in den neuen Dateien“ (Projektregel: verbotene Wörter)
  { name: "Menütafel: keine verbotenen Wörter", dateien: ["js/tafel.js", "js/screens/tafel.js", "js/bedienung", "js/lang"], darfNicht: VERBOTEN3 },
  // aus aktion_plan.test.mjs: dieselbe Regel für Aktionsplanung
  { name: "Aktionsplanung: keine verbotenen Wörter", dateien: ["js/aktion_plan.js", "js/screens/aktionen.js", "js/tafel.js", "js/bedienung", "js/lang"], darfNicht: VERBOTEN3 },
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


// ───── Teil 4 (Lauf 6, Etappe 4): Zeit und Geld aus je einer Quelle ─────
// Alle Dateien unter js/ außer den genannten Ausnahmen (Orte als Einzeldateien, damit der Wächter je Ausnahme begründet bleibt).
function jsOhne(...ausnahmen) {
  const out = []; const gehe = (rel) => { for (const e of fs.readdirSync(path.join(WURZEL, rel)).sort()) { const u = rel + "/" + e; if (fs.statSync(path.join(WURZEL, u)).isDirectory()) gehe(u); else if (e.endsWith(".js") && !ausnahmen.includes(u)) out.push(u); } };
  gehe("js"); return out;
}
const TEIL4 = [
  // Ausnahme: js/zeit.js selbst (dort steht die Erklärzeile, warum das Muster verboten ist)
  { name: "Zeit: toISOString().slice(0, 10) nur in js/zeit.js (Erklärzeile) – das ist der Tag in UTC", dateien: jsOhne("js/zeit.js"), darfNicht: /toISOString\(\)\.slice\(0, ?10\)/ },
  // Ausnahme: js/zeit.js – die einzige Definition. Weiterreichen (export { wochentag }, export const tagPlus = plusTage) ist keine Definition.
  { name: "Zeit: tageZwischen, plusTage und wochentag sind nur in js/zeit.js definiert", dateien: jsOhne("js/zeit.js"), darfNicht: /(?:const|let|var|function)\s+(?:tageZwischen|plusTage|wochentag|tagMinus|minusTage|naechsterTag)\b/ },
  // Ausnahme: js/geld.js – dort steht die eine Rundung (cent/rund2). Gerundet auf 1, 3 oder 4 Stellen (Math.round(x * 1000) / 1000) ist erlaubt und wird hier nicht gesucht.
  { name: "Geld: kein Math.round(… * 100) / 100 außerhalb js/geld.js – die eine Rundung heißt rund2", dateien: jsOhne("js/geld.js"), darfNicht: /Math\.round\((?:[^()]|\([^()]*\))*\*\s*100\)\s*\/\s*100(?!\d)/ },
  // Ausnahmen: js/data/regelwerk.js (dort stehen die Sätze), js/data/richtpreise.js und js/data/richtpreise_nachtrag.js (Preise und Spannen in Euro, die zufällig 0,19 oder 0,07 € heißen),
  // die Zeile mit AMPEL_GRENZEN in js/engine.js (Gewinn-Ampel „Grün ab 19 % Gewinn“ – kein Steuersatz) und Kommentarzeilen. Gesucht wird auch 1,19 / 1,07 (Bruttofaktor).
  { name: "Geld: kein Steuersatz-Literal 0.19 / 0.07 (auch 1.19 / 1.07, mit Komma) außerhalb js/data/regelwerk.js – Sätze kommen aus geld.mwst", dateien: jsOhne("js/data/regelwerk.js", "js/data/richtpreise.js", "js/data/richtpreise_nachtrag.js"), darfNicht: /^(?!\s*\/\/)(?!.*AMPEL_GRENZEN).*?(?<![\d.,])[01][.,](?:19|07)(?!\d)/m },
];

// ───── Teil 5 (Lauf 6, Etappe 5): Bedienschicht – Verdrahtung, die nur im Browser (tests/doppeltipp_browser.py, tests/echt_browser.py) als Verhalten prüfbar ist ─────
const TEIL5 = [
  { name: "A Doppeltipp: aufKlick belegt vor jeder Aktion die Sperre (aktionsSperre) und gibt sie im finally wieder frei", dateien: APP, muss: /AKTIONS_SPERRE\.belegen\([\s\S]*?finally \{ AKTIONS_SPERRE\.freigeben/ },
  { name: "A Doppeltipp: der Tagesabschluss prüft, ob der Geschäftstag schon einen aktiven Abschluss hat (tagSchonAbgeschlossen)", dateien: ["js/screens/abschluss.js"], muss: /tagSchonAbgeschlossen\(stand, H\)/ },
  { name: "B Tageswechsel: visibilitychange (sichtbar) ruft tagPruefen", dateien: APP, muss: /ereignisAnzahl \+= 1; tagPruefen\(\);/ },
  { name: "B Tageswechsel: ein Minuten-Takt ruft tagPruefen", dateien: APP, muss: /setInterval\(tagPruefen, 60e3\)/ },
  { name: "B Tageswechsel: zeichne() merkt sich den gezeichneten Tag (gezeichneterTag = tagStand())", dateien: APP, muss: /gezeichneterTag = tagStand\(\)/ },
  { name: "C Speicher: der Dauerspeicher gilt nur bei „Ja“ als gefragt (persistGefragt nur mit ok === true)", dateien: APP, muss: /ok === true[^\n]*persistGefragt = true/ },
  { name: "C Speicher: persistGefragt wird nie vor dem Ergebnis gesetzt", dateien: APP, darfNicht: /persistGefragt = true; speichern\(wurzel\);\s*speicherDauerhaftPruefen/ },
  { name: "C Speicher: das Fehler-Banner wird nach erfolgreichem Schreiben zurückgesetzt (problemNachErfolg) und kennt „Speicher voll“ (speicherProblemArt)", dateien: APP, muss: /problemNachErfolg\((?:Z\.)?speicherProblem\)[\s\S]*speicherProblemArt\(art, fehler\)/ },
  { name: "C Speicher: der Satz „Speicher voll …“ kommt aus js/data/l6z_texte.js", dateien: APP, muss: /l6z\(aktuelleSprache\(\), "speicherVoll"\)/ },
  { name: "E Echte App = Test-App: kein Bildschirm greift auf das Debug-Objekt __gastrocalc zu (das gibt es nur auf localhost)", dateien: ["js/screens"], darfNicht: /__gastrocalc/ },
  { name: "E Echte App = Test-App: app.js reicht die Wurzel an die Schritte der Einrichtung durch (s.view(stand, wurzel))", dateien: APP, muss: /s\.view\((?:Z\.)?stand, (?:Z\.)?wurzel\)/ },
  { name: "F Personal-Modus: app.js weist Aktionen über personalGesperrt ab (Positivliste in js/modus.js)", dateien: APP, muss: /modus\((?:Z\.)?wurzel\) === "personal" && personalGesperrt\(/ },
  { name: "G Büro-Code: das Schloss-Blatt kennt die harte Sperre nach 10 Fehlversuchen (hartGesperrt)", dateien: ["js/screens/ebene.js"], muss: /hartGesperrt\(pin\.wurzel\)/ },
  { name: "G Büro-Code: der Rettungscode rechnet nur mit der Uhr (sperreRestUhr), damit er bei der harten Sperre offen bleibt", dateien: ["js/rettung.js"], muss: /sperreRestUhr\(wurzel, jetzt\)/ },
  { name: "H Einrahmen: index.html lädt js/rahmen.js VOR js/app.js", dateien: ["index.html"], muss: /js\/rahmen\.js[\s\S]*js\/app\.js/ },
  { name: "H Einrahmen: .htaccess enthält frame-ancestors", dateien: [".htaccess"], muss: /frame-ancestors/ },
];

// ───── Teil 6 (Lauf 6, E5-Draht): Verdrahtung der neuen Fähigkeiten des Rechenwerks ─────
const TEIL6 = [
  { name: "Bedienschicht ruft vormonatEinfrierenWennNoetig (beim Start und beim Tageswechsel)", dateien: APP, muss: /(?=[\s\S]*vormonatEinfrierenWennNoetig\(b, H\))(?=[\s\S]*vormonatEinfrieren\(\);\n  zeichne\(\);)(?=[\s\S]*async function startNachLaden[\s\S]*vormonatEinfrieren\(\);)/ },
  { name: "Einlesen: sicherungUebernehmen nutzt einlesenSicher (Rückholpunkt), nicht zusammenfuehren", dateien: APP, muss: /await einlesenSicher\((?:Z\.)?wurzel, importiert\)/, darfNicht: /zusammenfuehren\((?:Z\.)?wurzel/ },
  { name: "Einlesen: Fehlergründe „neuer“ und „gross“ melden die Sätze aus l6y_texte.js", dateien: APP, muss: /l6yText\("neuer"[\s\S]*l6ySatz\("zuGross"/ },
  { name: "Einlesen: „Einlesen rückgängig machen“ ruft zurueckholen(wurzel) und arbeitet mit der zurückgegebenen Wurzel weiter", dateien: APP, muss: /await zurueckholen\((?:Z\.)?wurzel\)[\s\S]{0,400}(?:Z\.)?wurzel = r\.wurzel/ },
  { name: "Ablage: Schreibfehler der Ablage zeigen das Banner mit dem Fehler („Speicher voll“ über ablageVoll)", dateien: APP, muss: /beiAblageFehler\(\(art, fehler\) => speicherFehlerZeigen\(art \|\| "ablage", fehler\)\)[\s\S]*art === "voll" \|\| art === "ablageVoll"|art === "voll" \|\| art === "ablageVoll"[\s\S]*beiAblageFehler\(\(art, fehler\)/ },
];

// ───── Teil 8 (Etappe 8) ─────
const TEIL8 = [
  { name: "Einlesen: die sichtbare Sprache bleibt (Zusammenführen und Ersetzen)", dateien: ["js/bedienung/sicherung.js"], muss: /sprache \|\|= aktuelleSprache\(\)[\s\S]*spracheVorher/ },
  { name: "Fremdes Update: auch in der Einrichtung wird neu geladen, sobald kein Feld offen ist", dateien: ["js/bedienung/update.js"], muss: /einrichtung \? \(blattOffen\(\)/ },
];
const WAECHTER = [...TEIL1, ...TEIL2, ...TEIL3, ...TEIL4, ...TEIL5, ...TEIL6, ...TEIL8];
test("Quelltext-Wächter: jeder Eintrag nennt mindestens einen Ort, den es gibt", () => {
  for (const w of WAECHTER) assert.ok(w.dateien.some((d) => fs.existsSync(path.join(WURZEL, d))), w.name + ": keiner der Orte existiert (" + w.dateien.join(", ") + ")");
});
for (const w of WAECHTER) test("Quelltext-Wächter: " + w.name, () => {
  const text = w.dateien.map(lesen).join("\n");
  if (w.muss) assert.match(text, w.muss, "fehlt in " + w.dateien.join(", "));
  if (w.darfNicht) { const m = text.match(w.darfNicht); assert.equal(m, null, "verboten in " + w.dateien.join(", ") + ": " + (m && m[0])); }
});

// ───── Teil 7: der Browser bleibt am Rand ─────
// Diese Rechenwerk-Module greifen nicht selbst auf document, window, localStorage, sessionStorage, navigator oder location zu –
// das geht über js/adapter/. Erlaubt sind js/app.js, js/rahmen.js, js/bedienung/ und js/screens/ (dort ist die Anzeige und Bedienung zu Hause);
// sie stehen hier nicht. Kommentare zählen nicht. `ausser`: Textstücke, die vor der Prüfung entfernt werden – jede Ausnahme mit Grund.
const BROWSER = /\b(document|window|localStorage|sessionStorage|navigator|location)\b/;
const ohneKommentare = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
const RAND = [
  { datei: "js/ablage.js" }, { datei: "js/auswertung.js" }, { datei: "js/modus.js" }, { datei: "js/schloss_bio.js" },
  { datei: "js/gastrocash-brand.js" }, { datei: "js/i18n.js" }, { datei: "js/store.js" },
  // Ausnahme tafel.js: SKRIPT ist Text für die fertige Tafel-Datei (läuft im Browser des Fernsehers), kein Zugriff der App.
  { datei: "js/tafel.js", ausser: [/const SKRIPT = [\s\S]*?`;\n/] },
];
for (const r of RAND) test("Rand zum Browser: " + r.datei + " greift nicht selbst auf document, window, localStorage, navigator, location zu", () => {
  let text = ohneKommentare(lesen(r.datei));
  for (const a of r.ausser || []) text = text.replace(a, "");
  const m = text.match(BROWSER);
  assert.equal(m, null, r.datei + ": Browser-Zugriff gehört nach js/adapter/ – " + (m && text.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\n/g, " ")));
});
