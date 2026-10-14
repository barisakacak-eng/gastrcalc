// Baukasten für Sanji (Optik): zeigt alle Bildschirme der App mit Beispieldaten, ohne Speichern und ohne Knopf-Funktion.
// Sanji ändert nur css/tokens.css, css/app.css, bilder/, icons/ (siehe bruecke/visual-vertrag.md). Diese Datei pflegt Zoro.
import { leererBetrieb } from "../js/store.js";
import { setzeSprache, SPRACHEN, t } from "../js/i18n.js";
import { esc } from "../js/util.js";
import { vorschlaegeAusText, vorschlaegeUebernehmen } from "../js/karte_lesen.js";
import { fehlendeRezepteErgaenzen } from "../js/rezept_baukasten.js";
import { artikelAusGerichten } from "../js/engine.js";
import { SCHNELL, SCHRITTE } from "../js/screens/onboarding.js";
import { startView, karteView, einstellungenView } from "../js/screens/home.js";
import { muellView } from "../js/screens/muell.js";
import { umsatzView } from "../js/screens/umsatz.js";
import { kuehlView } from "../js/screens/kuehl.js";
import { listenView } from "../js/screens/tag.js";
import { belegView } from "../js/screens/beleg.js";
import { abschlussView } from "../js/screens/abschluss.js";
import { nav, navKontext, menueSetzen, schnellSetzen } from "../js/screens/nav.js";
import { muellEingabeOeffnen, muellAktion, muellZuruecksetzen } from "../js/screens/muell.js";
import { gerichtWeg } from "../js/muell.js";

const BEISPIEL_KARTE = `Döner Kebab ⋯ 7,50
Dürüm Döner ⋯ 8,00
Döner-Teller mit Salat und Pommes ⋯ 13,50
Falafel Dürüm ⋯ 7,00
Lahmacun mit Salat ⋯ 6,00
Pizza Margherita ⋯ 9,50
Pide mit Sucuk und Käse ⋯ 11,00
Pommes ⋯ 4,00
Ayran 0,25 l ⋯ 2,00
Cola 0,33 l ⋯ 2,50`;

function beispielLaden() {
  const s = leererBetrieb();
  s.phase = "app"; s.ladenArt = "doener";
  s.betrieb.name = "Beispiel-Imbiss"; s.betrieb.format = "imbiss"; s.betrieb.kuechen = ["doener"];
  s.team = { personen: 3, stundenProPerson: 40, lohnkosten: 6500, eigenerLohn: null, eigenerLohnStatus: "geschaetzt" };
  s.kosten = [{ id: "k1", kategorie: "raum", posten: "miete", betrag: 1800, status: "eigen", periode: "monat", basis: "brutto" }];
  vorschlaegeUebernehmen(s, vorschlaegeAusText(BEISPIEL_KARTE, s).map((v) => ({ ...v, an: true })));
  fehlendeRezepteErgaenzen(s); artikelAusGerichten(s);
  s.kuehlstellen = [{ id: "kst1", name: "Kühlschrank 1", art: "kuehl", min: null, max: 7, reihe: 0, archiviert: false }];
  s.kuehl.eingerichtet = true;
  gerichtWeg(s, s.gerichte[0], { anzahl: 2 });
  return s;
}

const wurzel = (s) => ({ schema: 5, sprache: "de", aktiv: s.id, geraet: "design", lfd: 0, betriebe: [s] });

