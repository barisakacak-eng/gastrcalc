// Zeki auf dem Bildschirm und die Lage des Home-Bildschirm-Hinweises.
// Welche Lage Zeki heute schon gesagt hat, ist nur Anzeige-Komfort im Browser (localStorage), nicht im Betriebsstand.
// Fehlt der Speicher (privates Fenster), sagt Zeki seinen Satz eben noch einmal.
import { testHaken } from "../adapter/testhaken.js";
import { Z } from "../bedienung/zustand.js";
import { heute, heuteGeschaeft } from "../util.js";
import { hmGezeigtMerken, hmFuerBuero, hmLadenZeile, hmLadenGezeigt } from "../hinweis_motor.js";
import { sofortSpeichern } from "./speichern.js";
import { rundgangOffen as fuehrungOffen } from "../screens/rundgang.js";
import { modus } from "../modus.js";
import { ZEKI_BILDSCHIRM, zekiMoment } from "../zeki.js";
import { personalAktiv, anredeTeam } from "../screens/personal.js";
import { rezeptFortschritt } from "../rezept_quelle.js";
import { zekiSprechblase, zekiAnkommen, zekiVorgemerktes, buehnenFigur } from "../screens/zeki_takt.js";
import { t, sprache as aktuelleSprache } from "../i18n.js";
import { fristErinnerungHeute } from "../welle3.js";
import { fristSatz } from "../data/frist_texte.js";
import { hmUi } from "../data/hm_texte.js";
import { sicherungStufe, sicherungFaellig } from "../sicherung_stufe.js";
import { installZustand, homeHinweisFaellig } from "../homebildschirm.js";
import { kurzOffen } from "../screens/rundgang_kurz.js";

// Testhaken window.__gcD.homeGeraet ("ios" | "android") stellt das Gerät nur für Bildproben ein (nur auf localhost); sonst zählt der echte Browser.
const probeGeraet = () => testHaken("__gcD")?.homeGeraet || null;
const ZEKI_SCHLUESSEL = "gastrocash-zeki-gesehen";

function zekiGesehenLesen() {
  try { const a = JSON.parse(localStorage.getItem(ZEKI_SCHLUESSEL) || "[]"); return new Set(Array.isArray(a) ? a : []); } catch { return new Set(); }
}

export function zekiLage() {
  const g = zekiGesehenLesen(); const rest = Z.zekiGerade ? 7000 - (Date.now() - Z.zekiGerade.t) : 0;
  if (rest > 0) { g.delete(Z.zekiGerade.key); return { zekiGesehen: g, zekiRestMs: rest, zekiOhneBewegung: true }; }
  return { zekiGesehen: g };
}

export function zekiGesehenMerken(key) {
  if (!key) return;
  if (!Z.zekiGerade || Z.zekiGerade.key !== key) Z.zekiGerade = { key, t: Date.now() };
  try { const tag = key.split(":").pop(); const a = [...zekiGesehenLesen()].filter((k) => k.endsWith(":" + tag)); if (!a.includes(key)) a.push(key); localStorage.setItem(ZEKI_SCHLUESSEL, JSON.stringify(a)); } catch { /* ohne Speicher kein Merken */ }
}


