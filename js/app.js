// GastroCalc – Einstieg. Hält die Wurzel (alle Läden dieses Handys), zeichnet den aktuellen Bildschirm des aktiven Ladens,
// speichert nach jeder Änderung. Etappe 5: Cockpit, Müll in zwei Tipps, Umsatz und Zähler, Belege, Tag abschließen.
import { kalkulationNeuerTakt } from "./engine.js";
import { laden, speichern, sofortSpeichern, speichernAbbrechen, ereignis, alleEreignisse, exportDatei, importDatei, zusammenfuehren, ereignisseUebernehmen, allesLoeschen, leererBetrieb, leereWurzel, speicherVerfuegbar, beiSpeicherFehler, eintraegeZaehlen } from "./store.js";
import { t, setzeSprache, SPRACHEN, ladeSprache } from "./i18n.js";
import { ablageLeeren, ablegen, bildFuerAblage, holen } from "./ablage.js";
import { esc, parseZahl } from "./util.js";
import { SCHRITTE, schrittIndex, schritteFuer } from "./screens/onboarding.js";
import { schrittWiederherstellen, schrittIdMerken } from "./screens/onboarding.js"; // E: Schritt nach Kennung merken
import { fehlendeRezepteErgaenzen } from "./rezept_baukasten.js";
import { artikelAusGerichten } from "./engine.js";
import { BRANCHENWERTE } from "./data/branchenwerte.js";
import { branchenwerteAnwenden } from "./rezept_quelle.js";
import { fotoVerarbeiten, fotosHinzufuegen, fotoZuruecksetzen, serieAbbrechen, fotoKennung, karteFotoView, kartePruefenView, kartePruefenEingabe, kartePruefenAktion, karteUebernehmen, hatVorschlaege, fotoLauf, karteFussKnopf, karteZeigtPruefliste } from "./screens/foto.js";
import { startView, einstellungenView, karteView } from "./screens/home.js";
import { listenView, tagAktion, tagZuruecksetzen, tagWertUebernehmen } from "./screens/tag.js";
import { parseTemperatur } from "./screens/kuehl.js";
import { putzplanView, putzplanAktion, putzplanZurueck, putzplanZuruecksetzen } from "./screens/putzplan.js";
import { kuehlView, kuehlAktion, kuehlEingabe, kuehlZurueck, kuehlZuruecksetzen, kuehlFormGueltig, kuehlKennung } from "./screens/kuehl.js";
import { laedenView } from "./screens/laeden.js";
import { vergleichView, vergleichModus } from "./screens/vergleich.js";
import { nav, navKontext } from "./screens/nav.js";
// Drei Ebenen (Entwickler A): Modus je Handy, Menü-Blatt/Hilfe/Büro-Code in eigener Hülle außerhalb von #app
import { modus, modusSetzen, startAnsicht, navZiel, ansichtErlaubt, ebeneWiederherstellen, ebeneVergessen, pinGesetzt, pinSetzen } from "./modus.js";
import { ebeneHuelle, blattOffen, blattSchliessen, menueZeigen, spracheZeigen, laedenZeigen, hilfeZeigen, pinStarten, pinTaste } from "./screens/ebene.js";
import { muellView, muellAktion, muellEingabe, muellZurueck, muellZuruecksetzen, muellFormGueltig, muellKennung, muellEingabeOeffnen, muellRueckgaengig, muellFotoSetzen,
  muellTipp, muellTippZeigen, muellTippZurueck, muellZurueckZeigen, muellKlickUnterdrueckt, muellLangdruckEinrichten } from "./screens/muell.js"; // D: Müll mit einem Tipp
import { personalView, personalAktion, personalKontext, personalAktiv, personalNachtragen, schichtPerson, personalLeiste } from "./screens/personal.js"; // D: Personal-Modus
import { rundgangOffen, kuehlBereit } from "./engine.js"; // D: Personal-Kachel Kühlung
import { umsatzView, umsatzAktion, umsatzEingabe, umsatzZuruecksetzen } from "./screens/umsatz.js";
import { belegView, belegAktion, belegEingabe, belegZurueck, belegZuruecksetzen, belegKennung, belegTextDa, belegTextVonFoto } from "./screens/beleg.js";
import { abschlussView, abschlussAktion, abschlussZuruecksetzen, abschlussKennung } from "./screens/abschluss.js";
import { inventurView, inventurAktion, inventurEingabe, inventurZurueck, inventurZuruecksetzen, inventurKennung } from "./screens/inventur.js";
// Entwickler B (Drei Ebenen): Laden-Karte als Fotoraster mit Preis-Blatt
import { karteLadenView, karteLadenAktion, karteLadenEingabe, karteLadenTeile, karteLadenBlatt, karteLadenZurueck, karteLadenZuruecksetzen, karteLadenKennung } from "./screens/karte_laden.js";
// Drei Ebenen (Entwickler C): Büro-Startseite und die drei Ordner
import { bueroView, bueroAktion, bueroEingabe, bueroSperren, bueroZuruecksetzen } from "./screens/buero.js";
import { ordnerAmtView, ordnerPaketView, ordnerAktion, ordnerEingabe, ordnerZuruecksetzen, ordnerVorschauOffen } from "./screens/ordner.js";

const root = document.getElementById("app");
let wurzel = null;
let stand = null;           // der aktive Laden (ein Eintrag aus wurzel.betriebe)
let ansicht = "start";      // in Phase "app": start | karte | muell | kuehl | umsatz | listen | laeden | beleg | abschluss | einstellungen | inventur
let ereignisAnzahl = 0;
let wechselt = false;       // Sperre gegen Doppeltipp auf Weiter / Kacheln
let letzterSchirm = "";     // damit ein Neuzeichnen desselben Bildschirms die Scrollposition behält
let aktualisierung = null;  // wartender Service Worker (neue Fassung liegt bereit)
let offlineStand = "laedt";   // "laedt" | "bereit" | "keinSw"
let speicherProblem = null;   // "speichern" | "fassung" – bleibt als Banner stehen, bis es wieder klappt
let ruheBis = 0, tippX = -99, tippY = -99; // nach einem Bildschirmwechsel 350 ms lang keinen Tipp an derselben Stelle annehmen (zweiter Tipp eines Doppeltipps)

function aktivSetzen(id) {
  if (stand && stand.id !== id) { fotoZuruecksetzen(); tagZuruecksetzen(); kuehlZuruecksetzen(); muellZuruecksetzen(); umsatzZuruecksetzen(); belegZuruecksetzen(); abschlussZuruecksetzen(); inventurZuruecksetzen(); } // offene Formulare gehören zum alten Laden
  stand = wurzel.betriebe.find((b) => b.id === id) || null;
  if (!stand) { stand = wurzel.betriebe[0] || null; }
  if (!stand) { stand = leererBetrieb(); wurzel.betriebe.push(stand); }
  wurzel.aktiv = stand.id;
  schrittWiederherstellen(stand); // E: gespeicherter Onboarding-Schritt nach Kennung (alte Stände: Nummer → Kennung)
}

// ---------- Zeichnen ----------

function schirmKennung() {
  const unter = ansicht === "karte" ? karteLadenKennung() : ansicht === "kuehl" ? kuehlKennung() : ansicht === "muell" ? muellKennung() : ansicht === "beleg" ? belegKennung() : ansicht === "abschluss" ? abschlussKennung() : ansicht === "kartefoto" ? fotoKennung() : ansicht === "inventur" ? inventurKennung() : "";
  return stand.phase === "onboarding" ? `ob:${stand.id}:${stand.weg}:${stand.schritt}:${fotoKennung()}` : `app:${stand.id}:${ansicht}${unter ? ":" + unter : ""}`;
}

