// GastroCalc – Einstieg. Hält die Wurzel (alle Läden dieses Handys), zeichnet den aktuellen Bildschirm des aktiven Ladens,
// speichert nach jeder Änderung. Etappe 5: Cockpit, Müll in zwei Tipps, Umsatz und Zähler, Belege, Tag abschließen.
import { Z } from "./bedienung/zustand.js";
import { offeneKlappen, textTeilen } from "./screens/bausteine.js"; // Entrümpelung Punkt 4 (19.10.2026)
import { fehlerSammlerStarten, fehlerText, fehlerLeeren, fehlerLesen } from "./fehler.js"; // Fehler-Rucksack (Pilotfest E3, 30.10.2026)
import { kurzStarten, kurzOffen } from "./screens/rundgang_kurz.js"; // 6b R1 (live seit 30.10.2026)
import { erstSatz, erstZeigen, erstWiederZeigen } from "./screens/zeki_erst.js"; // 6b R2 (live seit 30.10.2026)
import { rundgangStarten as fuehrungStarten, rundgangOffen as fuehrungOffen } from "./screens/rundgang.js"; // Rundgang mit Zeki (Entwurf 26.10.2026)
import { zekiLogAnhaengen, zekiLogLoeschen, rundgangAbschliessen, uebungStarten, uebungZuruecknehmen, uebungRezepteMerken, uebungRezepteBehalten } from "./stamm.js";
import { datenschutzText } from "./data/datenschutz.js";
import { zekiTaktStarten, zekiSprechblase, zekiStimmeEinsetzen } from "./screens/zeki_takt.js";
import { zekiMoment, ZEKI_BILDSCHIRM } from "./zeki.js"; // Zeki lebt (26.10.2026)
import { kalkulationNeuerTakt } from "./engine.js";
import { testHaken, nurLokal } from "./adapter/testhaken.js"; // Test-Haken nur auf localhost
import { introStarten } from "./intro.js"; // Zeki-Auftritt beim App-Start (27.10.2026), Schalter INTRO_AN in js/intro.js
import { laden, speichern as speichernVerzoegert, sofortSpeichern as sofortSpeichernRoh, speichernAbbrechen, ereignis, alleEreignisse, exportDatei, ereignisseUebernehmen, allesLoeschen, leererBetrieb, leereWurzel, speicherVerfuegbar, beiSpeicherFehler, eintraegeZaehlen, FREMDER_STAND } from "./store.js"; // Paket 2: FREMDER_STAND
import { importSicherung, ablageAusSicherung, ladeProbleme, speicherDauerhaftPruefen, speicherIstDauerhaft, speicherBelegt, APP_FASSUNG, SCHEMA } from "./store.js"; // W2-D
import { t, sprache as aktuelleSprache, setzeSprache as setzeSpracheI18n, SPRACHEN, ladeSprache, spracheGeladen, datumText } from "./i18n.js";
import { ablageLeeren, ablegen, bildFuerAblage, holen, ablageZuruecklegen, beiAblageFehler } from "./ablage.js"; // W2-D: ablageZuruecklegen
import { esc, parseZahl, heuteGeschaeft, heute } from "./util.js"; // W2-S: heute für die Personal-Sperre; Paket 3 (16.10.2026), M7: Geschäftstag
import { SCHRITTE, schrittIndex, schritteFuer, bearbeitenZiel } from "./screens/onboarding.js";
import { schrittWiederherstellen, schrittIdMerken } from "./screens/onboarding.js"; // E: Schritt nach Kennung merken
import { fehlendeRezepteErgaenzen } from "./rezept_baukasten.js";
import { artikelAusGerichten } from "./engine.js";
import { BRANCHENWERTE } from "./data/branchenwerte.js";
import { branchenwerteAnwenden } from "./rezept_quelle.js";
import { fotoVerarbeiten, fotosHinzufuegen, fotoZuruecksetzen, serieAbbrechen, fotoKennung, karteFotoView, kartePruefenView, kartePruefenEingabe, kartePruefenAktion, karteUebernehmen, hatVorschlaege, fotoLauf, karteFussKnopf, karteZeigtPruefliste, rechnungsLaufZuruecksetzen } from "./screens/foto.js"; // W2-D: rechnungsLaufZuruecksetzen
import { startView, einstellungenView, karteView } from "./screens/home.js";
import { listenView, tagAktion, tagZuruecksetzen, tagWertUebernehmen } from "./screens/tag.js";
import { parseTemperatur } from "./util.js"; // Trennung (17.10.2026)
import { putzplanView, putzplanAktion, putzplanZurueck, putzplanZuruecksetzen } from "./screens/putzplan.js";
import { planSicherstellen } from "./putzplan.js"; // Laden-Umbau (20.10.2026): Putzplan im Laden ohne Geräte-Auswahl
import { umsatzLadenView, umsatzLadenAktion, umsatzLadenEingabe, umsatzLadenZuruecksetzen, umsatzLadenKennung } from "./screens/umsatz_laden.js"; // Laden-Umbau (20.10.2026): „Umsatz heute“ im Laden
import { sicherungStufe, sicherungFaellig, sicherungOrtSetzen, sicherungZeitraum } from "./sicherung_stufe.js"; // Laden-Umbau (20.10.2026): „Wo liegt sie jetzt?“
import { kuehlView, kuehlAktion, kuehlEingabe, kuehlZurueck, kuehlZuruecksetzen, kuehlFormGueltig, kuehlKennung } from "./screens/kuehl.js";
import { laedenView, laedenAktion, laedenEingabe, laedenZuruecksetzen } from "./screens/laeden.js"; // Eigentümer-Ebene (18.10.2026)
import { vergleichView, vergleichModus, vergleichZuruecksetzen } from "./screens/vergleich.js";
import { wareView, wareAktion, wareEingabe, wareZuruecksetzen } from "./screens/ware.js"; // Masterauftrag Welle 2
import { portionView, portionOeffnen, portionAktion, portionZuruecksetzen, portionEingabe } from "./screens/portion.js"; // Masterauftrag 2.1
import { preisrundeView, preisrundeOeffnen, preisrundeAktion, preisrundeEingabe, preisrundeZuruecksetzen } from "./screens/preisrunde.js"; // Masterauftrag 1.2/1.3/1.6 // Paket 2: Zurücksetzer
import { karteZuruecksetzen, rezeptDirektOeffnen } from "./screens/karte.js";
import { naechstesRezept, rezeptFortschritt, waageFragen } from "./rezept_quelle.js"; // Mitmach-Rundgang (28.10.2026, 7.3/7.4): Rezept in höchstens 2 Tipps // Paket 2: Zurücksetzer der Einrichtungs-Schritte (Karte, Rezepte, Preise)
import { onboardingZuruecksetzen } from "./screens/onboarding.js"; // Paket 2: „?“-Hilfe des Schnellwegs
import { nav, navKontext } from "./screens/nav.js";
// Drei Ebenen (Entwickler A): Modus je Handy, Menü-Blatt/Hilfe/Büro-Code in eigener Hülle außerhalb von #app
import { bioKennung, bioSetzen, BUERO_OFFEN_MS, modusVergessen } from "./modus.js";
import { bioPruefen, bioEinrichten } from "./schloss_bio.js";
import { modus, modusSetzen, startAnsicht, navZiel, ansichtErlaubt, ebeneWiederherstellen, ebeneVergessen, pinGesetzt, pinSetzen, personalGesperrt, personalFeldGesperrt, codeAktiv, testphaseOhneCode, testphaseSetzen } from "./modus.js"; // W2-S: Sperrliste Personal
import { zaehler, monatsZiel } from "./zaehler.js"; // Lauf 2 (4d): Monatsblatt im Laden
import { ebeneHuelle, blattOffen, blattSchliessen, menueZeigen, monatBlattZeigen, spracheZeigen, laedenZeigen, hilfeZeigen, pinStarten, pinTaste, pinZweckJetzt, passwortStarten, passwortWert, passwortZeigen, passwortMeldung, sicherungSchalter, sicherungWahl, ortFrageZeigen, pinZweck, rettungStarten, rettungWert, rettungMeldung, rettungZiel, rettungOffen, rettungWarteText, rettungscodeZeigen } from "./screens/ebene.js"; // E5 (16.10.2026): Passwort der Sicherung
import { passwortGueltig } from "./schluessel.js"; // E5
import { rettungVersuch, rettungAnlegen, wurzelErsetzen, rettungErlaubt } from "./rettung.js"; // Rettung (17.10.2026): Rettungscode, Sicherung ersetzt alles (Fehlerseite)
import { muellView, muellAktion, muellEingabe, muellZurueck, muellZuruecksetzen, muellFormGueltig, muellKennung, muellRueckgaengig, muellFotoSetzen,
  muellTipp, muellTippZeigen, muellTippZurueck, muellZurueckZeigen, muellKlickUnterdrueckt, muellLangdruckEinrichten } from "./screens/muell.js"; // D: Müll mit einem Tipp
import { personalView, personalAktion, personalKontext, personalAktiv, personalNachtragen, schichtPerson, schichtPersonVergessen, personalLeiste, anredeTeam } from "./screens/personal.js"; // D: Personal-Modus
import { rundgangOffen, kuehlBereit } from "./engine.js"; // D: Personal-Kachel Kühlung
import { umsatzView, umsatzAktion, umsatzEingabe, umsatzZuruecksetzen, umsatzFeldVerlassen } from "./screens/umsatz.js"; // W2-T
import { belegView, belegAktion, belegEingabe, belegZurueck, belegZuruecksetzen, belegKennung, belegTextDa, belegTextVonFoto } from "./screens/beleg.js";
import { abschlussView, abschlussAktion, abschlussZuruecksetzen, abschlussKennung } from "./screens/abschluss.js";
import { inventurView, inventurAktion, inventurEingabe, inventurZurueck, inventurZuruecksetzen, inventurKennung } from "./screens/inventur.js";
// Entwickler B (Drei Ebenen): Laden-Karte als Fotoraster mit Preis-Blatt
import { karteLadenRezeptBlatt, karteLadenView, karteLadenAktion, karteLadenEingabe, karteLadenTeile, karteLadenBlatt, karteLadenZurueck, karteLadenZuruecksetzen, karteLadenKennung } from "./screens/karte_laden.js";
// Drei Ebenen (Entwickler C): Büro-Startseite und die drei Ordner
import { bueroView, bueroAktion, bueroEingabe, bueroSperren, bueroZuruecksetzen } from "./screens/buero.js";
import { ordnerAmtView, ordnerPaketView, ordnerAktion, ordnerEingabe, ordnerZuruecksetzen, ordnerVorschauOffen } from "./screens/ordner.js";
import { rundgangOffen as w2RundgangOffen } from "./engine.js"; // W2-D: stilles Update nur ohne offenen Rundgang
import { beispielLaden, beispielNamenFolgen } from "./beispiel.js"; // Beispiel-Laden (17.10.2026); Trennung (17.10.2026): beispielNamenFolgen
// Trennung (17.10.2026): Handlungen und Eingaben schreiben über das Rechenwerk (js/stamm.js, js/karte_daten.js)
import { einrichtungFertigSetzen, kuehlKeineSetzen, branchenMeldungQuittieren, abgleichHinweisQuittieren, kleinunternehmerUmschalten, waageVorschlagGesehen, warenQuoteSetzen, steuerSatzSetzen, uploadAnlegen, ruhezeitSetzen } from "./stamm.js";
import { gerichtFotoSetzen, artikelAbgleichen } from "./karte_daten.js";
import { speichernPausieren } from "./store.js"; // Mitmach-Rundgang (28.10.2026): Übungsmodus
import { verkaufView, verkaufAktion, verkaufEingabe, verkaufDatei, verkaufZuruecksetzen, verkaufZurueck, verkaufKennung, verkaufZbonFoto } from "./screens/verkauf.js"; // E7 (17.10.2026): Verkauf je Gericht (Büro, versteckt)
import { verkaufSichtbar } from "./verkauf.js"; // E7
import { bestandView, bestandAktion, bestandEingabe, bestandZuruecksetzen, bestandZurueck, bestandKennung, bestandLink } from "./screens/bestand.js"; // Bestand (17.10.2026): Lager & Bestellen (Büro)
import { aktionenView, aktionenAktion, aktionenZuruecksetzen, aktionenZurueck, aktionenKennung, aktionenEingabe } from "./screens/aktionen.js";
import { getraenkeView, getraenkeAktion, getraenkeEingabe, getraenkeZuruecksetzen, getraenkeZurueck, getraenkeKennung } from "./screens/getraenke.js";
import { lieferantenView, lieferantenAktion, lieferantenEingabe, lieferantenZuruecksetzen, lieferantenZurueck, lieferantenKennung } from "./screens/lieferanten.js"; // Lieferanten (18.10.2026): Büro „Lieferanten“ // Getränke (18.10.2026): Büro „Getränke“
import { aktionenAbschliessen } from "./aktion_plan.js"; // Aktion planen (18.10.2026): Bilanz beendeter Aktionen beim Betreten speichern
import { tafelView, tafelAktion, tafelEingabe } from "./screens/tafel.js"; // Menütafel (18.10.2026): Büro „Menütafel“
import { hinweiseView } from "./screens/hinweise.js";
import { geld3View, geld3Aktion, geld3Eingabe } from "./screens/geld3.js"; // Welle 3 (03.11.2026, Baris Ja 04.11.2026) // Hinweis-Karten (23.10.2026): Büro „Hinweise“
import { hinweisStatusSetzen } from "./hinweis.js";
import { hmStatusSetzen, hmFrageSetzen, hmFuerBuero, hmGezeigtMerken, hmLadenZeile, hmLadenGezeigt } from "./hinweis_motor.js"; // Lauf 3 (09.11.2026), live seit Baris’ Ja 17:21
import { hmUi } from "./data/hm_texte.js";
import { fristErinnerungHeute } from "./welle3.js"; // Lauf 3, Phase 6: Frist-Erinnerung auf Heute
import { fristSatz } from "./data/frist_texte.js";
import { rechtsformSetzen } from "./rechtsform.js"; // Rechtsform (23.10.2026)
import { installZustand, homeHinweisFaellig, homeHinweisGesehen } from "./homebildschirm.js"; // Lauf 2 (31.10.2026), Bildpaket D (1): Home-Bildschirm-Führung
import { tafelEinstellung } from "./tafel.js"; // Menütafel (18.10.2026): Sprache der Tafel beim Betreten nachladen
import { kuehlWareView, kuehlWareAktion, kuehlWareEingabe, kuehlWareZuruecksetzen, kuehlWareZurueck, kuehlWareKennung, kuehlWareGrundGueltig } from "./screens/kuehl_ware.js"; // Trennung (17.10.2026), Punkt 4: Ware nach Kühl-Abweichung (Büro) // Stufe 1 (17.10.2026): Aktionen & Haltbarkeit (Büro)
import { berlin } from "./zeit.js";
import { aktionsSperre, aktionsSchluessel, tagStand, tagGewechselt, feldMitText, speicherProblemArt, problemNachErfolg, dauerhaftFaellig } from "./bedienhilfe.js"; // Lauf 6, E5: Doppeltipp-Sperre, Tageswechsel, Speicher-Banner
import { l6z } from "./data/l6z_texte.js";
import { einlesenSicher, rueckholpunktInfo, zurueckholen } from "./store.js"; // Lauf 6, E5-Draht (4): Einlesen mit Rückholpunkt
import { l6yText, l6ySatz } from "./data/l6y_texte.js";
import { vormonatEinfrierenWennNoetig } from "./monatsabschluss.js"; // Lauf 6, E5-Draht (1): Vormonat beim Start und beim Tageswechsel einfrieren


// W2-D: EINE Liste aller Bildschirm-Zustände (alle *Zuruecksetzen-Exporte aus js/screens). Ladenwechsel, Einlesen und „Alles löschen“
// setzen alle zurück – ein neuer Bildschirm wird nur hier eingetragen (tests/d.test.mjs prüft, dass keiner fehlt).
const ZURUECKSETZER = [fotoZuruecksetzen, rechnungsLaufZuruecksetzen, tagZuruecksetzen, kuehlZuruecksetzen, muellZuruecksetzen, umsatzZuruecksetzen, belegZuruecksetzen,
  abschlussZuruecksetzen, inventurZuruecksetzen, putzplanZuruecksetzen, karteLadenZuruecksetzen, bueroZuruecksetzen, ordnerZuruecksetzen,
  karteZuruecksetzen, vergleichZuruecksetzen, preisrundeZuruecksetzen, wareZuruecksetzen, portionZuruecksetzen, onboardingZuruecksetzen, verkaufZuruecksetzen, bestandZuruecksetzen, aktionenZuruecksetzen, getraenkeZuruecksetzen, lieferantenZuruecksetzen, laedenZuruecksetzen, umsatzLadenZuruecksetzen, kuehlWareZuruecksetzen]; // Laden-Umbau (20.10.2026): umsatzLadenZuruecksetzen; // Eigentümer-Ebene (18.10.2026): laedenZuruecksetzen; // Lieferanten (18.10.2026): lieferantenZuruecksetzen; // Trennung (17.10.2026): kuehlWareZuruecksetzen; // Stufe 1 (17.10.2026): aktionenZuruecksetzen; Bestand (17.10.2026): bestandZuruecksetzen; E7 (17.10.2026): verkaufZuruecksetzen; Paket 2 (16.10.2026): Suche, offenes Rezept, Waage, Vergleichs-Modus, „?“-Hilfe
function alleZuruecksetzen() { for (const f of ZURUECKSETZER) { try { f(); } catch (e) { console.warn(e); } } }

// Durchsicht 30.10.2026 (Fund 7): localStorage kann selbst werfen (gesperrter Speicher) – ein Ersatz ohne Speicher statt Absturz
const SPEICHER_LEER = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const speicherLokal = () => { try { return window.localStorage || SPEICHER_LEER; } catch { return SPEICHER_LEER; } };
fehlerSammlerStarten(window, { fassung: APP_FASSUNG, ansichtJetzt: () => (Z.stand?.phase === "app" ? `${modus(Z.wurzel)}/${Z.ansicht}` : `einrichtung/${Z.stand?.schrittId || "?"}`) }); // E3: die letzten 50 Fehler, ohne Namen und Zahlen
// Vorab-Prüfung 03.11.2026 (B3): Doppeltipp mit ≈ 230 ms auf „Weiter“ übersprang einen Einrichtungsschritt, „Speichern“ im Preis-Blatt traf danach die Tab-Leiste.
// Neu: Hat der erste Tipp den Bildschirm unter dem Finger verändert (sein Element ist weg), zählt ein zweiter Tipp an derselben Stelle binnen 240 ms nicht (Setzung).
// Zähl-Tipps (Müll-Kachel, −/+) sind ausgenommen – dort zählt jeder Tipp (B1).
const WECHSEL_SCHUTZ_MS = 450; // Ausschuss Lauf 3, P4 B1/B2 (Fund bis 350 ms, dazu Zeichnen)
const FLAECHE_NEU_MS = 240; // zwischen Doppeltipp (≈ 100–230 ms) und bewusstem schnellen Weitertippen (≥ 250 ms, U1)
const ZAEHL_TIPPS = new Set(["muell-tipp", "kl-minus", "kl-plus", "minus", "plus", "ul-team-plus", "pin-taste", "pin-weg", "s2-kuehl"]);
const DOPPELTIPP_MS = 180; // Setzung 30.10.2026: ein versehentlicher Doppeltipp liegt bei ≈ 100–150 ms; „Weiter → Weiter“ eines schnellen Menschen braucht ≈ 250 ms und mehr
// // nach einem Bildschirmwechsel 350 ms lang keinen Tipp an derselben Stelle annehmen (zweiter Tipp eines Doppeltipps)

