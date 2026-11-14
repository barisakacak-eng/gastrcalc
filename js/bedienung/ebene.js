// Ebenen Laden · Personal · Büro und alles, was ein Blatt öffnet (Menü, Sprache, Läden, Hilfe, Code, Sicherung, Hinweise).
// Die Tabelle KLICK wird in klick.js als erste Stufe gefragt; ein Tipp aus einem Blatt schließt es danach (außer BLATT_INTERN).
import { Z } from "../bedienung/zustand.js";
import {
  pinGesetzt, testphaseOhneCode, modus, modusSetzen, startAnsicht, codeAktiv, bioKennung, BUERO_OFFEN_MS, bioSetzen, testphaseSetzen,
  pinSetzen,
} from "../modus.js";
import { schichtPersonVergessen } from "../screens/personal.js";
import { tagZuruecksetzen } from "../screens/tag.js";
import { muellZuruecksetzen } from "../screens/muell.js";
import { kuehlZuruecksetzen } from "../screens/kuehl.js";
import { putzplanZuruecksetzen } from "../screens/putzplan.js";
import {
  blattSchliessen, blattOffen, pinStarten, pinZweckJetzt, pinTaste, rettungscodeZeigen, pinZweck, rettungStarten, rettungOffen,
  rettungZiel, rettungMeldung, rettungWert, rettungWarteText, sicherungWahl, passwortWert, passwortMeldung, menueZeigen, hilfeZeigen,
  spracheZeigen, laedenZeigen, passwortStarten, sicherungSchalter, passwortZeigen,
} from "../screens/ebene.js";
import { ereignis } from "../store.js";
import { speichern, sofortSpeichern } from "./speichern.js";
import { bearbeiten } from "./einrichtung.js";
import { zeichne, notfallSeite } from "./zeichnen.js";
import { meldung } from "./meldung.js";
import { t } from "../i18n.js";
import { bioPruefen, bioEinrichten } from "../schloss_bio.js";
import { allesLoeschenJetzt, ladenLoeschenJetzt } from "./ladenverwaltung.js";
import { rettungErlaubt, rettungVersuch, rettungAnlegen } from "../rettung.js";
import { sicherungOrtSetzen, sicherungStufe } from "../sicherung_stufe.js";
import { sicherungTeilen, sicherungEinlesen } from "./sicherung.js";
import { passwortGueltig } from "../schluessel.js";
import { NICHT } from "./tabellen.js";
import { rechtsformSetzen } from "../rechtsform.js";
import { hmFrageSetzen, hmStatusSetzen } from "../hinweis_motor.js";
import { heute } from "../util.js";
import { hinweisStatusSetzen } from "../hinweis.js";
import { geld3Aktion } from "../screens/geld3.js";

export function ebeneWechseln(m, ziel) {
  Z.bueroWeg = []; // Ebenenwechsel beginnt den Büro-Weg neu
  if (m === "personal" && !pinGesetzt(Z.wurzel) && !testphaseOhneCode(Z.wurzel)) return; // W2-S: Personal nur mit Büro-Code – außer in der Testphase ohne Code
  if (m === "personal" && modus(Z.wurzel) !== "personal") schichtPersonVergessen(Z.stand); // (Persona-Test): Chef gibt das Handy weiter → neu fragen „Wer arbeitet?“, sonst bucht der Nächste unter dem alten Namen
  if (m === "personal") { tagZuruecksetzen(); muellZuruecksetzen(); kuehlZuruecksetzen(); putzplanZuruecksetzen(); } // W2-S: kein gewählter Vortag, keine offene Einrichtung
  modusSetzen(Z.wurzel, m); blattSchliessen();
  Z.ansicht = ziel === "preise" ? "buero" : (ziel || startAnsicht(Z.wurzel)); // Paket 3: Nav-Ziel „preise“ = Büro, dann der Schritt Einkaufspreise
  ereignis("modus", { modus: m, laden: Z.stand.id });
  if (m === "buero") history.pushState({ buero: true }, "");
  Z.ruheBis = Date.now() + 350; speichern(Z.wurzel);
  if (m === "buero" && ziel === "preise") return bearbeiten("preise");
  zeichne();
}
// Laden → Büro: mit Code, wenn einer gesetzt ist (Einstellung im Büro), sonst direkt.
export function bueroBetreten(ziel = "buero") {
  if (codeAktiv(Z.wurzel) && Date.now() > Z.bueroOffenBis) { if (!blattOffen()) history.pushState({ blatt: true }, ""); pinStarten("buero", ziel, Z.wurzel); return; }
  ebeneWechseln("buero", ziel);
}