// Eigene Fotos (Gericht) aus der Ablage nachladen – einmal je Foto, als Objekt-Adresse im Speicher
const fotoAdressen = new Map();
async function eigeneFotosLaden() {
  for (const img of root.querySelectorAll("img[data-foto]")) {
    const id = img.dataset.foto; let url = fotoAdressen.get(id);
    if (!url) { const g = stand.gerichte.find((x) => x.foto === id); const blob = g?.fotoMeta ? await holen(g.fotoMeta).catch(() => null) : null; if (!blob) continue; url = URL.createObjectURL(blob); fotoAdressen.set(id, url); }
    img.src = url; img.classList.remove("pikto");
  }
}

function zeichne() {
  kalkulationNeuerTakt(); // Zahlen dieses Bildes einmal rechnen
  // D (Personal-Modus): nur Personal-Start, Müll, Kühlung, Putzen; neue Einträge bekommen die Schicht-Person
  if (wurzel && stand) { personalKontext(wurzel); if (personalAktiv()) { personalNachtragen(stand); if (!["personal", "muell", "kuehl", "putzplan"].includes(ansicht)) ansicht = "personal"; } }
  const kennung = schirmKennung();
  const y = kennung === letzterSchirm ? window.scrollY : 0;
  try {
    if (stand.phase === "onboarding") zeichneOnboarding();
    else {
      if (!ansichtErlaubt(wurzel, ansicht)) ansicht = startAnsicht(wurzel); // Ebene schützt: z. B. kein Euro-Bildschirm im Personal-Modus
      navKontext(stand, wurzel, ansicht);
      document.body.dataset.modus = modus(wurzel);
      const v = ansicht === "buero" ? bueroView(stand, wurzel) // Büro-Start (Entwickler C)
        : ansicht === "einstellungen" ? einstellungenView(stand, ereignisAnzahl, wurzel, { offline: offlineStand })
        : ansicht === "karte" ? karteLadenView(stand) // Laden-Karte (Fotoraster mit Ampel)
        : ansicht === "kartebuero" ? karteView(stand) // Karten-Übersicht mit Kalkulation – im Büro
        : ansicht === "muell" ? muellView(stand)
        : ansicht === "umsatz" ? umsatzView(stand)
        : ansicht === "listen" ? listenView(stand)
        : ansicht === "kuehl" ? kuehlView(stand)
        : ansicht === "putzplan" ? putzplanView(stand)
        : ansicht === "laeden" ? laedenView(wurzel)
        : ansicht === "beleg" ? belegView(stand)
        : ansicht === "abschluss" ? abschlussView(stand)
        : ansicht === "kartefoto" ? karteFotoSchirm()
        : ansicht === "vergleich" ? vergleichView(stand)
        : ansicht === "inventur" ? inventurView(stand)
        : ansicht === "personal" ? personalView(stand) // D
        : ansicht === "ordner-amt" ? ordnerAmtView(stand)
        : ansicht === "ordner-steuer" ? ordnerPaketView(stand, "steuer")
        : ansicht === "ordner-buch" ? ordnerPaketView(stand, "buch")
        : startView(stand, { aktualisierung: !!aktualisierung, wurzel });
      root.innerHTML = `<div class="schirm">${v}</div>`;
      eigeneFotosLaden();
    }
  } catch (e) {
    console.error(e);
    root.innerHTML = `<div class="schirm"><div class="inhalt">
      <h1 class="frage">${esc(t("einstellungen.fehlerTitel"))}</h1><p class="hinweis">${esc(t("einstellungen.fehlerText"))}</p>
      <label class="knopf zweit mitte">${esc(t("einstellungen.importieren"))}<input type="file" accept="application/json,.json" data-f="import" class="versteckt"></label>
      <button type="button" class="knopf warn" data-a="loeschen">${esc(t("einstellungen.loeschenAlles"))}</button></div></div>`;
  }
  if (!speicherVerfuegbar() || speicherProblem) {
    const b = document.createElement("div"); b.className = "tipp warnband"; b.style.margin = "12px 20px 0";
    b.textContent = t(speicherProblem === "fassung" ? "einstellungen.andereFassung" : speicherProblem ? "einstellungen.speichernFehlgeschlagen" : "einstellungen.speicherFehlt");
    root.prepend(b);
  }
  if (kennung !== letzterSchirm) ruheBis = Date.now() + 250;
  letzterSchirm = kennung;
  window.scrollTo(0, y);
}

// Speisekarte fotografieren aus der App heraus (Karte → „Speisekarte fotografieren"): dieselben Bausteine wie im Schnellstart.
function karteFotoSchirm() {
  return `<div class="inhalt">${karteZeigtPruefliste() ? kartePruefenView(stand) : karteFotoView(stand)}
      ${karteFussKnopf("")}
      <button type="button" class="leise" data-a="nav" data-wert="kartebuero">${esc(t("allgemein.zurueck"))}</button></div>${nav("kartebuero")}`;
}

function zeichneOnboarding() {
  schrittIdMerken(stand); // E: Kennung des sichtbaren Schritts mitspeichern
  const SCHRITTE = schritteFuer(stand);
  const i = Math.min(stand.schritt, SCHRITTE.length - 1);
  const s = SCHRITTE[i];
  const bearbeitet = !!stand.rueckkehr;
  const zeigeFortschritt = s.id !== "sprache" && !bearbeitet;
  const kannZurueck = i > 0 || stand.rueckkehr || wurzel.betriebe.length > 1;
  root.innerHTML = `
    <div class="schirm weg-${esc(stand.weg)} schritt-${esc(s.id)}">
      <div class="kopf">
        ${zeigeFortschritt ? `<div class="fortschritt" aria-hidden="true">${SCHRITTE.slice(1).map((x, j) => `<i class="${j + 1 <= i ? "da" : ""}"></i>`).join("")}</div>` : ""}
        <div class="kopfzeile">
          ${kannZurueck ? `<button type="button" class="zurueck" data-a="zurueck">‹ ${esc(t("allgemein.zurueck"))}</button>` : "<span></span>"}
          ${zeigeFortschritt ? `<span class="schrittzahl">${esc(t("allgemein.schrittVon", i, SCHRITTE.length - 1))}</span>` : bearbeitet ? `<span class="schrittzahl">${esc(t("allgemein.bearbeiten"))}</span>` : ""}
        </div>
      </div>
      <div class="inhalt">${s.view(stand)}${i === 0 && wurzel.betriebe.length === 1 ? `<label class="leise" style="display:block;text-align:center;margin-top:24px">${esc(t("einstellungen.importieren"))}<input type="file" accept="application/json,.json" data-f="import" class="versteckt"></label>` : ""}</div>
      <div class="fuss">${s.fuss ? s.fuss(stand) : ""}</div>
    </div>`;
  if (bearbeitet && stand.rueckkehr.bis === s.id) { const k = root.querySelector('.fuss [data-a="weiter"]'); if (k) k.textContent = t("allgemein.uebernehmen"); }
  // Am Rechner das erste leere Textfeld fokussieren; am Handy nicht, sonst springt die Tastatur ungefragt hoch.
  const erstes = root.querySelector("input.textfeld, .zahlfeld input");
  if (erstes && !erstes.value && i > 0 && !/Mobi|Android/i.test(navigator.userAgent)) erstes.focus();
}