function aktivSetzen(id) {
  if (Z.stand && Z.stand.id !== id) alleZuruecksetzen(); // offene Formulare gehören zum alten Laden (W2-D: zentrale Liste)
  Z.stand = Z.wurzel.betriebe.find((b) => b.id === id) || null;
  if (!Z.stand) { Z.stand = Z.wurzel.betriebe[0] || null; }
  if (!Z.stand) { Z.stand = leererBetrieb(); Z.wurzel.betriebe.push(Z.stand); }
  Z.wurzel.aktiv = Z.stand.id;
  schrittWiederherstellen(Z.stand); // E: gespeicherter Onboarding-Schritt nach Kennung (alte Stände: Nummer → Kennung)
  schrittBetreten();
}
// Trennung (17.10.2026): Ein Schritt, der beim Betreten Daten vorbereitet (Einkaufspreise: Artikelliste abgleichen), tut das hier –
// beim Wechsel des Schritts oder Ladens, nicht mehr im Zeichnen.
// Dazu wird hier die Kennung des Schritts gemerkt (schrittIdMerken) – vorher bei jedem Zeichnen der Einrichtung.
function schrittBetreten() { if (Z.stand?.phase !== "onboarding") return; schrittIdMerken(Z.stand); const s = schritteFuer(Z.stand)[Z.stand.schritt]; if (s?.beimBetreten) s.beimBetreten(Z.stand); }
// Trennung (17.10.2026): Personal-Modus – neue Einträge bekommen die Schicht-Person, bevor gespeichert wird (vorher schrieb das Zeichnen das nach).
function personNachtragen() { if (Z.wurzel && Z.stand) { personalKontext(Z.wurzel); if (personalAktiv()) personalNachtragen(Z.stand); } }
// Lauf 6, E5 (C): Ein erfolgreiches Schreiben nimmt das Fehler-Banner weg. Das verzögerte Speichern meldet sein Ergebnis nicht –
// solange ein Speicherproblem offen ist, geht darum jedes Speichern über den sofortigen Weg, dessen Ergebnis bekannt ist.
function speicherErgebnis(ok) {
  if (ok === true) { const neu = problemNachErfolg(Z.speicherProblem); if (neu !== Z.speicherProblem) { Z.speicherProblem = neu; if (!neu) Z.root.querySelector(".speicherband")?.remove(); } }
  return ok;
}
const sofortSpeichernStore = (w, opts) => sofortSpeichernRoh(w, opts).then(speicherErgebnis);
const speichernStore = (w) => { if (Z.speicherProblem === "speichern" || Z.speicherProblem === "voll") { speichernAbbrechen(); return sofortSpeichernStore(w); } return speichernVerzoegert(w); };
function speichern(w) { personNachtragen(); return speichernStore(w); }
function sofortSpeichern(w, opts) { personNachtragen(); return sofortSpeichernStore(w, opts); } // K5 (28.10.2026): Optionen (stempel) weiterreichen

// ---------- Zeichnen ----------

function schirmKennung() {
  const unter = Z.ansicht === "karte" ? karteLadenKennung() : Z.ansicht === "kuehl" ? kuehlKennung() : Z.ansicht === "muell" ? muellKennung() : Z.ansicht === "beleg" ? belegKennung() : Z.ansicht === "abschluss" ? abschlussKennung() : Z.ansicht === "kartefoto" ? fotoKennung() : Z.ansicht === "inventur" ? inventurKennung() : Z.ansicht === "verkauf" ? verkaufKennung() : Z.ansicht === "bestand" ? bestandKennung() : Z.ansicht === "aktionen" ? aktionenKennung() : Z.ansicht === "getraenke" ? getraenkeKennung() : Z.ansicht === "kuehlware" ? kuehlWareKennung() : Z.ansicht === "lieferanten" ? lieferantenKennung() : Z.ansicht === "umsatzheute" ? umsatzLadenKennung() : ""; // Lieferanten (18.10.2026); E7; Bestand (17.10.2026); Stufe 1 (17.10.2026)
  return Z.stand.phase === "onboarding" ? `ob:${Z.stand.id}:${Z.stand.weg}:${Z.stand.schritt}:${fotoKennung()}` : `app:${Z.stand.id}:${Z.ansicht}${unter ? ":" + unter : ""}`;
}

// Eigene Fotos (Gericht) aus der Ablage nachladen – einmal je Foto, als Objekt-Adresse im Speicher
const fotoAdressen = new Map();
async function eigeneFotosLaden() {
  for (const img of Z.root.querySelectorAll("img[data-foto]")) {
    const id = img.dataset.foto; let url = fotoAdressen.get(id);
    if (!url) { const g = Z.stand.gerichte.find((x) => x.foto === id); const blob = g?.fotoMeta ? await holen(g.fotoMeta).catch(() => null) : null; if (!blob) continue; url = URL.createObjectURL(blob); fotoAdressen.set(id, url); }
    img.src = url; img.classList.remove("pikto");
  }
}

function zeichne() {
  kalkulationNeuerTakt(); // Zahlen dieses Bildes einmal rechnen
  // D (Personal-Modus): nur Personal-Start, Müll, Kühlung, Putzen; neue Einträge bekommen die Schicht-Person
  if (Z.wurzel && Z.stand) { personalKontext(Z.wurzel); if (personalAktiv()) { if (!["personal", "muell", "kuehl", "putzplan"].includes(Z.ansicht)) Z.ansicht = "personal"; } } // Trennung (17.10.2026): Person nachtragen beim Speichern (unten), nicht im Zeichnen
  const kennung = schirmKennung();
  const y = kennung === Z.letzterSchirm ? window.scrollY : 0;
  try {
    if (Z.stand.phase === "onboarding") zeichneOnboarding();
    else {
      if (!ansichtErlaubt(Z.wurzel, Z.ansicht)) Z.ansicht = startAnsicht(Z.wurzel); // Ebene schützt: z. B. kein Euro-Bildschirm im Personal-Modus
      if (Z.ansicht === "verkauf" && !verkaufSichtbar(Z.stand)) Z.ansicht = startAnsicht(Z.wurzel); // E7 (17.10.2026): ohne Schalter gibt es den Bereich nicht
      navKontext(Z.stand, Z.wurzel, Z.ansicht, modus(Z.wurzel) === "buero" ? Z.bueroWeg : []);
      document.body.dataset.modus = modus(Z.wurzel);
      const v = Z.ansicht === "buero" ? bueroView(Z.stand, Z.wurzel, { aktualisierung: !!Z.aktualisierung }) // Büro-Start (Entwickler C); W2-D: Update-Hinweis
        : Z.ansicht === "einstellungen" ? einstellungenView(Z.stand, Z.ereignisAnzahl, Z.wurzel, { offline: Z.offlineStand, dauerhaft: speicherIstDauerhaft(), fassung: APP_FASSUNG, fehlerAnzahl: fehlerLesen(speicherLokal()).length, home: homeLage({ buero: true }), rueckhol: Z.rueckholInfo }) // W2-D; E5-Draht (4): Rückholpunkt vorhanden?
        : Z.ansicht === "karte" ? karteLadenView(Z.stand) // Laden-Karte (Fotoraster mit Ampel)
        : Z.ansicht === "kartebuero" ? karteView(Z.stand) // Karten-Übersicht mit Kalkulation – im Büro
        : Z.ansicht === "muell" ? muellView(Z.stand)
        : Z.ansicht === "umsatz" ? umsatzView(Z.stand)
        : Z.ansicht === "listen" ? listenView(Z.stand)
        : Z.ansicht === "kuehl" ? kuehlView(Z.stand, { buero: modus(Z.wurzel) === "buero" }) // Laden-Umbau (20.10.2026): Monatsblatt, Einrichtung, 7-Tage-Lücken nur im Büro
        : Z.ansicht === "putzplan" ? putzplanView(Z.stand, { buero: modus(Z.wurzel) === "buero" }) // Laden-Umbau (20.10.2026): Einrichten und Anpassen nur im Büro
        : Z.ansicht === "umsatzheute" ? umsatzLadenView(Z.stand) // Laden-Umbau (20.10.2026)
        : Z.ansicht === "laeden" ? laedenView(Z.wurzel)
        : Z.ansicht === "beleg" ? belegView(Z.stand)
        : Z.ansicht === "abschluss" ? abschlussView(Z.stand)
        : Z.ansicht === "kartefoto" ? karteFotoSchirm()
        : Z.ansicht === "vergleich" ? vergleichView(Z.stand)
        : Z.ansicht === "preisrunde" ? preisrundeView(Z.stand) // Masterauftrag 1.2 (28.10.2026)
        : Z.ansicht === "ware" ? wareView(Z.stand, { datum: heuteGeschaeft() }) // Masterauftrag Welle 2
        : Z.ansicht === "portion" ? portionView(Z.stand) // Masterauftrag 2.1
        : Z.ansicht === "inventur" ? inventurView(Z.stand)
        : Z.ansicht === "verkauf" ? verkaufView(Z.stand) // E7 (17.10.2026)
        : Z.ansicht === "bestand" ? bestandView(Z.stand) // Bestand (17.10.2026)
        : Z.ansicht === "aktionen" ? aktionenView(Z.stand) // Stufe 1 (17.10.2026)
        : Z.ansicht === "tafel" ? tafelView(Z.stand) // Menütafel (18.10.2026)
        : Z.ansicht === "hinweise" ? hinweiseMitHm() // Hinweis-Karten (23.10.2026); Lauf 3: Takt des Hinweis-Motors merken
        : Z.ansicht === "geld3" ? geld3View(Z.stand) // Welle 3 Bildpaket W3 (hinter Schalter)
        : Z.ansicht === "getraenke" ? getraenkeView(Z.stand) // Getränke (18.10.2026)
        : Z.ansicht === "lieferanten" ? lieferantenView(Z.stand) // Lieferanten (18.10.2026)
        : Z.ansicht === "kuehlware" ? kuehlWareView(Z.stand) // Trennung (17.10.2026), Punkt 4
        : Z.ansicht === "personal" ? personalView(Z.stand) // D
        : Z.ansicht === "ordner-amt" ? ordnerAmtView(Z.stand)
        : Z.ansicht === "ordner-steuer" ? ordnerPaketView(Z.stand, "steuer")
        : Z.ansicht === "ordner-buch" ? ordnerPaketView(Z.stand, "buch")
        : startView(Z.stand, { aktualisierung: !!Z.aktualisierung, wurzel: Z.wurzel, ...zekiLage(), sicherungTage: sicherungStufe(Z.wurzel)?.tage ?? null, home: homeLage() });
      Z.root.innerHTML = `<div class="schirm">${v}</div>`;
      zekiGesehenMerken(Z.root.querySelector("[data-zeki-key]")?.dataset.zekiKey); zekiStimmeEinsetzen(Z.root); zekiBildschirm(); zekiTaktStarten();
      if (Z.ansicht === "start" && !Z.stand.fuehrung && modus(Z.wurzel) === "laden" && !personalAktiv() && !fuehrungOffen()) // erster Besuch auf Heute: Führung mit Zeki
        { const nr = Z.eingabeNr; setTimeout(() => { if (Z.ansicht !== "start" || Z.stand.phase !== "app" || Z.eingabeNr !== nr || Z.stand.fuehrung || (Z.wurzel?.betriebe || []).some((b) => b.fuehrung) || fuehrungOffen() || kurzOffen()) return; /* 03.11.2026: Rundgang je Gerät einmal – auch nicht nach dem Einlesen eines Ladens ohne Merker */ if (testHaken("__gcFuehrungZeigen")) fuehrungStarten(document, rundgangApi()); /* Testhaken: der lange Mitmach-Rundgang (12 Stationen) bleibt prüfbar */ else kurzStarten(document, { fertig: () => { rundgangAbschliessen(Z.stand, "kurz"); ereignis("rundgang-kurz", { laden: Z.stand.id }); ohneStempelSpeichern(); if (Z.ansicht === "start" && Z.stand.phase === "app") zeichne(); /* K3 Runde 2 (01.11.2026): Heute sofort neu, damit der Home-Hinweis nicht erst nach einem Tabwechsel kommt */ } }); /* 6b R1 live (Baris 30.10.2026): kurzer Rundgang statt 12 Stationen; „Fertig“ und „Überspringen“ merken „gesehen“ */ }, 400); } // Mitmach-Rundgang (28.10.2026); U3 (30.10.2026): nicht mehr, wenn der Chef inzwischen getippt hat oder in der Einrichtung/Mengenfrage ist
      else if (Z.ansicht === "start" && modus(Z.wurzel) === "laden" && !personalAktiv() && !fuehrungOffen()) introStarten(document); // höchstens einmal je App-Start
      eigeneFotosLaden();
    }
  } catch (e) {
    console.error(e);
    notfallSeite();
  }
  if (!speicherVerfuegbar() || Z.speicherProblem) {
    const b = document.createElement("div"); b.className = "tipp warnband"; b.style.margin = "12px 20px 0";
    b.classList.add("speicherband"); b.textContent = Z.speicherProblem ? speicherText(Z.speicherProblem) : t("einstellungen.speicherFehlt");
    Z.root.prepend(b);
  }
  if (kennung !== Z.letzterSchirm) { Z.ruheBis = Date.now() + 250; meldungBeiWechsel(); }
  Z.letzterSchirm = kennung; Z.gezeichneterTag = tagStand();
  window.scrollTo(0, y);
}

// Fehlerseite (Rettung, 17.10.2026): eine Sicherung einlesen geht hier OHNE Büro-Code – sie ersetzt dann den kaputten Stand
// (Rückfrage vorher). Das Passwort der Sicherung (E5) bleibt Pflicht. Im Personal-Modus wird wie sonst zusammengeführt, nicht ersetzt.
// „Alles löschen“ bleibt mit Büro-Code (dort hilft „Code vergessen?“).
function notfallSeite() {
  Z.notfall = true; blattSchliessen();
  const ersetzen = modus(Z.wurzel) !== "personal";
  Z.root.innerHTML = `<div class="schirm"><div class="inhalt">
      <h1 class="frage">${esc(t("einstellungen.fehlerTitel"))}</h1><p class="hinweis">${esc(t("einstellungen.fehlerText"))}</p>
      ${ersetzen ? `<p class="hinweis">${esc(t("rettung.fehlerOhneCode"))}</p>` : ""}
      <label class="knopf zweit mitte">${esc(t("einstellungen.importieren"))}<input type="file" accept="application/zip,.zip,application/json,.json" data-f="import"${ersetzen ? ' data-ersetzen="1"' : ""} class="versteckt"></label>
      <button type="button" class="knopf warn" data-a="loeschen">${esc(t("einstellungen.loeschenAlles"))}</button></div></div>`;
}

// Trennung (17.10.2026): Sprache setzen und dabei den Namen des Beispiel-Ladens nachziehen (vorher schrieb das Zeichnen ihn bei jedem Bild).
function setzeSprache(code, danach) {
  setzeSpracheI18n(code, () => { beispielNamenFolgen(Z.wurzel, t("beispiel.name")); if (danach) danach(); });
  beispielNamenFolgen(Z.wurzel, t("beispiel.name"));
}

// Speisekarte fotografieren aus der App heraus (Karte → „Speisekarte fotografieren"): dieselben Bausteine wie im Schnellstart.
function karteFotoSchirm() {
  return `<div class="inhalt">${karteZeigtPruefliste() ? kartePruefenView(Z.stand) : karteFotoView(Z.stand)}
      ${karteFussKnopf("")}
      ${!karteZeigtPruefliste() && !fotoLauf() && !Z.stand.gerichte.length ? `<button type="button" class="knopf zweit" data-a="bearbeiten" data-schritt="karte" data-bis="ergebnis">${esc(t("start.karteAnlegen"))}</button>` : ""}
      <button type="button" class="leise" data-a="nav" data-wert="${modus(Z.wurzel) === "buero" ? "kartebuero" : "start"}">${esc(t("allgemein.zurueck"))}</button></div>${nav("kartebuero")}`; // Persona-Test 27.10.: aus dem Laden zurück zu Heute
}

function zeichneOnboarding() {
  // E: Kennung des sichtbaren Schritts – Trennung (17.10.2026): gemerkt in schrittBetreten(), nicht mehr beim Zeichnen
  const SCHRITTE = schritteFuer(Z.stand);
  const i = Math.min(Z.stand.schritt, SCHRITTE.length - 1);
  const s = SCHRITTE[i];
  const bearbeitet = !!Z.stand.rueckkehr;
  const zeigeFortschritt = s.id !== "sprache" && !bearbeitet;
  const kannZurueck = i > 0 || Z.stand.rueckkehr || Z.wurzel.betriebe.length > 1;
  Z.root.innerHTML = `
    <div class="schirm weg-${esc(Z.stand.weg)} schritt-${esc(s.id)}">
      <div class="kopf">
        ${zeigeFortschritt ? `<div class="fortschritt" aria-hidden="true">${SCHRITTE.slice(1).map((x, j) => `<i class="${j + 1 <= i ? "da" : ""}"></i>`).join("")}</div>` : ""}
        <div class="kopfzeile">
          ${kannZurueck ? `<button type="button" class="zurueck" data-a="zurueck">‹ ${esc(t("allgemein.zurueck"))}</button>` : "<span></span>"}
          ${zeigeFortschritt ? `<span class="schrittzahl">${esc(t("allgemein.schrittVon", i, SCHRITTE.length - 1))}</span>` : bearbeitet ? `<span class="schrittzahl">${esc(t("allgemein.bearbeiten"))}</span>` : ""}
        </div>
      </div>
      <div class="inhalt">${s.view(Z.stand, Z.wurzel)}</div>
      <div class="fuss">${s.fuss ? s.fuss(Z.stand) : ""}${i === 0 && Z.wurzel.betriebe.length === 1 ? `<label class="leise ob-import">${esc(t("einstellungen.importieren"))}<input type="file" accept="application/zip,.zip,application/json,.json" data-f="import" class="versteckt"></label>` : ""}</div>
    </div>`;
  if (bearbeitet && Z.stand.rueckkehr.bis === s.id) { const k = Z.root.querySelector('.fuss [data-a="weiter"]'); if (k) k.textContent = t("allgemein.uebernehmen"); }
  // Am Rechner das erste leere Textfeld fokussieren; am Handy nicht, sonst springt die Tastatur ungefragt hoch.
  const erstes = Z.root.querySelector("input.textfeld, .zahlfeld input");
  if (erstes && !erstes.value && i > 0 && !/Mobi|Android/i.test(navigator.userAgent)) erstes.focus();
}

// ---------- Ablauf ----------
// Bearbeiten aus der App heraus: stand.rueckkehr = { von, bis } – nach Schritt „bis" geht es zurück zur App.
// Neuer Laden aus der App heraus: stand.neuAus = id des vorherigen Ladens – „Zurück" auf Schritt 1 geht zu dem zurück.

const ctx = {
  setzeSprache(code) { Z.wurzel.sprache = code; setzeSprache(code, () => zeichne()); },
  weiter(art) { schrittWeiter(art); },
  zurueck() { schrittZurueck(); },
  fertig(ziel) { fertig(ziel); },
  meldung(text) { meldung(text); }, // Richtpreise (17.10.2026): Schritte dürfen eine kurze Meldung zeigen
};

async function schrittWeiter(art = "fertig") {
  if (Z.wechselt) return; Z.wechselt = true;
  try {
    const SCHRITTE = schritteFuer(Z.stand);
    const s = SCHRITTE[Z.stand.schritt];
    if (s.beimVerlassen) s.beimVerlassen(Z.stand);
    await ereignis(art === "uebersprungen" ? "schritt-uebersprungen" : "schritt-fertig", { schritt: s.id, laden: Z.stand.id });
    if (Z.stand.rueckkehr && Z.stand.rueckkehr.bis === s.id) { zurueckZurApp(); }
    else if (Z.stand.schritt < SCHRITTE.length - 1) {
      Z.stand.schritt += 1; schrittBetreten(); history.pushState({ schritt: Z.stand.schritt }, "");
      await ereignis("schritt-start", { schritt: SCHRITTE[Z.stand.schritt].id, laden: Z.stand.id });
    }
    speichern(Z.wurzel); zeichne();
  } finally { Z.wechselt = false; }
}

