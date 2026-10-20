// Trennung (17.10.2026), Teil 1: innen Uhrwerk (Rechenwerk js/*.js), außen nur Anzeige (js/screens/*.js).
// Geprüft wird: (1) keine Bildschirm-Datei schreibt selbst in Journale oder Stammdaten (statische Suche), (2) Anzeigen schreibt nie
// (alle Ansichten auf einem vollen Beispiel-Laden zeichnen, der Stand bleibt Byte für Byte gleich), (3) monatsZiel und Sicherungsstufe
// kommen aus dem Rechenwerk, kein Rechenwerk-Modul hängt an einem Bildschirm, (4) zusammengeführte und entfernte Bausteine,
// (5) der neue Büro-Bildschirm „Ware nach Kühl-Abweichung“ (wegwerfen wie der Rundgang, behalten nur mit Begründung, Personal gesperrt).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HIER = path.dirname(fileURLToPath(import.meta.url));
const JS = path.join(HIER, "..", "js");
const SCREENS = path.join(JS, "screens");
const lies = (p) => fs.readFileSync(p, "utf8");
const i18n = await import("../js/i18n.js");
i18n.setzeSprache("de");

// ---------- (1) statische Suche ----------
// Kommentare weg (Block und Zeile), damit erklärender Text nicht zählt.
const ohneKommentar = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map((l) => l.replace(/(^|[\s;,)}{])\/\/.*$/, "$1")).join("\n");
// a.b = …, a[x] = …, a.b += …, a.b++ (nicht ==, ===, =>)
const ZUWEISUNG = /(?<![\w$.])([A-Za-z_$][\w$]*)((?:\??\.[A-Za-z_$][\w$]*|\[[^\]\n]+\])+)\s*(=(?![=>])|\+=|-=|\*=|\/=|\?\?=|\|\|=|&&=|\+\+|--)/g;
// a.push( … ), a.b.splice( … ) usw. – verändert die Liste an Ort und Stelle
const VERAENDERT = /(?<![\w$.])([A-Za-z_$][\w$]*)((?:\??\.[A-Za-z_$][\w$]*|\[[^\]\n]+\])*)\.(push|splice|unshift|pop|shift|sort|reverse|fill)\(/g;
const LOESCHT = /\bdelete\s+([A-Za-z_$][\w$]*)/g;
const ZUSAMMEN = /Object\.assign\(\s*([A-Za-z_$][\w$]*)/g;

// Ausnahmeliste: Wurzel-Namen, die in dieser Datei KEINE Laden-Daten sind – flüchtiger Bildschirmzustand (Modulvariablen),
// lokal gebaute Listen/Objekte oder DOM-Knoten. stand, wurzel, Gerichte, Artikel, Kühlstellen, Journal-Einträge stehen hier nie.
const AUSNAHMEN = {
  "bausteine.js": { a: "DOM: Download-Link beim Teilen" },
  "beleg.js": { zuweisung: "Entwurf Kostenbeleg (Modulzustand)",
    hbEntwurf: "Entwurf Haltbarkeit (Modulzustand)", angaben: "lokales Objekt für haltbarSetzen", zeilen: "gelesene Belegzeilen (Modulzustand)", zuordnung: "Auswahl je Zeile (Modulzustand)", genommen: "lokale Liste für lieferungAnlegen" },
  "bestand.js": { z: "lokale Liste von Hinweis-Sätzen", entwurf: "Entwurf Mindestbestand (Modulzustand)" },
  "buero.js": { offen: "lokale Liste der Büro-Chips" },
  "ebene.js": { huelle: "DOM", h: "DOM", m: "DOM", k: "DOM", feld: "DOM", pin: "PIN-Blatt (Modulzustand)", p: "PIN-Blatt (Modulzustand)", pw: "Passwort-Blatt (Modulzustand)" },
  "foto.js": { warteschlange: "Foto-Warteschlange (Modulzustand)", serie: "Zähler der Serie (Modulzustand)", mein: "laufendes Foto (Modulzustand lauf)", laufUploads: "Merkliste dieser Prüfliste (Modulzustand)",
    v: "Vorschlag der Prüfliste (flüchtig, erst „Übernehmen“ schreibt)", vorschlaege: "Prüfliste (Modulzustand)" },
  "karte.js": { waage: "Waage-Check (Modulzustand)" },
  "karte_laden.js": { blatt: "Preis-Blatt-Entwurf (Modulzustand)" },
  "kuehl.js": { tage: "lokale Liste der Tage", f: "offenes Stations-Formular (Modulzustand form)", form: "offenes Stations-Formular (Modulzustand)" },
  "muell.js": { out: "lokale Liste", ziel: "DOM", p: "DOM", w: "DOM", wahl: "Auswahl vor dem Tipp (Modulzustand)", ids: "lokale Liste der neuen Einträge" },
  "ordner.js": { f: "DOM (Druckrahmen)", amtZeit: "Zeitraum-Wahl (Modulzustand)", paketMonat: "Monats-Wahl (Modulzustand)", belDatum: "Datums-Entwürfe (Modulzustand)" },
  "personal.js": { alle: "Schicht-Person im Gerätespeicher (localStorage, nicht im Laden)", gemerkt: "Ersatz für den Gerätespeicher" },
  "putzplan.js": { entwurf: "Entwurf Putzplan (Modulzustand)" },
  "umsatz.js": { out: "lokale Liste", tage: "lokale Liste" },
  "verkauf.js": { zeilen: "lokale Liste von Sätzen", entwurf: "Entwurf Handeingabe (Modulzustand)" },
};
const NIE = new Set(["stand", "wurzel", "s", "b", "g", "e", "x", "l", "r", "k", "eintrag", "u"]); // diese Namen sind in den Bildschirmen Laden-Daten – erlaubt nur, wenn sie dort ein DOM-Knoten sind

function schreibstellen(datei) {
  const src = ohneKommentar(lies(path.join(SCREENS, datei)));
  const out = [];
  src.split("\n").forEach((zeile, i) => {
    for (const re of [ZUWEISUNG, VERAENDERT, LOESCHT, ZUSAMMEN]) { re.lastIndex = 0; let m; while ((m = re.exec(zeile))) out.push({ zeile: i + 1, wurzel: m[1], text: m[0].slice(0, 70) }); }
  });
  return out;
}

test("Trennung: keine Datei in js/screens/ schreibt direkt in Journale oder Stammdaten", () => {
  const fehler = [];
  for (const f of fs.readdirSync(SCREENS).filter((x) => x.endsWith(".js"))) {
    const erlaubt = AUSNAHMEN[f] || {};
    for (const s of schreibstellen(f)) if (!erlaubt[s.wurzel] || (NIE.has(s.wurzel) && !/^DOM/.test(erlaubt[s.wurzel]))) fehler.push(`${f}:${s.zeile} ${s.text}`);
  }
  assert.deepEqual(fehler, [], "Schreibvorgänge gehören ins Rechenwerk (js/stamm.js, js/karte_daten.js, engine.js …):\n" + fehler.join("\n"));
});

test("Trennung: kein Bildschirm schreibt über stand, wurzel oder Object.assign auf Laden-Daten", () => {
  for (const f of fs.readdirSync(SCREENS).filter((x) => x.endsWith(".js"))) {
    const src = ohneKommentar(lies(path.join(SCREENS, f)));
    assert.ok(!/(?<![\w$.])(stand|wurzel)(\??\.[\w$]+|\[[^\]\n]+\])+\s*(=(?![=>])|\+=|-=|\?\?=|\|\|=)/.test(src), f + ": Zuweisung an stand/wurzel");
    assert.ok(!/(?<![\w$.])(stand|wurzel)(\??\.[\w$]+)*\.(push|splice|unshift|pop|shift|sort|reverse)\(/.test(src), f + ": Liste von stand/wurzel verändert");
    assert.ok(!/delete\s+(stand|wurzel)\b/.test(src), f + ": delete auf stand/wurzel");
    assert.ok(!/Object\.assign\(\s*(stand|wurzel)\b/.test(src), f + ": Object.assign auf stand/wurzel");
  }
});

test("Trennung: die Ausnahmeliste ist begründet und nicht größer als nötig", () => {
  for (const [f, liste] of Object.entries(AUSNAHMEN)) {
    assert.ok(fs.existsSync(path.join(SCREENS, f)), f);
    const benutzt = new Set(schreibstellen(f).map((s) => s.wurzel));
    for (const [name, grund] of Object.entries(liste)) { assert.ok(grund.length > 2, `${f}: ${name} ohne Begründung`); assert.ok(benutzt.has(name), `${f}: Ausnahme „${name}“ wird nicht mehr gebraucht – streichen`); assert.ok(!["stand", "wurzel"].includes(name), name); }
  }
});

// ---------- (3) Rechenwerk hängt nicht an der Oberfläche ----------
test("Trennung: monatsZiel und Sicherungsstufe kommen aus dem Rechenwerk", async () => {
  const Z = await import("../js/zaehler.js"); const S = await import("../js/sicherung_stufe.js"); const O = await import("../js/offen.js");
  assert.equal(typeof Z.monatsZiel, "function"); assert.equal(typeof Z.wareneinsatzQuote, "function"); assert.equal(typeof Z.zaehlerVerlauf, "function");
  assert.equal(typeof S.sicherungStufe, "function"); assert.equal(typeof O.menueZaehler, "function"); assert.equal(typeof O.ladenPunkt, "function");
  const home = lies(path.join(SCREENS, "home.js")), nav = lies(path.join(SCREENS, "nav.js"));
  assert.ok(!/function monatsZiel|function wareneinsatzQuote|function zaehlerVerlauf/.test(home), "home.js rechnet nicht mehr selbst");
  // Trennung 2 (17.10.2026): home.js holt die Zielkarte aus js/laden_zahlen.js, das monatsZiel aus zaehler.js nutzt
  assert.match(home, /import \{[^}]*heuteZiel[^}]*\} from "\.\.\/laden_zahlen\.js"/);
  assert.match(lies(path.join(JS, "laden_zahlen.js")), /import \{[^}]*monatsZiel[^}]*\} from "\.\/zaehler\.js"/);
  assert.ok(!/function sicherungStufe|function menueZaehler|function ladenPunkt/.test(nav), "nav.js rechnet nicht mehr selbst");
  assert.match(lies(path.join(JS, "offen.js")), /import \{ sicherungStufe \} from "\.\/sicherung_stufe\.js"/);
  for (const f of ["ebene.js", "home.js", "nav.js"]) assert.ok(!/sicherungStufe[^\n]*from "\.\/nav\.js"/.test(lies(path.join(SCREENS, f))), f);
  // Gleiches Ergebnis wie vorher: frische Wurzel ohne Sicherung mit 5+ Einträgen → rot
  const st = await import("../js/store.js"); const w = st.leereWurzel(); const b = st.leererBetrieb(); w.betriebe.push(b);
  for (let i = 0; i < 5; i++) b.schwund.push({ id: "s" + i, datum: "2026-10-01", erfasst: "2026-10-01T10:00:00Z", art: "verderb", storniert: false });
  assert.equal(S.sicherungStufe(w).stufe, "rot"); assert.equal(S.sicherungStufe(null), null);
});

