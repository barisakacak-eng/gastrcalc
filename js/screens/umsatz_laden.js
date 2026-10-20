// Laden-Umbau (20.10.2026): „Umsatz heute“ im Laden – eine Zahl aus der Kasse, ein Knopf. Vorher führte die Kachel ins Büro (umsatz.js).
// Gespeichert wird wie die Tagesumsatz-Eingabe im Büro (js/laden_zahlen.js umsatzHeuteSpeichern: Geschäftstag bis 4 Uhr, festgeschrieben).
// brutto/netto, Vortage und Korrekturen bleiben im Büro. Über 100.000 € fragt der Bildschirm einmal nach („Stimmt das?“), ohne alert().
import { t } from "../i18n.js";
import { esc, fmtEuro, heuteGeschaeft, wertAnzeige } from "../util.js";
import { umsatzEintrag } from "../engine.js";
import { umsatzHeutePruefen, umsatzHeuteSpeichern } from "../laden_zahlen.js";
import { nav } from "./nav.js";

let entwurf = null;   // getippter Text (null = noch nichts getippt, Feld zeigt den gespeicherten Wert)
let rueckfrage = null; // Betrag, nach dem gerade gefragt wird (über der Grenze)

export const umsatzLadenKennung = () => (rueckfrage !== null ? "frage" : "feld");
export function umsatzLadenZuruecksetzen() { entwurf = null; rueckfrage = null; }

export function umsatzLadenView(stand) {
  const H = heuteGeschaeft(); const u = umsatzEintrag(stand, H);
  const wert = entwurf ?? (u ? wertAnzeige(u.umsatz) : "");
  return `
    <div class="inhalt umsatz-laden">
      <div class="ul-kopf"><h1>${esc(t("heute.kachel.umsatz"))}</h1><small>${esc(t("abschluss.umsatzKurz"))}</small></div>
      ${rueckfrage !== null ? `
      <div class="karte ul-frage" role="alertdialog" aria-live="assertive">
        <b>${esc(t("ladenSchirm.stimmt", fmtEuro(rueckfrage, { dezimal: 2 })))}</b>
        <button type="button" class="knopf glut" data-a="ul-ja">${esc(t("ladenSchirm.ja"))}</button>
        <button type="button" class="knopf zweit" data-a="ul-aendern">${esc(t("ladenSchirm.aendern"))}</button>
      </div>` : `
      <label class="ul-feld"><input inputmode="decimal" enterkeyhint="done" autocomplete="off" data-f="ul-umsatz" value="${esc(wert)}" placeholder="0,00" aria-label="${esc(t("heute.kachel.umsatz"))}"><span class="einheit">€</span></label>
      <button type="button" class="knopf glut" data-a="ul-speichern">${esc(t("kartelaeden.speichern"))}</button>`}
    </div>
    ${nav("start")}`;
}

// Eingabe merken, nicht neu zeichnen (Tastatur bleibt oben)
export function umsatzLadenEingabe(feld, wert) { if (feld !== "ul-umsatz") return false; entwurf = wert; return "entwurf"; }

// Rückgabe: false (nicht meine) | "zeichnen" | { gespeichert: true, betrag } | { meldung }
export function umsatzLadenAktion(name, el, stand, wurzel) {
  if (name === "ul-aendern") { rueckfrage = null; return "zeichnen"; }
  if (name !== "ul-speichern" && name !== "ul-ja") return false;
  const text = entwurf ?? (umsatzEintrag(stand, heuteGeschaeft()) ? wertAnzeige(umsatzEintrag(stand, heuteGeschaeft()).umsatz) : "");
  const p = umsatzHeutePruefen(name === "ul-ja" ? String(rueckfrage ?? "") : text, { bestaetigt: name === "ul-ja" });
  if (p.status === "leer") return false;
  if (p.status === "ungueltig") return { meldung: t("allgemein.zahlUngueltig", String(text).trim().slice(0, 20)) };
  if (p.status === "rueckfrage") { rueckfrage = p.betrag; return "zeichnen"; }
  umsatzHeuteSpeichern(stand, p.betrag, { geraet: wurzel?.geraet || null });
  entwurf = null; rueckfrage = null;
  return { gespeichert: true, betrag: p.betrag };
}
