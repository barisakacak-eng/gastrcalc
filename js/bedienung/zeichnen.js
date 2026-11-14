// Zeichnen: wählt nach Phase und Ansicht den Bildschirm, setzt ihn ein und räumt danach auf (Banner, Scrollposition, Fotos nachladen).
// zeichne() setzt Z.root.innerHTML komplett neu; Zustand ändert es nicht.
import { bueroView } from "../screens/buero.js";
import { Z } from "../bedienung/zustand.js";
import { einstellungenView, karteView, startView } from "../screens/home.js";
import { speicherIstDauerhaft, APP_FASSUNG, speicherVerfuegbar, beiSpeicherFehler } from "../store.js";
import { fehlerLesen } from "../fehler.js";
import { speicherLokal } from "../adapter/browser_speicher.js";
import { homeLage, hinweiseMitHm, zekiLage, zekiGesehenMerken, zekiBildschirm } from "./zeki.js";
import { karteLadenView, karteLadenKennung } from "../screens/karte_laden.js";
import { muellView, muellKennung } from "../screens/muell.js";
import { umsatzView } from "../screens/umsatz.js";
import { listenView } from "../screens/tag.js";
import { kuehlView, kuehlKennung } from "../screens/kuehl.js";
import { modus, ansichtErlaubt, startAnsicht } from "../modus.js";
import { putzplanView } from "../screens/putzplan.js";
import { umsatzLadenView, umsatzLadenKennung } from "../screens/umsatz_laden.js";
import { laedenView } from "../screens/laeden.js";
import { belegView, belegKennung } from "../screens/beleg.js";
import { abschlussView, abschlussKennung } from "../screens/abschluss.js";
import { vergleichView } from "../screens/vergleich.js";
import { preisrundeView } from "../screens/preisrunde.js";
import { wareView } from "../screens/ware.js";
import { heuteGeschaeft, esc } from "../util.js";
import { portionView } from "../screens/portion.js";
import { inventurView, inventurKennung } from "../screens/inventur.js";
import { verkaufView, verkaufKennung } from "../screens/verkauf.js";
import { bestandView, bestandKennung } from "../screens/bestand.js";
import { aktionenView, aktionenKennung } from "../screens/aktionen.js";
import { tafelView } from "../screens/tafel.js";
import { geld3View } from "../screens/geld3.js";
import { getraenkeView, getraenkeKennung } from "../screens/getraenke.js";
import { lieferantenView, lieferantenKennung } from "../screens/lieferanten.js";
import { kuehlWareView, kuehlWareKennung } from "../screens/kuehl_ware.js";
import { personalView, personalKontext, personalAktiv } from "../screens/personal.js";
import { ordnerAmtView, ordnerPaketView } from "../screens/ordner.js";
import { sicherungStufe } from "../sicherung_stufe.js";
import { fotoKennung, karteZeigtPruefliste, kartePruefenView, karteFotoView, karteFussKnopf, fotoLauf } from "../screens/foto.js";
import { holen, beiAblageFehler } from "../ablage.js";
import { l6z } from "../data/l6z_texte.js";
import { sprache as aktuelleSprache, t } from "../i18n.js";
import { kalkulationNeuerTakt } from "../engine.js";
import { meldungBeiWechsel, meldung } from "./meldung.js";
import { tagStand, speicherProblemArt } from "../bedienhilfe.js";
import { verkaufSichtbar } from "../verkauf.js";
import { navKontext, nav } from "../screens/nav.js";
import { zekiStimmeEinsetzen, zekiTaktStarten } from "../screens/zeki_takt.js";
import { haken } from "./zustand.js";
import { blattSchliessen } from "../screens/ebene.js";
import { schritteFuer } from "../screens/onboarding.js";