function personalVerlassen() { ebeneWechseln("laden", "start"); }

function nachCodeGesetzt(ziel) {
  meldung(t("ebene.pin.gesetzt"));
  if (ziel === "personal") return ebeneWechseln("personal", "personal");
  const u = ziel?.rettung;
  if (u?.zweck === "buero" && !Z.notfall) return ebeneWechseln("buero", u.ziel || "buero");
  if (u?.zweck === "personal" && !Z.notfall) return personalVerlassen(); // vom Personal-Schloss: neuer Code → Laden
  if (Z.notfall) return notfallSeite();
  zeichne();
}

// Büro-Code nach 5 Minuten im Hintergrund wieder verlangen.
export function ebeneAnmelden() {
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => { if (document.hidden) Z.versteckt = Date.now(); else if (Z.versteckt && Date.now() - Z.versteckt > 5 * 60 * 1000) Z.bueroOffenBis = 0; });
}

// Tipps, die zum offenen Blatt gehören: sie schließen es nicht.
export const BLATT_INTERN = new Set([
  "pin-bio", "menue-auf", "blatt-zu", "hilfe-mehr", "blatt-sprache", "blatt-laeden", "menue-zurueck", "hilfe-auf", "pin-taste", "pin-weg",
  "passwort-zeigen", "sicherung-teilen", "sicherung-ohne", "sicherung-einlesen", "sicherung-pw-schalter", "sicherung-fotos-schalter",
  "sicherung-ort", "rettung-start", "rettung-pruefen", "rettung-ok",
]);

const blattMerken = () => { if (!blattOffen()) history.pushState({ blatt: true }, ""); };

async function pinBio() { // Face ID statt Code
  const z = pinZweckJetzt(); if (!z || !(await bioPruefen(bioKennung(Z.wurzel)))) return;
  blattSchliessen();
  if (z.zweck === "buero") { Z.bueroOffenBis = Date.now() + BUERO_OFFEN_MS; ebeneWechseln("buero", z.ziel || "buero"); }
  else if (z.zweck === "personal") personalVerlassen();
}
async function bioEinrichtenKlick() {
  const id = await bioEinrichten();
  if (id) { bioSetzen(Z.wurzel, id); await sofortSpeichern(Z.wurzel); meldung(t("schloss.bioAn")); } else meldung(t("schloss.bioNicht"));
  zeichne();
}
async function pinTasteKlick(name, el) {
  const r = await pinTaste(name === "pin-weg" ? "weg" : el.dataset.wert, Z.wurzel);
  if (r?.fehler) { await sofortSpeichern(Z.wurzel); return; } // Fehlversuch-Zähler übersteht einen Neustart
  if (r?.zweck === "buero") { Z.bueroOffenBis = Date.now() + BUERO_OFFEN_MS; ebeneWechseln("buero", r.ziel || "buero"); }
  else if (r?.zweck === "personal") personalVerlassen();
  else if (r?.zweck === "loeschen") await allesLoeschenJetzt();
  else if (r?.zweck === "ladenLoeschen") await ladenLoeschenJetzt(r.ziel);
  else if (r?.zweck === "setzen") { // danach in Personal; erst den Rettungscode zeigen
    await sofortSpeichern(Z.wurzel);
    if (r.rettungscode) rettungscodeZeigen(r.rettungscode, r.ziel); else nachCodeGesetzt(r.ziel);
  }
  if (r?.zweck && r.zweck !== "setzen") await sofortSpeichern(Z.wurzel); // umgestellter Prüfwert / gelöster Zähler
}

