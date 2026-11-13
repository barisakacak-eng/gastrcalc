// Mitmach-Rundgang und Zekis erste Führung: Rückrufe für js/screens/rundgang.js. Hier wird geschrieben (Übungsmodus, Rezept behalten, Ende);
// der Rundgang selbst zeigt nur an. Während der Übung ist Speichern pausiert – ein Abbruch oder Neuladen lässt den alten Stand stehen.
// Die Station steht im Browser (localStorage, nur Komfort): nach dem Neuladen geht es dort weiter.
import { karteLadenZuruecksetzen } from "../screens/karte_laden.js";
import { tagZuruecksetzen } from "../screens/tag.js";
import { muellZuruecksetzen } from "../screens/muell.js";
import { kuehlZuruecksetzen } from "../screens/kuehl.js";
import { umsatzLadenZuruecksetzen } from "../screens/umsatz_laden.js";
import { Z } from "../bedienung/zustand.js";
import { zekiLogAnhaengen, uebungStarten, uebungZuruecknehmen, uebungRezepteMerken, uebungRezepteBehalten, rundgangAbschliessen } from "../stamm.js";
import { ohneStempelSpeichern, sofortSpeichern } from "./speichern.js";
import { modus, modusSetzen, modusVergessen, startAnsicht } from "../modus.js";
import { blattSchliessen } from "../screens/ebene.js";
import { zeichne } from "./zeichnen.js";
import { speichernPausieren, speichernAbbrechen, ereignis } from "../store.js";
import { alleZuruecksetzen } from "./zuruecksetzen.js";
import { naechstesRezept, waageFragen, rezeptFortschritt } from "../rezept_quelle.js";
import { artikelAbgleichen } from "../karte_daten.js";
import { rezeptDirekt } from "./einrichtung.js";
import { rundgangOffen as fuehrungOffen, rundgangStarten as fuehrungStarten } from "../screens/rundgang.js";
import { kurzOffen, kurzStarten } from "../screens/rundgang_kurz.js";
import { testHaken } from "../adapter/testhaken.js";
import { personalAktiv } from "../screens/personal.js";
import { introStarten } from "../intro.js";

const RG_SCHLUESSEL = "gastrocash-rundgang";
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

// Kurzer Rundgang fertig: „Gesehen“ merken, Heute sofort neu zeichnen, damit der Home-Hinweis nicht erst nach einem Tabwechsel kommt.
function kurzFertig() {
  rundgangAbschliessen(Z.stand, "kurz"); ereignis("rundgang-kurz", { laden: Z.stand.id }); ohneStempelSpeichern();
  if (Z.ansicht === "start" && Z.stand.phase === "app") zeichne();
}
// Nach 400 ms, wenn der Chef inzwischen nichts getippt hat und nicht in der Einrichtung oder Mengenfrage ist.
// Der Rundgang läuft je Gerät einmal – auch nicht nach dem Einlesen eines Ladens ohne Merker.
function fuehrungNachPause(nr) {
  if (Z.ansicht !== "start" || Z.stand.phase !== "app" || Z.eingabeNr !== nr || Z.stand.fuehrung || (Z.wurzel?.betriebe || []).some((b) => b.fuehrung) || fuehrungOffen() || kurzOffen()) return;
  if (testHaken("__gcFuehrungZeigen")) fuehrungStarten(document, rundgangApi()); // Testhaken: der lange Mitmach-Rundgang (12 Stationen) bleibt prüfbar
  else kurzStarten(document, { fertig: kurzFertig }); // kurzer Rundgang statt 12 Stationen; „Fertig“ und „Überspringen“ merken „gesehen“
}
// Erster Besuch auf Heute: Führung mit Zeki. Sonst, im Laden, höchstens einmal je App-Start die Einführung.
export function fuehrungStartPlanen() {
  const imLaden = Z.ansicht === "start" && modus(Z.wurzel) === "laden" && !personalAktiv() && !fuehrungOffen();
  if (imLaden && !Z.stand.fuehrung) { const nr = Z.eingabeNr; setTimeout(() => fuehrungNachPause(nr), 400); }
  else if (imLaden) introStarten(document);
}