// Welche Funktion liefert das HTML einer Ansicht in der Phase „app“? Jede andere Ansicht (auch „start“) zeigt Heute.
const ANSICHT_VIEW = {
  buero: () => bueroView(Z.stand, Z.wurzel, { aktualisierung: !!Z.aktualisierung }),
  einstellungen: () => einstellungenView(Z.stand, Z.ereignisAnzahl, Z.wurzel, {
    offline: Z.offlineStand, dauerhaft: speicherIstDauerhaft(), fassung: APP_FASSUNG, fehlerAnzahl: fehlerLesen(speicherLokal()).length,
    home: homeLage({ buero: true }), rueckhol: Z.rueckholInfo,
  }),
  karte: () => karteLadenView(Z.stand),
  kartebuero: () => karteView(Z.stand),
  muell: () => muellView(Z.stand),
  umsatz: () => umsatzView(Z.stand),
  listen: () => listenView(Z.stand),
  kuehl: () => kuehlView(Z.stand, { buero: modus(Z.wurzel) === "buero" }), // Monatsblatt, Einrichtung, 7-Tage-Lücken nur im Büro
  putzplan: () => putzplanView(Z.stand, { buero: modus(Z.wurzel) === "buero" }), // Einrichten und Anpassen nur im Büro
  umsatzheute: () => umsatzLadenView(Z.stand),
  laeden: () => laedenView(Z.wurzel),
  beleg: () => belegView(Z.stand),
  abschluss: () => abschlussView(Z.stand),
  kartefoto: () => karteFotoSchirm(),
  vergleich: () => vergleichView(Z.stand),
  preisrunde: () => preisrundeView(Z.stand),
  ware: () => wareView(Z.stand, { datum: heuteGeschaeft() }),
  portion: () => portionView(Z.stand),
  inventur: () => inventurView(Z.stand),
  verkauf: () => verkaufView(Z.stand),
  bestand: () => bestandView(Z.stand),
  aktionen: () => aktionenView(Z.stand),
  tafel: () => tafelView(Z.stand),
  hinweise: () => hinweiseMitHm(),
  geld3: () => geld3View(Z.stand),
  getraenke: () => getraenkeView(Z.stand),
  lieferanten: () => lieferantenView(Z.stand),
  kuehlware: () => kuehlWareView(Z.stand),
  personal: () => personalView(Z.stand),
  "ordner-amt": () => ordnerAmtView(Z.stand),
  "ordner-steuer": () => ordnerPaketView(Z.stand, "steuer"),
  "ordner-buch": () => ordnerPaketView(Z.stand, "buch"),
};
const heuteView = () => startView(Z.stand, {
  aktualisierung: !!Z.aktualisierung, wurzel: Z.wurzel, ...zekiLage(), sicherungTage: sicherungStufe(Z.wurzel)?.tage ?? null, home: homeLage(),
});

// Zusatz zur Kennung eines Bildschirms: ein offenes Formular oder Blatt zählt als anderer Bildschirm (dann beginnt das Scrollen oben).
const KENNUNG_UNTER = {
  karte: karteLadenKennung, kuehl: kuehlKennung, muell: muellKennung, beleg: belegKennung, abschluss: abschlussKennung, kartefoto: fotoKennung,
  inventur: inventurKennung, verkauf: verkaufKennung, bestand: bestandKennung, aktionen: aktionenKennung, getraenke: getraenkeKennung,
  kuehlware: kuehlWareKennung, lieferanten: lieferantenKennung, umsatzheute: umsatzLadenKennung,
};
function schirmKennung() {
  const unter = Object.hasOwn(KENNUNG_UNTER, Z.ansicht) ? KENNUNG_UNTER[Z.ansicht]() : "";
  return Z.stand.phase === "onboarding"
    ? `ob:${Z.stand.id}:${Z.stand.weg}:${Z.stand.schritt}:${fotoKennung()}`
    : `app:${Z.stand.id}:${Z.ansicht}${unter ? ":" + unter : ""}`;
}

// Eigene Fotos (Gericht) aus der Ablage nachladen – einmal je Foto, als Objekt-Adresse im Speicher
const fotoAdressen = new Map();

export async function eigeneFotosLaden() {
  for (const img of Z.root.querySelectorAll("img[data-foto]")) {
    const id = img.dataset.foto; let url = fotoAdressen.get(id);
    if (!url) { const g = Z.stand.gerichte.find((x) => x.foto === id); const blob = g?.fotoMeta ? await holen(g.fotoMeta).catch(() => null) : null; if (!blob) continue; url = URL.createObjectURL(blob); fotoAdressen.set(id, url); }
    img.src = url; img.classList.remove("pikto");
  }
}

// Lauf 6, E5 (C): „Speicher voll“ (QuotaExceededError) bekommt einen eigenen, verständlichen Satz im selben Banner; sonst der bisherige Text.
const speicherText = (art) => (art === "voll" || art === "ablageVoll" ? l6z(aktuelleSprache(), "speicherVoll") : t(art === "fassung" ? "einstellungen.andereFassung" : "einstellungen.speichernFehlgeschlagen"));

export function zeichne() {
  kalkulationNeuerTakt(); // Zahlen dieses Bildes einmal rechnen
  // Personal-Modus: nur Personal-Start, Müll, Kühlung, Putzen (die Person für neue Einträge setzt das Speichern, nicht das Zeichnen)
  if (Z.wurzel && Z.stand) {
    personalKontext(Z.wurzel);
    if (personalAktiv() && !["personal", "muell", "kuehl", "putzplan"].includes(Z.ansicht)) Z.ansicht = "personal";
  }
  const kennung = schirmKennung();
  const y = kennung === Z.letzterSchirm ? window.scrollY : 0;
  try {
    if (Z.stand.phase === "onboarding") zeichneOnboarding(); else zeichneApp();
  } catch (e) {
    console.error(e);
    notfallSeite();
  }
  speicherBandZeigen();
  if (kennung !== Z.letzterSchirm) { Z.ruheBis = Date.now() + 250; meldungBeiWechsel(); }
  Z.letzterSchirm = kennung; Z.gezeichneterTag = tagStand();
  window.scrollTo(0, y);
}