// ---------- Ablauf ----------
// Bearbeiten aus der App heraus: stand.rueckkehr = { von, bis } – nach Schritt „bis" geht es zurück zur App.
// Neuer Laden aus der App heraus: stand.neuAus = id des vorherigen Ladens – „Zurück" auf Schritt 1 geht zu dem zurück.

const ctx = {
  setzeSprache(code) { wurzel.sprache = code; setzeSprache(code, () => zeichne()); },
  weiter(art) { schrittWeiter(art); },
  zurueck() { schrittZurueck(); },
  fertig(ziel) { fertig(ziel); },
};

async function schrittWeiter(art = "fertig") {
  if (wechselt) return; wechselt = true;
  try {
    const SCHRITTE = schritteFuer(stand);
    const s = SCHRITTE[stand.schritt];
    if (s.beimVerlassen) s.beimVerlassen(stand);
    await ereignis(art === "uebersprungen" ? "schritt-uebersprungen" : "schritt-fertig", { schritt: s.id, laden: stand.id });
    if (stand.rueckkehr && stand.rueckkehr.bis === s.id) { zurueckZurApp(); }
    else if (stand.schritt < SCHRITTE.length - 1) {
      stand.schritt += 1; history.pushState({ schritt: stand.schritt }, "");
      await ereignis("schritt-start", { schritt: SCHRITTE[stand.schritt].id, laden: stand.id });
    }
    speichern(wurzel); zeichne();
  } finally { wechselt = false; }
}

function schrittZurueck() {
  const SCHRITTE = schritteFuer(stand);
  const s = SCHRITTE[stand.schritt];
  if (s?.id === "karte-foto" && hatVorschlaege()) { fotoZuruecksetzen(); zeichne(); return; } // erst die Prüfliste verwerfen, dann zurück
  if (s.zurueck && s.zurueck(stand)) { speichern(wurzel); zeichne(); return; }
  if (stand.rueckkehr && (stand.rueckkehr.von === s.id || stand.schritt === 0)) { zurueckZurApp(); }
  else if (stand.schritt > (stand.neuAus ? 1 : 0)) { stand.schritt -= 1; ereignis("schritt-zurueck", { schritt: SCHRITTE[stand.schritt].id }); }
  else if (wurzel.betriebe.length > 1) {
    // Ein noch leerer neuer Laden wird wieder verworfen, wenn der Nutzer auf dem ersten Schritt zurück geht.
    const alt = stand; const ziel = alt.neuAus && wurzel.betriebe.some((b) => b.id === alt.neuAus) ? alt.neuAus : wurzel.betriebe.find((b) => b.id !== alt.id).id;
    if (!alt.betrieb.name && !alt.kosten.length && !alt.gerichte.length) wurzel.betriebe = wurzel.betriebe.filter((b) => b.id !== alt.id);
    aktivSetzen(ziel); ansicht = "laeden";
    zeichne(); sofortSpeichern(wurzel); return;
  }
  speichern(wurzel); zeichne();
}

function zurueckZurApp() { ansicht = stand.rueckkehr?.ansicht || "start"; stand.rueckkehr = null; stand.phase = "app"; }

async function fertig(ziel = "start") {
  if (wechselt) return; wechselt = true;
  try {
    stand.phase = "app"; stand.rueckkehr = null; delete stand.neuAus;
    { const nz = navZiel(wurzel, ziel); if (nz.buero) modusSetzen(wurzel, "buero"); ansicht = nz.ansicht; } // Einrichtung macht der Inhaber: „Beleg fotografieren" am Ende führt ins Büro
    await ereignis("onboarding-fertig", { laden: stand.id });
    await sofortSpeichern(wurzel); zeichne();
  } finally { wechselt = false; }
}

function bearbeiten(vonId, bisId) {
  const i = schrittIndex(vonId); if (i < 0) return;
  stand.weg = "genau"; // Bearbeiten nutzt immer die einzelnen Schritte
  stand.phase = "onboarding"; stand.schritt = i; stand.rueckkehr = { von: vonId, bis: bisId || vonId, ansicht: ["einstellungen", "karte", "kartebuero", "inventur", "buero"].includes(ansicht) ? ansicht : ansicht.startsWith("ordner-") ? "buero" : "start" };
  ereignis("bearbeiten", { schritt: vonId });
  history.pushState({ schritt: i }, "");
  speichern(wurzel); zeichne();
}

// Neuer Laden: Sprache ist schon gewählt, also beginnt der neue Laden beim Format (Schritt 1).
// Strukturänderungen (neuer Laden, Wechsel) werden sofort geschrieben, nicht erst nach der Verzögerung.
async function ladenNeu() {
  const neu = leererBetrieb(); neu.schritt = 1; neu.neuAus = stand.id;
  wurzel.betriebe.push(neu); aktivSetzen(neu.id);
  ereignis("laden-neu", { laden: neu.id, anzahl: wurzel.betriebe.length });
  history.pushState({ schritt: 1 }, "");
  zeichne(); await sofortSpeichern(wurzel);
}

async function ladenWechseln(id) {
  if (!wurzel.betriebe.some((b) => b.id === id)) return;
  aktivSetzen(id); ansicht = stand.phase === "app" ? startAnsicht(wurzel) : ansicht;
  ereignis("laden-wechsel", { laden: id });
  zeichne(); await sofortSpeichern(wurzel);
}

function meldung(text) {
  let m = document.querySelector(".meldung");
  if (!m) { m = document.createElement("div"); m.className = "meldung"; document.body.appendChild(m); }
  m.textContent = text; m.classList.add("da");
  setTimeout(() => m.classList.remove("da"), 2600);
}

async function sicherungTeilen() {
  const { blob, name, fingerabdruck } = await exportDatei(wurzel);
  ereignisAnzahl += 1;
  const gelungen = () => { // erst nach Teilen oder Download zählt die Sicherung
    wurzel.letzteSicherung = new Date().toISOString(); wurzel.sicherungZaehler = eintraegeZaehlen(wurzel);
    meldung(t("einstellungen.exportOk", wurzel.betriebe.length) + (fingerabdruck ? ` · ${fingerabdruck}` : ` · ${t("einstellungen.ohnePruefsumme")}`));
    sofortSpeichern(wurzel); zeichne();
  };
  const datei = new File([blob], name, { type: "application/json" });
  if (navigator.canShare && navigator.canShare({ files: [datei] })) {
    try { await navigator.share({ files: [datei], title: "GastroCalc" }); gelungen(); return; } catch (e) { if (e.name === "AbortError") return; }
  }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000); gelungen();
}