function schrittZurueck() {
  const SCHRITTE = schritteFuer(Z.stand);
  const s = SCHRITTE[Z.stand.schritt];
  if (s?.id === "karte-foto" && hatVorschlaege()) { fotoZuruecksetzen(); zeichne(); return; } // erst die Prüfliste verwerfen, dann zurück
  if (s.zurueck && s.zurueck(Z.stand)) { speichern(Z.wurzel); zeichne(); return; }
  if (Z.stand.rueckkehr && (Z.stand.rueckkehr.von === s.id || Z.stand.schritt === 0)) { zurueckZurApp(); }
  else if (Z.stand.schritt > (Z.stand.neuAus ? 1 : 0)) { Z.stand.schritt -= 1; schrittBetreten(); ereignis("schritt-zurueck", { schritt: SCHRITTE[Z.stand.schritt].id }); }
  else if (Z.wurzel.betriebe.length > 1) {
    // Ein noch leerer neuer Laden wird wieder verworfen, wenn der Nutzer auf dem ersten Schritt zurück geht.
    const alt = Z.stand; const ziel = alt.neuAus && Z.wurzel.betriebe.some((b) => b.id === alt.neuAus) ? alt.neuAus : Z.wurzel.betriebe.find((b) => b.id !== alt.id).id;
    if (!alt.betrieb.name && !alt.kosten.length && !alt.gerichte.length) Z.wurzel.betriebe = Z.wurzel.betriebe.filter((b) => b.id !== alt.id);
    aktivSetzen(ziel); Z.ansicht = "laeden";
    zeichne(); sofortSpeichern(Z.wurzel); return;
  }
  speichern(Z.wurzel); zeichne();
}

function zurueckZurApp() { Z.ansicht = Z.stand.rueckkehr?.ansicht || "start"; Z.stand.rueckkehr = null; Z.stand.phase = "app"; }

async function fertig(ziel = "start") {
  if (Z.wechselt) return; Z.wechselt = true;
  try {
    Z.stand.phase = "app"; Z.stand.rueckkehr = null; delete Z.stand.neuAus;
    if (ziel === "vorlagen") { // Gremium 1 (24.10.2026): Karte aus Vorlagen gleich nach der Einrichtung – die Schritte Karte → Rezepte → Preise, zurück auf Heute
      Z.ansicht = "start"; await ereignis("onboarding-fertig", { laden: Z.stand.id }); dauerhaftAnfragen(); await sofortSpeichern(Z.wurzel);
      Z.wechselt = false; bearbeiten("karte", "verkauf"); zeichne(); return; // bis Verkaufspreise (Nachtest Gremium 1: „preise“ = Einkaufspreise, danach fehlten die Verkaufspreise)
    }
    { const nz = navZiel(Z.wurzel, ziel); if (nz.buero) modusSetzen(Z.wurzel, "buero"); Z.ansicht = nz.ansicht; } // Einrichtung macht der Inhaber: „Beleg fotografieren" am Ende führt ins Büro
    await ereignis("onboarding-fertig", { laden: Z.stand.id });
    const pinWunsch = !!Z.stand.pinFestlegen; delete Z.stand.pinFestlegen; // W2-S (p07 H1): „Büro-Code festlegen" öffnet gleich das Code-Blatt
    dauerhaftAnfragen(); // W2-D
    await sofortSpeichern(Z.wurzel); zeichne();
    if (pinWunsch) { history.pushState({ blatt: true }, ""); pinStarten("setzen", null, Z.wurzel); }
  } finally { Z.wechselt = false; }
}

function bearbeiten(vonId, bisId) {
  ({ von: vonId, bis: bisId } = bearbeitenZiel(Z.stand, vonId, bisId)); // 17.10.2026 Fehler F1: ohne Gerichte erst die Gerichte-Auswahl
  const i = schrittIndex(vonId); if (i < 0) return;
  Z.stand.weg = "genau"; // Bearbeiten nutzt immer die einzelnen Schritte
  Z.stand.phase = "onboarding"; Z.stand.schritt = i; Z.stand.rueckkehr = { von: vonId, bis: bisId || vonId, ansicht: ["einstellungen", "karte", "kartebuero", "inventur", "buero"].includes(Z.ansicht) || (modus(Z.wurzel) === "buero" && !Z.ansicht.startsWith("ordner-") && Z.ansicht !== "kartefoto") ? Z.ansicht : Z.ansicht === "kartefoto" ? "kartebuero" : Z.ansicht.startsWith("ordner-") ? "buero" : "start" }; // 17.10.2026 Fehler F1: aus „Karte per Foto“ zurück zur Speisekarte
  schrittBetreten();
  ereignis("bearbeiten", { schritt: vonId });
  history.pushState({ schritt: i }, "");
  speichern(Z.wurzel); zeichne();
}

// Mitmach-Rundgang (28.10.2026, 7.4): Tipp aufs Gericht (Laden-Karte) oder „Jetzt“ (Heute) → sofort die erste Mengenfrage.
// Ohne Kennung nimmt Zeki das nächste geschätzte Gericht (meistverkauft zuerst). Danach geht es zurück dorthin, wo der Chef herkam.
function rezeptDirekt(gid, { max = 3 } = {}) {
  const g = gid ? Z.stand.gerichte.find((x) => x.id === gid) : naechstesRezept(Z.stand);
  if (!g) return bearbeiten("karte", "rezepte");
  rezeptDirektOeffnen(Z.stand, g.id, { max });
  ereignis("rezept-direkt", { laden: Z.stand.id, ort: Z.ansicht });
  return bearbeiten("rezepte");
}

// Mitmach-Rundgang (28.10.2026): Rückrufe für js/screens/rundgang.js. Hier wird geschrieben (Übungsmodus, Rezept behalten, Ende);
// der Rundgang selbst zeigt nur an. Während der Übung ist Speichern pausiert – ein Abbruch oder Neuladen lässt den alten Stand stehen.
// Die Station steht im Browser (localStorage, nur Komfort): nach dem Neuladen geht es dort weiter.
const RG_SCHLUESSEL = "gastrocash-rundgang";
// app.js sofortSpeichern(w) reicht { stempel } nicht weiter – darum hier direkt (Merkzeichen und Zeki-Verlauf ändern den Zeitstempel nicht)
const ohneStempelSpeichern = () => { personNachtragen(); return sofortSpeichernStore(Z.wurzel, { stempel: false }); };
const RG_ZURUECK = { karte: () => karteLadenZuruecksetzen(), muell: () => { tagZuruecksetzen(); muellZuruecksetzen(); }, kuehl: () => kuehlZuruecksetzen(), start: () => umsatzLadenZuruecksetzen() };
function rundgangApi() {
  return {
    log: (e) => { const x = { t: new Date().toISOString(), ...e }; if (Z.uebung) Z.uebungLog.push(x); else if (Z.stand) { zekiLogAnhaengen(Z.stand, x); ohneStempelSpeichern(); } }, // nur Zeki-Verlauf: kein neuer Zeitstempel
    ansicht: () => Z.ansicht, phase: () => Z.stand?.phase, modus: () => modus(Z.wurzel),
    gehe: (ziel) => { if (!Z.stand || Z.stand.phase !== "app") return; blattSchliessen(); if (modus(Z.wurzel) !== "laden") modusSetzen(Z.wurzel, "laden"); RG_ZURUECK[ziel]?.(); Z.ansicht = ziel; zeichne(); },
    fortsetzen: () => { try { const x = JSON.parse(localStorage.getItem(RG_SCHLUESSEL) || "null"); return x && x.laden === Z.stand.id ? Number(x.station) || 0 : 0; } catch { return 0; } },
    merken: (nr) => { try { localStorage.setItem(RG_SCHLUESSEL, JSON.stringify({ laden: Z.stand.id, station: nr })); } catch { /* ohne Speicher beginnt der Rundgang vorn */ } },
    uebungStart: async () => { if (Z.uebung) return; await sofortSpeichern(Z.wurzel); Z.uebung = uebungStarten(Z.wurzel); Z.uebungLog = []; Z.rezeptVorher = Z.rezeptNeu = null; speichernPausieren(true); },
    uebungEnde: async () => {
      if (!Z.uebung) return;
      speichernAbbrechen(); alleZuruecksetzen(); blattSchliessen();
      const m0 = Z.uebung.modus; uebungZuruecknehmen(Z.wurzel, Z.uebung); Z.uebung = null; speichernPausieren(false);
      if (m0 === undefined) modusVergessen(Z.wurzel); else modusSetzen(Z.wurzel, m0); // Modus gilt auch je Handy (Gerätespeicher): mit zurücklegen, Stand bleibt byte-gleich
      Z.stand = Z.wurzel.betriebe.find((b) => b.id === Z.wurzel.aktiv) || Z.stand; Z.ansicht = startAnsicht(Z.wurzel);
      for (const e of Z.uebungLog) zekiLogAnhaengen(Z.stand, e); Z.uebungLog = [];
      await ohneStempelSpeichern(); zeichne();
    },
    rezeptId: () => naechstesRezept(Z.stand)?.id || null, rezeptName: () => naechstesRezept(Z.stand)?.name || "",
    rezeptFrage: () => { const g = naechstesRezept(Z.stand); const f = g && waageFragen(Z.stand, g, 1)[0]; return f ? { zutat: f.name, einheit: f.einheit, gericht: g.name } : null; },
    rezeptMerken: () => { Z.rezeptVorher = JSON.stringify(Z.stand.gerichte); Z.rezeptNeu = null; },
    rezeptNachher: () => { if (Z.rezeptVorher !== null && JSON.stringify(Z.stand.gerichte) !== Z.rezeptVorher) Z.rezeptNeu = uebungRezepteMerken(Z.stand); Z.rezeptVorher = null; },
    rezeptGeaendert: () => !!Z.rezeptNeu,
    behalten: async () => { if (!Z.rezeptNeu) return; uebungRezepteBehalten(Z.stand, Z.rezeptNeu); artikelAbgleichen(Z.stand); Z.rezeptNeu = null; ereignis("rundgang-rezept-behalten", { laden: Z.stand.id }); await sofortSpeichern(Z.wurzel); zeichne(); },
    hatRezept: () => rezeptFortschritt(Z.stand).mit > 0,
    kostenLeer: () => !(Z.stand.kosten || []).some((k) => Number(k.betrag) > 0),
    rezeptEintragen: () => rezeptDirekt(null),
    ende: (erg) => { Z.rezeptNeu = null; rundgangAbschliessen(Z.stand, erg); try { localStorage.removeItem(RG_SCHLUESSEL); } catch { /* egal */ } ereignis("rundgang-mitmach", { laden: Z.stand.id, ergebnis: erg }); ohneStempelSpeichern(); /* nur das Merkzeichen „Rundgang gesehen“ */ if (Z.stand.phase === "app") { Z.ansicht = startAnsicht(Z.wurzel); zeichne(); } },
  };
}

// Neuer Laden: Sprache ist schon gewählt, also beginnt der neue Laden beim Format (Schritt 1).
// Strukturänderungen (neuer Laden, Wechsel) werden sofort geschrieben, nicht erst nach der Verzögerung.
async function ladenNeu() {
  const neu = leererBetrieb(); neu.schritt = 1; neu.neuAus = Z.stand.id;
  Z.wurzel.betriebe.push(neu); aktivSetzen(neu.id);
  ereignis("laden-neu", { laden: neu.id, anzahl: Z.wurzel.betriebe.length });
  history.pushState({ schritt: 1 }, "");
  zeichne(); await sofortSpeichern(Z.wurzel);
}

async function ladenWechseln(id) {
  if (!Z.wurzel.betriebe.some((b) => b.id === id)) return;
  aktivSetzen(id); Z.ansicht = Z.stand.phase === "app" ? startAnsicht(Z.wurzel) : Z.ansicht;
  ereignis("laden-wechsel", { laden: id });
  zeichne(); await sofortSpeichern(Z.wurzel);
}

// 27.10.2026 (Persona-Test Personal): eine Meldung hing nach dem Bildschirmwechsel noch über der nächsten Liste. Jetzt: eine Uhr je Meldung
// (eine alte Uhr schließt keine neue Meldung zu früh), und wechselt der Mensch danach den Bildschirm (Tipp, Zurück), geht sie sofort zu.
// Eine Meldung, die mit genau dem Tipp kommt, der den Bildschirm wechselt, bleibt stehen (eingabeNr zählt Tipps und Zurück).
for (const art of ["pointerdown", "keydown"]) document.addEventListener(art, () => { Z.eingabeNr++; }, true);
window.addEventListener("popstate", () => { Z.eingabeNr++; }, true);
function meldung(text) {
  let m = document.querySelector(".meldung");
  if (!m) { m = document.createElement("div"); m.className = "meldung"; document.body.appendChild(m); }
  m.textContent = text; m.classList.add("da"); Z.meldungNr = Z.eingabeNr;
  clearTimeout(Z.meldungUhr); Z.meldungUhr = setTimeout(() => m.classList.remove("da"), 2600);
}
function meldungBeiWechsel() {
  if (Z.eingabeNr <= Z.meldungNr) return;
  const m = document.querySelector(".meldung.da"); if (m) { clearTimeout(Z.meldungUhr); m.classList.remove("da"); }
}