// Phase „app“: Bildschirm der Ansicht einsetzen, Zeki dazu, Führung oder Auftritt planen.
function zeichneApp() {
  if (!ansichtErlaubt(Z.wurzel, Z.ansicht)) Z.ansicht = startAnsicht(Z.wurzel); // Ebene schützt: z. B. kein Euro-Bildschirm im Personal-Modus
  if (Z.ansicht === "verkauf" && !verkaufSichtbar(Z.stand)) Z.ansicht = startAnsicht(Z.wurzel); // ohne Schalter gibt es den Bereich nicht
  navKontext(Z.stand, Z.wurzel, Z.ansicht, modus(Z.wurzel) === "buero" ? Z.bueroWeg : []);
  document.body.dataset.modus = modus(Z.wurzel);
  const v = (ANSICHT_VIEW[Z.ansicht] || heuteView)();
  Z.root.innerHTML = `<div class="schirm">${v}</div>`;
  zekiGesehenMerken(Z.root.querySelector("[data-zeki-key]")?.dataset.zekiKey); zekiStimmeEinsetzen(Z.root); zekiBildschirm(); zekiTaktStarten();
  haken.fuehrungStartPlanen?.();
  eigeneFotosLaden();
}

// Fehler- oder Speicher-Banner über dem Bildschirm
function speicherBandZeigen() {
  if (speicherVerfuegbar() && !Z.speicherProblem) return;
  const b = document.createElement("div"); b.className = "tipp warnband"; b.style.margin = "12px 20px 0";
  b.classList.add("speicherband"); b.textContent = Z.speicherProblem ? speicherText(Z.speicherProblem) : t("einstellungen.speicherFehlt");
  Z.root.prepend(b);
}

// Fehlerseite (Rettung): eine Sicherung einlesen geht hier OHNE Büro-Code – sie ersetzt dann den kaputten Stand
// (Rückfrage vorher). Das Passwort der Sicherung bleibt Pflicht. Im Personal-Modus wird wie sonst zusammengeführt, nicht ersetzt.
// „Alles löschen“ bleibt mit Büro-Code (dort hilft „Code vergessen?“).
export function notfallSeite() {
  Z.notfall = true; blattSchliessen();
  const ersetzen = modus(Z.wurzel) !== "personal";
  Z.root.innerHTML = `<div class="schirm"><div class="inhalt">
      <h1 class="frage">${esc(t("einstellungen.fehlerTitel"))}</h1><p class="hinweis">${esc(t("einstellungen.fehlerText"))}</p>
      ${ersetzen ? `<p class="hinweis">${esc(t("rettung.fehlerOhneCode"))}</p>` : ""}
      <label class="knopf zweit mitte">${esc(t("einstellungen.importieren"))}<input type="file" accept="application/zip,.zip,application/json,.json" data-f="import"${ersetzen ? ' data-ersetzen="1"' : ""} class="versteckt"></label>
      <button type="button" class="knopf warn" data-a="loeschen">${esc(t("einstellungen.loeschenAlles"))}</button></div></div>`;
}

// Speisekarte fotografieren aus der App heraus (Karte → „Speisekarte fotografieren"): dieselben Bausteine wie im Schnellstart.
function karteFotoSchirm() {
  return `<div class="inhalt">${karteZeigtPruefliste() ? kartePruefenView(Z.stand) : karteFotoView(Z.stand)}
      ${karteFussKnopf("")}
      ${!karteZeigtPruefliste() && !fotoLauf() && !Z.stand.gerichte.length ? `<button type="button" class="knopf zweit" data-a="bearbeiten" data-schritt="karte" data-bis="ergebnis">${esc(t("start.karteAnlegen"))}</button>` : ""}
      <button type="button" class="leise" data-a="nav" data-wert="${modus(Z.wurzel) === "buero" ? "kartebuero" : "start"}">${esc(t("allgemein.zurueck"))}</button></div>${nav("kartebuero")}`; // Persona-Test 27.10.: aus dem Laden zurück zu Heute
}

function zeichneOnboarding() {
  // E: Kennung des sichtbaren Schritts – Trennung: gemerkt in schrittBetreten(), nicht mehr beim Zeichnen
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

// Ein Speicherfehler (Schreiben, Platz, zweites Fenster) zeigt das Banner; auch ein Foto, das nicht auf das Gerät passt.
const speicherFehlerZeigen = (art, fehler) => { Z.speicherProblem = speicherProblemArt(art, fehler); meldung(speicherText(Z.speicherProblem)); zeichne(); };
export function speicherFehlerAnmelden() {
  beiAblageFehler((art, fehler) => speicherFehlerZeigen(art || "ablage", fehler));
  beiSpeicherFehler(speicherFehlerZeigen);
}