// Einlesen führt zusammen: gleiche Laden-Kennung wird ersetzt, neue Läden kommen dazu. Nichts anderes geht verloren.
async function sicherungEinlesen(datei) {
  try {
    const text = await datei.text();
    const { wurzel: importiert, ereignisse, pruefsumme } = await importDatei(text);
    if (pruefsumme === "abweichung" && !confirm(t("einstellungen.pruefsummeFalsch"))) return;
    const gleich = importiert.betriebe.filter((b) => wurzel.betriebe.some((x) => x.id === b.id)).map((b) => b.betrieb.name || t("start.hallo", ""));
    const neu = importiert.betriebe.filter((b) => !wurzel.betriebe.some((x) => x.id === b.id)).map((b) => b.betrieb.name || t("start.hallo", ""));
    if (!confirm(t("einstellungen.importFrage", neu, gleich))) return;
    const leerVorher = stand && stand.phase === "onboarding" && !stand.betrieb.name && !stand.kosten.length && !stand.gerichte.length ? stand.id : null;
    zusammenfuehren(wurzel, importiert);
    if (leerVorher && wurzel.betriebe.length > 1) { wurzel.betriebe = wurzel.betriebe.filter((b) => b.id !== leerVorher); if (wurzel.aktiv === leerVorher) wurzel.aktiv = importiert.aktiv; }
    aktivSetzen(wurzel.aktiv); // der eigene aktive Laden bleibt, die Datei ändert ihn nicht
    setzeSprache(wurzel.sprache || spracheDesGeraets(), () => zeichne());
    await sofortSpeichern(wurzel); await ereignisseUebernehmen(ereignisse); await ereignis("import", { anzahl: ereignisse.length, neu: neu.length, gleich: gleich.length, pruefsumme });
    ereignisAnzahl = (await alleEreignisse()).length;
    ansicht = wurzel.betriebe.length > 1 ? "laeden" : "start"; if (stand.phase === "onboarding") ansicht = "start"; meldung(t(pruefsumme === "ok" ? "einstellungen.importOk" : pruefsumme === "abweichung" ? "einstellungen.importTrotzAbweichung" : "einstellungen.importOhnePruefsumme")); zeichne();
  } catch (e) { console.warn(e); meldung(t(e.grund === "neuer" ? "einstellungen.importNeuer" : "einstellungen.importFehler")); }
}

// ---------- Ereignisse der Oberfläche (eine Stelle für alles) ----------

// ---------- Ebenen: Laden · Personal · Büro (Entwickler A) ----------
let schlossFertig = 0; // Zeitpunkt, an dem das Schloss nach 2 s ausgelöst hat (der Klick beim Loslassen zählt nicht)

function ebeneWechseln(m, ziel) {
  modusSetzen(wurzel, m); blattSchliessen();
  ansicht = ziel || startAnsicht(wurzel);
  ereignis("modus", { modus: m, laden: stand.id });
  if (m === "buero") history.pushState({ buero: true }, "");
  ruheBis = Date.now() + 350; speichern(wurzel); zeichne();
}
// Laden → Büro: mit Code, wenn einer gesetzt ist (Einstellung im Büro), sonst direkt.
function bueroBetreten(ziel = "buero") {
  if (pinGesetzt(wurzel)) { if (!blattOffen()) history.pushState({ blatt: true }, ""); pinStarten("buero", ziel); return; }
  ebeneWechseln("buero", ziel);
}
// Personal → Laden: mit Code oder 2 Sekunden aufs Schloss (ohne Code).
function personalVerlassen() { ebeneWechseln("laden", "start"); }

// Blätter (Menü, Sprache, Läden, Hilfe, Code) – nur die Hülle ändert sich, der Bildschirm darunter bleibt stehen.
const BLATT_INTERN = new Set(["menue-auf", "blatt-zu", "blatt-sprache", "blatt-laeden", "menue-zurueck", "hilfe-auf", "pin-taste", "pin-weg"]);
async function ebeneAktion(name, el) {
  if (name === "menue-auf") { if (!blattOffen()) history.pushState({ blatt: true }, ""); menueZeigen(stand, wurzel); return true; }
  if (name === "menue-zurueck") { menueZeigen(stand, wurzel); return true; }
  if (name === "blatt-zu") { blattSchliessen(); return true; }
  if (name === "blatt-sprache") { spracheZeigen(); return true; }
  if (name === "blatt-laeden") { laedenZeigen(wurzel); return true; }
  if (name === "hilfe-auf") { if (!blattOffen()) history.pushState({ blatt: true }, ""); hilfeZeigen(ansicht); return true; }
  if (name === "pin-taste" || name === "pin-weg") {
    const r = await pinTaste(name === "pin-weg" ? "weg" : el.dataset.wert, wurzel);
    if (r?.zweck === "buero") ebeneWechseln("buero", r.ziel || "buero");
    else if (r?.zweck === "personal") personalVerlassen();
    else if (r?.zweck === "setzen") { meldung(t("ebene.pin.gesetzt")); await sofortSpeichern(wurzel); zeichne(); }
    return true;
  }
  if (name === "pin-setzen") { if (!blattOffen()) history.pushState({ blatt: true }, ""); pinStarten("setzen"); return true; }
  if (name === "pin-entfernen") { await pinSetzen(wurzel, null); meldung(t("ebene.pin.entfernt")); await sofortSpeichern(wurzel); zeichne(); return true; }
  if (name === "modus") {
    const m = el.dataset.wert;
    if (m === "buero") bueroBetreten();
    else if (m === "personal") ebeneWechseln("personal", "personal");
    else if (m === "laden" && modus(wurzel) === "buero") ebeneWechseln("laden", "start");
    return true;
  }
  if (name === "schloss") { // Personal: Tipp aufs Schloss → Code (falls gesetzt), sonst Hinweis „2 Sekunden drücken"
    if (Date.now() - schlossFertig < 800) return true;
    if (pinGesetzt(wurzel)) { if (!blattOffen()) history.pushState({ blatt: true }, ""); pinStarten("personal"); } else meldung(t("ebene.schlossHalten"));
    return true;
  }
  return false;
}