test("Trennung: kein Rechenwerk-Modul (js/*.js außer app.js) importiert aus js/screens/", () => {
  for (const f of fs.readdirSync(JS).filter((x) => x.endsWith(".js") && x !== "app.js")) assert.ok(!/from "\.\/screens\//.test(lies(path.join(JS, f))), f);
});

// Trennung 2 (17.10.2026): Rechenlogik aus Bauplan 5.2 A/B wohnt im Rechenwerk – in js/screens/ ist keine dieser Funktionen mehr definiert.
const VERSCHOBEN = {
  "anzeige_text.js": ["datumLesbar", "monatName", "tagLesbar", "zeitKurz", "eintragName", "eintragMenge", "gebindeSatz", "gebindeZeile", "gebindeName", "zahlText"],
  "bilder.js": ["fotoName", "piktoName", "gerichtBildQuelle", "wareBildQuelle", "NAME_FOTO", "BEREICH_FOTO", "PIKTO", "VERP", "WARE", "GETRAENK", "R_ALIAS", "fotoFuer"],
  "gerichte_vergleich.js": ["gerichteVergleich"], "personal.js": ["personalZahlen"],
  "laden_zahlen.js": ["heuteZiel", "heuteKachelZahlen", "abschlussHaken", "tagesBilanz", "heuteZielWerte", "heuteKachelWerte"],
  "zaehler.js": ["umsatzAnzeigeWert", "umsatzAusEingabe", "zaehlerStrecke", "monatTagStatus", "wochentagSpalte"],
  "engine.js": ["sachbezugWert", "schwundEintraege"], "muell.js": ["muellTonne", "muellSuche", "muellFormWerte"],
  "lieferung.js": ["preisAnzeige", "belegZeilenVorbereiten", "neuArtikelAngaben"], "beleg.js": ["belegKandidaten", "kandidaten", "belegIstLieferschein", "belegDatumVon", "belegPruefStand"],
  "kostenbeleg.js": ["kostenZuweisungVorschlag"], "inventur.js": ["inventurListe", "inventurSuche", "inventurKarte", "lagerortVonName", "lagerortVon"],
  "karte_lesen.js": ["kartePruefZahlen", "baukastenZutatenOhneVerpackung"], "deal.js": ["kombiTeileSortiert", "kombiAuswahlBereinigt", "ORDNUNG"],
  "ordner_text.js": ["ordnerKachelStand", "amtHinweis", "amtUnter", "paketUnter", "amtDokument", "paketDokument", "csvDateien", "dokumentFuer", "dateiName", "zeitraumText", "amtZeitraumVon", "paketZeitVon",
    "monatLang", "beispielKopf", "NAMEN", "kopfVon", "rueckText", "nkText"],
};
// Namen, die nur im Rechenwerk anders heißen (die alten Namen dürfen in js/screens/ nicht mehr definiert sein; im Rechenwerk gibt es sie nicht)
const NUR_ALT = new Set(["heuteZielWerte", "heuteKachelWerte", "kandidaten", "lagerortVon"]);
test("Trennung 2: verschobene Rechen- und Textfunktionen sind nicht mehr in js/screens/ definiert", async () => {
  const def = (n) => new RegExp(`(^|\\n)\\s*(export\\s+)?(async\\s+)?(function\\s+${n}\\s*\\(|(const|let|var)\\s+${n}\\s*=)`);
  const fehler = [];
  for (const f of fs.readdirSync(SCREENS).filter((x) => x.endsWith(".js"))) {
    const src = ohneKommentar(lies(path.join(SCREENS, f)));
    for (const namen of Object.values(VERSCHOBEN)) for (const n of namen) if (def(n).test(src)) fehler.push(`${f}: ${n}`);
  }
  assert.deepEqual(fehler, [], "gehört ins Rechenwerk:\n" + fehler.join("\n"));
  for (const [datei, namen] of Object.entries(VERSCHOBEN)) {
    const src = lies(path.join(JS, datei));
    for (const n of namen) if (!NUR_ALT.has(n)) assert.ok(def(n).test(src), `${datei}: ${n} fehlt`);
  }
  // die öffentlichen davon sind als Funktion erreichbar
  const M = await import("../js/ordner_text.js"); for (const n of ["ordnerKachelStand", "amtDokument", "paketDokument", "csvDateien", "dokumentFuer"]) assert.equal(typeof M[n], "function", n);
  // Gegenprobe: eine eingebaute Definition wird erkannt
  assert.ok(def("personalZahlen").test("export function personalZahlen(stand) {}")); assert.ok(def("ORDNUNG").test("const ORDNUNG = {};"));
  assert.ok(!def("personalZahlen").test('import { personalZahlen } from "../personal.js";'));
});

// ---------- (4) zusammengeführt und entfernt ----------
test("Trennung: ring, zielAttr, Mengen-Schreibweise und Teilen gibt es je einmal (js/screens/bausteine.js)", () => {
  const B = lies(path.join(SCREENS, "bausteine.js"));
  for (const n of ["ring", "bueroRing", "zielAttr", "mengeBasisText", "mengeEinheitText", "gebindeAnzahl", "textTeilen", "dateienTeilen"]) assert.match(B, new RegExp(`export (async )?(function|const) ${n}\\b`), n);
  for (const f of fs.readdirSync(SCREENS).filter((x) => x.endsWith(".js") && x !== "bausteine.js")) {
    const s = ohneKommentar(lies(path.join(SCREENS, f)));
    assert.ok(!/function ring\(|function zielAttr|zielAttr = \(z\) => `|function mengeText|async function teilen|navigator\.share/.test(s), f + ": eigener Baustein statt bausteine.js");
  }
  assert.ok(!/export function zielAttr/.test(lies(path.join(JS, "offen.js"))), "offen.js liefert kein HTML mehr");
});

test("Trennung: tote Anzeige-Bausteine (home.js) und tote Handlungen (app.js) sind entfernt", () => {
  const home = lies(path.join(SCREENS, "home.js")), app = lies(path.join(JS, "app.js"));
  for (const n of ["heuteKacheln(", "umsatzInstrument", "tonneInstrument", "wareneinsatzInstrument", "kuehlInstrument", "bandView", "einrichtungKarte", "monatKarte", "spruchKarte"]) assert.ok(!home.includes(n), n);
  for (const n of ['"schnell-muell"', '"schnell-umsatz"', '"personal-start"', '"einrichtung-liste"']) assert.ok(!app.includes(n), n);
  assert.ok(!app.includes("muellEingabeOeffnen"), "nur von schnell-muell benutzt");
});

// ---------- (2) Anzeigen schreibt nie ----------
test("Trennung: alle Ansichten auf dem Beispiel-Laden zeichnen, ohne den Stand zu verändern", async () => {
  const { beispielLaden } = await import("../js/beispiel.js");
  const st = await import("../js/store.js");
  const H = new Date().toISOString().slice(0, 10);
  const s = beispielLaden(H, { jetzt: new Date().toISOString() });
  // offene Kühl-Abweichung für „Ware nach Kühl-Abweichung“; ein Artikel ohne Eintrag, damit „Einkaufspreise“ beim Zeichnen etwas abgleichen MÜSSTE
  s.messungen.push({ id: "m-abw", stelle: s.kuehlstellen[0].id, datum: H, zeit: H + "T09:00:00", wert: 12, min: null, max: 7, abweichung: true, massnahmen: ["chef"], nachkontrolle: null, von: null, nacherfasst: false, storniert: false });
  s.gerichte[0].zutaten.push({ name: "Sumach", menge: 2, einheit: "g" });
  const w = st.leereWurzel(); w.betriebe = [s]; w.aktiv = s.id;
  const { navKontext } = await import("../js/screens/nav.js");
  const home = await import("../js/screens/home.js");
  const ansichten = {
    start: () => home.startView(s, { wurzel: w }), kartebuero: () => home.karteView(s), einstellungen: () => home.einstellungenView(s, 3, w, {}),
    buero: async () => (await import("../js/screens/buero.js")).bueroView(s, w, {}),
    muell: async () => (await import("../js/screens/muell.js")).muellView(s), kuehl: async () => (await import("../js/screens/kuehl.js")).kuehlView(s),
    putzplan: async () => (await import("../js/screens/putzplan.js")).putzplanView(s), umsatz: async () => (await import("../js/screens/umsatz.js")).umsatzView(s),
    listen: async () => (await import("../js/screens/tag.js")).listenView(s), beleg: async () => (await import("../js/screens/beleg.js")).belegView(s),
    abschluss: async () => (await import("../js/screens/abschluss.js")).abschlussView(s), vergleich: async () => (await import("../js/screens/vergleich.js")).vergleichView(s),
    inventur: async () => (await import("../js/screens/inventur.js")).inventurView(s), bestand: async () => (await import("../js/screens/bestand.js")).bestandView(s),
    aktionen: async () => (await import("../js/screens/aktionen.js")).aktionenView(s), karte: async () => (await import("../js/screens/karte_laden.js")).karteLadenView(s),
    "ordner-amt": async () => (await import("../js/screens/ordner.js")).ordnerAmtView(s), "ordner-steuer": async () => (await import("../js/screens/ordner.js")).ordnerPaketView(s, "steuer"),
    kuehlware: async () => (await import("../js/screens/kuehl_ware.js")).kuehlWareView(s), verkauf: async () => (await import("../js/screens/verkauf.js")).verkaufView(s),
    tafel: async () => (await import("../js/screens/tafel.js")).tafelView(s), // Menütafel (18.10.2026)
    getraenke: async () => (await import("../js/screens/getraenke.js")).getraenkeView(s), // Getränke (18.10.2026)
    lieferanten: async () => (await import("../js/screens/lieferanten.js")).lieferantenView(s), // Lieferanten (18.10.2026)
    laeden: async () => (await import("../js/screens/laeden.js")).laedenView(w), // Eigentümer-Ebene (18.10.2026)
    umsatzheute: async () => (await import("../js/screens/umsatz_laden.js")).umsatzLadenView(s), // Laden-Umbau (20.10.2026)
  };
  for (const [name, f] of Object.entries(ansichten)) {
    navKontext(s, w, name); const vorher = JSON.stringify(w);
    const html = await f(); assert.equal(typeof html, "string", name); assert.ok(html.length > 50, name);
    assert.equal(JSON.stringify(w), vorher, `Ansicht „${name}“ hat beim Zeichnen geschrieben`);
  }
  // alle Schritte der Einrichtung (genauer Weg und Schnellweg), auch „Einkaufspreise“ (vorher: stand.artikel beim Zeichnen gesetzt)
  const { SCHRITTE, SCHNELL } = await import("../js/screens/onboarding.js");
  for (const sch of [...SCHRITTE, ...SCHNELL]) {
    const vorher = JSON.stringify(w);
    sch.view(s); if (sch.fuss) sch.fuss(s);
    assert.equal(JSON.stringify(w), vorher, `Schritt „${sch.id}“ hat beim Zeichnen geschrieben`);
  }
  // Einkaufspreise zeigt trotzdem die abgeglichene Liste (Vorschau) – und erst das Betreten des Schritts speichert sie
  const { preise } = await import("../js/screens/karte.js");
  assert.ok(preise.view(s).includes("Sumach"), "Vorschau enthält die neue Zutat");
  assert.ok(!s.artikel.some((a) => a.name === "Sumach"));
  preise.beimBetreten(s); assert.ok(s.artikel.some((a) => a.name === "Sumach"), "beimBetreten gleicht ab und speichert");
});

test("Trennung: Prüfliste der Karte legt ihre Gruppen beim Hinzufügen fest, nicht beim Zeichnen", () => {
  const foto = lies(path.join(SCREENS, "foto.js"));
  const ansicht = foto.slice(foto.indexOf("export function kartePruefenView"), foto.indexOf("export function kartePruefenEingabe"));
  assert.ok(!/\.gruppe\s*=(?!=)/.test(ansicht), "kartePruefenView setzt keine Gruppe");
  assert.match(foto, /for \(const v of neu\) if \(v\.gruppe === undefined\) v\.gruppe =/);
});

test("Trennung: app.js schreibt beim Zeichnen nichts (Beispiel-Name, Person im Personal-Modus, Schritt-Kennung)", () => {
  const app = lies(path.join(JS, "app.js"));
  const zeichne = app.slice(app.indexOf("function zeichne() {"), app.indexOf("function karteFotoSchirm"));
  assert.ok(!/b\.betrieb\.name =|personalNachtragen\(|beispielNamenFolgen\(/.test(zeichne.split("function setzeSprache")[0]), "zeichne() schreibt nicht");
  const ob = app.slice(app.indexOf("function zeichneOnboarding"), app.indexOf("// ---------- Ablauf ----------"));
  assert.ok(!/schrittIdMerken\(stand\)/.test(ob), "zeichneOnboarding merkt keine Kennung mehr");
  assert.match(app, /function speichern\(w\) \{ personNachtragen\(\); return speichernStore\(w\); \}/);
});

// ---------- (5) Ware nach Kühl-Abweichung ----------
async function ladenMitAbweichung() {
  const st = await import("../js/store.js");
  const s = st.leererBetrieb(); s.phase = "app"; s.betrieb.name = "Testladen";
  s.kuehlstellen = [{ id: "k1", name: "Kühlschrank 1", art: "kuehl", min: null, max: 7, reihe: 0, archiviert: false }];
  s.artikel = [{ name: "Hackfleisch gemischt", gruppe: "fleisch", einheit: "kg", packung: { menge: 2, einheit: "kg" }, gebinde: { art: "packung", zwischen: null }, preis: 14, preisBasis: "netto", status: "bekannt" }];
  const H = new Date().toISOString().slice(0, 10);
  const m = (id, wert, extra = {}) => { const x = { id, stelle: "k1", datum: H, zeit: H + "T09:00:00", wert, min: null, max: 7, abweichung: wert > 7, massnahmen: ["chef"], nachkontrolle: null, von: null, nacherfasst: false, storniert: false, ...extra }; s.messungen.push(x); return x; };
  m("a1", 11); m("a2", 12); m("ok", 5, { zeit: H + "T08:00:00" });
  return { s, H };
}

test("Ware nach Kühl-Abweichung: wegwerfen bucht Müll wie der Rundgang (Wert zum Einkaufspreis, Ware, Messung) und schließt die Abweichung", async () => {
  const E = await import("../js/engine.js"); const O = await import("../js/offen.js");
  const { s, H } = await ladenMitAbweichung();
  assert.equal(E.offeneWareEntscheidungen(s, { heuteTag: H }).length, 2);
  const chip = O.offenImBuero(s, { betriebe: [s] }).find((o) => o.id === "kuehlMassnahme");
  assert.deepEqual(chip.ziel, { aktion: "nav", wert: "kuehlware" }, "Büro-Hinweis führt auf den neuen Bildschirm");
  const z = E.wareWegZeile(s, "Hackfleisch gemischt", 0.5); assert.equal(z.einheit, "kg"); assert.equal(z.ref.typ, "artikel");
  assert.equal(z.wert, E.wertEintrag({ ref: z.ref, menge: 0.5, einheit: "kg", art: "verderb" }, s)); assert.ok(z.wert > 0);
  assert.equal(E.wareWegwerfen(s, "a1", []), null, "ohne Ware kein Wegwerfen");
  const r = E.wareWegwerfen(s, "a1", [z, E.wareWegZeile(s, "Inhalt von Kühlschrank 1", 1)], { grund: "Kühlschrank 1", jetzt: "2026-10-17T10:00:00.000Z", datum: H });
  assert.equal(r.schwund.length, 2); assert.equal(r.messung.ware.art, "weggeworfen");
  const [a, b] = r.schwund;
  assert.deepEqual(Object.keys(a), ["id", "datum", "erfasst", "art", "vorgang", "ref", "menge", "einheit", "fraktion", "grund", "wert", "wertOffen", "quelle", "messung", "nacherfasst", "storniert"], "gleiche Felder wie der Rundgang");
  assert.equal(a.art, "verderb"); assert.equal(a.quelle, "kuehl"); assert.equal(a.messung, "a1"); assert.equal(a.wert, z.wert); assert.equal(a.wertOffen, false);
  assert.equal(b.wert, null); assert.equal(b.wertOffen, true); assert.equal(b.ref.typ, "frei");
  assert.equal(s.schwund.length, 2); assert.equal(E.abweichungStand(s, s.messungen.find((m) => m.id === "a1")), "behoben");
  assert.equal(E.wareWegwerfen(s, "a1", [z]), null, "nur einmal"); assert.equal(s.schwund.length, 2);
  // Müll-Auswertung zählt den Wert mit
  const sw = E.schwundAuswertung(s, { von: H, bis: H }); assert.equal(sw.anzahl, 2); assert.ok(Math.abs(sw.muellwert - z.wert) < 1e-9, `${sw.muellwert} ≠ ${z.wert}`);
});

test("Ware nach Kühl-Abweichung: behalten nur mit Begründung, steht im Amt-Ordner", async () => {
  const E = await import("../js/engine.js"); const A = await import("../js/export_amt.js");
  const { s, H } = await ladenMitAbweichung();
  assert.equal(E.wareBehalten(s, "a2", "  "), null); assert.equal(E.wareBehalten(s, "a2", "ok"), null, "mindestens 3 Zeichen");
  const m = E.wareBehalten(s, "a2", "sofort in den anderen Kühlschrank gestellt", { jetzt: "2026-10-17T10:00:00.000Z" });
  assert.deepEqual(m.ware, { art: "behalten", erfasst: "2026-10-17T10:00:00.000Z", von: null, grund: "sofort in den anderen Kühlschrank gestellt" });
  assert.equal(E.abweichungStand(s, m), "behoben"); assert.equal(s.schwund.length, 0, "behalten bucht keinen Müll");
  const k = A.kuehlprotokoll(s, { von: H, bis: H }, { datum: H });
  const zeile = k.zeilen.find((x) => x.wert === 12); assert.equal(zeile.ware, "behalten"); assert.equal(zeile.wareGrund, "sofort in den anderen Kühlschrank gestellt");
  assert.equal(E.offeneWareEntscheidungen(s, { heuteTag: H }).length, 1);
});

test("Ware nach Kühl-Abweichung: Bildschirm im Büro – Handlungen, Texte in 18 Sprachen, Personal gesperrt", async () => {
  const W = await import("../js/screens/kuehl_ware.js"); const M = await import("../js/modus.js"); const { navKontext } = await import("../js/screens/nav.js");
  const { s } = await ladenMitAbweichung(); const w = { betriebe: [s], modus: "buero" }; navKontext(s, w, "kuehlware");
  W.kuehlWareZuruecksetzen();
  let html = W.kuehlWareView(s);
  assert.ok(html.includes('data-a="kw-weg"') && html.includes('data-a="kw-behalten"')); assert.ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(html), "keine Emoji");
  const el = (d) => ({ dataset: d });
  assert.equal(W.kuehlWareAktion("kw-weg", el({ id: "a1" }), s), true);
  W.kuehlWareEingabe("kw-name", "Hackfleisch gemischt", s); W.kuehlWareEingabe("kw-menge", "0,5", s);
  assert.equal(W.kuehlWareAktion("kw-hinzu", el({}), s), true);
  html = W.kuehlWareView(s); assert.ok(html.includes("Hackfleisch") && html.includes("Als Müll buchen"));
  const r = W.kuehlWareAktion("kw-weg-speichern", el({}), s); assert.equal(r.speichern, true); assert.equal(s.schwund.length, 1);
  assert.equal(W.kuehlWareAktion("kw-behalten", el({ id: "a2" }), s), true);
  assert.equal(W.kuehlWareEingabe("kw-grund", "ok", s), "knopf"); assert.equal(W.kuehlWareGrundGueltig(), false);
  assert.ok(W.kuehlWareAktion("kw-behalten-speichern", el({}), s).meldung); assert.equal(s.messungen.find((m) => m.id === "a2").ware, undefined);
  W.kuehlWareEingabe("kw-grund", "Kerntemperatur gemessen", s); assert.equal(W.kuehlWareAktion("kw-behalten-speichern", el({}), s).speichern, true);
  assert.ok(W.kuehlWareView(s).includes("Keine offene Abweichung"));
  // Personal-Modus: Ansicht nicht erlaubt, Handlungen abgewiesen; im Laden nur über das Büro (Code)
  assert.equal(M.ansichtErlaubt({ modus: "personal" }, "kuehlware"), false);
  for (const n of ["kw-weg", "kw-behalten", "kw-weg-speichern", "kw-behalten-speichern", "kw-hinzu"]) assert.equal(M.personalGesperrt(n, null, "2026-10-17"), true, n);
  assert.deepEqual(M.navZiel({ modus: "laden" }, "kuehlware"), { ansicht: "kuehlware", buero: true });
  // Texte: alle Schlüssel in allen 18 Sprachen
  const de = (await import("../js/lang/de.js")).default;
  const codes = fs.readdirSync(path.join(JS, "lang")).filter((f) => f.endsWith(".js")).map((f) => f.slice(0, -3));
  assert.equal(codes.length, 18);
  for (const c of codes) { const tab = (await import(`../js/lang/${c}.js`)).default;
    for (const k of Object.keys(de.kuehlWare)) assert.ok(typeof tab.kuehlWare?.[k] === "string" && tab.kuehlWare[k].trim(), `${c}: kuehlWare.${k}`);
    assert.ok(tab.amtW2.ware.behalten, `${c}: amtW2.ware.behalten`); }
  // der Bildschirm steht in der zentralen Zurücksetzer-Liste
  assert.match(lies(path.join(JS, "app.js")), /kuehlWareZuruecksetzen\]/);
});
