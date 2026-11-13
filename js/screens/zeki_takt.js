// Zeki lebt (Salbei & Papier, 13.11.2026): Die Bühnen-Figur bewegt sich selten und ruhig – immer genau eine Folge (assets/brand/zeki-klein/), danach steht wieder das ruhende Bild.
// – Ankommen auf einem Bildschirm: EINMAL die Bewegung der Haltung (zekiEreignis „ankommen:<haltung>“). Folgen werden erst geladen, wenn sie gebraucht werden (folgeVorladen), nie alle auf einmal.
// – Leerlauf: „warten“ (atmen, blinzeln) in unregelmäßigen Abständen – nur über der Ruhe-Haltung; eine gehaltene Pose (Hand oben …) bleibt stehen. Zwinkern gibt es im Leerlauf nie.
// – Ereignisse: Erfolg (Eintrag gespeichert, Haken gesetzt) → nicken · Tag geschafft → jubeln · Lob → zwinkern (einzelne kurze Bewegung) · Warnung/Fehler → kopfschütteln bzw. prüfen, Miene „warnung“, nie Grinsen.
// – „Bewegung reduzieren“: gar keine Bewegung, nur das ruhende Bild. Nur Anzeige.
import { buehnenBild, folgeFuer, folgeVorladen, zekiEreignis, zekiSpielen, LEERLAUF_FOLGE } from "../zeki_figur.js";
import { buehneEinrichten } from "./buehne_dom.js";

const ZEKI_ANKOMMEN_FRIST_MS = 1500; // ist die Folge so lange nach dem Ankommen noch nicht geladen, bleibt es beim ruhenden Bild
export const ERNST_AUSLOESER = ["kuehl_abweichung", "muell_hoch"];
const reduziert = (el) => { try { return !!el?.ownerDocument?.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches; } catch { return false; } };
export const buehnenFigur = (root) => root?.querySelector?.(".gc-buehne .gc-figur[data-zeki-buehne]") || null;

// Beim Zeichnen eines Bildschirms: Leerlauf anmelden und – beim Ankommen auf einem neuen Bildschirm – die Bewegung der Haltung spielen. Rückgabe: Handle der Folge oder null.
export function zekiAnkommen(root, { neu = true } = {}) {
  const fig = buehnenFigur(root); if (!fig || reduziert(fig)) return null;
  zekiSpielen(fig, LEERLAUF_FOLGE); // gibt null, solange die Haltung keine Ruhe ist
  const haltung = buehnenBild(fig.getAttribute("data-zeki-buehne"))?.haltung; if (!neu || !haltung) return null;
  const e = `ankommen:${haltung}`, name = folgeFuer(e); if (!name) return null;
  const h = zekiEreignis(fig, e); if (h) return h;
  const t0 = Date.now(); // noch nicht geladen: jetzt laden; kommt sie rechtzeitig, läuft die Ankunft doch noch
  folgeVorladen(fig, name).then((ok) => { if (ok && fig.isConnected && Date.now() - t0 < ZEKI_ANKOMMEN_FRIST_MS) zekiEreignis(fig, e); }).catch(() => {});
  return null;
}

// Ein Ereignis (erfolg | tagGeschafft | lob | warnung | fehler) an der Bühnen-Figur dieses Bildschirms
export function zekiBewegt(root, ereignis) {
  const fig = buehnenFigur(root); if (!fig || reduziert(fig) || !folgeFuer(ereignis)) return null;
  return zekiEreignis(fig, ereignis);
}

// Bei einer Warnung wird Zeki ernst: das ruhende Bild wechselt zur Haltung „warten“ mit Miene „warnung“ (Bühnen-Bild blatt-sperre), danach schüttelt er den Kopf.
export function zekiErnst(root) {
  const fig = buehnenFigur(root), bild = fig?.querySelector("img.gc-zeki"), ernst = buehnenBild("blatt-sperre"); if (!fig || !bild || !ernst) return false;
  fig.setAttribute("data-zeki-buehne", "blatt-sperre"); bild.setAttribute("src", ernst.datei); return true;
}

// Welches Ereignis gehört zu einem Satz von Zeki (js/zeki.js zekiMoment: ausloeser, bewegung)? null = Zeki bleibt stehen.
export function zekiEreignisFuerMoment(moment) {
  if (!moment || moment.bewegung === "keine") return null;
  if (ERNST_AUSLOESER.includes(moment.ausloeser)) return "warnung";
  if (moment.ausloeser === "ziel_erreicht") return "tagGeschafft";
  if (moment.ausloeser === "tag_abgeschlossen") return moment.bewegung === "zwinkern" ? "lob" : "erfolg";
  return moment.bewegung === "nicken" ? "erfolg" : null; // zwinkern nur beim Lob, hand und grinsen stehen lassen
}