async function aufKlick(ev) {
  const el = ev.target.closest("[data-a]"); if (!el) return;
  const name = el.dataset.a;
  const nah = Math.hypot(ev.clientX - tippX, ev.clientY - tippY) < 40; tippX = ev.clientX; tippY = ev.clientY;
  if (nah && Date.now() < ruheBis) return; // zweiter Tipp eines Doppeltipps auf dem schon gewechselten Bildschirm
  if (Date.now() - schlossFertig < 800) return; // Loslassen nach dem langen Druck aufs Schloss
  if (!stand) return;

  // Blätter öffnen/schließen ohne Neuzeichnen; jede andere Handlung aus einem Blatt schließt es zuerst
  if (await ebeneAktion(name, el)) return;
  if (blattOffen() && !BLATT_INTERN.has(name)) blattSchliessen();
  if (name === "vergleich-modus") { vergleichModus(el.dataset.wert); return zeichne(); }
  if (name === "einrichtung-liste") { try { const zu = localStorage.getItem("gc-einrichtung-zu") !== "0"; localStorage.setItem("gc-einrichtung-zu", zu ? "0" : "1"); } catch { /* ohne Speicher bleibt die Liste offen */ } return zeichne(); }
  if (name === "einrichtung-fertig-ok") { stand.einrichtungFertig = true; speichern(wurzel); return zeichne(); }
  if (name === "kuehl-keine") { stand.kuehl.keine = true; speichern(wurzel); return zeichne(); }
  if (name === "branchen-ok") { delete stand.branchenMeldung; speichern(wurzel); return zeichne(); }
  if (name === "waage-vorschlag") { stand.waageVorschlag = new Date().toISOString().slice(0, 10); speichern(wurzel); return bearbeiten("rezepte"); }
  if (name === "schnell-muell") { tagZuruecksetzen(); muellZuruecksetzen(); muellEingabeOeffnen(); ansicht = "muell"; return zeichne(); }
  if (name === "schnell-umsatz") { tagZuruecksetzen(); umsatzZuruecksetzen(); ansicht = "umsatz"; zeichne(); root.querySelector('[data-f="umsatz"]')?.focus(); return; }
  if (name === "zurueck") return schrittZurueck();
  if (name === "weiter") return schrittWeiter();
  if (name === "bearbeiten") return bearbeiten(el.dataset.schritt, el.dataset.bis);
  if (name === "nav" && el.dataset.wert !== ansicht) { if (ansicht.startsWith("ordner-")) ordnerZuruecksetzen(); if (ansicht === "buero") bueroZuruecksetzen(); } // Entwickler C: Büro zu, wenn es in den Laden geht
  if (name === "nav") { const nz = navZiel(wurzel, el.dataset.wert); if (nz.buero) return bueroBetreten(nz.ansicht); // Büro-Bildschirm aus dem Laden: erst ins Büro
    const ziel = nz.ansicht; if (ziel !== ansicht) herkunft = ansicht; // Prüfung 15.10.: Zurück führt dorthin, wo man herkam
    if (ziel === "inventur") inventurZuruecksetzen(); // Inventur aus dem Menü: offene Zählung oder Übersicht
    if (ziel === "karte" && ansicht !== "karte") karteLadenZuruecksetzen(); // B: Laden-Karte frisch (Filter „Alle“, Blatt zu)
    if (ziel === ansicht) { if (ziel === "muell") muellZuruecksetzen(); if (ziel === "kuehl") kuehlZuruecksetzen(); if (ziel === "beleg") belegZuruecksetzen(); if (ziel === "putzplan") putzplanZuruecksetzen(); } // Menüpunkt der aktuellen Seite: zurück auf deren Anfang
    if (el.dataset.anker) setTimeout(() => document.getElementById(el.dataset.anker)?.scrollIntoView({ block: "start" }), 60); if (ziel === "kartefoto" || ansicht === "kartefoto") fotoZuruecksetzen(); if (ziel !== ansicht) { if (ansicht === "beleg") belegZuruecksetzen(); if (ansicht === "abschluss") abschlussZuruecksetzen(); if (ziel === "muell" || ziel === "umsatz" || ziel === "abschluss") { tagZuruecksetzen(); muellZuruecksetzen(); umsatzZuruecksetzen(); } } ansicht = ziel; return zeichne(); }
  if (name === "export") return sicherungTeilen();
  if (name === "foto-abbrechen") { if (fotoLauf()?.zweck === "speisekarte" || hatVorschlaege()) serieAbbrechen(); else fotoZuruecksetzen(); return zeichne(); }
  if (name === "laden-neu") return ladenNeu();
  if (name === "aktualisieren") { if (aktualisierung) { aktualisierungKlick = true; aktualisierung.postMessage("uebernehmen"); } return; }
  if (name === "kuehl-rundgang-start") { if (ansicht === "abschluss") abschlussZuruecksetzen(); ansicht = "kuehl"; if (el.dataset.offen !== "1") kuehlAktion("kuehl-rundgang", el, stand, wurzel); return zeichne(); }
  if (name === "kuehl-einrichtung-oeffnen") { ansicht = "kuehl"; kuehlAktion("kuehl-einrichtung", el, stand, wurzel); return zeichne(); }
  if (name === "laden-wechseln") return ladenWechseln(el.dataset.id);
  if (name === "laden-loeschen") {
    if (wurzel.betriebe.length < 2 || !confirm(t("einstellungen.ladenLoeschenFrage", stand.betrieb.name))) return;
    const weg = stand.id; wurzel.betriebe = wurzel.betriebe.filter((b) => b.id !== weg);
    aktivSetzen((wurzel.betriebe.find((b) => b.phase === "app") || wurzel.betriebe[0]).id);
    await ereignis("laden-geloescht", { laden: weg }); ansicht = "laeden"; await sofortSpeichern(wurzel); return zeichne();
  }
  if (name === "loeschen") {
    if (!confirm(t("einstellungen.loeschenFrage"))) return;
    speichernAbbrechen(); await allesLoeschen(); await ablageLeeren(); tagZuruecksetzen(); muellZuruecksetzen(); belegZuruecksetzen(); abschlussZuruecksetzen(); inventurZuruecksetzen(); ebeneVergessen(); blattSchliessen(); wurzel = leereWurzel(); stand = null; aktivSetzen(null); ansicht = "start"; ereignisAnzahl = 0;
    setzeSprache(spracheDesGeraets()); return zeichne();
  }
  if (name === "sprache" && stand.phase === "app") { wurzel.sprache = el.dataset.wert; setzeSprache(wurzel.sprache, () => zeichne()); speichern(wurzel); return zeichne(); }

  if (stand.phase === "onboarding") {
    if (wechselt) return;
    const s = schritteFuer(stand)[stand.schritt];
    if (s.aktion && s.aktion(name, el, stand, ctx)) { speichern(wurzel); if (stand.phase === "onboarding" && !wechselt) zeichne(); }
    return;
  }
  // D: Müll nachtragen aus Büro/Listen (Tag wählen, dann das Foto-Raster für diesen Tag)
  if (name === "muell1-nachtragen") { tagAktion("tag-datum", el, stand); muellZuruecksetzen(); ansicht = "muell"; return zeichne(); }
  // D: Personal-Modus – Person wählen, Kacheln, Zurück zum Personal-Start
  if (name === "personal-start") { ansicht = "personal"; return zeichne(); }
  if (ansicht === "personal") {
    const r = personalAktion(name, el, stand); if (!r) return;
    if (r.ziel) {
      const wer = schichtPerson(stand) || "";
      if (r.ziel === "muell") { tagZuruecksetzen(); muellZuruecksetzen(); }
      if (r.ziel === "kuehl") { kuehlZuruecksetzen(); if (kuehlBereit(stand) && !rundgangOffen(stand)) { kuehlAktion("kuehl-rundgang", el, stand, wurzel); kuehlAktion("start-von", { dataset: { id: wer } }, stand, wurzel); } }
      if (r.ziel === "putzplan") { putzplanZuruecksetzen(); if (wer) putzplanAktion("pp-wer", { dataset: { id: wer } }, stand); }
      herkunft = "personal"; ansicht = r.ziel;
    }
    return zeichne();
  }
  if (name === "tag-datum" || name === "listen-zeitraum" || (name === "schwund-storno" && ansicht !== "muell")) {
    if (tagAktion(name, el, stand)) { speichern(wurzel); zeichne(); } return;
  }
  if (ansicht === "muell") {
    // D: ein Tipp = eingetragen; nur Kachel, Kopfzahl und Hinweis werden getauscht (kein ganzes Neuzeichnen)
    if (name === "muell-tipp") { if (muellKlickUnterdrueckt()) return; const r = muellTipp(el, stand); if (r) { if (!muellTippZeigen(root, stand)) zeichne(); speichern(wurzel); ereignis("schwund-eintrag", { laden: stand.id, tipp: true }); } return; }
    if (name === "muell1-zurueck") { if (muellTippZurueck(stand, el.dataset.id)) { speichern(wurzel); if (!root.querySelector(".muellraster")) zeichne(); else muellZurueckZeigen(root, stand); } return; }
    if (name === "muell-rueckgaengig") { if (muellRueckgaengig(stand, el.dataset.id)) { speichern(wurzel); meldung(t("muell.zurueckgenommen")); } return zeichne(); }
    const r = muellAktion(name, el, stand);
    if (r) { speichern(wurzel); if (name === "muell-weg-damit") ereignis("schwund-eintrag", { laden: stand.id }); if (r.meldung) meldung(r.meldung); zeichne(); }
  }
  if (ansicht === "umsatz") { if (umsatzAktion(name, el)) zeichne(); }
  if (ansicht === "karte") { // B: Laden-Karte – Plus/Minus tauschen nur das Blatt aus (Raster und Bilder bleiben stehen)
    const r = karteLadenAktion(name, el, stand);
    if (r === "blatt") { const b = root.querySelector(".kl-blatt"); if (b) { root.querySelector(".kl-dimmer")?.remove(); b.outerHTML = karteLadenBlatt(stand); eigeneFotosLaden(); } else zeichne(); return; }
    if (r && r.gespeichert) { ereignis("preis-geaendert", { laden: stand.id, gericht: r.id, vorher: r.vorher ?? null, preis: r.preis, ort: "laden" }); meldung(t("kartelaeden.gespeichert")); await sofortSpeichern(wurzel); return zeichne(); }
    if (r) return zeichne();
  }
  if (ansicht === "kartefoto") {
    if (name === "fv-uebernehmen") { const r = karteUebernehmen(stand); ereignis("karte-foto-uebernommen", { laden: stand.id, neu: r.neu }); meldung(t("foto.uebernommen", r.neu, r.artikel)); ansicht = "kartebuero"; await sofortSpeichern(wurzel); return zeichne(); }
    if (kartePruefenAktion(name, el)) zeichne();
  }
  if (ansicht === "beleg") {
    const r = belegAktion(name, el, stand, wurzel);
    if (r) { if (r.meldung) meldung(r.meldung); if (r === "uebernommen") { ereignis("beleg-uebernommen", { laden: stand.id }); await sofortSpeichern(wurzel); } else speichern(wurzel); zeichne(); }
  }
  if (ansicht === "abschluss") {
    const r = abschlussAktion(name, el, stand, wurzel);
    if (r) { ereignis("tag-abgeschlossen", { laden: stand.id }); await sofortSpeichern(wurzel); zeichne(); }
  }
  if (ansicht === "putzplan") {
    const r = putzplanAktion(name, el, stand);
    if (r) { if (r === "zurueck") { ansicht = startAnsicht(wurzel); speichern(wurzel); } else if (r === "speichern") await sofortSpeichern(wurzel); return zeichne(); }
  }
  if (ansicht === "inventur") {
    const r = inventurAktion(name, el, stand);
    if (r) {
      if (r === "abgeschlossen") { ereignis("inventur-fertig", { laden: stand.id }); await sofortSpeichern(wurzel); }
      else if (r === "sofort" || r.sofort) await sofortSpeichern(wurzel); else speichern(wurzel);
      if (r.meldung) meldung(r.meldung);
      zeichne();
    }
  }
  if (ansicht === "buero" || ansicht.startsWith("ordner-")) { // Entwickler C
    const r = ansicht === "buero" ? await bueroAktion(name, el, stand, wurzel) : await ordnerAktion(name, el, stand, ansicht);
    if (r) { if (r.speichern) await sofortSpeichern(wurzel); if (r.meldung) meldung(r.meldung); zeichne(); root.querySelector('.b-codefeld')?.focus(); }
    return;
  }
  if (ansicht === "kuehl") {
    const r = kuehlAktion(name, el, stand, wurzel);
    if (r) {
      zeichne();
      const feld = root.querySelector('[data-f="station-wert"]'); if (feld && !feld.value) feld.focus(); // Tastatur gleich hoch, der nächste Schritt ist Tippen
      if (r === "abgeschlossen") { ereignis("rundgang-fertig", { laden: stand.id }); meldung(t("kuehl.abgeschlossen")); await sofortSpeichern(wurzel); } else speichern(wurzel);
    }
  }
}
root.addEventListener("click", aufKlick);
ebeneHuelle()?.addEventListener("click", aufKlick); // Blätter liegen außerhalb von #app

