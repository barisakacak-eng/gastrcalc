// Klicks: ein Tipp auf ein Element mit data-a. aufKlick schützt vor Doppeltipps und doppelt laufenden Aktionen; aufKlickAktion fragt die
// Stufen der Reihe nach. Eine Stufe „behandelt“ den Tipp, sobald ihr Eintrag etwas anderes als NICHT zurückgibt – dann ist Schluss.
// Reihenfolge der Stufen (nicht ändern, sie ist Teil des Verhaltens):
//   1 Ebene (Blätter, Büro-Code, Hinweise) → offenes Blatt schließen (außer BLATT_INTERN)
//   2 Bereiche (Einrichtung, Navigation, Sicherung, Zeki, Update, Laden-Verwaltung, …) – alle Namen sind einmalig
//   3 Einrichtung läuft → der Schritt entscheidet
//   4 „Müll nachtragen“ → Personal-Start → Tag wählen → Bildschirm der Ansicht
// Einen neuen Namen trägt man in der Klick-Tabelle (export const KLICK) seines Bereichs ein, nicht hier.
import { zusammenfuehren, NICHT } from "./tabellen.js";
import { aktionsSperre, aktionsSchluessel } from "../bedienhilfe.js";
import { Z } from "../bedienung/zustand.js";
import { modus, personalGesperrt } from "../modus.js";
import { heuteGeschaeft } from "../util.js";
import { meldung } from "./meldung.js";
import { t } from "../i18n.js";
import { bestandLink } from "../screens/bestand.js";
import { blattOffen, blattSchliessen, ebeneHuelle } from "../screens/ebene.js";
import { BLATT_INTERN } from "./ebene.js";
import { offeneKlappen } from "../screens/bausteine.js";
import { KLICK as KLICK_EBENE, praefixKlick } from "./ebene.js";
import { KLICK as KLICK_EINRICHTUNG, onboardingKlick } from "./einrichtung.js";
import { KLICK as KLICK_NAVIGATION } from "./navigation.js";
import { KLICK as KLICK_SICHERUNG } from "./sicherung.js";
import { KLICK as KLICK_UPDATE } from "./update.js";
import { KLICK as KLICK_LADENVERWALTUNG } from "./ladenverwaltung.js";
import { KLICK as KLICK_SPRACHE } from "./sprache.js";
import { KLICK as KLICK_START } from "./start.js";
import { KLICK as KLICK_LADEN, ANSICHT_KLICK as ANSICHT_LADEN } from "./laden.js";
import { KLICK as KLICK_BUERO, ANSICHT_KLICK as ANSICHT_BUERO } from "./buero.js";
import { KLICK as KLICK_TAGWAHL, KLICK_TAG } from "./tag.js";
import { personalKlick } from "./personal.js";

// Stufe 2: alle Bereiche zusammen. Ein Name in zwei Bereichen wirft sofort beim Laden (zusammenfuehren).
const BEREICHE = zusammenfuehren(
  KLICK_EINRICHTUNG, KLICK_NAVIGATION, KLICK_SICHERUNG, KLICK_UPDATE, KLICK_LADENVERWALTUNG, KLICK_SPRACHE, KLICK_START, KLICK_LADEN, KLICK_BUERO,
);
const ANSICHT_KLICK = zusammenfuehren(ANSICHT_LADEN, ANSICHT_BUERO);

const WECHSEL_SCHUTZ_MS = 450;

const FLAECHE_NEU_MS = 240;

const ZAEHL_TIPPS = new Set(["muell-tipp", "kl-minus", "kl-plus", "minus", "plus", "ul-team-plus", "pin-taste", "pin-weg", "s2-kuehl"]);

const DOPPELTIPP_MS = 180;

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

// Fragt eine Tabelle nach dem Namen; true, wenn der Eintrag den Tipp behandelt hat.
async function tabellenStufe(tabelle, name, el, k) {
  if (!Object.hasOwn(tabelle, name)) return false;
  return (await tabelle[name](el, k)) !== NICHT;
}
async function ebeneStufe(name, el, k) {
  if (Object.hasOwn(KLICK_EBENE, name)) return (await KLICK_EBENE[name](el, k)) !== NICHT;
  return (await praefixKlick(name, el)) !== NICHT;
}
// Bildschirm der Ansicht: „ordner-…“ gehören alle dem Ordner-Handler. Der Handler bekommt Namen und Element.
function ansichtKlick(name, el) {
  const h = Z.ansicht.startsWith("ordner-") ? ANSICHT_KLICK["ordner-"] : ANSICHT_KLICK[Z.ansicht];
  return h ? h(name, el) : undefined;
}

async function aufKlickAktion(ev, el, name) {
  const k = { name, ev };
  if (await ebeneStufe(name, el, k)) return; // Blätter öffnen/schließen ohne Neuzeichnen
  if (blattOffen() && !BLATT_INTERN.has(name)) blattSchliessen(); // jede andere Handlung aus einem Blatt schließt es zuerst
  if (await tabellenStufe(BEREICHE, name, el, k)) return;
  if (Z.stand.phase === "onboarding") return onboardingKlick(name, el);
  if (await tabellenStufe(KLICK_TAGWAHL, name, el, k)) return;
  if (Z.ansicht === "personal") return personalKlick(name, el);
  if (await tabellenStufe(KLICK_TAG, name, el, k)) return;
  return ansichtKlick(name, el);
}

// Klicks, Blätter außerhalb von #app, Escape schließt ein Blatt, aufklappbare Karten merken ihren Zustand.
export function klickAnmelden() {
  Z.root.addEventListener("click", aufKlick);
  Z.root.addEventListener("toggle", (e) => { const k = e.target?.dataset?.klapp; if (k) { if (e.target.open) offeneKlappen.add(k); else offeneKlappen.delete(k); } }, true);
  ebeneHuelle()?.addEventListener("click", aufKlick); // Blätter liegen außerhalb von #app
  Z.root.addEventListener("contextmenu", (ev) => { if (ev.target.closest('[data-a="schloss"]')) ev.preventDefault(); });
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && blattSchliessen()) ev.preventDefault(); });
}