// W2-D: Sicherung als ZIP mit allen Fotos und Belegen; die Größe steht in der Meldung.
// E5 (16.10.2026): passwort = Text → Datei verschlüsselt (.gcs.zip); null → wie bisher. Das Passwort wird hier nur durchgereicht, nie gespeichert.
const groesseText = (n) => n >= 1048576 ? `${(n / 1048576).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
// Laden-Umbau (20.10.2026): mitAblage = false → „Ohne Fotos (klein, für Mail)“. Nach Teilen oder Download fragt das Blatt „Wo liegt sie jetzt?“;
// erst die Antwort „Anderes Gerät, Mail, Cloud“ zählt als Sicherung (sicherungOrtSetzen). „Nur auf diesem Handy“ lässt die Erinnerung weiterlaufen.
async function sicherungTeilen(passwort = null, { mitAblage = true } = {}) {
  let datei0; try { datei0 = await exportDatei(Z.wurzel, { passwort, mitAblage }); } catch (e) { console.warn(e); meldung(t("einstellungen.importFehler")); return; }
  const { blob, name, fingerabdruck, groesse, verschluesselt } = datei0;
  Z.ereignisAnzahl += 1;
  const gelungen = () => { // erst nach Teilen oder Download – und dann erst nach der Antwort auf „Wo liegt sie jetzt?“
    Z.wurzel.letzteSicherungGroesse = groesse;
    meldung(t("einstellungen.exportOk", Z.wurzel.betriebe.length) + ` · ${groesseText(groesse)}` + (fingerabdruck ? ` · ${fingerabdruck}` : ` · ${t("einstellungen.ohnePruefsumme")}`) + ` · ${t(verschluesselt ? "passwort.mit" : "passwort.ohneKurz")}`);
    sofortSpeichern(Z.wurzel); zeichne();
    if (!blattOffen()) history.pushState({ blatt: true }, ""); ortFrageZeigen();
  };
  const datei = new File([blob], name, { type: "application/zip" });
  if (navigator.canShare && navigator.canShare({ files: [datei] })) {
    try { await navigator.share({ files: [datei], title: "GastroCash" }); gelungen(); return; } catch (e) { if (e.name === "AbortError") return; }
  }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000); gelungen();
}

// Einlesen führt zusammen: gleiche Laden-Kennung wird je Bereich zusammengeführt, neue Läden kommen dazu (W2-D: ZIP oder alte JSON).
// E5 (16.10.2026): verschlüsselte Datei → Blatt fragt nach dem Passwort; die Datei wartet in einleseDatei, bis das Passwort stimmt oder das Blatt zugeht.
// Datensicherung (28.10.2026, Bauplan Prompt 12): Vorschau „wie viele Tage, von wann bis wann“ vor dem Einlesen
const zeitraumZeile = (w) => { const z = sicherungZeitraum(w); if (!z.tage) return ""; const d = (x) => datumText(new Date(x + "T12:00:00"), { day: "2-digit", month: "2-digit", year: "numeric" }); return t("einstellungen.importZeitraum", z.tage, d(z.von), d(z.bis)) + " "; };
// Lauf 6, E5-Draht (4): Fehlergrund des Einlesens → Satz. „neuer“ und „gross“ haben eigene Sätze (js/data/l6y_texte.js), alles andere bleibt die bisherige Meldung.
function einlesenFehlerText(e) {
  if (e?.grund === "neuer") return l6yText("neuer", aktuelleSprache());
  if (e?.grund === "gross") return l6ySatz("zuGross", aktuelleSprache(), e.maxMB ?? 200);
  return t("einstellungen.importFehler");
}
// „Einlesen rückgängig machen“: Info über den Rückholpunkt kommt asynchron (IndexedDB) – beim Start und nach jedem Einlesen holen, die Ansicht bekommt nur den Zustand.
async function rueckholInfoHolen() { try { Z.rueckholInfo = await rueckholpunktInfo(); } catch (_) { Z.rueckholInfo = null; } if (Z.stand?.phase === "app" && Z.ansicht === "einstellungen") zeichne(); }
async function sicherungZurueckholen() {
  if (!Z.rueckholInfo || !confirm(l6yText("rueckgaengig", aktuelleSprache()))) return;
  const r = await zurueckholen(Z.wurzel);
  if (!r) { meldung(t("einstellungen.importFehler")); await rueckholInfoHolen(); return; }
  speichernAbbrechen(); alleZuruecksetzen(); blattSchliessen();
  Z.wurzel = r.wurzel; Z.stand = null; aktivSetzen(Z.wurzel.aktiv);
  await ladeSprache(Z.wurzel.sprache || spracheDesGeraets()).catch(() => {}); setzeSprache(Z.wurzel.sprache || spracheDesGeraets(), () => zeichne());
  await sofortSpeichern(Z.wurzel); await ereignis("einlesen-rueckgaengig", { zeit: r.zeit }); Z.ereignisAnzahl = (await alleEreignisse()).length;
  if (!ansichtErlaubt(Z.wurzel, Z.ansicht)) Z.ansicht = startAnsicht(Z.wurzel);
  Z.rueckholInfo = null; await rueckholInfoHolen();
  meldung(l6yText("zurueckgeholt", aktuelleSprache())); zeichne();
}
async function sicherungEinlesen(datei, passwort = null, { ersetzen = Z.einleseErsetzen } = {}) {
  Z.einleseErsetzen = !!ersetzen && Z.notfall && modus(Z.wurzel) !== "personal"; // Rettung (17.10.2026): nur von der Fehlerseite
  let r;
  try { r = await importSicherung(datei, { passwort }); }
  catch (e) {
    if (e.grund === "passwort") { passwortMeldung(t("passwort.falsch")); return; } // Blatt bleibt offen
    console.warn(e); blattSchliessen(); meldung(einlesenFehlerText(e)); return;
  }
  if (r.passwortNoetig) { Z.einleseDatei = datei; if (!blattOffen()) history.pushState({ blatt: true }, ""); passwortStarten("einlesen"); return; }
  blattSchliessen(); Z.einleseDatei = null;
  const ersetzenJetzt = Z.einleseErsetzen; Z.einleseErsetzen = false;
  return ersetzenJetzt ? sicherungErsetzen(r) : sicherungUebernehmen(r);
}
async function sicherungUebernehmen(gelesen) {
  try {
    const { wurzel: importiert, ereignisse, pruefsumme, ablage } = gelesen;
    if (pruefsumme !== "ok") { await ereignis("import-pruefsumme", { pruefsumme }); if (!confirm(t(pruefsumme === "abweichung" ? "einstellungen.pruefsummeFalsch" : "w2d.pruefsummeFehlt"))) return; } // W2-D: Rückfrage vor dem Einlesen
    const gleich = importiert.betriebe.filter((b) => Z.wurzel.betriebe.some((x) => x.id === b.id)).map((b) => b.betrieb.name || t("start.hallo", ""));
    const neu = importiert.betriebe.filter((b) => !Z.wurzel.betriebe.some((x) => x.id === b.id)).map((b) => b.betrieb.name || t("start.hallo", ""));
    if (!confirm(zeitraumZeile(importiert) + t("einstellungen.importFrage", neu, gleich))) return; // Datensicherung 28.10.2026: Tage und Zeitraum zuerst
    const leerVorher = Z.stand && Z.stand.phase === "onboarding" && !Z.stand.betrieb.name && !Z.stand.kosten.length && !Z.stand.gerichte.length ? Z.stand.id : null;
    const r = (await einlesenSicher(Z.wurzel, importiert)).bericht; // Lauf 6, E5-Draht (4): sicher, mit Rückholpunkt
    if (leerVorher && Z.wurzel.betriebe.length > 1) { Z.wurzel.betriebe = Z.wurzel.betriebe.filter((b) => b.id !== leerVorher); if (Z.wurzel.aktiv === leerVorher) Z.wurzel.aktiv = importiert.aktiv; }
    alleZuruecksetzen(); Z.stand = null; aktivSetzen(Z.wurzel.aktiv); // der eigene aktive Laden bleibt, die Datei ändert ihn nicht; Bildschirm-Zustände gehören zum alten Objekt
    const fotos = ablage.length ? await ablageAusSicherung(ablage, ablageZuruecklegen) : { neu: 0, kaputt: 0, da: 0 };
    delete Z.wurzel.ladeFehler; // eine Sicherung ist eingelesen: die Meldung über fehlende Teile ist erledigt
    setzeSprache(Z.wurzel.sprache || spracheDesGeraets(), () => zeichne());
    await sofortSpeichern(Z.wurzel); await ereignisseUebernehmen(ereignisse); await ereignis("import", { anzahl: ereignisse.length, neu: neu.length, gleich: gleich.length, pruefsumme, fotos: fotos.neu, fotosKaputt: fotos.kaputt, beide: r.beide, zukunft: r.zukunft, konflikte: r.konflikte });
    Z.ereignisAnzahl = (await alleEreignisse()).length; await rueckholInfoHolen();
    Z.ansicht = Z.wurzel.betriebe.length > 1 ? "laeden" : "start"; if (Z.stand.phase === "onboarding") Z.ansicht = "start";
    const zusatz = [fotos.neu ? t("w2d.importFotos", fotos.neu) : "", fotos.kaputt ? t("w2d.importFotosKaputt", fotos.kaputt) : "", r.zukunft ? t("w2d.importZukunft", r.zukunft) : "", r.beide.length ? t("w2d.importBeide") : "", !Z.wurzel.bueroPin ? t("w2d.importOhneCode") : ""].filter(Boolean).join(" ");
    meldung(t(pruefsumme === "ok" ? "einstellungen.importOk" : pruefsumme === "abweichung" ? "einstellungen.importTrotzAbweichung" : "einstellungen.importOhnePruefsumme") + (zusatz ? " " + zusatz : "")); zeichne();
  } catch (e) { console.warn(e); meldung(einlesenFehlerText(e)); }
}

// Rettung (17.10.2026): Fehlerseite – die Sicherung ersetzt den Stand auf diesem Handy. Büro-Code, Rettungscode und Fehlversuche bleiben (rettung.js).
async function sicherungErsetzen(gelesen) {
  try {
    const { wurzel: importiert, ereignisse, pruefsumme, ablage } = gelesen;
    if (pruefsumme !== "ok") { await ereignis("import-pruefsumme", { pruefsumme }); if (!confirm(t(pruefsumme === "abweichung" ? "einstellungen.pruefsummeFalsch" : "w2d.pruefsummeFehlt"))) return; }
    const namen = importiert.betriebe.map((b) => b.betrieb?.name || t("ebene.deinLaden"));
    if (!confirm(zeitraumZeile(importiert) + t("rettung.ersetzenFrage", namen.join(", ")))) return;
    speichernAbbrechen(); alleZuruecksetzen(); blattSchliessen();
    Z.wurzel = wurzelErsetzen(Z.wurzel || leereWurzel(), importiert); Z.stand = null; aktivSetzen(Z.wurzel.aktiv);
    const fotos = ablage?.length ? await ablageAusSicherung(ablage, ablageZuruecklegen) : { neu: 0, kaputt: 0, da: 0 };
    await ladeSprache(Z.wurzel.sprache || spracheDesGeraets()).catch(() => {}); setzeSprache(Z.wurzel.sprache || spracheDesGeraets());
    await sofortSpeichern(Z.wurzel); await ereignisseUebernehmen(ereignisse); await ereignis("import-ersetzt", { anzahl: ereignisse.length, laeden: importiert.betriebe.length, pruefsumme, fotos: fotos.neu, fotosKaputt: fotos.kaputt });
    Z.ereignisAnzahl = (await alleEreignisse()).length;
    Z.notfall = false; Z.ansicht = startAnsicht(Z.wurzel);
    meldung(t("rettung.ersetzt") + (fotos.neu ? " " + t("w2d.importFotos", fotos.neu) : "")); zeichne();
  } catch (e) { console.warn(e); meldung(einlesenFehlerText(e)); }
}

// W2-D: dauerhaften Speicher einmal anfragen (nach der Einrichtung); das Ergebnis zeigen die Einstellungen
// Lauf 6, E5 (C): gemerkt wird nur ein „Ja“ (persistGefragt = true). Lehnt der Browser ab, fragt die App beim nächsten Start noch einmal;
// innerhalb eines Starts höchstens einmal (dauerhaftVersucht).
function dauerhaftAnfragen() {
  if (!dauerhaftFaellig(Z.wurzel) || Z.dauerhaftVersucht) return;
  Z.dauerhaftVersucht = true;
  speicherDauerhaftPruefen({ anfragen: true }).then((ok) => { if (ok === true && Z.wurzel && Z.wurzel.persistGefragt !== true) { Z.wurzel.persistGefragt = true; speichern(Z.wurzel); } ereignis("speicher-dauerhaft", { ok }); if (Z.ansicht === "einstellungen") zeichne(); });
}
// Lauf 2 (31.10.2026), Bildpaket D – Baris' Ja am 01.11.2026: Home-Bildschirm-Führung, Rezept-Blatt im Laden und die Klicker-Befunde sind Standard.
// Testhaken window.__gcD.homeGeraet ("ios" | "android") stellt das Gerät nur für Bildproben; sonst zählt der echte Browser.
const probeGeraet = () => testHaken("__gcD")?.homeGeraet || null;
if (typeof window !== "undefined") window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); Z.installAufforderung = e; if (Z.ansicht === "einstellungen") zeichne(); });
// Lage für die Ansichten: null = kein Hinweis. Laden: nur einmal, nicht während des Rundgangs. Büro: immer (Sicherung), auch „liegt schon dort“.
function homeLage({ buero = false } = {}) {
  const g = probeGeraet();
  const z = installZustand(g ? { matchMedia: () => ({ matches: false }), navigator: { userAgent: g === "android" ? "Android" : "iPhone" } } : globalThis);
  if (buero) return { ...z, knopf: !!Z.installAufforderung };
  if (fuehrungOffen() || kurzOffen() || !(Z.stand?.fuehrung || (Z.wurzel?.betriebe || []).some((b) => b.fuehrung)) || !homeHinweisFaellig(Z.wurzel, z)) return null; // erst nach dem Rundgang (03.11.2026: Rundgang je Gerät, also auch im zweiten Laden)
  return z;
}
// W2-D: „Diagnose kopieren“ – Fassung, Browser, Speicher, Anzahl Einträge. Keine Namen, keine Zahlen aus dem Laden.
async function diagnoseKopieren() {
  const sp = await speicherBelegt(); const mb = (n) => (typeof n === "number" ? (n / 1048576).toFixed(1) + " MB" : "?");
  const installiert = (typeof matchMedia === "function" && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  const text = [`GastroCash ${APP_FASSUNG} · Schema ${SCHEMA}`, `Browser: ${navigator.userAgent}`, `Installiert: ${installiert ? "ja" : "nein"} · Offline: ${Z.offlineStand}`,
    `Speicher: ${speicherVerfuegbar() ? "ok" : "nicht verfügbar"} · dauerhaft: ${speicherIstDauerhaft() === null ? "?" : speicherIstDauerhaft() ? "ja" : "nein"} · belegt ${mb(sp?.belegt)} von ${mb(sp?.frei)}`,
    `Läden: ${Z.wurzel.betriebe.length} · Einträge: ${eintraegeZaehlen(Z.wurzel)} · Verlauf: ${Z.ereignisAnzahl}`, `Fehlende Teile: ${(Z.wurzel.ladeFehler || []).length} · Sprache: ${Z.wurzel.sprache || "?"}`].join("\n");
  try { await navigator.clipboard.writeText(text); meldung(t("w2d.diagnoseKopiert")); } catch (_) { window.prompt(t("w2d.diagnose"), text); }
}

// ---------- Ereignisse der Oberfläche (eine Stelle für alles) ----------

// ---------- Ebenen: Laden · Personal · Büro (Entwickler A) ----------

function ebeneWechseln(m, ziel) {
  Z.bueroWeg = []; // 01.11.2026: Ebenenwechsel beginnt den Büro-Weg neu
  if (m === "personal" && !pinGesetzt(Z.wurzel) && !testphaseOhneCode(Z.wurzel)) return; // W2-S: Personal nur mit Büro-Code – außer in der Testphase ohne Code
  if (m === "personal" && modus(Z.wurzel) !== "personal") schichtPersonVergessen(Z.stand); // 27.10.2026 (Persona-Test): Chef gibt das Handy weiter → neu fragen „Wer arbeitet?“, sonst bucht der Nächste unter dem alten Namen
  if (m === "personal") { tagZuruecksetzen(); muellZuruecksetzen(); kuehlZuruecksetzen(); putzplanZuruecksetzen(); } // W2-S: kein gewählter Vortag, keine offene Einrichtung
  modusSetzen(Z.wurzel, m); blattSchliessen();
  Z.ansicht = ziel === "preise" ? "buero" : (ziel || startAnsicht(Z.wurzel)); // Paket 3 (16.10.2026): Nav-Ziel „preise“ = Büro, dann der Schritt Einkaufspreise
  ereignis("modus", { modus: m, laden: Z.stand.id });
  if (m === "buero") history.pushState({ buero: true }, "");
  Z.ruheBis = Date.now() + 350; speichern(Z.wurzel);
  if (m === "buero" && ziel === "preise") return bearbeiten("preise");
  zeichne();
}
// Laden → Büro: mit Code, wenn einer gesetzt ist (Einstellung im Büro), sonst direkt.
 if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => { if (document.hidden) Z.versteckt = Date.now(); else if (Z.versteckt && Date.now() - Z.versteckt > 5 * 60 * 1000) Z.bueroOffenBis = 0; });
function bueroBetreten(ziel = "buero") {
  if (codeAktiv(Z.wurzel) && Date.now() > Z.bueroOffenBis) { if (!blattOffen()) history.pushState({ blatt: true }, ""); pinStarten("buero", ziel, Z.wurzel); return; }
  ebeneWechseln("buero", ziel);
}
// Personal → Laden: nur mit Code (W2-S – das 2-Sekunden-Schloss gibt es nicht mehr).
function personalVerlassen() { ebeneWechseln("laden", "start"); }
// W2-S (p07 M6): Löschen verlangt den Büro-Code, wenn einer gesetzt ist.
function mitCode(zweck, ziel, weiter) {
  if (!codeAktiv(Z.wurzel)) return weiter();
  if (!blattOffen()) history.pushState({ blatt: true }, ""); pinStarten(zweck, ziel, Z.wurzel);
}

// Blätter (Menü, Sprache, Läden, Hilfe, Code) – nur die Hülle ändert sich, der Bildschirm darunter bleibt stehen.
const BLATT_INTERN = new Set(["pin-bio", "menue-auf", "blatt-zu", "hilfe-mehr", "blatt-sprache", "blatt-laeden", "menue-zurueck", "hilfe-auf", "pin-taste", "pin-weg", "passwort-zeigen", "sicherung-teilen", "sicherung-ohne", "sicherung-einlesen", "sicherung-pw-schalter", "sicherung-fotos-schalter", "sicherung-ort", "rettung-start", "rettung-pruefen", "rettung-ok"]); // E5: Passwort-Blatt; Rettung (17.10.2026)
async function ebeneAktion(name, el) {
  if (name === "menue-auf") { if (!blattOffen()) history.pushState({ blatt: true }, ""); menueZeigen(Z.stand, Z.wurzel); return true; }
  if (name === "menue-zurueck") { menueZeigen(Z.stand, Z.wurzel); return true; }
  if (name === "blatt-zu") { blattSchliessen(); Z.einleseDatei = null; Z.einleseErsetzen = false; return true; } // E5: wartende Sicherungsdatei loslassen
  if (name === "hilfe-mehr") { hilfeZeigen(el.dataset.wert, true); return true; } // P6 (2): ganze Hilfe nach „Mehr“
  if (name === "blatt-sprache") { spracheZeigen(); return true; }
  if (name === "blatt-laeden") { laedenZeigen(Z.wurzel); return true; }
  if (name === "hilfe-auf") { if (!blattOffen()) history.pushState({ blatt: true }, ""); hilfeZeigen(Z.ansicht); return true; }
  if (name === "pin-bio") { // Face ID statt Code (27.10.2026)
    const z = pinZweckJetzt(); if (!z || !(await bioPruefen(bioKennung(Z.wurzel)))) return true;
    blattSchliessen();
    if (z.zweck === "buero") { Z.bueroOffenBis = Date.now() + BUERO_OFFEN_MS; ebeneWechseln("buero", z.ziel || "buero"); }
    else if (z.zweck === "personal") personalVerlassen();
    return true;
  }
  if (name === "bio-einrichten") { const id = await bioEinrichten(); if (id) { bioSetzen(Z.wurzel, id); await sofortSpeichern(Z.wurzel); meldung(t("schloss.bioAn")); } else meldung(t("schloss.bioNicht")); zeichne(); return true; }
  if (name === "pin-taste" || name === "pin-weg") {
    const r = await pinTaste(name === "pin-weg" ? "weg" : el.dataset.wert, Z.wurzel);
    if (r?.fehler) { await sofortSpeichern(Z.wurzel); return true; } // W2-S: Fehlversuch-Zähler übersteht einen Neustart
    if (r?.zweck === "buero") { Z.bueroOffenBis = Date.now() + BUERO_OFFEN_MS; ebeneWechseln("buero", r.ziel || "buero"); }
    else if (r?.zweck === "personal") personalVerlassen();
    else if (r?.zweck === "loeschen") await allesLoeschenJetzt(); // W2-S
    else if (r?.zweck === "ladenLoeschen") await ladenLoeschenJetzt(r.ziel); // W2-S
    else if (r?.zweck === "setzen") { await sofortSpeichern(Z.wurzel); if (r.rettungscode) rettungscodeZeigen(r.rettungscode, r.ziel); else nachCodeGesetzt(r.ziel); } // W2-S: danach in Personal; Rettung (17.10.2026): erst den Rettungscode zeigen
    if (r?.zweck && r.zweck !== "setzen") await sofortSpeichern(Z.wurzel); // W2-S: umgestellter Prüfwert / gelöster Zähler
    return true;
  }
  // Rettung (17.10.2026): „Code vergessen?“ → Rettungscode → neuer Büro-Code → neuer Rettungscode. Im Personal-Modus nur am Schloss (Personal verlassen).
  if (name === "rettung-start") { const u = pinZweck(); if (!u || !rettungErlaubt(Z.wurzel, u.zweck)) return true; rettungStarten(u, Z.wurzel); return true; }
  if (name === "rettung-pruefen") {
    if (!rettungOffen() || !rettungErlaubt(Z.wurzel, rettungZiel()?.zweck)) return true;
    rettungMeldung("", { laeuft: true }); // PBKDF2 rechnet – kein zweiter Tipp
    const r = await rettungVersuch(Z.wurzel, rettungWert());
    if (r.gesperrt) { rettungMeldung(rettungWarteText(r.gesperrt), { gesperrt: true }); return true; }
    await sofortSpeichern(Z.wurzel); // Zähler übersteht einen Neustart (wie beim Büro-Code)
    if (r.ok) { pinStarten("setzen", { rettung: rettungZiel() }, Z.wurzel, t("rettung.richtig")); return true; }
    rettungMeldung(r.dauer ? rettungWarteText(r.dauer) : t("rettung.falsch"), { gesperrt: !!r.dauer });
    if (r.dauer) setTimeout(() => rettungMeldung("", {}), r.dauer);
    return true;
  }
  if (name === "rettung-ok") { const z = rettungZiel(); if (modus(Z.wurzel) === "personal" && z?.rettung?.zweck !== "personal") return true; blattSchliessen(); nachCodeGesetzt(z); return true; }
  if (name === "rettung-neu") { // im Büro: neuen Rettungscode anlegen (der alte gilt nicht mehr) – auch der Offen-Hinweis für ältere Läden
    if (modus(Z.wurzel) !== "buero" || !codeAktiv(Z.wurzel)) return true;
    const code = await rettungAnlegen(Z.wurzel); await sofortSpeichern(Z.wurzel);
    if (!blattOffen()) history.pushState({ blatt: true }, ""); rettungscodeZeigen(code, null); return true;
  }
  if (name === "pin-setzen") { if (!blattOffen()) history.pushState({ blatt: true }, ""); pinStarten("setzen", null, Z.wurzel); return true; }
  // E5 (16.10.2026): „Sicherung“ öffnet erst das Passwort-Blatt; geteilt wird mit oder ohne Passwort
  if (name === "export") { if (!blattOffen()) history.pushState({ blatt: true }, ""); passwortStarten("teilen", { tage: sicherungStufe(Z.wurzel)?.tage ?? null }); return true; }
  if (name === "sicherung-pw-schalter") { sicherungSchalter("passwort"); return true; } // Laden-Umbau (20.10.2026)
  if (name === "sicherung-fotos-schalter") { sicherungSchalter("fotos"); return true; }
  if (name === "sicherung-ort") { // Laden-Umbau (20.10.2026): nur „woanders“ setzt die Erinnerung zurück
    const gezaehlt = sicherungOrtSetzen(Z.wurzel, el.dataset.wert);
    blattSchliessen(); meldung(t(gezaehlt ? "ladenSchirm.sicherung.gezaehlt" : "ladenSchirm.sicherung.nurHandyMeldung"));
    ereignis("sicherung-ort", { ort: el.dataset.wert === "woanders" ? "woanders" : "handy" }); await sofortSpeichern(Z.wurzel); zeichne(); return true;
  }
  if (name === "passwort-zeigen") { passwortZeigen(); return true; }
  if (name === "sicherung-ohne") { blattSchliessen(); await sicherungTeilen(null); return true; }
  if (name === "sicherung-teilen" && !sicherungWahl().mitPasswort) { const w = sicherungWahl(); blattSchliessen(); await sicherungTeilen(null, { mitAblage: !w.ohneFotos }); return true; } // Schalter „Mit Passwort“ aus
  if (name === "sicherung-teilen" || name === "sicherung-einlesen") {
    const p = passwortWert();
    if (!passwortGueltig(p)) { passwortMeldung(t("passwort.zuKurz")); return true; }
    passwortMeldung("", { laeuft: true }); // PBKDF2 rechnet – kein zweiter Tipp
    if (name === "sicherung-teilen") { const w = sicherungWahl(); blattSchliessen(); await sicherungTeilen(p, { mitAblage: !w.ohneFotos }); return true; }
    if (!Z.einleseDatei) { blattSchliessen(); return true; }
    await sicherungEinlesen(Z.einleseDatei, p); return true;
  }
  if (name === "rechtsform" && Z.stand.phase === "app") { if (rechtsformSetzen(Z.stand, el.dataset.wert)) { ereignis("rechtsform", { laden: Z.stand.id, wert: el.dataset.wert }); meldung(t("rechtsform.gesetzt")); await sofortSpeichern(Z.wurzel); } zeichne(); return true; } // Rechtsform (23.10.2026)
  if (name.startsWith("g3-") && geld3Aktion(name, el, Z.stand)) { speichern(Z.wurzel); return zeichne(); } // Welle 3
  if (name === "hm-status") { if (hmStatusSetzen(Z.stand, el.dataset.id, el.dataset.status, { datum: heute() })) { ereignis("hm-status", { laden: Z.stand.id, id: el.dataset.id, status: el.dataset.status }); await sofortSpeichern(Z.wurzel); } zeichne(); return true; } // Lauf 3, Hinweis-Motor
  if (name === "hm-frage") { const f = el.dataset.frage, w = el.dataset.wert;
    const wert = w === "ja" ? true : w === "nein" ? false : w === "nie" ? "nie" : el.closest(".hm-frage")?.querySelector(".hm-datum")?.value || "";
    if (hmFrageSetzen(Z.stand, f, wert, { bisHeute: heute() })) await sofortSpeichern(Z.wurzel);
    zeichne(); return true; }
  if (name === "hinweis-status") { if (hinweisStatusSetzen(Z.stand, el.dataset.id, el.dataset.status)) { ereignis("hinweis-status", { laden: Z.stand.id, id: el.dataset.id, status: el.dataset.status }); meldung(t(el.dataset.status === "erledigt" ? "hinweise.erledigtMeldung" : "hinweise.spaeterMeldung")); await sofortSpeichern(Z.wurzel); } zeichne(); return true; } // Hinweis-Karten (23.10.2026)
  if (name === "testphase-code") { testphaseSetzen(Z.wurzel, !testphaseOhneCode(Z.wurzel)); meldung(t(testphaseOhneCode(Z.wurzel) ? "ebene.pin.testphaseAn" : "ebene.pin.testphaseAus")); await sofortSpeichern(Z.wurzel); zeichne(); return true; }
  if (name === "pin-entfernen") { await pinSetzen(Z.wurzel, null); meldung(t("ebene.pin.entfernt")); await sofortSpeichern(Z.wurzel); zeichne(); return true; }
  if (name === "modus") {
    const m = el.dataset.wert;
    if (m === "buero") bueroBetreten();
    else if (m === "personal") { if (pinGesetzt(Z.wurzel) || testphaseOhneCode(Z.wurzel)) ebeneWechseln("personal", "personal"); else { if (!blattOffen()) history.pushState({ blatt: true }, ""); pinStarten("setzen", "personal", Z.wurzel, t("sicherheit.personalBrauchtCode")); } } // W2-S: erst Code festlegen
    else if (m === "laden" && modus(Z.wurzel) === "buero") ebeneWechseln("laden", "start");
    return true;
  }
  if (name === "schloss") { // Personal: Tipp aufs Schloss → immer der Code (W2-S). Ohne Code gibt es keinen Personal-Modus (alter Stand: gleich zurück).
    if (codeAktiv(Z.wurzel)) { if (!blattOffen()) history.pushState({ blatt: true }, ""); pinStarten("personal", null, Z.wurzel); } else personalVerlassen();
    return true;
  }
  return false;
}

// Nach einem neuen Büro-Code (und dem Rettungscode): ziel "personal" → Personal-Modus; ziel { rettung: { zweck, ziel } } → wohin die
// vergessene Code-Abfrage wollte (Büro: gleich hinein; Löschen: zurück, der Wirt tippt noch einmal mit dem neuen Code).
function nachCodeGesetzt(ziel) {
  meldung(t("ebene.pin.gesetzt"));
  if (ziel === "personal") return ebeneWechseln("personal", "personal");
  const u = ziel?.rettung;
  if (u?.zweck === "buero" && !Z.notfall) return ebeneWechseln("buero", u.ziel || "buero");
  if (u?.zweck === "personal" && !Z.notfall) return personalVerlassen(); // vom Personal-Schloss: neuer Code → Laden
  if (Z.notfall) return notfallSeite();
  zeichne();
}

// W2-S: die eigentlichen Löschungen – erst nach dem Code (falls gesetzt), dann noch die Rückfrage
async function ladenLoeschenJetzt(id) {
  const b = Z.wurzel.betriebe.find((x) => x.id === id);
  if (!b || Z.wurzel.betriebe.length < 2 || !confirm(t("einstellungen.ladenLoeschenFrage", b.betrieb.name))) return;
  Z.wurzel.betriebe = Z.wurzel.betriebe.filter((x) => x.id !== id);
  aktivSetzen((Z.wurzel.betriebe.find((x) => x.phase === "app" && !x.beispiel) || Z.wurzel.betriebe.find((x) => x.phase === "app") || Z.wurzel.betriebe[0]).id); // Beispiel-Laden (17.10.2026): zurück zum eigenen Laden
  await ereignis("laden-geloescht", { laden: id, beispiel: !!b.beispiel }); Z.ansicht = "laeden"; await sofortSpeichern(Z.wurzel); return zeichne();
}
// Beispiel-Laden (17.10.2026): zweiter Laden über die Mehr-Laden-Logik; gibt es ihn schon, nur dorthin wechseln. Der eigene Laden bleibt unberührt.
async function beispielAnlegen() {
  const da = Z.wurzel.betriebe.find((b) => b.beispiel);
  if (da) return ladenWechseln(da.id);
  const b = beispielLaden(heuteGeschaeft(), { name: t("beispiel.name"), jetzt: new Date().toISOString() });
  Z.wurzel.betriebe.push(b);
  await ereignis("beispiel-angelegt", { laden: b.id });
  return ladenWechseln(b.id);
}
async function allesLoeschenJetzt() {
  if (!confirm(t("einstellungen.loeschenFrage"))) return;
  speichernAbbrechen(); const geloescht = await allesLoeschen(); if (geloescht) await ablageLeeren(); else if (speicherVerfuegbar()) { meldung(t("w2d.loeschenFehlgeschlagen")); return; } alleZuruecksetzen(); ebeneVergessen(); blattSchliessen(); Z.wurzel = leereWurzel(); Z.stand = null; aktivSetzen(null); Z.ansicht = "start"; Z.ereignisAnzahl = 0; // W2-D: Fotos nur weg, wenn die Daten wirklich gelöscht sind
  setzeSprache(spracheDesGeraets()); return zeichne();
}

const AKTIONS_SPERRE = aktionsSperre();
async function aufKlick(ev) {
  const el = ev.target.closest("[data-a]"); if (!el) return;
  if (el.type === "submit") ev.preventDefault(); // Vorab-Prüfung 03.11.2026 (B5): Formulare der Blätter nie wirklich absenden – der Klick schließt das Blatt, danach meldete Chrome „form is not connected“
  const name = el.dataset.a;
  const jetzt = Date.now(); const nah = Math.hypot(ev.clientX - Z.tippX, ev.clientY - Z.tippY) < 40; const abstand = jetzt - Z.tippZeit; const schnell = abstand < DOPPELTIPP_MS;
  // unter dem Finger liegt jetzt etwas anderes – nur in der Einrichtung und vom Preis-/Rezept-Blatt auf die Tab-Leiste (U1: sonst zählt ein schneller zweiter Tipp)
  const flaecheNeu = !!Z.tippEl && Z.tippEl !== el && !Z.tippEl.isConnected && (Z.stand?.phase === "onboarding" || (Z.tippSchutz && !!el.closest(".tableiste")));
  const prevEl = Z.tippEl;
  Z.tippX = ev.clientX; Z.tippY = ev.clientY; Z.tippZeit = jetzt; Z.tippEl = el; Z.tippSchutz = !!el.closest(".kl-blatt"); // Preis-/Rezept-Blatt zu → Tab-Leiste darunter
  if (nah && !ZAEHL_TIPPS.has(name) && ((schnell && jetzt < Z.ruheBis) || (flaecheNeu && abstand < FLAECHE_NEU_MS))) return; // zweiter Tipp eines Doppeltipps (U1, Vorab-Prüfung B3)
  // Ausschuss Lauf 3 (09.11.2026), P4 B1: Hat der erste Tipp den Bildschirm gewechselt (sein Element ist weg), zählt ein Zähl-Tipp an derselben Stelle
  // binnen 450 ms nicht – sonst bucht der zweite Tipp auf „Müll“ (Heute) gleich eine Kachel. P4 B2: Ein „…-zu“ an derselben Stelle binnen 450 ms nach
  // dem Tipp, der das Blatt geöffnet hat, schließt es nicht wieder. 350 ms = Grenze aus dem Fund (60–350 ms); bewusstes Tippen auf neuem Schirm dauert länger.
  if (nah && abstand < WECHSEL_SCHUTZ_MS && prevEl && prevEl !== el && ((ZAEHL_TIPPS.has(name) && !prevEl.isConnected && prevEl.dataset?.a !== name) || (/(^|-)zu$/.test(name) && !/(^|-)zu$/.test(prevEl.dataset?.a || "")))) return;
  if (!Z.stand && !Z.notfall) return; // Rettung (17.10.2026): auf der Fehlerseite gibt es evtl. keinen Laden – Sicherung einlesen und Löschen gehen trotzdem
  if (modus(Z.wurzel) === "personal" && personalGesperrt(name, el.dataset.wert, heuteGeschaeft())) { if (/^kuehl-einrichtung|^pp-/.test(name) || name === "pp-ansicht") meldung(t("sicherheit.chefRichtetEin")); return; } // W2-S (p02 K2): im Personal-Modus abgewiesen
  if (name === "best-wa" && Z.ansicht === "bestand") { const l = bestandLink(Z.stand, el.dataset.wert); if (l) window.open(l, "_blank", "noopener"); return; } // Lieferanten (18.10.2026): WhatsApp gleich beim Tipp öffnen (vor jedem await, sonst blockt der Browser)

  // Lauf 6, E5 (A): Doppeltipp-Sperre. Solange dieselbe Aktion (Name + Wert + Kennung) mit `await` läuft, startet sie nicht noch einmal –
  // sonst ergab „Tag abschließen“ zweimal getippt (0–30 ms) zwei Abschlüsse. Zähl-Tipps sind ausgenommen (jeder Tipp zählt).
  if (ZAEHL_TIPPS.has(name)) return aufKlickAktion(ev, el, name);
  const sperrSchluessel = aktionsSchluessel(name, el.dataset.wert, el.dataset.id);
  if (!AKTIONS_SPERRE.belegen(sperrSchluessel)) return;
  try { return await aufKlickAktion(ev, el, name); } finally { AKTIONS_SPERRE.freigeben(sperrSchluessel); }
}

async function aufKlickAktion(ev, el, name) {
  // Blätter öffnen/schließen ohne Neuzeichnen; jede andere Handlung aus einem Blatt schließt es zuerst
  if (await ebeneAktion(name, el)) return;
  if (blattOffen() && !BLATT_INTERN.has(name)) blattSchliessen();
  if (name === "vergleich-modus") { vergleichModus(el.dataset.wert); return zeichne(); }
  if (name === "einrichtung-fertig-ok") { einrichtungFertigSetzen(Z.stand); speichern(Z.wurzel); return zeichne(); }
  if (name === "kuehl-keine") { kuehlKeineSetzen(Z.stand); speichern(Z.wurzel); return zeichne(); }
  if (name === "branchen-ok") { branchenMeldungQuittieren(Z.stand); speichern(Z.wurzel); return zeichne(); }
  if (name === "kleinunternehmer") { kleinunternehmerUmschalten(Z.stand); speichern(Z.wurzel); return zeichne(); } // Paket 3 (16.10.2026), M1: keine Vorsteuer – alle Posten Satz 0
  if (name === "waage-vorschlag") { waageVorschlagGesehen(Z.stand, heuteGeschaeft()); speichern(Z.wurzel); return bearbeiten("rezepte"); }
  if (name === "zurueck") return schrittZurueck();
  if (name === "weiter") return schrittWeiter();
  if (name === "bearbeiten") return bearbeiten(el.dataset.schritt, el.dataset.bis);
  if (name === "nav" && el.dataset.wert !== Z.ansicht) { if (Z.ansicht.startsWith("ordner-")) ordnerZuruecksetzen(); if (Z.ansicht === "buero") bueroZuruecksetzen(); } // Entwickler C: Büro zu, wenn es in den Laden geht
  if (name === "nav") { const nz = navZiel(Z.wurzel, el.dataset.wert); if (nz.buero) { Z.bueroWeg = []; return bueroBetreten(nz.ansicht); } // Büro-Bildschirm aus dem Laden: erst ins Büro
    if (modus(Z.wurzel) === "buero") bueroWegFuehren(nz.ansicht, !!el.dataset.zurueck); // 01.11.2026: Zurück im Büro = eine Ebene
    if (nz.ansicht === "preise") return bearbeiten("preise"); // Paket 3 (16.10.2026): Richtwert-Zeile „Preise eintragen“ – im Büro direkt in den Schritt
    const ziel = nz.ansicht; if (ziel !== Z.ansicht) Z.herkunft = Z.ansicht; // Prüfung 15.10.: Zurück führt dorthin, wo man herkam
    if (ziel === "inventur") inventurZuruecksetzen(); // Inventur aus dem Menü: offene Zählung oder Übersicht
    if (ziel === "verkauf") verkaufZuruecksetzen(); // E7 (17.10.2026)
    if (ziel === "bestand") bestandZuruecksetzen(); // Bestand (17.10.2026)
    if (ziel === "aktionen") aktionenZuruecksetzen(); // Stufe 1 (17.10.2026)
    { let sp = null; try { sp = localStorage; } catch { sp = null; } const satz = fuehrungOffen() ? null : erstSatz(ziel, { speicher: sp, stunde: berlin().stunde, stand: Z.stand }); if (satz) setTimeout(() => { if (!fuehrungOffen()) erstZeigen(document, ziel, satz, sp); }, 350); } /* Lauf 3 Nachtrag: nie während des Mitmach-Rundgangs – Zekis Erst-Karte lag über dem Rundgang-Ziel (Station 9), der Tipp traf „Verstanden“ statt das Gericht */ // 6b R2 Entwurf
    if (ziel === "ware") wareZuruecksetzen(); // Welle 2
    if (ziel === "portion") portionOeffnen(Z.stand, el.dataset.id || null); // 2.1
    if (ziel === "preisrunde") preisrundeOeffnen(Z.stand, el.dataset.id || null, el.dataset.cent || null); // Masterauftrag 1.2
    if (ziel === "getraenke") getraenkeZuruecksetzen(); // Getränke (18.10.2026)
    if (ziel === "lieferanten") lieferantenZuruecksetzen(); // Lieferanten (18.10.2026)
    if ((ziel === "aktionen" || ziel === "tafel") && aktionenAbschliessen(Z.stand)) speichern(Z.wurzel); // Aktion planen (18.10.2026): Bilanz beendeter Aktionen festhalten
    if (ziel === "tafel") { const sp = tafelEinstellung(Z.stand).sprache; if (!spracheGeladen(sp)) ladeSprache(sp).then(() => { if (Z.ansicht === "tafel") zeichne(); }); } // Menütafel (18.10.2026)
    if (ziel === "kuehlware") kuehlWareZuruecksetzen(); // Trennung (17.10.2026), Punkt 4
    if (ziel === "umsatzheute") { if (Z.ansicht !== "umsatzheute") Z.herkunft = Z.ansicht; umsatzLadenZuruecksetzen(); } // Laden-Umbau (20.10.2026)
    if (ziel === "putzplan" && modus(Z.wurzel) === "laden" && planSicherstellen(Z.stand)) { ereignis("putzplan-vorschlag", { laden: Z.stand.id }); speichern(Z.wurzel); } // Laden-Umbau (20.10.2026): Vorschlag nach Laden-Art still übernehmen
    if (ziel === "karte" && Z.ansicht !== "karte") karteLadenZuruecksetzen(); // B: Laden-Karte frisch (Filter „Alle“, Blatt zu)
    if (ziel === Z.ansicht) { if (ziel === "muell") muellZuruecksetzen(); if (ziel === "kuehl") kuehlZuruecksetzen(); if (ziel === "beleg") belegZuruecksetzen(); if (ziel === "putzplan") putzplanZuruecksetzen(); } // Menüpunkt der aktuellen Seite: zurück auf deren Anfang
    if (el.dataset.anker) setTimeout(() => document.getElementById(el.dataset.anker)?.scrollIntoView({ block: "start" }), 60); if (ziel === "kartefoto" || Z.ansicht === "kartefoto") fotoZuruecksetzen(); if (ziel !== Z.ansicht) { if (Z.ansicht === "beleg") belegZuruecksetzen(); if (Z.ansicht === "abschluss") abschlussZuruecksetzen(); if (ziel === "muell" || ziel === "umsatz" || ziel === "abschluss") { tagZuruecksetzen(); muellZuruecksetzen(); umsatzZuruecksetzen(); } } Z.ansicht = ziel; return zeichne(); }
  if (name === "diagnose-kopieren") return diagnoseKopieren(); // W2-D
  if (name === "rezept-direkt" && Z.stand.phase === "app") return rezeptDirekt(el.dataset.id || null); // 28.10.2026: Heute „Jetzt“
  if (name === "fehler-melden") { textTeilen(fehlerText(speicherLokal(), { fassung: APP_FASSUNG, sprache: aktuelleSprache(), geraet: navigator.userAgent.replace(/\(.*?\)/g, "").trim().slice(0, 60) }), t("einstellungen.fehler.titel")).then((r) => { if (r === "kopiert") meldung(t("einstellungen.fehler.kopiert")); }); return true; } // P6 (6)
  if (name === "fehler-leeren") { fehlerLeeren(speicherLokal()); return zeichne(); }
  if (name === "monat-blatt") { if (!blattOffen()) history.pushState({ blatt: true }, ""); const H = heuteGeschaeft(); const z = zaehler(Z.stand, { datum: H }); const m = monatsZiel(Z.stand, z, H); 
    monatBlattZeigen(Z.stand, { umsatz: m.umsatz, nullpunkt: m.nullpunkt, ziel: m.ziel, geschaetzt: m.geschaetzt }); return true; } // Bildpaket D (4d): große Zahl → Blatt im Laden
  if (name === "home-weg") { homeHinweisGesehen(Z.wurzel); speichern(Z.wurzel); return zeichne(); } // Bildpaket D (1): Laden-Hinweis einmal, dann weg
  if (name === "home-installieren") { const p = Z.installAufforderung; Z.installAufforderung = null; if (p) { p.prompt(); p.userChoice?.then(() => zeichne()); } return true; }
  if (name === "zeki-erst-wieder") { let sp = null; try { sp = localStorage; } catch { sp = null; } erstWiederZeigen(sp); meldung(t("rundgang.erst.wiederOk")); return true; } // 6b R2 live: Zeki erklärt jede Stelle wieder beim ersten Tipp
  if (name === "zeki-log-loeschen") { const n = zekiLogLoeschen(Z.stand); speichern(Z.wurzel); meldung(datenschutzText(aktuelleSprache())[n ? "zekiGeloescht" : "zekiLeer"]); return zeichne(); } // Datenschutz (27.10.2026)
  if (name === "abgleich-ok") { abgleichHinweisQuittieren(Z.stand); speichern(Z.wurzel); return zeichne(); } // W2-D: Hinweis „Beim Zusammenführen …“ gelesen
  if (name === "foto-abbrechen") { if (fotoLauf()?.zweck === "speisekarte" || hatVorschlaege()) serieAbbrechen(); else fotoZuruecksetzen(); return zeichne(); }
  if (name === "laden-neu") return ladenNeu();
  if (name === "aktualisieren") { if (Z.aktualisierung) { Z.aktualisierungKlick = true; Z.aktualisierung.postMessage("uebernehmen"); } return; }
  if (name === "kuehl-rundgang-start") { if (Z.ansicht === "abschluss") abschlussZuruecksetzen(); Z.ansicht = "kuehl"; if (el.dataset.offen !== "1") { kuehlAktion(modus(Z.wurzel) === "buero" ? "kuehl-rundgang" : "kuehl-rundgang-los", el, Z.stand, Z.wurzel); speichern(Z.wurzel); } return zeichne(); } // Laden-Umbau (20.10.2026): im Laden direkt zur ersten Stelle
  if (name === "kuehl-einrichtung-oeffnen") { Z.ansicht = "kuehl"; kuehlAktion("kuehl-einrichtung", el, Z.stand, Z.wurzel); return zeichne(); }
  if (name === "kuehl-blatt-oeffnen") { Z.ansicht = "kuehl"; kuehlZuruecksetzen(); if (kuehlBereit(Z.stand)) kuehlAktion("kuehl-blatt", el, Z.stand, Z.wurzel); else kuehlAktion("kuehl-einrichtung", el, Z.stand, Z.wurzel); return zeichne(); } // Lauf 2, K2 C4: Büro-Zeile „Kontrollblatt“ öffnet das Blatt selbst
  if (name === "laden-wechseln") return ladenWechseln(el.dataset.id);
  if (name === "laden-loeschen") { if (Z.wurzel.betriebe.length < 2) return; return mitCode("ladenLoeschen", Z.stand.id, () => ladenLoeschenJetzt(Z.stand.id)); } // W2-S: mit Büro-Code
  if (name === "sicherung-zurueckholen") return sicherungZurueckholen(); // Lauf 6, E5-Draht (4)
  if (name === "beispiel-anlegen") return beispielAnlegen(); // Beispiel-Laden (17.10.2026)
  if (name === "beispiel-loeschen") { if (!Z.stand.beispiel || Z.wurzel.betriebe.length < 2) return; return mitCode("ladenLoeschen", Z.stand.id, () => ladenLoeschenJetzt(Z.stand.id)); } // Beispiel-Laden (17.10.2026): gleiche Rückfrage wie „Laden löschen“
  if (name === "loeschen") return mitCode("loeschen", null, () => allesLoeschenJetzt()); // W2-S: mit Büro-Code (auch auf der Fehlerseite)
  if (name === "sprache" && Z.stand.phase === "app") { Z.wurzel.sprache = el.dataset.wert; setzeSprache(Z.wurzel.sprache, () => zeichne()); speichern(Z.wurzel); return zeichne(); }

  if (Z.stand.phase === "onboarding") {
    if (Z.wechselt) return;
    const s = schritteFuer(Z.stand)[Z.stand.schritt];
    if (s.aktion && s.aktion(name, el, Z.stand, ctx)) { speichern(Z.wurzel); if (Z.stand.phase === "onboarding" && !Z.wechselt) zeichne(); }
    return;
  }
  // D: Müll nachtragen aus Büro/Listen (Tag wählen, dann das Foto-Raster für diesen Tag)
  if (name === "muell1-nachtragen") { tagAktion("tag-datum", el, Z.stand); muellZuruecksetzen(); Z.ansicht = "muell"; return zeichne(); }
  // D: Personal-Modus – Person wählen, Kacheln, Zurück zum Personal-Start
  if (Z.ansicht === "personal") {
    const r = personalAktion(name, el, Z.stand); if (!r) return;
    if (r.ziel) {
      const wer = schichtPerson(Z.stand) || "";
      if (r.ziel === "muell") { tagZuruecksetzen(); muellZuruecksetzen(); }
      if (r.ziel === "kuehl") { kuehlZuruecksetzen(); if (kuehlBereit(Z.stand) && !rundgangOffen(Z.stand)) { kuehlAktion("kuehl-rundgang-los", el, Z.stand, Z.wurzel); speichern(Z.wurzel); } } // 27.10.2026 (Persona-Test): Schicht-Person steht fest – kein „Wer misst?“ mit „Los“, gleich die erste Stelle
      if (r.ziel === "putzplan") { putzplanZuruecksetzen(); if (wer) putzplanAktion("pp-wer", { dataset: { id: wer } }, Z.stand); }
      Z.herkunft = "personal"; Z.ansicht = r.ziel;
    }
    return zeichne();
  }
  if (name === "tag-datum" || name === "listen-zeitraum" || (name === "schwund-storno" && Z.ansicht !== "muell")) {
    if (tagAktion(name, el, Z.stand)) { speichern(Z.wurzel); zeichne(); } return;
  }
  if (Z.ansicht === "muell") {
    // D: ein Tipp = eingetragen; nur Kachel, Kopfzahl und Hinweis werden getauscht (kein ganzes Neuzeichnen)
    if (name === "muell-tipp") { if (muellKlickUnterdrueckt()) return; const r = muellTipp(el, Z.stand); if (r) { if (!muellTippZeigen(Z.root, Z.stand)) zeichne(); speichern(Z.wurzel); ereignis("schwund-eintrag", { laden: Z.stand.id, tipp: true }); } return; }
    if (name === "muell1-zurueck") { if (muellTippZurueck(Z.stand, el.dataset.id)) { speichern(Z.wurzel); if (!Z.root.querySelector(".muellraster")) zeichne(); else muellZurueckZeigen(Z.root, Z.stand); } return; }
    if (name === "muell-rueckgaengig") { if (muellRueckgaengig(Z.stand, el.dataset.id)) { speichern(Z.wurzel); meldung(t("muell.zurueckgenommen")); } return zeichne(); }
    const r = muellAktion(name, el, Z.stand);
    if (r) { speichern(Z.wurzel); if (name === "muell-weg-damit") ereignis("schwund-eintrag", { laden: Z.stand.id }); if (r.meldung) meldung(r.meldung); zeichne(); }
  }
  if (Z.ansicht === "umsatz") { if (umsatzAktion(name, el)) zeichne(); }
  if (Z.ansicht === "umsatzheute") { // Laden-Umbau (20.10.2026): „Umsatz heute“ – Speichern, Rückfrage über 100.000 €
    const r = umsatzLadenAktion(name, el, Z.stand, Z.wurzel); if (!r) return;
    if (r === "zeichnen") { zeichne(); Z.root.querySelector('[data-f="ul-umsatz"]')?.focus(); return; }
    if (r.teil) { meldung(r.meldung); ereignis("umsatz-laden", { laden: Z.stand.id }); await sofortSpeichern(Z.wurzel); zeichne(); Z.root.querySelector('[data-f="ul-team-satz"]')?.focus(); return; } // K1: Umsatz gespeichert, Lohn je Stunde fehlt noch
    if (r.meldung) { meldung(r.meldung); return; }
    if (r.gespeichert) { ereignis("umsatz-laden", { laden: Z.stand.id }); await sofortSpeichern(Z.wurzel); if (r.weiter) return zeichne(); Z.ansicht = Z.herkunft === "abschluss" ? "abschluss" : startAnsicht(Z.wurzel); return zeichne(); }
    if (r.fertig) { meldung(t("tag.gespeichert")); await sofortSpeichern(Z.wurzel); Z.ansicht = Z.herkunft === "abschluss" ? "abschluss" : startAnsicht(Z.wurzel); return zeichne(); } // Mitarbeiter heute (27.10.2026)
    return;
  }
  if (Z.ansicht === "karte") { // B: Laden-Karte – Plus/Minus tauschen nur das Blatt aus (Raster und Bilder bleiben stehen)
    const r = karteLadenAktion(name, el, Z.stand);
    if (r === "blatt") { const b = Z.root.querySelector(".kl-blatt"); if (b) { Z.root.querySelector(".kl-dimmer")?.remove(); b.outerHTML = karteLadenBlatt(Z.stand); eigeneFotosLaden(); } else zeichne(); return; }
    if (r && r.gespeichert && r.rezept === true) { artikelAbgleichen(Z.stand); ereignis("rezept-laden", { laden: Z.stand.id, gericht: r.id }); await sofortSpeichern(Z.wurzel); const bl = Z.root.querySelector(".kl-blatt"); if (bl) { Z.root.querySelector(".kl-dimmer")?.remove(); bl.outerHTML = karteLadenBlatt(Z.stand); eigeneFotosLaden(); } else zeichne(); return; } // Bildpaket D (3) B: Menge geändert, Blatt bleibt offen
    if (r && r.rezept && !fuehrungOffen() && karteLadenRezeptBlatt(Z.stand, r.rezept)) return zeichne(); // Bildpaket D (3) B, Ja 01.11.2026: alle Zutaten im Laden-Blatt
    if (r && r.rezept) return rezeptDirekt(r.rezept, { max: fuehrungOffen() ? 1 : 3 }); // 28.10.2026: im Rundgang (und ohne Zutaten) die Mengenfrage
    if (r && r.gespeichert) { ereignis("preis-geaendert", { laden: Z.stand.id, gericht: r.id, vorher: r.vorher ?? null, preis: r.preis, ort: "laden" }); meldung(t("kartelaeden.gespeichert")); await sofortSpeichern(Z.wurzel); return zeichne(); }
    if (r) return zeichne();
  }
  if (Z.ansicht === "kartefoto") {
    if (name === "fv-uebernehmen") { const r = karteUebernehmen(Z.stand); ereignis("karte-foto-uebernommen", { laden: Z.stand.id, neu: r.neu }); meldung(t("foto.uebernommen", r.neu, r.artikel)); Z.ansicht = "kartebuero"; await sofortSpeichern(Z.wurzel); return zeichne(); }
    if (kartePruefenAktion(name, el)) zeichne();
  }
  if (Z.ansicht === "beleg") {
    const r = belegAktion(name, el, Z.stand, Z.wurzel);
    if (r) { if (r.meldung) meldung(r.meldung); if (r === "uebernommen") { ereignis("beleg-uebernommen", { laden: Z.stand.id }); await sofortSpeichern(Z.wurzel); } else speichern(Z.wurzel); zeichne(); }
  }
  if (Z.ansicht === "abschluss") {
    const r = abschlussAktion(name, el, Z.stand, Z.wurzel);
    if (r === "schon") return zeichne(); // Lauf 6, E5 (A): dieser Tag ist schon abgeschlossen – nur die Bilanz zeigen, kein zweiter Abschluss
    if (r) { ereignis("tag-abgeschlossen", { laden: Z.stand.id }); await sofortSpeichern(Z.wurzel); zeichne(); }
  }
  if (Z.ansicht === "putzplan") {
    const r = putzplanAktion(name, el, Z.stand);
    if (r) { if (r === "zurueck") { Z.ansicht = startAnsicht(Z.wurzel); speichern(Z.wurzel); } else if (r === "speichern") await sofortSpeichern(Z.wurzel); return zeichne(); }
  }
  if (Z.ansicht === "inventur") {
    const r = inventurAktion(name, el, Z.stand);
    if (r) {
      if (r === "abgeschlossen") { ereignis("inventur-fertig", { laden: Z.stand.id }); await sofortSpeichern(Z.wurzel); }
      else if (r === "sofort" || r.sofort) await sofortSpeichern(Z.wurzel); else speichern(Z.wurzel);
      if (r.meldung) meldung(r.meldung);
      zeichne();
    }
  }
  if (Z.ansicht === "verkauf") { // E7 (17.10.2026): Verkauf je Gericht
    const r = verkaufAktion(name, el, Z.stand, Z.wurzel);
    if (r) { if (r.speichern) await sofortSpeichern(Z.wurzel); if (r.meldung) meldung(r.meldung); zeichne(); }
    return;
  }
  if (Z.ansicht === "bestand") { // Bestand (17.10.2026): Lager & Bestellen
    const r = await bestandAktion(name, el, Z.stand);
    if (r) { if (r.speichern) await sofortSpeichern(Z.wurzel); if (r.meldung) meldung(r.meldung); zeichne(); }
    return;
  }
  if (Z.ansicht === "kuehlware") { // Trennung (17.10.2026), Punkt 4: Ware nach Kühl-Abweichung – weggeworfen (Müll) oder behalten (Begründung)
    const r = kuehlWareAktion(name, el, Z.stand);
    if (r) { if (r.speichern) await sofortSpeichern(Z.wurzel); if (r.meldung) meldung(r.meldung); zeichne(); }
    return;
  }
  if (Z.ansicht === "ware" && name.startsWith("wa-")) { // Masterauftrag Welle 2
    const r = wareAktion(name, el, Z.stand, { datum: heuteGeschaeft(), jetzt: new Date().toISOString() });
    if (r) { if (r.speichern) await sofortSpeichern(Z.wurzel); if (r.meldung) meldung(r.meldung); zeichne(); }
    return;
  }
  if (Z.ansicht === "portion" && name.startsWith("po-")) { // Masterauftrag 2.1
    const r = portionAktion(name, el, Z.stand, { datum: heuteGeschaeft() });
    if (r) { if (r.speichern) await sofortSpeichern(Z.wurzel); if (r.nav) { Z.ansicht = r.nav; karteLadenZuruecksetzen(); } zeichne(); }
    return;
  }
  if (Z.ansicht === "preisrunde" && name.startsWith("pr-")) { // Masterauftrag 1.2/1.6 (28.10.2026)
    const r = preisrundeAktion(name, el, Z.stand, { datum: heuteGeschaeft() });
    if (r) { if (r.speichern) await sofortSpeichern(Z.wurzel); if (r.meldung) meldung(r.meldung); zeichne(); }
    return;
  }
  if (Z.ansicht === "aktionen") { // Stufe 1 (17.10.2026): Aktionen & Haltbarkeit – Vorschläge; Menütafel (18.10.2026): „Auf die Tafel“ speichert
    const r = await aktionenAktion(name, el, Z.stand);
    if (r) { if (r.speichern) await sofortSpeichern(Z.wurzel); if (r.meldung) meldung(r.meldung); zeichne(); }
    return;
  }
  if (Z.ansicht === "lieferanten") { // Lieferanten (18.10.2026): Liste, Bearbeiten, Waren zuordnen
    const r = lieferantenAktion(name, el, Z.stand);
    if (r) { if (r.speichern) await sofortSpeichern(Z.wurzel); if (r.meldung) meldung(r.meldung); zeichne(); }
    return;
  }
  if (Z.ansicht === "getraenke") { // Getränke (18.10.2026): Felder je Getränk, neues Getränk
    const r = getraenkeAktion(name, el, Z.stand);
    if (r) { if (r.speichern) await sofortSpeichern(Z.wurzel); if (r.meldung) meldung(r.meldung); zeichne(); }
    return;
  }
  if (Z.ansicht === "tafel") { // Menütafel (18.10.2026): Einstellungen, Aktion beenden, Datei teilen
    const r = await tafelAktion(name, el, Z.stand);
    if (r) { if (r.speichern) await sofortSpeichern(Z.wurzel); if (r.meldung) meldung(r.meldung); zeichne(); }
    return;
  }
  if (Z.ansicht === "laeden") { // Eigentümer-Ebene (18.10.2026): Zeitraum, Bericht drucken, CSV
    const r = await laedenAktion(name, el, Z.wurzel);
    if (r) { if (r.meldung) meldung(r.meldung); zeichne(); }
    return;
  }
  if (Z.ansicht === "buero" || Z.ansicht.startsWith("ordner-")) { // Entwickler C
    const r = Z.ansicht === "buero" ? await bueroAktion(name, el, Z.stand, Z.wurzel) : await ordnerAktion(name, el, Z.stand, Z.ansicht);
    if (r) { if (r.speichern) await sofortSpeichern(Z.wurzel); if (r.meldung) meldung(r.meldung); zeichne(); Z.root.querySelector('.b-codefeld')?.focus(); }
    return;
  }
  if (Z.ansicht === "kuehl") {
    const r = kuehlAktion(name, el, Z.stand, Z.wurzel);
    if (r) {
      zeichne();
      const feld = Z.root.querySelector('[data-f="station-wert"]'); if (feld && !feld.value) feld.focus(); // Tastatur gleich hoch, der nächste Schritt ist Tippen
      if (r === "abgeschlossen") { ereignis("rundgang-fertig", { laden: Z.stand.id }); meldung(t("kuehl.abgeschlossen")); await sofortSpeichern(Z.wurzel); } else speichern(Z.wurzel);
    }
  }
}
Z.root.addEventListener("click", aufKlick);
Z.root.addEventListener("toggle", (e) => { const k = e.target?.dataset?.klapp; if (k) { if (e.target.open) offeneKlappen.add(k); else offeneKlappen.delete(k); } }, true); // Entrümpelung Punkt 4
ebeneHuelle()?.addEventListener("click", aufKlick); // Blätter liegen außerhalb von #app

Z.root.addEventListener("contextmenu", (ev) => { if (ev.target.closest('[data-a="schloss"]')) ev.preventDefault(); });
document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && blattSchliessen()) ev.preventDefault(); });

// Eingaben: nicht bei jedem Zeichen neu zeichnen, sonst springt die Tastatur. Nur Stand ändern und speichern.
Z.root.addEventListener("input", (ev) => {
  Z.ruheBis = 0; // wer tippt, hat nicht doppelt getippt
  const el = ev.target.closest("[data-f]"); if (!el || el.type === "file") return;
  if (modus(Z.wurzel) === "personal" && personalFeldGesperrt(el.dataset.f)) return; // W2-S: Einrichtungsfelder wirken im Personal-Modus nicht
  if (el.dataset.f === "sprache-wahl") { Z.wurzel.sprache = el.value; setzeSprache(el.value, () => zeichne()); return; } // Willkommen (19.10.2026): Sprache sofort zeigen
  let neu = false;
  if (Z.stand.phase === "onboarding") {
    const s = schritteFuer(Z.stand)[Z.stand.schritt];
    if (s.eingabe) neu = s.eingabe(el.dataset.f, el.value, Z.stand);
    const zeile = el.closest(".zeile"); const betrag = el.closest(".betrag");
    if (zeile && betrag) { const leer = el.value.trim() === ""; zeile.classList.toggle("offen", leer); betrag.classList.remove("geschaetzt"); betrag.classList.toggle("offen", leer); }
  } else if (Z.ansicht === "karte") { // B: Preis tippen – nur „Bleibt dir“ und Knopf austauschen, Feld behält den Fokus
    if (karteLadenEingabe(el.dataset.f, el.value) === "teil") { const teil = karteLadenTeile(Z.stand); const z = Z.root.querySelector(".kl-bleibt-teil"); if (teil && z) z.outerHTML = teil.bleibt; const k = Z.root.querySelector('[data-a="kl-speichern"]'); if (k && teil) k.disabled = !teil.speichernAn; }
    return; // Entwurf, noch nichts zu speichern
  } else if (Z.ansicht === "kartefoto") {
    neu = kartePruefenEingabe(el.dataset.f, el.value);
  } else if (Z.ansicht === "umsatzheute") { // Laden-Umbau (20.10.2026): nur merken – gespeichert wird mit „Speichern“
    umsatzLadenEingabe(el.dataset.f, el.value); return;
  } else if (Z.ansicht === "umsatz" || Z.ansicht === "abschluss") {
    neu = umsatzEingabe(el.dataset.f, el.value, Z.stand, Z.wurzel);
  } else if (Z.ansicht === "muell") {
    neu = muellEingabe(el.dataset.f, el.value);
    if (neu === "knopf") { neu = false; const k = Z.root.querySelector('[data-a="muell-weg-damit"]'); if (k) k.disabled = !muellFormGueltig(); }
  } else if (Z.ansicht === "beleg") {
    neu = belegEingabe(el.dataset.f, el.value);
    if (neu === "knopf") { neu = false; const k = Z.root.querySelector('[data-a="beleg-zerlegen"]'); if (k) k.disabled = !belegTextDa(); }
    if (neu === "knopf-zw") { neu = false; const k = Z.root.querySelector('[data-a="zw-speichern"]'); const w = parseZahl(el.value); if (k) k.disabled = !(w > 0); }
  } else if (Z.ansicht === "einstellungen") {
    if (el.dataset.f === "warenQuote") warenQuoteSetzen(Z.stand, parseZahl(el.value));
    if (el.dataset.f === "steuerSatz") steuerSatzSetzen(Z.stand, parseZahl(el.value));
    { const m = /^ruhe-(\d)-(von|bis)$/.exec(el.dataset.f || ""); if (m) ruhezeitSetzen(Z.stand, Number(m[1]), m[2], el.value); } // K4 Stoßzeiten
  } else if (Z.ansicht === "buero") { // Entwickler C
    neu = bueroEingabe(el.dataset.f, el.value); if (neu === "knopf") { neu = false; if (el.value !== el.value.replace(/\D/g, "").slice(0, 4)) el.value = el.value.replace(/\D/g, "").slice(0, 4); }
  } else if (Z.ansicht.startsWith("ordner-")) {
    neu = ordnerEingabe(el.dataset.f, el.value); if (neu === "knopf") neu = false;
  } else if (Z.ansicht === "laeden") { // Eigentümer-Ebene (18.10.2026): freier Zeitraum
    neu = laedenEingabe(el.dataset.f, el.value);
  } else if (Z.ansicht === "inventur") {
    neu = inventurEingabe(el.dataset.f, el.value);
  } else if (Z.ansicht === "verkauf") { // E7 (17.10.2026): Handeingabe ist ein Entwurf bis „Speichern“; nur der Tag zeichnet neu
    const r = verkaufEingabe(el.dataset.f, el.value); if (r === "zeichnen") { zeichne(); return; } if (r === "entwurf") return;
  } else if (Z.ansicht === "kuehlware") { // Trennung (17.10.2026), Punkt 4: nur Entwurf; Begründung schaltet nur den Knopf
    neu = kuehlWareEingabe(el.dataset.f, el.value, Z.stand);
    if (neu === "knopf") { const k = Z.root.querySelector('[data-a="kw-behalten-speichern"]'); if (k) k.disabled = !kuehlWareGrundGueltig(); return; }
    if (neu !== true) return;
  } else if (Z.ansicht === "tafel") { // Menütafel (18.10.2026): Sprache der Tafel – speichern, Sprache laden, neu zeichnen
    const r = tafelEingabe(el.dataset.f, el.value, Z.stand); if (!r) return;
    speichern(Z.wurzel); ladeSprache(r.sprache).then(() => { if (Z.ansicht === "tafel") zeichne(); }); return;
  } else if (Z.ansicht === "portion") { portionEingabe(el.dataset.f, el.value); return; // W2-K3: Zahl merken, Feld behält den Fokus
  } else if (Z.ansicht === "ware") { // Welle 2: Entwurf; Zukaufpreis speichert sofort
    const r = wareEingabe(el.dataset.f, el.value, Z.stand, el);
    if (r === "speichern") { speichern(Z.wurzel); return; }
    if (r && typeof r === "object") { const k = Z.root.querySelector('[data-a="wa-spiess"]'); if (k) { k.disabled = !r.knopf; k.textContent = r.text; } }
    return;
  } else if (Z.ansicht === "preisrunde") { // Masterauftrag 1.2/1.6: Gericht wechseln zeichnet neu, Extra-Felder schalten nur den Knopf
    const r = preisrundeEingabe(el.dataset.f, el.value, Z.stand); if (r === "zeichnen") { zeichne(); return; }
    if (r) { const k = Z.root.querySelector('[data-a="pr-extra-dazu"]'); if (k) k.disabled = r !== "knopf-an"; } return;
  } else if (Z.ansicht === "aktionen") { // Aktion planen (18.10.2026): Datum im Plan ist ein Entwurf bis „Auf die Tafel“
    const r = aktionenEingabe(el.dataset.f, el.value); if (r === "zeichnen") { zeichne(); return; } if (r === "entwurf" || !r) return;
  } else if (Z.ansicht === "lieferanten") { // Lieferanten (18.10.2026): Formular = Entwurf; Zuordnung (Auswahl) schreibt gleich
    const r = lieferantenEingabe(el.dataset.f, el.value, Z.stand); if (r === "speichern") { speichern(Z.wurzel); zeichne(); return; } if (r?.meldung) { meldung(r.meldung); zeichne(); } return;
  } else if (Z.ansicht === "getraenke") { // Getränke (18.10.2026): Formular ist ein Entwurf bis „Speichern“
    const r = getraenkeEingabe(el.dataset.f, el.value); if (r === "zeichnen") { zeichne(); return; } return;
  } else if (Z.ansicht === "bestand") { // Bestand (17.10.2026): Mindestbestand ist ein Entwurf bis „Speichern“
    if (bestandEingabe(el.dataset.f, el.value) === "entwurf") return;
  } else if (Z.ansicht === "geld3") { // Welle 3: speichern, neu rechnen, Fokus und offene Karten bleiben
    if (geld3Eingabe(el.dataset.f, el.value, Z.stand)) { speichern(Z.wurzel); const f = el.dataset.f; const offen = [...Z.root.querySelectorAll("details[data-g3][open]")].map((d) => d.dataset.g3);
      zeichne(); for (const id of offen) Z.root.querySelector(`details[data-g3="${id}"]`)?.setAttribute("open", "");
      const neuEl = Z.root.querySelector(`[data-f="${f}"]`); if (neuEl) { neuEl.focus(); try { neuEl.setSelectionRange(neuEl.value.length, neuEl.value.length); } catch { /* egal */ } } }
    return;
  } else if (Z.ansicht === "kuehl") {
    neu = kuehlEingabe(el.dataset.f, el.value, Z.stand);
    if (neu === "knopf") { neu = false; const k = Z.root.querySelector('[data-a="station-speichern"]'); if (k) k.disabled = !kuehlFormGueltig(); }
  }
  speichern(Z.wurzel);
  if (neu === true) { // Suchfelder: Liste live filtern, Fokus und Cursor behalten
    const f = el.dataset.f, pos = el.selectionStart; zeichne();
    const wieder = Z.root.querySelector(`[data-f="${CSS.escape(f)}"]`); if (wieder) { wieder.focus(); try { wieder.setSelectionRange(pos, pos); } catch (_) {} }
  }
});

// Wenn ein Feld verlassen wird, einmal neu zeichnen, damit Zwischenstände und Markierungen stimmen.
Z.root.addEventListener("focusout", (ev) => {
  const el = ev.target.closest("[data-f]"); if (!el || el.type === "file") return;
  if ((el.dataset.f === "station-wert" || el.dataset.f.startsWith("stelle-max:") || el.dataset.f.startsWith("stelle-min:")) && el.value.trim() !== "" && parseTemperatur(el.value) === null) meldung(t("kuehl.tempUngueltig", el.value.trim().slice(0, 12)));
  if (el.getAttribute("inputmode") === "decimal" && el.value.trim() !== "" && parseZahl(el.value) === null) {
    meldung(t(/^[0-9.,\s]+$/.test(el.value) ? "allgemein.zahlZuGross" : "allgemein.zahlUngueltig", el.value.trim().slice(0, 20)));
    if (el.dataset.f === "umsatz") { umsatzEingabe("umsatz", "", Z.stand, Z.wurzel); speichern(Z.wurzel); } // halbe Zahl nicht stehen lassen
  }
  if (el.dataset.f === "umsatz") { umsatzFeldVerlassen(Z.stand); speichern(Z.wurzel); } // W2-T: Wert festschreiben, spätere Änderung = neuer Eintrag
  if (el.dataset.f.startsWith("wert:") && tagWertUebernehmen(el.dataset.f, el.value, Z.stand)) { speichern(Z.wurzel); meldung(t("tag.gespeichert")); }
  if (Z.stand.phase === "onboarding" || ["umsatz", "kuehl", "muell", "abschluss", "einstellungen", "listen", "beleg", "inventur", "verkauf"].includes(Z.ansicht)) setTimeout(() => { const a = document.activeElement; if (!a || a === document.body || !a.matches("[data-f]")) zeichne(); }, 80);
});

Z.root.addEventListener("change", async (ev) => {
  const el = ev.target; if (!el.files?.[0]) return;
  const dateien = [...el.files]; const datei = dateien[0]; el.value = "";
  if (el.dataset.f === "import") return sicherungEinlesen(datei, null, { ersetzen: el.dataset.ersetzen === "1" }); // Rettung (17.10.2026): Fehlerseite ersetzt
  if (el.dataset.f === "verkauf-datei") { // E7 (17.10.2026): Kassen-Export lesen – bleibt auf dem Gerät, nichts wird gesendet
    try { await verkaufDatei(Z.stand, dateien); } catch (e) { console.warn(e); meldung(t("verkaeufe.vorschau.fehlerDatei")); }
    return zeichne();
  }
  if (el.dataset.f === "zbon-foto") { // Z-Bon per Foto (18.10.2026): ablegen und auf dem Handy lesen wie ein Belegfoto; nur im Büro
    if (Z.ansicht !== "verkauf" || modus(Z.wurzel) === "personal") return;
    ereignis("foto", { laden: Z.stand.id, zweck: "zbon", art: datei.type || "?", anzahl: 1 });
    try { await verkaufZbonFoto(Z.stand, datei, () => zeichne(), { geraet: Z.wurzel.geraet }); } catch (e) { console.warn(e); meldung(t("verkaeufe.zbon.nichts")); }
    speichern(Z.wurzel); return zeichne();
  }
  if (el.dataset.f === "gericht-foto") { // Zielbild: eigenes Foto je Gericht (ersetzt Standardbild), bleibt auf dem Gerät
    const g = Z.stand.gerichte.find((x) => x.id === el.dataset.id); if (!g) return;
    try { const meta = await ablegen(await bildFuerAblage(datei, 800), { name: datei.name || "", zweck: "gericht", laden: Z.stand.id });
      gerichtFotoSetzen(Z.stand, g.id, meta, { geraet: Z.wurzel.geraet }); speichern(Z.wurzel); meldung(t("vergleich.fotoGespeichert")); }
    catch (e) { console.warn(e); meldung(t("muell.fotoFehler")); }
    return zeichne();
  }
  if (el.dataset.f === "muell-foto") { // Zielbild: Foto (optional) beim Müll – nur ablegen, nicht lesen; hängt am nächsten Eintrag
    const kopf = { id: "u-" + Date.now().toString(36), zweck: "muell", erfasst: new Date().toISOString(), geraet: Z.wurzel.geraet, status: "abgelegt" };
    try { const abgelegt = await ablegen(await bildFuerAblage(datei, 1200), { name: datei.name || "", zweck: "muell", laden: Z.stand.id }); muellFotoSetzen(uploadAnlegen(Z.stand, { ...kopf, datei: abgelegt, auswertung: null, ergebnis: null })); speichern(Z.wurzel); } // Trennung (17.10.2026)
    catch (e) { console.warn(e); meldung(t("muell.fotoFehler")); }
    return zeichne();
  }
  if (el.dataset.f === "foto") {
    // Foto oder Datei: ablegen, lesen, Ergebnis zeigen. Speisekarte → Prüfliste, Rechnung → Zuweisung im Beleg-Bildschirm.
    const zweck = el.dataset.zweck || "rechnung";
    ereignis("foto", { laden: Z.stand.id, zweck, art: datei.type || "?", anzahl: dateien.length });
    // Speisekarte: alle Fotos in die Warteschlange (Serie), gelesen wird nacheinander im Hintergrund
    if (zweck === "speisekarte") { await fotosHinzufuegen(Z.stand, dateien, zweck, () => zeichne(), { geraet: Z.wurzel.geraet, fertig: !el.hasAttribute("capture") }); speichern(Z.wurzel); zeichne(); return; }
    const lauf = await fotoVerarbeiten(Z.stand, datei, zweck, () => zeichne(), { geraet: Z.wurzel.geraet });
    if (lauf && lauf === fotoLauf() && lauf.status === "fertig" && zweck !== "speisekarte" && Z.ansicht === "beleg") belegTextVonFoto(lauf.text, lauf.upload);
    speichern(Z.wurzel); zeichne();
  }
});

// Enter = Weiter, aber nur auf Bildschirmen mit genau einem Feld (sonst überspringt es Felder).
Z.root.addEventListener("keydown", (ev) => {
  if (ev.key !== "Enter") return;
  const el = ev.target.closest("[data-f]"); if (!el || el.type === "file" || el.tagName === "TEXTAREA") return;
  ev.preventDefault();
  if (el.dataset.f === "eigenes" || el.dataset.f === "stelle-neu" || el.dataset.f === "person-neu") { const b = el.closest(".neu")?.querySelector('[data-a$="-neu"]'); if (b) b.click(); return; }
  if (el.dataset.f === "buero-code") { Z.root.querySelector('[data-a="buero-code-oeffnen"], [data-a="buero-code-weiter"]')?.click(); return; } // Entwickler C
  el.blur();
  if (Z.stand.phase === "onboarding" && Z.root.querySelectorAll("[data-f]").length === 1) schrittWeiter();
});

// Zurück-Geste des Handys / Browser-Zurück: ein Schritt zurück statt App verlassen.
// Baris 01.11.2026 (Klicker K2 Runde 2, B1): Büro-Weg – die vorher besuchten Büro-Bildschirme, damit „Zurück“ eine Ebene zurück führt
// statt immer zum Büro-Start. Büro-Start leert den Weg; „Zurück“ nimmt den letzten Eintrag ab; höchstens 12 Einträge.
function bueroWegFuehren(ziel, zurueck) {
  if (ziel === Z.ansicht) return;
  if (ziel === "buero") { Z.bueroWeg = []; return; }
  if (zurueck) { Z.bueroWeg.pop(); return; }
  const i = Z.bueroWeg.lastIndexOf(ziel); if (i >= 0) { Z.bueroWeg = Z.bueroWeg.slice(0, i); return; } // schon auf dem Weg: dorthin zurückspringen, keine Schleife
  if (Z.ansicht !== "buero") Z.bueroWeg = [...Z.bueroWeg, Z.ansicht].slice(-12);
}
window.addEventListener("popstate", () => {
  if (!Z.stand) return;
  if (fuehrungOffen()) { history.pushState({ schritt: Z.stand.schritt }, ""); return; } // Mitmach-Rundgang: Zurück-Geste wirkt nicht, Station 16 lässt sich nicht schließen
  if (blattSchliessen()) return; // Zurück schließt zuerst ein offenes Blatt – ohne Neuzeichnen
  const m = modus(Z.wurzel); const anfang = startAnsicht(Z.wurzel);
  if (Z.stand.phase === "onboarding" && (Z.stand.schritt > 0 || Z.stand.rueckkehr || fotoLauf())) { schrittZurueck(); }
  else if (Z.stand.phase === "app" && m === "buero" && Z.ansicht === "buero") { ebeneWechseln("laden", "start"); } // Büro-Start: Zurück = „‹ Laden"
  else if (Z.stand.phase === "app" && Z.ansicht !== anfang) {
    if (Z.ansicht === "listen") Z.ansicht = Z.herkunft && Z.herkunft !== "listen" ? Z.herkunft : m === "buero" ? "buero" : "umsatz";
    else if (Z.ansicht === "kuehl" && kuehlZurueck()) { /* eine Ebene hoch */ }
    else if (Z.ansicht === "putzplan" && putzplanZurueck(Z.stand)) { /* eine Ebene hoch */ }
    else if (Z.ansicht === "muell" && muellZurueck()) { /* eine Ebene hoch */ }
    else if (Z.ansicht === "beleg" && belegZurueck()) { /* eine Ebene hoch */ }
    else if (Z.ansicht === "inventur" && inventurZurueck(Z.stand)) { /* eine Ebene hoch: Karte → Liste → Übersicht */ }
    else if (Z.ansicht === "verkauf" && verkaufZurueck()) { /* E7: Vorschau/Handeingabe → Übersicht */ }
    else if (Z.ansicht === "bestand" && bestandZurueck()) { /* Bestand (17.10.2026): Mindestbestand-Liste zu */ }
    else if (Z.ansicht === "aktionen" && aktionenZurueck()) { /* Stufe 1 (17.10.2026): Kombi-Auswahl leeren; Aktion planen: Plan schließen */ }
    else if (Z.ansicht === "getraenke" && getraenkeZurueck()) { /* Getränke (18.10.2026): Formular schließen */ }
    else if (Z.ansicht === "lieferanten" && lieferantenZurueck()) { /* Lieferanten (18.10.2026): Formular bzw. Zuordnung schließen */ }
    else if (Z.ansicht === "kuehlware" && kuehlWareZurueck()) { /* Trennung (17.10.2026): offene Entscheidung schließen */ }
    else if (Z.ansicht === "beleg") Z.ansicht = Z.herkunft && Z.herkunft !== "beleg" ? Z.herkunft : m === "buero" ? "buero" : "umsatz";
    else if (Z.ansicht === "umsatzheute") { umsatzLadenZuruecksetzen(); Z.ansicht = Z.herkunft === "abschluss" ? "abschluss" : anfang; } // Laden-Umbau (20.10.2026)
    else if (Z.ansicht === "kartefoto") { fotoZuruecksetzen(); Z.ansicht = m === "buero" ? "kartebuero" : anfang; } // Persona-Test 27.10.: nach der Einrichtung (Laden) zurück zu Heute, nicht ins Büro
    else if (Z.ansicht.startsWith("ordner-")) { if (ordnerVorschauOffen()) ordnerZuruecksetzen(); else { ordnerZuruecksetzen(); Z.ansicht = "buero"; } } // Vorschau zu, dann ins Büro
    else if (Z.ansicht === "karte" && karteLadenZurueck()) { /* erst das Preis-Blatt schließen */ }
    else if (m === "buero" && Z.bueroWeg.length) { Z.ansicht = Z.bueroWeg.pop(); } // 01.11.2026: Büro – eine Ebene zurück
    else { if (Z.ansicht === "abschluss") abschlussZuruecksetzen(); Z.ansicht = anfang; } // Laden-Reiter stapeln nicht: Zurück = Heute; Büro → Büro-Start; Personal → drei Kacheln
    if (!ansichtErlaubt(Z.wurzel, Z.ansicht)) Z.ansicht = anfang;
    zeichne();
  }
  history.pushState({ schritt: Z.stand.schritt }, "");
});

// Beim Verlassen (Wechsel zu WhatsApp, Kamera, Sperrbildschirm) sofort sichern – der Tester tippt oft und wechselt weg.
window.addEventListener("pagehide", () => { if (Z.wurzel) sofortSpeichern(Z.wurzel, { stempel: false }); });
document.addEventListener("visibilitychange", () => {
  if (!Z.wurzel) return;
  if (document.visibilityState === "hidden") sofortSpeichern(Z.wurzel, { stempel: false });
  else { ereignis("app-sichtbar", { phase: Z.stand.phase }); Z.ereignisAnzahl += 1; tagPruefen(); }
});
window.addEventListener("pageshow", () => tagPruefen());
Z.root.addEventListener("focusout", () => setTimeout(tagPruefen, 200)); // Feld mit Text wurde verlassen: Tageswechsel nachholen
// Lauf 6, E5 (B): Zurück in der App, oder die Uhr läuft über 04:00 (Geschäftstag) bzw. 00:00 (Kalendertag): neu zeichnen – sonst zeigt Heute,
// Putzplan und Kühlung noch gestern. Nicht, solange ein Feld mit Text den Fokus hat (dann beim Verlassen) oder eine Führung läuft.
// Lauf 6, E5-Draht (1): friert in jedem eingerichteten Laden den Vormonat ein (nur wenn nötig); hat es etwas getan, wird gespeichert.
function vormonatEinfrieren() {
  let n = 0; const H = heuteGeschaeft();
  for (const b of Z.wurzel?.betriebe || []) { if (b.phase === "app" && vormonatEinfrierenWennNoetig(b, H)) n += 1; }
  if (n) speichern(Z.wurzel);
  return n;
}
function tagPruefen() {
  if (!Z.wurzel || !Z.stand || Z.notfall || !tagGewechselt(Z.gezeichneterTag)) return;
  const a = document.activeElement; const feld = a?.matches?.("input, textarea, select") ? { aktiv: true, value: a.value } : null;
  if (feldMitText(feld) || fuehrungOffen() || kurzOffen()) return;
  vormonatEinfrieren();
  zeichne();
}

function spracheDesGeraets() {
  const code = (navigator.language || "de").slice(0, 2).toLowerCase();
  return SPRACHEN.includes(code) ? code : "de";
}

// ---------- Start ----------

// W2-D: im Laden (und Personal-Modus) still auf die neue Fassung wechseln, wenn die App 30 Minuten nicht bedient wurde und nichts offen ist
for (const e of ["pointerdown", "keydown", "input"]) document.addEventListener(e, () => { Z.zuletztBedient = Date.now(); }, { capture: true, passive: true });
// Paket 2 (16.10.2026): „kein Formular offen“ an einer Stelle – für das stille Update und für den fremden Fassungswechsel (unten)
function formularOffen() {
  return fuehrungOffen() || !Z.wurzel || !Z.stand || Z.ansicht !== startAnsicht(Z.wurzel) || blattOffen() || w2RundgangOffen(Z.stand) || fotoLauf() || !!document.activeElement?.matches?.("input, textarea, select");
}
function stillAktualisieren() {
  if (!Z.aktualisierung || Z.aktualisierungKlick || !Z.wurzel || !Z.stand || Z.stand.phase !== "app") return;
  if (modus(Z.wurzel) === "buero" || Date.now() - Z.zuletztBedient < 30 * 60e3) return;
  if (formularOffen()) return; // kein Formular offen
  Z.aktualisierungKlick = true; ereignis("still-aktualisiert", {});
  sofortSpeichern(Z.wurzel, { stempel: false }).finally(() => Z.aktualisierung.postMessage("uebernehmen"));
}
// Paket 2 (16.10.2026): ein ANDERES Fenster hat „Aktualisieren“ getippt. Der neue Service Worker löscht beim Aktivieren den alten
// Cache (sw.js activate). Dieses Fenster läuft dann mit altem app.js weiter, holt Nachlader (Sprachdateien, OCR-Worker) aber aus dem
// neuen Cache – ein Mischstand aus zwei Fassungen. Darum: neu laden, sobald hier kein Formular offen ist (sonst alle 2 s nachsehen),
// vorher sichern. Im Onboarding ist jeder Schritt ein Formular: dort wird erst beim nächsten Start neu geladen (pagehide sichert).
function fremdeFassungUebernehmen() {
  if (Z.aktualisierungKlick || Z.fremdeFassung) return;
  Z.fremdeFassung = true; ereignis("fremde-fassung", {});
  const versuch = () => {
    if (!Z.wurzel || !Z.stand || Z.stand.phase !== "app" || formularOffen()) { setTimeout(versuch, 2000); return; }
    Z.aktualisierungKlick = true; // ab jetzt kein zweiter Anlauf
    sofortSpeichern(Z.wurzel, { stempel: false }).finally(() => location.reload());
  };
  versuch();
}
async function serviceWorkerStarten() {
  if (Z.swGestartet) return; Z.swGestartet = true;
  if (!("serviceWorker" in navigator) || !window.isSecureContext) { Z.offlineStand = "keinSw"; return; }
  try {
    const reg = await navigator.serviceWorker.register("sw.js", { updateViaCache: "none" });
    const bereit = (w) => { Z.aktualisierung = w; if ((Z.ansicht === "start" || Z.ansicht === "buero") && Z.stand?.phase === "app") zeichne(); }; // W2-D: auch im Büro
    if (reg.waiting && navigator.serviceWorker.controller) bereit(reg.waiting);
    reg.addEventListener("updatefound", () => { const w = reg.installing; if (!w) return; w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) bereit(w); }); });
    // 27.10.2026 (Persona-Test): beim allerersten Besuch hat die Seite noch keinen Service Worker. sw.js übernimmt sie per
    // clients.claim() – das löst ebenfalls „controllerchange“ aus, ist aber KEINE neue Fassung (die Seite läuft schon mit genau
    // diesen Dateien). Dieser erste Wechsel lädt deshalb nicht neu; erst ein späterer Wechsel (echtes Update) läuft wie gehabt.
    let ersteUebernahme = !navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (ersteUebernahme) { ersteUebernahme = false; return; }
      if (Z.aktualisierungKlick) location.reload(); else fremdeFassungUebernehmen(); // Paket 2: auch ohne eigenen Tipp
    });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) reg.update().catch(() => {}); });
    await navigator.serviceWorker.ready; Z.offlineStand = "bereit";
    setInterval(stillAktualisieren, 60e3); document.addEventListener("visibilitychange", () => { if (!document.hidden) stillAktualisieren(); }); // W2-D
  } catch (e) { console.warn("Kein Service Worker:", e); Z.offlineStand = "keinSw"; }
}

// Lauf 6, E5 (C): „Speicher voll“ (QuotaExceededError) bekommt einen eigenen, verständlichen Satz im selben Banner; sonst der bisherige Text.
const speicherText = (art) => (art === "voll" || art === "ablageVoll" ? l6z(aktuelleSprache(), "speicherVoll") : t(art === "fassung" ? "einstellungen.andereFassung" : "einstellungen.speichernFehlgeschlagen"));
const speicherFehlerZeigen = (art, fehler) => { Z.speicherProblem = speicherProblemArt(art, fehler); meldung(speicherText(Z.speicherProblem)); zeichne(); };
beiAblageFehler((art, fehler) => speicherFehlerZeigen(art || "ablage", fehler)); // 20.10.2026: auch ein Foto, das nicht auf das Gerät passt, zeigt das Banner
beiSpeicherFehler(speicherFehlerZeigen);
// Paket 2 (16.10.2026): ein zweites Fenster derselben Fassung hat geschrieben (store.js, Generationszähler). store.js hat die eigenen
// Änderungen in den frischen Stand gemischt und geschrieben (zusammengefuehrt: true) – oder aufgegeben (false: eigene Kopie verworfen).
// So oder so: den gelieferten Stand übernehmen, Bildschirm-Zustände verwerfen, neu zeichnen. Hinweis (vorhandener Toast) nur im
// Büro und nur beim Aufgeben; im Erfolgsfall braucht niemand eine Meldung. Ließ sich nichts laden: Seite neu laden.
window.addEventListener(FREMDER_STAND, (ev) => {
  const neu = ev.detail?.wurzel;
  if (!neu || !Z.wurzel) { location.reload(); return; }
  speichernAbbrechen(); alleZuruecksetzen(); blattSchliessen();
  Z.wurzel = neu; Z.stand = null; aktivSetzen(Z.wurzel.aktiv); ebeneWiederherstellen(Z.wurzel);
  if (!ansichtErlaubt(Z.wurzel, Z.ansicht)) Z.ansicht = startAnsicht(Z.wurzel);
  if (!ev.detail.zusammengefuehrt && modus(Z.wurzel) === "buero") meldung(t("einstellungen.fremderStand"));
  zeichne();
});

(async () => {
  try { Z.wurzel = await laden(); }
  catch (e) {
    // Der gespeicherte Stand stammt aus einer neueren Fassung der App (z. B. alte Fassung aus dem Cache): nichts anfassen, nur erklären.
    setzeSprache(spracheDesGeraets());
    Z.root.innerHTML = `<div class="schirm"><div class="inhalt"><h1 class="frage">${esc(t("einstellungen.fehlerTitel"))}</h1><p class="hinweis">${esc(t("einstellungen.standNeuer"))}</p><button type="button" class="knopf" data-a="aktualisieren-oder-neu">${esc(t("start.jetztUebernehmen"))}</button></div></div>`;
    Z.root.querySelector('[data-a="aktualisieren-oder-neu"]').onclick = () => { if (Z.aktualisierung) { Z.aktualisierungKlick = true; Z.aktualisierung.postMessage("uebernehmen"); } else location.reload(); };
    serviceWorkerStarten(); return;
  }
  // W2-D: Speicher ließ sich nicht öffnen – die Daten sind wahrscheinlich noch da. Nicht zur Neu-Einrichtung einladen.
  if (ladeProbleme().gesperrt && !(await speicherGesperrtSchirm())) return;
  try { await startNachLaden(); }
  catch (e) { // Rettung (17.10.2026): der Start bricht ab (z. B. kaputter Stand) – Fehlerseite statt leerem Bildschirm
    console.error(e); try { await ladeSprache(Z.wurzel?.sprache || spracheDesGeraets()); setzeSprache(Z.wurzel?.sprache || spracheDesGeraets()); } catch (_) { /* Deutsch */ }
    notfallSeite(); serviceWorkerStarten();
  }
})();
async function startNachLaden() {
  aktivSetzen(Z.wurzel.aktiv);
  ebeneWiederherstellen(Z.wurzel); Z.ansicht = startAnsicht(Z.wurzel); // Modus gilt je Handy und bleibt nach dem Neustart (Büro mit Code: zurück in den Laden)
  // Gerichte ohne Rezept (aus älteren Fassungen) bekommen beim Start Startwerte aus dem Baukasten (Pilot 14.10.: keine leere App)
  { let n = 0; for (const b of Z.wurzel.betriebe) n += fehlendeRezepteErgaenzen(b); if (n) { for (const b of Z.wurzel.betriebe) b.artikel = artikelAusGerichten(b); speichern(Z.wurzel); } }
  // Neue Branchenwerte (Punkt 7.4): einmal je Version einspielen, nur Schätzungen ersetzen, Meldung fürs Cockpit merken
  if (BRANCHENWERTE.werte.length) for (const b of Z.wurzel.betriebe) {
    if ((b.branchenVersion || 0) >= BRANCHENWERTE.version) continue;
    const r = branchenwerteAnwenden(b, BRANCHENWERTE.werte); b.branchenVersion = BRANCHENWERTE.version;
    if (r.geaendert) b.branchenMeldung = { geaendert: r.geaendert, uebersprungenEigen: r.uebersprungenEigen, datum: heute() };
    speichern(Z.wurzel);
  }
  rueckholInfoHolen(); // Lauf 6, E5-Draht (4)
  vormonatEinfrieren(); // Lauf 6, E5-Draht (1): nach dem Laden des Standes, nur Läden in der Phase „app“
  serviceWorkerStarten(); setInterval(tagPruefen, 60e3); // Lauf 6, E5 (B): Minuten-Takt für den Tageswechsel bei offener App
  speicherDauerhaftPruefen().then(() => { if (Z.wurzel.betriebe.some((b) => b.phase === "app")) dauerhaftAnfragen(); }); // W2-D: einmal nach der Einrichtung (auch für schon eingerichtete Läden)
  // Vor der Sprachwahl in der Sprache des Geräts fragen, damit ein türkischer oder englischer Tester die erste Frage lesen kann.
  await ladeSprache(Z.wurzel.sprache || spracheDesGeraets()); setzeSprache(Z.wurzel.sprache || spracheDesGeraets());
  const ev = await alleEreignisse(); Z.ereignisAnzahl = ev.length;
  await ereignis("app-geoeffnet", { phase: Z.stand.phase, schritt: schritteFuer(Z.stand)[Z.stand.schritt]?.id, sprache: Z.wurzel.sprache, laeden: Z.wurzel.betriebe.length });
  Z.ereignisAnzahl += 1;
  history.replaceState({ schritt: Z.stand.schritt }, "");
  history.pushState({ schritt: Z.stand.schritt }, "");
  zeichne();
}

// W2-D: eigener Schirm statt leerer Einrichtung. Rückgabe true = trotzdem weiter (ohne Speichern, mit Warnband).
async function speicherGesperrtSchirm() {
  await ladeSprache(spracheDesGeraets()); setzeSprache(spracheDesGeraets());
  Z.root.innerHTML = `<div class="schirm"><div class="inhalt"><h1 class="frage">${esc(t("w2d.gesperrtTitel"))}</h1><p class="hinweis">${esc(t("w2d.gesperrtText"))}</p>
    <button type="button" class="knopf" data-w2="neu">${esc(t("w2d.gesperrtNeu"))}</button>
    <button type="button" class="leise" data-w2="weiter">${esc(t("w2d.gesperrtWeiter"))}</button></div></div>`;
  return new Promise((res) => {
    Z.root.querySelector('[data-w2="neu"]').onclick = () => location.reload();
    Z.root.querySelector('[data-w2="weiter"]').onclick = () => { Z.root.innerHTML = ""; res(true); };
  });
}

// D: lang drücken auf ein Müll-Foto öffnet das Detail (Menge, Foto, Personalessen)
// Vorab-Prüfung 03.11.2026 (B4): Zahlenfelder markieren beim Antippen ihren Inhalt – „750“ ersetzt „0,00“ statt „0750,00“ zu ergeben
// Ausschuss Lauf 3 (09.11.2026), P5 B1/B2: nur markieren, wenn der Finger das Feld angetippt hat – nicht, wenn die App nach dem Neuzeichnen den Fokus
// zurückgibt (sonst ersetzte jede zweite Ziffer alles: „3000“ → „0“, „98“ → „8“). Ein Antippen markiert genau einmal.
Z.root.addEventListener("pointerdown", (ev) => { const i = ev.target; Z.zeigerAufFeld = i instanceof HTMLInputElement && i.inputMode === "decimal" ? i : null; }, true);
Z.root.addEventListener("focusin", (ev) => { const i = ev.target; if (!(i instanceof HTMLInputElement && i.inputMode === "decimal" && i.value) || Z.zeigerAufFeld !== i) return; Z.zeigerAufFeld = null;
  const vorher = i.value; setTimeout(() => { if (document.activeElement === i && i.value === vorher) { try { i.select(); } catch { /* egal */ } } }, 0); }); // schon getippt: nichts überschreiben
muellLangdruckEinrichten(Z.root, (el) => { if (Z.ansicht === "muell" && Z.stand && muellAktion("muell-detail", el, Z.stand)) zeichne(); });

// Für Tests und Fehlersuche – nur am eigenen Rechner (localhost, 127.0.0.1, [::1]). In der echten App gibt es dieses Objekt nicht.
if (nurLokal())
  window.__gastrocalc = { get stand() { return Z.stand; }, get wurzel() { return Z.wurzel; }, zeichne, kurzStarten: () => kurzStarten(document), fehlerText: () => fehlerText(speicherLokal(), { fassung: APP_FASSUNG, sprache: aktuelleSprache() }), fehlerLeeren: () => fehlerLeeren(speicherLokal()) };

// Zeki (26.10.2026): Welche Lage Zeki heute schon gesagt hat – nur Anzeige-Komfort im Browser, nicht im Betriebsstand.
// Fehlt der Speicher (privates Fenster), sagt Zeki seinen Satz eben noch einmal.
const ZEKI_SCHLUESSEL = "gastrocash-zeki-gesehen";
function zekiGesehenLesen() {
  try { const a = JSON.parse(localStorage.getItem(ZEKI_SCHLUESSEL) || "[]"); return new Set(Array.isArray(a) ? a : []); } catch { return new Set(); }
}
function zekiLage() {
  const g = zekiGesehenLesen(); const rest = Z.zekiGerade ? 7000 - (Date.now() - Z.zekiGerade.t) : 0;
  if (rest > 0) { g.delete(Z.zekiGerade.key); return { zekiGesehen: g, zekiRestMs: rest, zekiOhneBewegung: true }; }
  return { zekiGesehen: g };
}
function zekiGesehenMerken(key) {
  if (!key) return;
  if (!Z.zekiGerade || Z.zekiGerade.key !== key) Z.zekiGerade = { key, t: Date.now() };
  try { const tag = key.split(":").pop(); const a = [...zekiGesehenLesen()].filter((k) => k.endsWith(":" + tag)); if (!a.includes(key)) a.push(key); localStorage.setItem(ZEKI_SCHLUESSEL, JSON.stringify(a)); } catch { /* ohne Speicher kein Merken */ }
}

// Zeki auf jedem Bildschirm (26.10.2026): Lage nur aus ZEKI_BILDSCHIRM[ansicht]; Heute macht das selbst (zekiReihe).
// Personal sieht keine Euro: dort keine Lage mit Betrag.
// Lauf 3 (09.11.2026, Baris Ja 17:21): Hinweis-Motor – was heute zum ersten Mal im Büro steht, merkt sich der Takt (eine neue Karte je 7 Tage).
function hinweiseMitHm() {
  { try { const d = heute(); if (hmGezeigtMerken(Z.stand, hmFuerBuero(Z.stand, { datum: d }).neu, d)) sofortSpeichern(Z.wurzel); } catch { /* Takt ist Komfort, kein Absturz */ } }
  return hinweiseView(Z.stand);
}
function zekiBildschirm() {
  if (fuehrungOffen() || (Z.ansicht === "start" && !Z.stand?.fuehrung && modus(Z.wurzel) === "laden")) return; // Führung zuerst, keine zweite Blase darüber
  if (Z.root.querySelector(".zeki-zeile, .kl-zeki, .zeki-stimme > *")) return; // 27.10.2026: Bildschirm hat schon seinen Zeki-Satz – keine zweite Blase
  const nur = Z.ansicht === "start" ? null : ZEKI_BILDSCHIRM[Z.ansicht]; if ((Z.ansicht !== "start" && !nur) || !Z.stand) return; // Heute: alle Lagen, Zeki spricht oben rechts
  const H = heuteGeschaeft(); const gesehen = zekiGesehenLesen();
  if (Z.zekiGerade && Date.now() - Z.zekiGerade.t < 7000) gesehen.delete(Z.zekiGerade.key);
  let zm = null;
  // Mitmach-Rundgang (28.10.2026, 7.3): erstes eigenes Rezept da, aber noch nicht alle Verkaufsrenner → höchstens einmal am Tag leise „3 von 12 …“
  if (Z.ansicht === "start" && !personalAktiv()) { const r = rezeptFortschritt(Z.stand); const key = `rezepte:${H}`;
    if (r.mit > 0 && !r.rennerFertig && (!gesehen.has(key) || Z.zekiGerade?.key === key) && !Z.root.querySelector('[data-dran="kuehlAlarm"]')) {
      const laeuft = Z.zekiGerade?.key === key;
      zekiSprechblase(Z.root, { ausloeser: "rezepte", text: t("heute.rezeptErinnerung.stand", r.mit, r.gesamt), bewegung: "nicken" }, { restMs: laeuft ? 7000 - (Date.now() - Z.zekiGerade.t) : 7000, bewegen: !laeuft });
      zekiGesehenMerken(key); return; } }
  // Lauf 3, Phase 6 (09.11.2026): 5 Tage vor einem Pflichttermin sagt Zeki auf Heute einen Satz, höchstens einmal am Tag, nie über einem Kühl-Alarm
  if (Z.ansicht === "start" && !personalAktiv() && !Z.root.querySelector('[data-dran="kuehlAlarm"]')) { const key = `frist:${H}`;
    if (!gesehen.has(key) || Z.zekiGerade?.key === key) { let f = null; try { f = fristErinnerungHeute(Z.stand, heute()); } catch { f = null; }
      if (f) { const laeuft = Z.zekiGerade?.key === key; const arten = f.arten.map((a) => t("w3.termine.art." + a)).join(", ");
        zekiSprechblase(Z.root, { ausloeser: "frist", text: fristSatz(aktuelleSprache(), arten, f.datum.slice(8, 10) + "." + f.datum.slice(5, 7) + "."), bewegung: "nicken" }, { restMs: laeuft ? 7000 - (Date.now() - Z.zekiGerade.t) : 7000, bewegen: !laeuft });
        zekiGesehenMerken(key); return; } } }
  // Lauf 3 (09.11.2026, Baris Ja 17:21), Hinweis-Motor: im Laden höchstens einmal je 7 Tage ein Satz, nie in der Stoßzeit, nie über einem Kühl-Alarm
  if (Z.ansicht === "start" && !personalAktiv() && !Z.root.querySelector('[data-dran="kuehlAlarm"]')) {
    let k = null; try { k = hmLadenZeile(Z.stand, { jetzt: new Date() }); } catch { k = null; }
    if (k) { zekiSprechblase(Z.root, { ausloeser: "hm", text: hmUi(aktuelleSprache(), k === "hm.zeki.geld" ? "zekiGeld" : "zekiPflicht"), bewegung: "nicken" }, { restMs: 7000, bewegen: true });
      hmLadenGezeigt(Z.stand, heute()); sofortSpeichern(Z.wurzel); return; } }
  try { zm = zekiMoment(Z.stand, { H, sprache: aktuelleSprache(), gesehen, sicherungTage: sicherungStufe(Z.wurzel)?.tage ?? null, sicherung: personalAktiv() ? null : sicherungFaellig(Z.wurzel), nur: nur && personalAktiv() ? nur.filter((x) => x !== "muell_hoch") : nur || undefined }); } catch { zm = null; }
  if (!zm) return;
  // 27.10.2026: Auf Heute spricht die Jetzt-Karte schon („Kühlrundgang“) – Zeki sagt dort nur Ernstes, sonst doppelt und über 15 Wörter
  if (Z.ansicht === "start" && zm.ausloeser !== "kuehl_abweichung" && zm.ausloeser !== "muell_hoch") return;
  if (Z.ansicht === "start" && zm.ausloeser === "kuehl_abweichung" && Z.root.querySelector('[data-dran="kuehlAlarm"]')) return; // Persona-Test Vater 27.10.: Warnung stand doppelt
  const key = `${zm.ausloeser}:${H}`; const laeuft = Z.zekiGerade?.key === key;
  if (personalAktiv()) zm = { ...zm, text: anredeTeam(zm.text, Z.stand) }; // Baris 27.10.2026: andere Anrede im Personal-Modus
  zekiSprechblase(Z.root, zm, { restMs: laeuft ? 7000 - (Date.now() - Z.zekiGerade.t) : 7000, bewegen: !laeuft });
  zekiGesehenMerken(key);
}