// Erfolg und „Tag geschafft“: Ein Tipp auf einen speichernden Knopf merkt das Ereignis vor; nach dem Neuzeichnen (die Bühne ist dann neu) läuft die Bewegung einmal.
// Welche Knöpfe gelten, steht hier; die Namen (data-a) gehören den Bildschirmen und ändern sich nicht.
export const ERFOLG_AKTIONEN = /^(pp-haken|muell-weg-damit|station-speichern|ul-speichern|zw-speichern|vk-hand-speichern|vk-kombi-speichern|kl-speichern|hb-speichern|kw-weg-speichern|kw-behalten-speichern|bel-eintragen)$/;
export const TAG_AKTIONEN = /^abschluss-fertig$/;
export const VORMERKEN_MS = 1500;
let offen = null, angemeldet = false;
export function zekiVormerken(ereignis, jetzt = Date.now()) { offen = { ereignis, bis: jetzt + VORMERKEN_MS }; }
export function zekiAktionMerken(aktion, jetzt = Date.now()) {
  if (TAG_AKTIONEN.test(aktion)) zekiVormerken("tagGeschafft", jetzt); else if (ERFOLG_AKTIONEN.test(aktion)) zekiVormerken("erfolg", jetzt);
}
// Wird beim Zeichnen gefragt: gibt es ein vorgemerktes Ereignis, das noch gilt? Dann läuft es (und ersetzt die Ankunft); sonst null.
export function zekiVorgemerktes(root, jetzt = Date.now()) {
  const o = offen; offen = null; if (!o || jetzt > o.bis) return null;
  return zekiBewegt(root, o.ereignis);
}
// Anmeldung beim Start der Bedienung (js/bedienung/zeichnen.js): lauscht nur, fängt nichts ab
export function zekiTaktStarten(doc = typeof document !== "undefined" ? document : null) {
  if (!doc?.addEventListener || angemeldet) return; angemeldet = true;
  doc.addEventListener("click", (ev) => { const a = ev.target?.closest?.("[data-a]")?.getAttribute?.("data-a"); if (a) zekiAktionMerken(a); }, true);
}

// Zekis Stimme: Was Zeki sagt, steht in der Bühne direkt neben ihm – keine Sprechblase, kein Kasten, nie über dem Inhalt (Salbei & Papier).
// Den festen Satz eines Bildschirms (.zeki-zeile / .kl-zeki) und den Titel holt buehneEinrichten aus dem Inhalt in die Bühne. Rückgabe: true, wenn Zeki spricht.
export function zekiStimmeEinsetzen(root) {
  const r = buehneEinrichten(root);
  return !!(r.satz || root?.querySelector?.(".gc-buehne.spricht"));
}
// Ein flüchtiger Satz (Lage des Tages) ersetzt ≈ 7 s lang Zekis festen Satz in der Bühne (CSS blendet ihn aus, der Titel bleibt), dann ist der feste Satz wieder da. Antippen schließt sofort.
function stimmePlatz(root) {
  const leiste = root?.querySelector?.(".gc-buehne"); const innen = leiste?.querySelector(".gc-buehne-innen"); if (!innen) return null;
  let text = innen.querySelector(".gc-buehne-text"); let neu = false;
  if (!text) { text = root.ownerDocument.createElement("div"); text.setAttribute("class", "gc-buehne-text"); innen.insertBefore(text, innen.firstChild); neu = true; leiste.classList.remove("gc-buehne-niedrig"); }
  let platz = text.querySelector(".zeki-stimme");
  if (!platz) { platz = root.ownerDocument.createElement("div"); platz.setAttribute("class", "zeki-stimme"); platz.setAttribute("aria-live", "polite"); text.append(platz); }
  return { kopf: leiste.querySelector(".zeki-knopf"), leiste, text, platz, neu };
}
export function zekiSprechblase(root, moment, { restMs = 7000, bewegen = true } = {}) {
  if (!moment?.text) return false;
  const p = stimmePlatz(root); if (!p) return false;
  const satz = root.ownerDocument.createElement("p");
  const ernst = moment.ausloeser === "kuehl_abweichung" || moment.ausloeser === "muell_hoch";
  satz.setAttribute("class", "zeki-sprech" + (ernst ? " zeki-sprech--ernst" : ""));
  satz.setAttribute("role", "status"); satz.style.setProperty("--zeki-rest", Math.max(0, Math.round(restMs)) + "ms");
  satz.append(moment.text);
  const weg = () => {
    satz.remove(); if (p.platz.childElementCount) return;
    p.platz.remove(); p.leiste.classList.remove("gc-spricht-kurz");
    if (!p.text.childElementCount) { p.text.remove(); p.leiste.classList.add("gc-buehne-niedrig"); }
  };
  satz.addEventListener("click", weg); satz.addEventListener("animationend", (e) => { if (e.animationName === "zekiBlaseAus") weg(); });
  p.platz.replaceChildren(satz); p.leiste.classList.add("gc-spricht-kurz");
  if (ernst) zekiErnst(root);
  const e = bewegen ? zekiEreignisFuerMoment(moment) : null; if (e) zekiBewegt(root, e);
  return true;
}