// „Code vergessen?“ → Rettungscode → neuer Büro-Code → neuer Rettungscode. Im Personal-Modus nur am Schloss (Personal verlassen).
function rettungStart() { const u = pinZweck(); if (!u || !rettungErlaubt(Z.wurzel, u.zweck)) return; rettungStarten(u, Z.wurzel); }
async function rettungPruefen() {
  if (!rettungOffen() || !rettungErlaubt(Z.wurzel, rettungZiel()?.zweck)) return;
  rettungMeldung("", { laeuft: true }); // PBKDF2 rechnet – kein zweiter Tipp
  const r = await rettungVersuch(Z.wurzel, rettungWert());
  if (r.gesperrt) { rettungMeldung(rettungWarteText(r.gesperrt), { gesperrt: true }); return; }
  await sofortSpeichern(Z.wurzel); // Zähler übersteht einen Neustart (wie beim Büro-Code)
  if (r.ok) { pinStarten("setzen", { rettung: rettungZiel() }, Z.wurzel, t("rettung.richtig")); return; }
  rettungMeldung(r.dauer ? rettungWarteText(r.dauer) : t("rettung.falsch"), { gesperrt: !!r.dauer });
  if (r.dauer) setTimeout(() => rettungMeldung("", {}), r.dauer);
}
function rettungOk() {
  const z = rettungZiel(); if (modus(Z.wurzel) === "personal" && z?.rettung?.zweck !== "personal") return;
  blattSchliessen(); nachCodeGesetzt(z);
}
async function rettungNeu() { // im Büro: neuen Rettungscode anlegen (der alte gilt nicht mehr)
  if (modus(Z.wurzel) !== "buero" || !codeAktiv(Z.wurzel)) return;
  const code = await rettungAnlegen(Z.wurzel); await sofortSpeichern(Z.wurzel);
  blattMerken(); rettungscodeZeigen(code, null);
}

async function sicherungOrt(el) { // nur „woanders“ setzt die Erinnerung zurück
  const gezaehlt = sicherungOrtSetzen(Z.wurzel, el.dataset.wert);
  blattSchliessen(); meldung(t(gezaehlt ? "ladenSchirm.sicherung.gezaehlt" : "ladenSchirm.sicherung.nurHandyMeldung"));
  ereignis("sicherung-ort", { ort: el.dataset.wert === "woanders" ? "woanders" : "handy" }); await sofortSpeichern(Z.wurzel); zeichne();
}
// „Sicherung teilen“ / „Sicherung einlesen“ (Passwort-Blatt): ohne Passwort-Schalter wird gleich geteilt, sonst zählt das Passwort.
async function sicherungTeilenKlick(name) {
  if (name === "sicherung-teilen" && !sicherungWahl().mitPasswort) { const w = sicherungWahl(); blattSchliessen(); await sicherungTeilen(null, { mitAblage: !w.ohneFotos }); return; }
  const p = passwortWert();
  if (!passwortGueltig(p)) { passwortMeldung(t("passwort.zuKurz")); return; }
  passwortMeldung("", { laeuft: true }); // PBKDF2 rechnet – kein zweiter Tipp
  if (name === "sicherung-teilen") { const w = sicherungWahl(); blattSchliessen(); await sicherungTeilen(p, { mitAblage: !w.ohneFotos }); return; }
  if (!Z.einleseDatei) { blattSchliessen(); return; }
  await sicherungEinlesen(Z.einleseDatei, p);
}

async function rechtsformKlick(el) {
  if (Z.stand.phase !== "app") return NICHT;
  if (rechtsformSetzen(Z.stand, el.dataset.wert)) { ereignis("rechtsform", { laden: Z.stand.id, wert: el.dataset.wert }); meldung(t("rechtsform.gesetzt")); await sofortSpeichern(Z.wurzel); }
  zeichne();
}
async function hmFrageKlick(el) { // Hinweis-Motor
  const f = el.dataset.frage, w = el.dataset.wert;
  const wert = w === "ja" ? true : w === "nein" ? false : w === "nie" ? "nie" : el.closest(".hm-frage")?.querySelector(".hm-datum")?.value || "";
  if (hmFrageSetzen(Z.stand, f, wert, { bisHeute: heute() })) await sofortSpeichern(Z.wurzel);
  zeichne();
}
async function hmStatusKlick(el) {
  if (hmStatusSetzen(Z.stand, el.dataset.id, el.dataset.status, { datum: heute() })) {
    ereignis("hm-status", { laden: Z.stand.id, id: el.dataset.id, status: el.dataset.status }); await sofortSpeichern(Z.wurzel);
  }
  zeichne();
}
async function hinweisStatusKlick(el) {
  if (hinweisStatusSetzen(Z.stand, el.dataset.id, el.dataset.status)) {
    ereignis("hinweis-status", { laden: Z.stand.id, id: el.dataset.id, status: el.dataset.status });
    meldung(t(el.dataset.status === "erledigt" ? "hinweise.erledigtMeldung" : "hinweise.spaeterMeldung")); await sofortSpeichern(Z.wurzel);
  }
  zeichne();
}
function modusKlick(el) {
  const m = el.dataset.wert;
  if (m === "buero") bueroBetreten();
  else if (m === "personal") { // erst Code festlegen
    if (pinGesetzt(Z.wurzel) || testphaseOhneCode(Z.wurzel)) ebeneWechseln("personal", "personal");
    else { blattMerken(); pinStarten("setzen", "personal", Z.wurzel, t("sicherheit.personalBrauchtCode")); }
  } else if (m === "laden" && modus(Z.wurzel) === "buero") ebeneWechseln("laden", "start");
}
// Personal: Tipp aufs Schloss → immer der Code. Ohne Code gibt es keinen Personal-Modus (alter Stand: gleich zurück).
function schlossKlick() {
  if (codeAktiv(Z.wurzel)) { blattMerken(); pinStarten("personal", null, Z.wurzel); } else personalVerlassen();
}
const sicherungTeilenTabelle = (name) => (_el) => sicherungTeilenKlick(name);

