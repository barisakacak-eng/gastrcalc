// Tageswechsel: bei Rückkehr in die App, bei der Minuten-Uhr und beim Verlassen. Dazu der Vormonat, der eingefroren wird,
// und die Tipps, die einen Tag wählen („Nachtragen“, Zeitraum der Listen).
import { heuteGeschaeft } from "../util.js";
import { Z } from "../bedienung/zustand.js";
import { vormonatEinfrierenWennNoetig } from "../monatsabschluss.js";
import { speichern, sofortSpeichern } from "./speichern.js";
import { tagGewechselt, feldMitText } from "../bedienhilfe.js";
import { rundgangOffen as fuehrungOffen } from "../screens/rundgang.js";
import { kurzOffen } from "../screens/rundgang_kurz.js";
import { zeichne } from "./zeichnen.js";
import { ereignis } from "../store.js";
import { tagAktion } from "../screens/tag.js";
import { muellZuruecksetzen } from "../screens/muell.js";
import { NICHT } from "./tabellen.js";

// Friert in jedem eingerichteten Laden den Vormonat ein (nur wenn nötig); hat es etwas getan, wird gespeichert.
export function vormonatEinfrieren() {
  let n = 0; const H = heuteGeschaeft();
  for (const b of Z.wurzel?.betriebe || []) { if (b.phase === "app" && vormonatEinfrierenWennNoetig(b, H)) n += 1; }
  if (n) speichern(Z.wurzel);
  return n;
}

// Zurück in der App, oder die Uhr läuft über 04:00 (Geschäftstag) bzw. 00:00 (Kalendertag): neu zeichnen – sonst zeigt Heute,
// Putzplan und Kühlung noch gestern. Nicht, solange ein Feld mit Text den Fokus hat (dann beim Verlassen) oder eine Führung läuft.
export function tagPruefen() {
  if (!Z.wurzel || !Z.stand || Z.notfall || !tagGewechselt(Z.gezeichneterTag)) return;
  const a = document.activeElement; const feld = a?.matches?.("input, textarea, select") ? { aktiv: true, value: a.value } : null;
  if (feldMitText(feld) || fuehrungOffen() || kurzOffen()) return;
  vormonatEinfrieren();
  zeichne();
}

// Beim Verlassen (Wechsel zu WhatsApp, Kamera, Sperrbildschirm) sofort sichern – der Tester tippt oft und wechselt weg.
export function tagAnmelden() {
  window.addEventListener("pagehide", () => { if (Z.wurzel) sofortSpeichern(Z.wurzel, { stempel: false }); });
  document.addEventListener("visibilitychange", () => {
    if (!Z.wurzel) return;
    if (document.visibilityState === "hidden") sofortSpeichern(Z.wurzel, { stempel: false });
    else { ereignis("app-sichtbar", { phase: Z.stand.phase }); Z.ereignisAnzahl += 1; tagPruefen(); }
  });
  window.addEventListener("pageshow", () => tagPruefen());
  Z.root.addEventListener("focusout", () => setTimeout(tagPruefen, 200)); // Feld mit Text wurde verlassen: Tageswechsel nachholen
}

// Müll nachtragen aus Büro/Listen: Tag wählen, dann das Foto-Raster für diesen Tag.
export const KLICK = {
  "muell1-nachtragen": (el) => { tagAktion("tag-datum", el, Z.stand); muellZuruecksetzen(); Z.ansicht = "muell"; return zeichne(); },
};
// Zweite Stufe (nach Personal): Tag wählen, Zeitraum der Listen, Schwund stornieren (nicht im Müll-Bildschirm – dort gehört es dem Müll).
export const KLICK_TAG = {
  "tag-datum": (el, k) => tagWaehlen(k.name, el),
  "listen-zeitraum": (el, k) => tagWaehlen(k.name, el),
  "schwund-storno": (el, k) => (Z.ansicht === "muell" ? NICHT : tagWaehlen(k.name, el)),
};
function tagWaehlen(name, el) {
  if (tagAktion(name, el, Z.stand)) { speichern(Z.wurzel); zeichne(); }
}
