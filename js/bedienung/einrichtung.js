// Einrichtung (Onboarding) und alles, was Schritte weiterschaltet: Weiter, Zurück, Fertig, Bearbeiten aus der App heraus.
// Bearbeiten: Z.stand.rueckkehr = { von, bis } – nach dem Schritt „bis“ geht es zurück zur App.
// Neuer Laden aus der App heraus: Z.stand.neuAus = Kennung des vorherigen Ladens – „Zurück“ auf Schritt 1 geht zu dem zurück.
import { Z } from "../bedienung/zustand.js";
import { setzeSprache } from "./sprache.js";
import { zeichne } from "./zeichnen.js";
import { meldung } from "./meldung.js";
import { schritteFuer, bearbeitenZiel, schrittIndex } from "../screens/onboarding.js";
import { ereignis } from "../store.js";
import { schrittBetreten, aktivSetzen } from "./ladenverwaltung.js";
import { speichern, sofortSpeichern } from "./speichern.js";
import { hatVorschlaege, fotoZuruecksetzen } from "../screens/foto.js";
import { dauerhaftAnfragen } from "./sicherung.js";
import { navZiel, modusSetzen, modus } from "../modus.js";
import { pinStarten } from "../screens/ebene.js";
import { naechstesRezept } from "../rezept_quelle.js";
import { rezeptDirektOeffnen } from "../screens/karte.js";
import { einrichtungFertigSetzen, kuehlKeineSetzen, branchenMeldungQuittieren, kleinunternehmerUmschalten, waageVorschlagGesehen } from "../stamm.js";
import { heuteGeschaeft } from "../util.js";
import { NICHT } from "./tabellen.js";

// Rückrufe, die die Schritte der Einrichtung benutzen dürfen.
const ctx = {
  setzeSprache(code) { Z.wurzel.sprache = code; setzeSprache(code, () => zeichne()); },
  weiter(art) { schrittWeiter(art); },
  zurueck() { schrittZurueck(); },
  fertig(ziel) { fertig(ziel); },
  meldung(text) { meldung(text); }, // Schritte dürfen eine kurze Meldung zeigen
};
export async function schrittWeiter(art = "fertig") {
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

export function schrittZurueck() {
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

// Fertig: zurück in die App (oder gleich in die Karte aus Vorlagen), Speicher dauerhaft anfragen, Büro-Code festlegen auf Wunsch.
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

// Aus welcher Ansicht kam das Bearbeiten? Dorthin geht es danach zurück.
const RUECKKEHR_ANSICHTEN = ["einstellungen", "karte", "kartebuero", "inventur", "buero"];
function rueckkehrAnsicht() {
  const a = Z.ansicht;
  if (RUECKKEHR_ANSICHTEN.includes(a) || (modus(Z.wurzel) === "buero" && !a.startsWith("ordner-") && a !== "kartefoto")) return a;
  if (a === "kartefoto") return "kartebuero"; // aus „Karte per Foto“ zurück zur Speisekarte
  return a.startsWith("ordner-") ? "buero" : "start";
}
export function bearbeiten(vonId, bisId) {
  ({ von: vonId, bis: bisId } = bearbeitenZiel(Z.stand, vonId, bisId)); // ohne Gerichte erst die Gerichte-Auswahl
  const i = schrittIndex(vonId); if (i < 0) return;
  Z.stand.weg = "genau"; // Bearbeiten nutzt immer die einzelnen Schritte
  Z.stand.phase = "onboarding"; Z.stand.schritt = i;
  Z.stand.rueckkehr = { von: vonId, bis: bisId || vonId, ansicht: rueckkehrAnsicht() };
  schrittBetreten();
  ereignis("bearbeiten", { schritt: vonId });
  history.pushState({ schritt: i }, "");
  speichern(Z.wurzel); zeichne();
}

// Mitmach-Rundgang: Tipp aufs Gericht (Laden-Karte) oder „Jetzt“ (Heute) → sofort die erste Mengenfrage.
// Ohne Kennung nimmt Zeki das nächste geschätzte Gericht (meistverkauft zuerst). Danach geht es zurück dorthin, wo der Chef herkam.
export function rezeptDirekt(gid, { max = 3 } = {}) {
  const g = gid ? Z.stand.gerichte.find((x) => x.id === gid) : naechstesRezept(Z.stand);
  if (!g) return bearbeiten("karte", "rezepte");
  rezeptDirektOeffnen(Z.stand, g.id, { max });
  ereignis("rezept-direkt", { laden: Z.stand.id, ort: Z.ansicht });
  return bearbeiten("rezepte");
}

// Ein Tipp, solange die Einrichtung läuft: der Schritt entscheidet (s.aktion).
export function onboardingKlick(name, el) {
  if (Z.wechselt) return;
  const s = schritteFuer(Z.stand)[Z.stand.schritt];
  if (s.aktion && s.aktion(name, el, Z.stand, ctx)) { speichern(Z.wurzel); if (Z.stand.phase === "onboarding" && !Z.wechselt) zeichne(); }
}
// Eine Eingabe in der Einrichtung: der Schritt entscheidet (s.eingabe); Beträge markieren ihre Zeile als offen oder gefüllt.
export function onboardingEingabe(el) {
  const s = schritteFuer(Z.stand)[Z.stand.schritt];
  const neu = s.eingabe ? s.eingabe(el.dataset.f, el.value, Z.stand) : false;
  const zeile = el.closest(".zeile"); const betrag = el.closest(".betrag");
  if (zeile && betrag) { const leer = el.value.trim() === ""; zeile.classList.toggle("offen", leer); betrag.classList.remove("geschaetzt"); betrag.classList.toggle("offen", leer); }
  return neu;
}

export const KLICK = {
  "einrichtung-fertig-ok": () => { einrichtungFertigSetzen(Z.stand); speichern(Z.wurzel); return zeichne(); },
  "kuehl-keine": () => { kuehlKeineSetzen(Z.stand); speichern(Z.wurzel); return zeichne(); },
  "branchen-ok": () => { branchenMeldungQuittieren(Z.stand); speichern(Z.wurzel); return zeichne(); },
  kleinunternehmer: () => { kleinunternehmerUmschalten(Z.stand); speichern(Z.wurzel); return zeichne(); }, // keine Vorsteuer – alle Posten Satz 0
  "waage-vorschlag": () => { waageVorschlagGesehen(Z.stand, heuteGeschaeft()); speichern(Z.wurzel); return bearbeiten("rezepte"); },
  zurueck: () => schrittZurueck(),
  weiter: () => schrittWeiter(),
  bearbeiten: (el) => bearbeiten(el.dataset.schritt, el.dataset.bis),
  "rezept-direkt": (el) => (Z.stand.phase === "app" ? rezeptDirekt(el.dataset.id || null) : NICHT), // Heute „Jetzt“
};