// Personal-Modus: 2 Sekunden aufs Schloss drücken (nur ohne Büro-Code) – der Ring füllt sich, Loslassen bricht ab.
root.addEventListener("pointerdown", (ev) => {
  const el = ev.target.closest('[data-a="schloss"]'); if (!el || !wurzel || pinGesetzt(wurzel) || modus(wurzel) !== "personal") return;
  el.classList.add("haelt");
  const stop = () => { clearTimeout(uhr); el.classList.remove("haelt"); for (const e of ["pointerup", "pointercancel", "pointerleave"]) el.removeEventListener(e, stop); };
  const uhr = setTimeout(() => { stop(); schlossFertig = Date.now(); personalVerlassen(); }, 2000);
  for (const e of ["pointerup", "pointercancel", "pointerleave"]) el.addEventListener(e, stop);
});
root.addEventListener("contextmenu", (ev) => { if (ev.target.closest('[data-a="schloss"]')) ev.preventDefault(); });
document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && blattSchliessen()) ev.preventDefault(); });

// Eingaben: nicht bei jedem Zeichen neu zeichnen, sonst springt die Tastatur. Nur Stand ändern und speichern.
root.addEventListener("input", (ev) => {
  ruheBis = 0; // wer tippt, hat nicht doppelt getippt
  const el = ev.target.closest("[data-f]"); if (!el || el.type === "file") return;
  let neu = false;
  if (stand.phase === "onboarding") {
    const s = schritteFuer(stand)[stand.schritt];
    if (s.eingabe) neu = s.eingabe(el.dataset.f, el.value, stand);
    const zeile = el.closest(".zeile"); const betrag = el.closest(".betrag");
    if (zeile && betrag) { const leer = el.value.trim() === ""; zeile.classList.toggle("offen", leer); betrag.classList.remove("geschaetzt"); betrag.classList.toggle("offen", leer); }
  } else if (ansicht === "karte") { // B: Preis tippen – nur „Bleibt dir“ und Knopf austauschen, Feld behält den Fokus
    if (karteLadenEingabe(el.dataset.f, el.value) === "teil") { const teil = karteLadenTeile(stand); const z = root.querySelector(".kl-bleibt"); if (teil && z) z.outerHTML = teil.bleibt; const k = root.querySelector('[data-a="kl-speichern"]'); if (k && teil) k.disabled = !teil.speichernAn; }
    return; // Entwurf, noch nichts zu speichern
  } else if (ansicht === "kartefoto") {
    neu = kartePruefenEingabe(el.dataset.f, el.value);
  } else if (ansicht === "umsatz" || ansicht === "abschluss") {
    neu = umsatzEingabe(el.dataset.f, el.value, stand, wurzel);
  } else if (ansicht === "muell") {
    neu = muellEingabe(el.dataset.f, el.value);
    if (neu === "knopf") { neu = false; const k = root.querySelector('[data-a="muell-weg-damit"]'); if (k) k.disabled = !muellFormGueltig(); }
  } else if (ansicht === "beleg") {
    neu = belegEingabe(el.dataset.f, el.value);
    if (neu === "knopf") { neu = false; const k = root.querySelector('[data-a="beleg-zerlegen"]'); if (k) k.disabled = !belegTextDa(); }
    if (neu === "knopf-zw") { neu = false; const k = root.querySelector('[data-a="zw-speichern"]'); const w = parseZahl(el.value); if (k) k.disabled = !(w > 0); }
  } else if (ansicht === "einstellungen") {
    if (el.dataset.f === "warenQuote") { const n = parseZahl(el.value); stand.verkauf.warenQuote = n !== null && n < 90 ? n / 100 : null; }
    if (el.dataset.f === "steuerSatz") { const n = parseZahl(el.value); stand.betrieb.steuerSatz = n !== null && n < 100 ? n / 100 : null; }
  } else if (ansicht === "buero") { // Entwickler C
    neu = bueroEingabe(el.dataset.f, el.value); if (neu === "knopf") { neu = false; if (el.value !== el.value.replace(/\D/g, "").slice(0, 4)) el.value = el.value.replace(/\D/g, "").slice(0, 4); }
  } else if (ansicht.startsWith("ordner-")) {
    neu = ordnerEingabe(el.dataset.f, el.value); if (neu === "knopf") neu = false;
  } else if (ansicht === "inventur") {
    neu = inventurEingabe(el.dataset.f, el.value);
  } else if (ansicht === "kuehl") {
    neu = kuehlEingabe(el.dataset.f, el.value, stand);
    if (neu === "knopf") { neu = false; const k = root.querySelector('[data-a="station-speichern"]'); if (k) k.disabled = !kuehlFormGueltig(); }
  }
  speichern(wurzel);
  if (neu === true) { // Suchfelder: Liste live filtern, Fokus und Cursor behalten
    const f = el.dataset.f, pos = el.selectionStart; zeichne();
    const wieder = root.querySelector(`[data-f="${CSS.escape(f)}"]`); if (wieder) { wieder.focus(); try { wieder.setSelectionRange(pos, pos); } catch (_) {} }
  }
});

