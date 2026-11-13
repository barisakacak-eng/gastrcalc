// Eingaben: Tippen in ein Feld mit data-f. Nicht bei jedem Zeichen neu zeichnen, sonst springt die Tastatur – nur den Stand ändern und
// speichern. Welcher Bildschirm was tut, steht in ANSICHT_EINGABE (laden.js, buero.js) und, in der Einrichtung, im Schritt selbst.
// Ein Eintrag gibt true zurück („Liste live filtern, Fokus und Cursor behalten“), FERTIG („nichts speichern“) oder etwas anderes („speichern“).
import { zusammenfuehren, FERTIG } from "./tabellen.js";
import { Z } from "../bedienung/zustand.js";
import { onboardingEingabe, schrittWeiter } from "./einrichtung.js";
import { modus, personalFeldGesperrt } from "../modus.js";
import { setzeSprache } from "./sprache.js";
import { zeichne } from "./zeichnen.js";
import { speichern } from "./speichern.js";
import { parseTemperatur, parseZahl } from "../util.js";
import { meldung } from "./meldung.js";
import { t } from "../i18n.js";
import { umsatzEingabe, umsatzFeldVerlassen } from "../screens/umsatz.js";
import { tagWertUebernehmen } from "../screens/tag.js";
import { ANSICHT_EINGABE as EINGABE_LADEN } from "./laden.js";
import { ANSICHT_EINGABE as EINGABE_BUERO } from "./buero.js";
import { aufAenderung } from "./fotos.js";

const ANSICHT_EINGABE = zusammenfuehren(EINGABE_LADEN, EINGABE_BUERO);

function eingabeWert(el) {
  if (Z.stand.phase === "onboarding") return onboardingEingabe(el);
  const h = Z.ansicht.startsWith("ordner-") ? ANSICHT_EINGABE["ordner-"] : Object.hasOwn(ANSICHT_EINGABE, Z.ansicht) ? ANSICHT_EINGABE[Z.ansicht] : null;
  return h ? h(el) : false;
}
function aufEingabe(ev) {
  Z.ruheBis = 0; // wer tippt, hat nicht doppelt getippt
  const el = ev.target.closest("[data-f]"); if (!el || el.type === "file") return;
  if (modus(Z.wurzel) === "personal" && personalFeldGesperrt(el.dataset.f)) return; // Einrichtungsfelder wirken im Personal-Modus nicht
  if (el.dataset.f === "sprache-wahl") { Z.wurzel.sprache = el.value; setzeSprache(el.value, () => zeichne()); return; } // Sprache sofort zeigen
  const neu = eingabeWert(el);
  if (neu === FERTIG) return;
  speichern(Z.wurzel);
  if (neu === true) { // Suchfelder: Liste live filtern, Fokus und Cursor behalten
    const f = el.dataset.f, pos = el.selectionStart; zeichne();
    const wieder = Z.root.querySelector(`[data-f="${CSS.escape(f)}"]`);
    if (wieder) { wieder.focus(); try { wieder.setSelectionRange(pos, pos); } catch (_) {} }
  }
}

// Wenn ein Feld verlassen wird: Zahl prüfen und einmal neu zeichnen, damit Zwischenstände und Markierungen stimmen.
function aufFeldVerlassen(ev) {
  const el = ev.target.closest("[data-f]"); if (!el || el.type === "file") return;
  if ((el.dataset.f === "station-wert" || el.dataset.f.startsWith("stelle-max:") || el.dataset.f.startsWith("stelle-min:")) && el.value.trim() !== "" && parseTemperatur(el.value) === null) meldung(t("kuehl.tempUngueltig", el.value.trim().slice(0, 12)));
  if (el.getAttribute("inputmode") === "decimal" && el.value.trim() !== "" && parseZahl(el.value) === null) {
    meldung(t(/^[0-9.,\s]+$/.test(el.value) ? "allgemein.zahlZuGross" : "allgemein.zahlUngueltig", el.value.trim().slice(0, 20)));
    if (el.dataset.f === "umsatz") { umsatzEingabe("umsatz", "", Z.stand, Z.wurzel); speichern(Z.wurzel); } // halbe Zahl nicht stehen lassen
  }
  if (el.dataset.f === "umsatz") { umsatzFeldVerlassen(Z.stand); speichern(Z.wurzel); } // Wert festschreiben, spätere Änderung = neuer Eintrag
  if (el.dataset.f.startsWith("wert:") && tagWertUebernehmen(el.dataset.f, el.value, Z.stand)) { speichern(Z.wurzel); meldung(t("tag.gespeichert")); }
  if (Z.stand.phase === "onboarding" || ["umsatz", "kuehl", "muell", "abschluss", "einstellungen", "listen", "beleg", "inventur", "verkauf"].includes(Z.ansicht)) {
    setTimeout(() => { const a = document.activeElement; if (!a || a === document.body || !a.matches("[data-f]")) zeichne(); }, 80);
  }
}

// Enter = Weiter, aber nur auf Bildschirmen mit genau einem Feld (sonst überspringt es Felder).
function aufEnter(ev) {
  if (ev.key !== "Enter") return;
  const el = ev.target.closest("[data-f]"); if (!el || el.type === "file" || el.tagName === "TEXTAREA") return;
  ev.preventDefault();
  if (el.dataset.f === "eigenes" || el.dataset.f === "stelle-neu" || el.dataset.f === "person-neu") { const b = el.closest(".neu")?.querySelector('[data-a$="-neu"]'); if (b) b.click(); return; }
  if (el.dataset.f === "buero-code") { Z.root.querySelector('[data-a="buero-code-oeffnen"], [data-a="buero-code-weiter"]')?.click(); return; }
  el.blur();
  if (Z.stand.phase === "onboarding" && Z.root.querySelectorAll("[data-f]").length === 1) schrittWeiter();
}

export function eingabeAnmelden() {
  Z.root.addEventListener("input", aufEingabe);
  Z.root.addEventListener("focusout", aufFeldVerlassen);
  Z.root.addEventListener("change", aufAenderung);
  Z.root.addEventListener("keydown", aufEnter);
}