function schirme(s) {
  const w = wurzel(s);
  const ob = (x, nr) => ({ titel: `Einrichtung ${nr}: ${x.id}`, html: () => x.view({ ...structuredClone(s), phase: "onboarding" }) });
  return [
    ...SCHNELL.map((x, i) => ob(x, i + 1)),
    { titel: "Cockpit (Start)", html: () => startView(s, { wurzel: w }) },
    { titel: "Menü offen (drei Striche)", html: () => { menueSetzen(true); const h = startView(s, { wurzel: w }); menueSetzen(false); return h; } },
    { titel: "Schnellknopf offen", html: () => { schnellSetzen(true); const h = startView(s, { wurzel: w }); schnellSetzen(false); return h; } },
    { titel: "Müll: Was ist weg?", html: () => { muellEingabeOeffnen(); const h = muellView(s); muellZuruecksetzen(); return h; } },
    { titel: "Müll: Blatt", html: () => { muellEingabeOeffnen(); muellAktion("muell-kachel", { dataset: { typ: "gericht", id: s.gerichte[0].id } }, s); const h = muellView(s); muellZuruecksetzen(); return h; } },
    { titel: "Speisekarte", html: () => karteView(s) },
    { titel: "Müll", html: () => muellView(s) },
    { titel: "Umsatz", html: () => umsatzView(s) },
    { titel: "Kühlung", html: () => kuehlView(s) },
    { titel: "Listen", html: () => listenView(s) },
    { titel: "Rechnung lesen", html: () => belegView(s) },
    { titel: "Tag abschließen", html: () => abschlussView(s) },
    { titel: "Einstellungen", html: () => einstellungenView(s, 0, w, { offline: "bereit" }) },
    ...SCHRITTE.filter((x) => ["karte", "rezepte", "preise", "verkauf", "ergebnis"].includes(x.id)).map((x) => ({ titel: `Genaue Einrichtung: ${x.id}`, html: () => x.view(s) })),
  ];
}

// Einzelbausteine, damit jede Klasse einmal sichtbar ist (Namen nicht ändern, nur Aussehen)
const BAUSTEINE = `
  <h1 class="frage">Überschrift (frage)</h1>
  <p class="hinweis">Hinweis-Text, so lang wie er in der App vorkommt, auch auf Türkisch 40 % länger.</p>
  <button type="button" class="knopf">Hauptaktion (knopf)</button>
  <button type="button" class="knopf zweit">Zweite Aktion (knopf zweit)</button>
  <button type="button" class="knopf" disabled>Gesperrt</button>
  <div class="kacheln"><button type="button" class="kachel an"><b>Kachel an</b></button><button type="button" class="kachel"><b>Kachel</b></button></div>
  <input class="textfeld gross" placeholder="textfeld gross">
  <input class="textfeld" placeholder="textfeld">
  <p><span class="pkt gelb"></span> geschätzt · <span class="pkt gruen"></span> eigen · <span class="pkt rot"></span> fehlt · <span class="pkt grau"></span> weggelassen</p>
  <div class="bildplatz"></div><small class="leise block">bildplatz (Bild aus bilder/)</small>
  <div class="bildplatz klein"></div><small class="leise block">bildplatz klein</small>
  <p class="leise">leise</p> <small class="marke block">marke</small>`;

function zeichnen() {
  const lang = new URLSearchParams(location.search).get("lang") || "de";
  setzeSprache(SPRACHEN.includes(lang) ? lang : "de");
  document.documentElement.lang = lang;
  const s = beispielLaden(); navKontext(s, wurzel(s));
  const teile = schirme(s).map((x, i) => {
    let inhalt;
    try { inhalt = x.html(); } catch (e) { inhalt = `<p class="hinweis">Fehler beim Zeichnen: ${esc(e.message)}</p>`; }
    return `<section class="bk-teil" id="s${i + 1}"><h2 class="bk-titel">${i + 1}. ${esc(x.titel)}</h2><div class="bk-handy"><div class="schirm"><div class="inhalt">${inhalt}</div></div></div></section>`;
  });
  document.getElementById("baukasten").innerHTML =
    `<section class="bk-teil"><h2 class="bk-titel">0. Bausteine</h2><div class="bk-handy"><div class="schirm"><div class="inhalt">${BAUSTEINE}</div></div></div></section>` + teile.join("");
  for (const i of document.querySelectorAll('img[src^="bilder/"]')) i.src = "../" + i.getAttribute("src"); // Bilder liegen eine Ebene höher
  document.getElementById("sprachen").innerHTML = SPRACHEN.map((c) => `<a href="?lang=${c}"${c === lang ? ' aria-current="page"' : ""}>${c.toUpperCase()}</a>`).join(" · ");
}

// Knöpfe tun hier nichts – die Seite ist nur zum Ansehen
document.addEventListener("click", (e) => { if (e.target.closest("[data-a], button, a.knopf")) e.preventDefault(); }, true);
document.addEventListener("submit", (e) => e.preventDefault(), true);
zeichnen();
void nav; void t;