// Wenn ein Feld verlassen wird, einmal neu zeichnen, damit Zwischenstände und Markierungen stimmen.
root.addEventListener("focusout", (ev) => {
  const el = ev.target.closest("[data-f]"); if (!el || el.type === "file") return;
  if ((el.dataset.f === "station-wert" || el.dataset.f.startsWith("stelle-max:") || el.dataset.f.startsWith("stelle-min:")) && el.value.trim() !== "" && parseTemperatur(el.value) === null) meldung(t("kuehl.tempUngueltig", el.value.trim().slice(0, 12)));
  if (el.getAttribute("inputmode") === "decimal" && el.value.trim() !== "" && parseZahl(el.value) === null) {
    meldung(t(/^[0-9.,\s]+$/.test(el.value) ? "allgemein.zahlZuGross" : "allgemein.zahlUngueltig", el.value.trim().slice(0, 20)));
    if (el.dataset.f === "umsatz") { umsatzEingabe("umsatz", "", stand, wurzel); speichern(wurzel); } // halbe Zahl nicht stehen lassen
  }
  if (el.dataset.f.startsWith("wert:") && tagWertUebernehmen(el.dataset.f, el.value, stand)) { speichern(wurzel); meldung(t("tag.gespeichert")); }
  if (stand.phase === "onboarding" || ["umsatz", "kuehl", "muell", "abschluss", "einstellungen", "listen", "beleg", "inventur"].includes(ansicht)) setTimeout(() => { const a = document.activeElement; if (!a || a === document.body || !a.matches("[data-f]")) zeichne(); }, 80);
});

root.addEventListener("change", async (ev) => {
  const el = ev.target; if (!el.files?.[0]) return;
  const dateien = [...el.files]; const datei = dateien[0]; el.value = "";
  if (el.dataset.f === "import") return sicherungEinlesen(datei);
  if (el.dataset.f === "gericht-foto") { // Zielbild: eigenes Foto je Gericht (ersetzt Standardbild), bleibt auf dem Gerät
    const g = stand.gerichte.find((x) => x.id === el.dataset.id); if (!g) return;
    try { const meta = await ablegen(await bildFuerAblage(datei, 800), { name: datei.name || "", zweck: "gericht", laden: stand.id });
      stand.uploads.push({ id: "u-" + Date.now().toString(36), zweck: "gericht", erfasst: new Date().toISOString(), geraet: wurzel.geraet, status: "abgelegt", datei: meta, ref: g.id });
      g.foto = meta.id; g.fotoMeta = meta; speichern(wurzel); meldung(t("vergleich.fotoGespeichert")); }
    catch (e) { console.warn(e); meldung(t("muell.fotoFehler")); }
    return zeichne();
  }
  if (el.dataset.f === "muell-foto") { // Zielbild: Foto (optional) beim Müll – nur ablegen, nicht lesen; hängt am nächsten Eintrag
    const eintrag = { id: "u-" + Date.now().toString(36), zweck: "muell", erfasst: new Date().toISOString(), geraet: wurzel.geraet, status: "abgelegt", datei: null, auswertung: null, ergebnis: null };
    try { eintrag.datei = await ablegen(await bildFuerAblage(datei, 1200), { name: datei.name || "", zweck: "muell", laden: stand.id }); stand.uploads.push(eintrag); muellFotoSetzen(eintrag); speichern(wurzel); }
    catch (e) { console.warn(e); meldung(t("muell.fotoFehler")); }
    return zeichne();
  }
  if (el.dataset.f === "foto") {
    // Foto oder Datei: ablegen, lesen, Ergebnis zeigen. Speisekarte → Prüfliste, Rechnung → Zuweisung im Beleg-Bildschirm.
    const zweck = el.dataset.zweck || "rechnung";
    ereignis("foto", { laden: stand.id, zweck, art: datei.type || "?", anzahl: dateien.length });
    // Speisekarte: alle Fotos in die Warteschlange (Serie), gelesen wird nacheinander im Hintergrund
    if (zweck === "speisekarte") { await fotosHinzufuegen(stand, dateien, zweck, () => zeichne(), { geraet: wurzel.geraet, fertig: !el.hasAttribute("capture") }); speichern(wurzel); zeichne(); return; }
    const lauf = await fotoVerarbeiten(stand, datei, zweck, () => zeichne(), { geraet: wurzel.geraet });
    if (lauf && lauf === fotoLauf() && lauf.status === "fertig" && zweck !== "speisekarte" && ansicht === "beleg") belegTextVonFoto(lauf.text, lauf.upload);
    speichern(wurzel); zeichne();
  }
});

// Enter = Weiter, aber nur auf Bildschirmen mit genau einem Feld (sonst überspringt es Felder).
root.addEventListener("keydown", (ev) => {
  if (ev.key !== "Enter") return;
  const el = ev.target.closest("[data-f]"); if (!el || el.type === "file" || el.tagName === "TEXTAREA") return;
  ev.preventDefault();
  if (el.dataset.f === "eigenes" || el.dataset.f === "stelle-neu" || el.dataset.f === "person-neu") { const b = el.closest(".neu")?.querySelector('[data-a$="-neu"]'); if (b) b.click(); return; }
  if (el.dataset.f === "buero-code") { root.querySelector('[data-a="buero-code-oeffnen"], [data-a="buero-code-weiter"]')?.click(); return; } // Entwickler C
  el.blur();
  if (stand.phase === "onboarding" && root.querySelectorAll("[data-f]").length === 1) schrittWeiter();
});