// Beim Zeichnen: Zekis Satz einsetzen (zekiSatz) und seine Bewegung planen. Ankommen heißt: ein anderer Bildschirm als beim letzten Zeichnen – dann spielt er EINMAL die Bewegung seiner Haltung;
// ein Neuzeichnen desselben Bildschirms (Tipp, Eintrag) lässt ihn stehen, außer ein Erfolg ist vorgemerkt (Haken, Speichern, Tag geschafft). Während Führung oder Hinweis ist die Bühne leer: keine Bewegung.
let letzteAnkunft = "";
export function zekiBildschirm() {
  const fig = buehnenFigur(Z.root), key = fig ? [Z.stand?.id, Z.ansicht, modus(Z.wurzel), fig.getAttribute("data-zeki-buehne")].join("|") : "";
  try { zekiSatz(); } finally {
    if (fig && !fuehrungOffen() && !kurzOffen()) {
      const neu = key !== letzteAnkunft; letzteAnkunft = key;
      const gespielt = zekiVorgemerktes(Z.root); zekiAnkommen(Z.root, { neu: neu && !gespielt });
    }
  }
}
function zekiSatz() {
  if (fuehrungOffen() || (Z.ansicht === "start" && !Z.stand?.fuehrung && modus(Z.wurzel) === "laden")) return; // Führung zuerst, keine zweite Blase darüber
  if (Z.root.querySelector(".zeki-zeile, .kl-zeki, .zeki-stimme > *")) return; // Bildschirm hat schon seinen Zeki-Satz – keine zweite Blase
  const nur = Z.ansicht === "start" ? null : ZEKI_BILDSCHIRM[Z.ansicht]; if ((Z.ansicht !== "start" && !nur) || !Z.stand) return; // Heute: alle Lagen, Zeki spricht oben rechts
  const H = heuteGeschaeft(); const gesehen = zekiGesehenLesen();
  if (Z.zekiGerade && Date.now() - Z.zekiGerade.t < 7000) gesehen.delete(Z.zekiGerade.key);
  let zm = null;
  // Mitmach-Rundgang: erstes eigenes Rezept da, aber noch nicht alle Verkaufsrenner → höchstens einmal am Tag leise „3 von 12 …“
  if (Z.ansicht === "start" && !personalAktiv()) { const r = rezeptFortschritt(Z.stand); const key = `rezepte:${H}`;
    if (r.mit > 0 && !r.rennerFertig && (!gesehen.has(key) || Z.zekiGerade?.key === key) && !Z.root.querySelector('[data-dran="kuehlAlarm"]')) {
      const laeuft = Z.zekiGerade?.key === key;
      zekiSprechblase(Z.root, { ausloeser: "rezepte", text: t("heute.rezeptErinnerung.stand", r.mit, r.gesamt), bewegung: "nicken" }, { restMs: laeuft ? 7000 - (Date.now() - Z.zekiGerade.t) : 7000, bewegen: !laeuft });
      zekiGesehenMerken(key); return; } }
  // Lauf 3, Phase 6: 5 Tage vor einem Pflichttermin sagt Zeki auf Heute einen Satz, höchstens einmal am Tag, nie über einem Kühl-Alarm
  if (Z.ansicht === "start" && !personalAktiv() && !Z.root.querySelector('[data-dran="kuehlAlarm"]')) { const key = `frist:${H}`;
    if (!gesehen.has(key) || Z.zekiGerade?.key === key) { let f = null; try { f = fristErinnerungHeute(Z.stand, heute()); } catch { f = null; }
      if (f) { const laeuft = Z.zekiGerade?.key === key; const arten = f.arten.map((a) => t("w3.termine.art." + a)).join(", ");
        zekiSprechblase(Z.root, { ausloeser: "frist", text: fristSatz(aktuelleSprache(), arten, f.datum.slice(8, 10) + "." + f.datum.slice(5, 7) + "."), bewegung: "nicken" }, { restMs: laeuft ? 7000 - (Date.now() - Z.zekiGerade.t) : 7000, bewegen: !laeuft });
        zekiGesehenMerken(key); return; } } }
  // Lauf 3, Hinweis-Motor: im Laden höchstens einmal je 7 Tage ein Satz, nie in der Stoßzeit, nie über einem Kühl-Alarm
  if (Z.ansicht === "start" && !personalAktiv() && !Z.root.querySelector('[data-dran="kuehlAlarm"]')) {
    let k = null; try { k = hmLadenZeile(Z.stand, { jetzt: new Date() }); } catch { k = null; }
    if (k) { zekiSprechblase(Z.root, { ausloeser: "hm", text: hmUi(aktuelleSprache(), k === "hm.zeki.geld" ? "zekiGeld" : "zekiPflicht"), bewegung: "nicken" }, { restMs: 7000, bewegen: true });
      hmLadenGezeigt(Z.stand, heute()); sofortSpeichern(Z.wurzel); return; } }
  try { zm = zekiMoment(Z.stand, { H, sprache: aktuelleSprache(), gesehen, sicherungTage: sicherungStufe(Z.wurzel)?.tage ?? null, sicherung: personalAktiv() ? null : sicherungFaellig(Z.wurzel), nur: nur && personalAktiv() ? nur.filter((x) => x !== "muell_hoch") : nur || undefined }); } catch { zm = null; }
  if (!zm) return;
  // Auf Heute spricht die Jetzt-Karte schon („Kühlrundgang“) – Zeki sagt dort nur Ernstes, sonst doppelt und über 15 Wörter
  if (Z.ansicht === "start" && zm.ausloeser !== "kuehl_abweichung" && zm.ausloeser !== "muell_hoch") return;
  if (Z.ansicht === "start" && zm.ausloeser === "kuehl_abweichung" && Z.root.querySelector('[data-dran="kuehlAlarm"]')) return; // Persona-Test Vater 27.10.: Warnung stand doppelt
  const key = `${zm.ausloeser}:${H}`; const laeuft = Z.zekiGerade?.key === key;
  if (personalAktiv()) zm = { ...zm, text: anredeTeam(zm.text, Z.stand) }; // Baris: andere Anrede im Personal-Modus
  zekiSprechblase(Z.root, zm, { restMs: laeuft ? 7000 - (Date.now() - Z.zekiGerade.t) : 7000, bewegen: !laeuft });
  zekiGesehenMerken(key);
}

export function homeLage({ buero = false } = {}) {
  const g = probeGeraet();
  const z = installZustand(g ? { matchMedia: () => ({ matches: false }), navigator: { userAgent: g === "android" ? "Android" : "iPhone" } } : globalThis);
  if (buero) return { ...z, knopf: !!Z.installAufforderung };
  if (fuehrungOffen() || kurzOffen() || !(Z.stand?.fuehrung || (Z.wurzel?.betriebe || []).some((b) => b.fuehrung)) || !homeHinweisFaellig(Z.wurzel, z)) return null; // erst nach dem Rundgang
  return z;
}