export const KLICK = {
  "menue-auf": () => { blattMerken(); menueZeigen(Z.stand, Z.wurzel); },
  "menue-zurueck": () => menueZeigen(Z.stand, Z.wurzel),
  "blatt-zu": () => { blattSchliessen(); Z.einleseDatei = null; Z.einleseErsetzen = false; }, // wartende Sicherungsdatei loslassen
  "hilfe-mehr": (el) => hilfeZeigen(el.dataset.wert, true), // ganze Hilfe nach „Mehr“
  "blatt-sprache": () => spracheZeigen(),
  "blatt-laeden": () => laedenZeigen(Z.wurzel),
  "hilfe-auf": () => { blattMerken(); hilfeZeigen(Z.ansicht); },
  "pin-bio": () => pinBio(),
  "bio-einrichten": () => bioEinrichtenKlick(),
  "pin-taste": (el) => pinTasteKlick("pin-taste", el),
  "pin-weg": (el) => pinTasteKlick("pin-weg", el),
  "rettung-start": () => rettungStart(),
  "rettung-pruefen": () => rettungPruefen(),
  "rettung-ok": () => rettungOk(),
  "rettung-neu": () => rettungNeu(),
  "pin-setzen": () => { blattMerken(); pinStarten("setzen", null, Z.wurzel); },
  export: () => { blattMerken(); passwortStarten("teilen", { tage: sicherungStufe(Z.wurzel)?.tage ?? null }); }, // erst das Passwort-Blatt; geteilt wird mit oder ohne Passwort
  "sicherung-pw-schalter": () => sicherungSchalter("passwort"),
  "sicherung-fotos-schalter": () => sicherungSchalter("fotos"),
  "sicherung-ort": (el) => sicherungOrt(el),
  "passwort-zeigen": () => passwortZeigen(),
  "sicherung-ohne": async () => { blattSchliessen(); await sicherungTeilen(null); },
  "sicherung-teilen": sicherungTeilenTabelle("sicherung-teilen"),
  "sicherung-einlesen": sicherungTeilenTabelle("sicherung-einlesen"),
  rechtsform: (el) => rechtsformKlick(el),
  "hm-status": (el) => hmStatusKlick(el),
  "hm-frage": (el) => hmFrageKlick(el),
  "hinweis-status": (el) => hinweisStatusKlick(el),
  "testphase-code": async () => {
    testphaseSetzen(Z.wurzel, !testphaseOhneCode(Z.wurzel));
    meldung(t(testphaseOhneCode(Z.wurzel) ? "ebene.pin.testphaseAn" : "ebene.pin.testphaseAus")); await sofortSpeichern(Z.wurzel); zeichne();
  },
  "pin-entfernen": async () => { await pinSetzen(Z.wurzel, null); meldung(t("ebene.pin.entfernt")); await sofortSpeichern(Z.wurzel); zeichne(); },
  modus: (el) => modusKlick(el),
  schloss: () => schlossKlick(),
};

// Geld-Seite (Welle 3): alle Namen mit „g3-“ gehören den Geld-Karten.
export function praefixKlick(name, el) {
  if (name.startsWith("g3-") && geld3Aktion(name, el, Z.stand)) { speichern(Z.wurzel); return zeichne(); }
  return NICHT;
}