// Zurück-Geste des Handys / Browser-Zurück: ein Schritt zurück statt App verlassen.
let herkunft = null; // vorige Ansicht (für die Zurück-Geste aus Listen und Beleg)
window.addEventListener("popstate", () => {
  if (!stand) return;
  if (blattSchliessen()) return; // Zurück schließt zuerst ein offenes Blatt – ohne Neuzeichnen
  const m = modus(wurzel); const anfang = startAnsicht(wurzel);
  if (stand.phase === "onboarding" && (stand.schritt > 0 || stand.rueckkehr || fotoLauf())) { schrittZurueck(); }
  else if (stand.phase === "app" && m === "buero" && ansicht === "buero") { ebeneWechseln("laden", "start"); } // Büro-Start: Zurück = „‹ Laden"
  else if (stand.phase === "app" && ansicht !== anfang) {
    if (ansicht === "listen") ansicht = herkunft && herkunft !== "listen" ? herkunft : m === "buero" ? "buero" : "umsatz";
    else if (ansicht === "kuehl" && kuehlZurueck()) { /* eine Ebene hoch */ }
    else if (ansicht === "putzplan" && putzplanZurueck(stand)) { /* eine Ebene hoch */ }
    else if (ansicht === "muell" && muellZurueck()) { /* eine Ebene hoch */ }
    else if (ansicht === "beleg" && belegZurueck()) { /* eine Ebene hoch */ }
    else if (ansicht === "inventur" && inventurZurueck(stand)) { /* eine Ebene hoch: Karte → Liste → Übersicht */ }
    else if (ansicht === "beleg") ansicht = herkunft && herkunft !== "beleg" ? herkunft : m === "buero" ? "buero" : "umsatz";
    else if (ansicht === "kartefoto") { fotoZuruecksetzen(); ansicht = "kartebuero"; }
    else if (ansicht.startsWith("ordner-")) { if (ordnerVorschauOffen()) ordnerZuruecksetzen(); else { ordnerZuruecksetzen(); ansicht = "buero"; } } // Vorschau zu, dann ins Büro
    else if (ansicht === "karte" && karteLadenZurueck()) { /* erst das Preis-Blatt schließen */ }
    else { if (ansicht === "abschluss") abschlussZuruecksetzen(); ansicht = anfang; } // Laden-Reiter stapeln nicht: Zurück = Heute; Büro → Büro-Start; Personal → drei Kacheln
    if (!ansichtErlaubt(wurzel, ansicht)) ansicht = anfang;
    zeichne();
  }
  history.pushState({ schritt: stand.schritt }, "");
});

// Beim Verlassen (Wechsel zu WhatsApp, Kamera, Sperrbildschirm) sofort sichern – der Tester tippt oft und wechselt weg.
window.addEventListener("pagehide", () => { if (wurzel) sofortSpeichern(wurzel, { stempel: false }); });
document.addEventListener("visibilitychange", () => {
  if (!wurzel) return;
  if (document.visibilityState === "hidden") sofortSpeichern(wurzel, { stempel: false });
  else { ereignis("app-sichtbar", { phase: stand.phase }); ereignisAnzahl += 1; }
});

function spracheDesGeraets() {
  const code = (navigator.language || "de").slice(0, 2).toLowerCase();
  return SPRACHEN.includes(code) ? code : "de";
}

// ---------- Start ----------

let aktualisierungKlick = false;
async function serviceWorkerStarten() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) { offlineStand = "keinSw"; return; }
  try {
    const reg = await navigator.serviceWorker.register("sw.js", { updateViaCache: "none" });
    const bereit = (w) => { aktualisierung = w; if (ansicht === "start" && stand?.phase === "app") zeichne(); };
    if (reg.waiting && navigator.serviceWorker.controller) bereit(reg.waiting);
    reg.addEventListener("updatefound", () => { const w = reg.installing; if (!w) return; w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) bereit(w); }); });
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (aktualisierungKlick) location.reload(); });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) reg.update().catch(() => {}); });
    await navigator.serviceWorker.ready; offlineStand = "bereit";
  } catch (e) { console.warn("Kein Service Worker:", e); offlineStand = "keinSw"; }
}

beiSpeicherFehler((art) => { speicherProblem = art; meldung(t(art === "fassung" ? "einstellungen.andereFassung" : "einstellungen.speichernFehlgeschlagen")); zeichne(); });

(async () => {
  try { wurzel = await laden(); }
  catch (e) {
    // Der gespeicherte Stand stammt aus einer neueren Fassung der App (z. B. alte Fassung aus dem Cache): nichts anfassen, nur erklären.
    setzeSprache(spracheDesGeraets());
    root.innerHTML = `<div class="schirm"><div class="inhalt"><h1 class="frage">${esc(t("einstellungen.fehlerTitel"))}</h1><p class="hinweis">${esc(t("einstellungen.standNeuer"))}</p><button type="button" class="knopf" data-a="aktualisieren-oder-neu">${esc(t("start.jetztUebernehmen"))}</button></div></div>`;
    root.querySelector('[data-a="aktualisieren-oder-neu"]').onclick = () => { if (aktualisierung) { aktualisierungKlick = true; aktualisierung.postMessage("uebernehmen"); } else location.reload(); };
    serviceWorkerStarten(); return;
  }
  aktivSetzen(wurzel.aktiv);
  ebeneWiederherstellen(wurzel); ansicht = startAnsicht(wurzel); // Modus gilt je Handy und bleibt nach dem Neustart (Büro mit Code: zurück in den Laden)
  // Gerichte ohne Rezept (aus älteren Fassungen) bekommen beim Start Startwerte aus dem Baukasten (Pilot 14.10.: keine leere App)
  { let n = 0; for (const b of wurzel.betriebe) n += fehlendeRezepteErgaenzen(b); if (n) { for (const b of wurzel.betriebe) b.artikel = artikelAusGerichten(b); speichern(wurzel); } }
  // Neue Branchenwerte (Punkt 7.4): einmal je Version einspielen, nur Schätzungen ersetzen, Meldung fürs Cockpit merken
  if (BRANCHENWERTE.werte.length) for (const b of wurzel.betriebe) {
    if ((b.branchenVersion || 0) >= BRANCHENWERTE.version) continue;
    const r = branchenwerteAnwenden(b, BRANCHENWERTE.werte); b.branchenVersion = BRANCHENWERTE.version;
    if (r.geaendert) b.branchenMeldung = { geaendert: r.geaendert, uebersprungenEigen: r.uebersprungenEigen, datum: new Date().toISOString().slice(0, 10) };
    speichern(wurzel);
  }
  serviceWorkerStarten();
  // Vor der Sprachwahl in der Sprache des Geräts fragen, damit ein türkischer oder englischer Tester die erste Frage lesen kann.
  await ladeSprache(wurzel.sprache || spracheDesGeraets()); setzeSprache(wurzel.sprache || spracheDesGeraets());
  const ev = await alleEreignisse(); ereignisAnzahl = ev.length;
  await ereignis("app-geoeffnet", { phase: stand.phase, schritt: schritteFuer(stand)[stand.schritt]?.id, sprache: wurzel.sprache, laeden: wurzel.betriebe.length });
  ereignisAnzahl += 1;
  history.replaceState({ schritt: stand.schritt }, "");
  history.pushState({ schritt: stand.schritt }, "");
  zeichne();
})();

// D: lang drücken auf ein Müll-Foto öffnet das Detail (Menge, Foto, Personalessen)
muellLangdruckEinrichten(root, (el) => { if (ansicht === "muell" && stand && muellAktion("muell-detail", el, stand)) zeichne(); });

// Für Tests und Fehlersuche
window.__gastrocalc = { get stand() { return stand; }, get wurzel() { return wurzel; }, zeichne };
